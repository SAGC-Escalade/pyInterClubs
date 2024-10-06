from django.contrib import admin
from django.db import models, transaction
from django.db.models import Q, F, Count, Case, When, Sum, Prefetch, BooleanField, QuerySet
from django.db.models.functions import Cast, Substr
from django.core.validators import MaxValueValidator, MinValueValidator
from django.core.exceptions import ValidationError
from django.utils.formats import date_format
from django.urls import reverse
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from model_utils import FieldTracker

from datetime import timedelta
from itertools import groupby

from admin.models import Juge
from api.models import CleanModel

__all__ = [
    "Categorie", "Genre", "TypeVoie",
    "Voie",
    "Club",
    "Grimpeur",
    "Rencontre",
    "Equipe",
    "Score",
    "Performance",
    "RencontreVoie",
]

########################################################
# Définition des Enum

class Categorie(models.IntegerChoices):
    __empty__   = 'Sélectionnez la catégorie'
    enfants     = 1
    adolescents = 2

class Genre(models.IntegerChoices):
    __empty__ = 'Sélectionnez le genre'
    femme     = 1, 'Fille'
    homme     = 2, 'Garçon'
    mixte     = 3

class TypeVoie(models.IntegerChoices):
    __empty__ = 'Sélectionnez le type'
    bloc      = 1, 'Bloc'
    diff      = 2, 'Difficulté'
    vitesse   = 3, 'Vitesse'


########################################################
# Définition des Manager et des QuerySet

class VoieQuerySet(models.QuerySet):
    def order_by__nom(self):
        is_tete = Case(
            When(nom__startswith='M', then=False),
            When(nom__startswith='T', then=True),
            output_field=models.BooleanField()
        )
        numero_voie = Cast(Substr('nom', 2), models.IntegerField())
        return self.annotate(tete=is_tete, numero=numero_voie).order_by('tete', 'numero')

    def actifs(self):
        return self.filter(actif=True)
    def blocs(self):
        return self.filter(type=TypeVoie.bloc)
    def diffs(self):
        return self.filter(type=TypeVoie.diff)
    def vitesses(self):
        return self.filter(type=TypeVoie.vitesse)

class GrimpeurQuerySet(models.QuerySet):
    def hommes(self):
        return self.filter(sexe=Genre.homme)
    def femmes(self):
        return self.filter(sexe=Genre.femme)

    def enfants(self, saison):
        amin, amax = 8, 13  # Ages correspondants à la catégorie 'Enfant'
        amax, amin= map(lambda x: saison + 1 - x, (amin, amax))
        return self.filter(Q(anneeNaissance__gte=amin) & Q(anneeNaissance__lte=amax))
    def adolescents(self, saison):
        amin, amax = 13, 19  # Ages correspondants à la catégorie 'Adolescent'
        amax, amin= map(lambda x: saison + 1 - x, (amin, amax))
        return self.filter(Q(anneeNaissance__gte=amin) & Q(anneeNaissance__lte=amax))

    def global_filter(self, *, club=None):
        qs = self
        if club: qs = qs.filter(club_id=club)
        return qs

    def exclude_inscrits(self, rencontre):
        alreadyRegistered = Score.objects.global_filter(rencontre=rencontre).values('grimpeur_id')
        return self.exclude(id__in=alreadyRegistered)

class RencontreQuerySet(models.QuerySet):
    def global_filter(self, *, rencontre=None, club=None):
        qs = self
        if club:      qs = qs.filter(club_id=club)
        if rencontre: qs = qs.get(pk=rencontre)
        return qs
    def with_related(self, with_valide_and_points=False):
        e_qs = Equipe.objects.with_related(with_valide_and_points)
        if with_valide_and_points: e_qs = e_qs.with_valide_and_points()
        return self.prefetch_related(
                Prefetch('equipes', queryset=e_qs),
                'voies'
            ).select_related(
                'club'
            )

class EquipeQuerySet(models.QuerySet):
    def global_filter(self, *, rencontre=None, club=None):
        qs = self
        if rencontre: qs = qs.filter(rencontre_id=rencontre)
        if club:      qs = qs.filter(club_id=club)
        return qs
    def with_related(self, with_valide_and_points=False):
        s_qs = Score.objects.with_related()
        if with_valide_and_points: s_qs = s_qs.with_valide_and_points()
        s_qs = s_qs.in_order()
        return self.prefetch_related(
                Prefetch('membres', queryset=s_qs)
            ).select_related('club', 'rencontre')
    def with_valide_and_points(self):
        return self.annotate(
                points=Sum('membres__performances__points'),
                # Calcul du nombre de performances non-nulles pour chaque type de voie
                nb_blocs_valide=Count('membres__performances', filter=Q(membres__performances__voie__type=TypeVoie.bloc) & Q(membres__performances__points__isnull=False)),
                nb_diffs_valide=Count('membres__performances', filter=Q(membres__performances__voie__type=TypeVoie.diff) & Q(membres__performances__points__isnull=False)),
                nb_vitesses_valide=Count('membres__performances', filter=Q(membres__performances__voie__type=TypeVoie.vitesse) & Q(membres__performances__points__isnull=False)),
                nb_membres=Count('membres', distinct=True),  # Nombre de membres de l'équipe
            ).annotate(
                # Vérification de la validité en comparant les performances réelles avec les attentes
                valide=Case(
                    When((
                        (Q(nb_blocs_valide__gt=0) | Q(nb_diffs_valide__gt=0) | Q(nb_vitesses_valide__gt=0)) &
                        Q(nb_blocs_valide = F('nb_membres') * F('rencontre__nbBloc')) &
                        Q(nb_diffs_valide = F('nb_membres') * F('rencontre__nbDiff')) &
                        Q(nb_vitesses_valide=F('nb_membres') * F('rencontre__nbVitesse'))
                        ), then=True
                    ),
                    default=False,
                    output_field=BooleanField()
                )
            )

class ScoreQuerySet(models.QuerySet):
    def hommes(self):
        return self.filter(Grimpeur__Sexe=Genre.Homme)
    def femmes(self):
        return self.filter(Grimpeur__Sexe=Genre.Femme)

    def in_order(self):
        return self.order_by('ordre')

    def global_filter(self, *, rencontre=None, equipe=None, club=None):
        qs = self
        if equipe:    qs = qs.filter(equipe_id=equipe)
        if rencontre: qs = qs.filter(equipe__rencontre_id=rencontre)
        if club:      qs = qs.filter(grimpeur__club_id=club)
        return qs
    def with_related(self):
        return self.prefetch_related(
                Prefetch('performances', queryset=Performance.objects.with_related()),
            ).select_related('equipe__rencontre__club', 'equipe__club', 'clubPreteur', 'grimpeur__club')
    def with_valide_and_points(self):
        return self.annotate(
                points=Sum('performances__points'),
                # Calcul du nombre de performances non-nulles pour chaque type de voie
                nb_blocs_valide=Count('performances', filter=Q(performances__voie__type=TypeVoie.bloc) & Q(performances__points__isnull=False)),
                nb_diffs_valide=Count('performances', filter=Q(performances__voie__type=TypeVoie.diff) & Q(performances__points__isnull=False)),
                nb_vitesses_valide=Count('performances', filter=Q(performances__voie__type=TypeVoie.vitesse) & Q(performances__points__isnull=False)),
            ).annotate(
                # Vérification de la validité en comparant les performances réelles avec les attentes
                valide=Case(
                    When((
                        (Q(nb_blocs_valide__gt=0) | Q(nb_diffs_valide__gt=0) | Q(nb_vitesses_valide__gt=0)) &
                        Q(nb_blocs_valide=F('equipe__rencontre__nbBloc')) &
                        Q(nb_diffs_valide=F('equipe__rencontre__nbDiff')) &
                        Q(nb_vitesses_valide=F('equipe__rencontre__nbVitesse'))
                        ), then=True
                    ),
                    default=False,
                    output_field=BooleanField()
                )
            )

class PerformanceQuerySet(models.QuerySet):
    def global_filter(self, *, score=None, equipe=None, rencontre=None, club=None, sexe=None):
        qs = self
        if score:     qs = qs.filter(score_id=score)
        if equipe:    qs = qs.filter(score__equipe_id=equipe)
        if rencontre: qs = qs.filter(score__equipe__rencontre_id=rencontre)
        if club:      qs = qs.filter(score__grimpeur__club_id=club)
        if sexe:      qs = qs.filter(score__grimpeur__sexe=sexe)
        return qs
    def with_related(self):
        return self.select_related('voie')

    def blocs(self):
        return self.filter(voie__type=TypeVoie.bloc)
    def diffs(self):
        return self.filter(voie__type=TypeVoie.diff)
    def vitesses(self):
        return self.filter(voie__type=TypeVoie.vitesse)
    def with_temps(self):
        return self.filter(temps__isnull=False)

class RencontreVoieQuerySet(models.QuerySet):
    def global_filter(self, *, rencontre=None, voie=None, juge=None):
        qs = self
        if rencontre: qs = qs.filter(rencontre_id=rencontre)
        if voie:      qs = qs.filter(voie_id=voie)
        if juge:      qs = qs.filter(juge_id=juge)
        return qs
    def with_related(self):
        return self.select_related('voie')

    def order_by__nom(self):
        is_tete = Case(
            When(voie__nom__startswith='M', then=False),
            When(voie__nom__startswith='T', then=True),
            output_field=models.BooleanField()
        )
        numero_voie = Cast(Substr('voie__nom', 2), models.IntegerField())
        return self.annotate(tete=is_tete, numero=numero_voie).order_by('tete', 'numero')


########################################################
# Définition des Models

class Voie(CleanModel):
    class Meta:
        indexes = [
            models.Index(fields=['type',]),
            models.Index(fields=['actif',]),
        ]
    objects = VoieQuerySet().as_manager()

    id = models.BigAutoField(primary_key=True)
    nom = models.CharField(max_length=15)
    niveau = models.CharField(max_length=5)
    categorie = models.IntegerField(choices=Categorie.choices)
    type = models.IntegerField(choices=TypeVoie.choices)
    zones = models.JSONField()
    actif = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.nom}/{self.niveau}'

    def points(self, index):
        return list(self.zones.values())[index]


class Club(CleanModel):
    class Meta:
        ordering = ['nom']

    id = models.BigAutoField(primary_key=True)
    nom = models.CharField(max_length=50)
    ville = models.CharField(max_length=50)

    def __str__(self):
        return self.nom


class Grimpeur(CleanModel):
    class Meta:
        indexes = [
            models.Index(fields=['anneeNaissance',]),
            models.Index(fields=['sexe',]),
        ]
        ordering = ['nom', 'prenom']
    objects = GrimpeurQuerySet().as_manager()

    id = models.BigAutoField(primary_key=True)
    nom = models.CharField(max_length=50)
    prenom = models.CharField(max_length=50)
    anneeNaissance = models.IntegerField()
    sexe = models.IntegerField(choices=Genre.choices)
    licence = models.BigIntegerField(default=0)
    club = models.ForeignKey(Club, on_delete=models.PROTECT, related_name='grimpeurs')

    def __str__(self):
        return f'{self.nom} {self.prenom}'


class Rencontre(CleanModel):
    class Meta:
        indexes = [
            models.Index(fields=['categorie',]),
            models.Index(fields=['date',]),
            models.Index(fields=['saison',]),
        ]
    objects = RencontreQuerySet().as_manager()

    id = models.BigAutoField(primary_key=True)
    saison = models.IntegerField()
    club = models.ForeignKey(Club, on_delete=models.PROTECT, related_name='rencontres')
    date = models.DateField()
    categorie = models.IntegerField(choices=Categorie.choices)
    nbBloc = models.IntegerField(default=2, validators=[MinValueValidator(1)])
    nbDiff = models.IntegerField(default=3, validators=[MinValueValidator(1)])
    nbVitesse = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    voiesReutilisables = models.BooleanField(default=False)
    voiesGroupees = models.BooleanField(default=False)
    voies = models.ManyToManyField(Voie, through='RencontreVoie')

    def __str__(self):
        date = date_format(self.date, format='SHORT_DATE_FORMAT', use_l10n=True)
        return f'{self.club.ville} le {date} - {Categorie(self.categorie).name}'
    str = __str__

    @property
    def scores_count(self):
        return sum(e.membres.count() for e in self.equipes.all())


    @transaction.atomic
    def proceed_speed_points(self, perf=None):
        # TODO: Trouver comment ne pas appeller ce calcul à chaque ajout d'une performance lors de l'import de l'ancienne base.
        # TODO: Simplifier cette méthode pour la rendre plus lisible
        # (certaines actions peuvent être dispatché dans d'autres modèles comme "Evaluation des conditions et points de la voie" => Perf.get_points())
        sexe = (Genre.homme, Genre.femme)
        if perf:
            if perf.score_id is None or perf.score.grimpeur_id is None: return
            sexe = (perf.score.grimpeur.sexe,)
        perfs = []
        scores = []
        for s in sexe:
            classement = Performance.objects.filter(
                Q(voie__type=TypeVoie.vitesse)
                & Q(score__grimpeur__sexe=s)
                & Q(score__equipe__rencontre=self)
                & Q(temps__isnull=False)
            ).prefetch_related('voie').prefetch_related('score').order_by('temps')
            rank = 0
            for temps, group in groupby(classement, key=lambda p: p.temps):
                # TODO: Les temps C# négatifs de l'abandon et de la chute ne correspondent pas aux temps Python
                # Il faut corriger cela... (peut-être lors de l'import)
                if temps == timedelta(minutes=-2): temps = 'Abandon'
                if temps == timedelta(minutes=-1): temps = 'Chute'
                group = list(group)
                for perf in group:
                    # Evaluation des conditions de la voie
                    for i, (k,p) in enumerate(perf.voie.zones.items()):
                        if temps == k or ('rank' in k and eval(k.replace('{rank}', str(rank)), {'__builtins__': None})):
                            points = p
                            break
                    else:
                        raise RuntimeError("Aucune condition trouvée pour la performance")
                    perf.etat = i
                    # Evaluation des points correspondants
                    if isinstance(points, str) and 'rank' in points:
                        perf.points = eval(points.replace('{rank}', str(rank)), {'__builtins__': None})
                    else:
                        perf.points = points
                    perfs.append(perf)
                rank += len(group)
        Performance.objects.bulk_update(perfs, ['points', 'etat'])


class Equipe(CleanModel):
    class Meta:
        indexes = [
            models.Index(fields=['club',]),
            models.Index(fields=['rencontre',]),
        ]
        ordering = ['club_id', 'numero']
    objects = EquipeQuerySet().as_manager()

    id = models.BigAutoField(primary_key=True)
    rencontre = models.ForeignKey(Rencontre, on_delete=models.PROTECT, related_name='equipes')
    club = models.ForeignKey(Club, on_delete=models.PROTECT, related_name='equipes')
    numero = models.IntegerField(default=1, validators=[MinValueValidator(1)])

    def __str__(self):
        return f'{self.club.nom} {self.numero}'


class Score(CleanModel):
    class Meta:
        indexes = [
            models.Index(fields=['equipe',]),
            models.Index(fields=['grimpeur',]),
        ]
        ordering = ['equipe_id', 'ordre']
    objects = ScoreQuerySet().as_manager()

    id = models.BigAutoField(primary_key=True)
    equipe = models.ForeignKey(Equipe, on_delete=models.PROTECT, related_name='membres')
    grimpeur = models.ForeignKey(Grimpeur, on_delete=models.PROTECT, related_name='participations')
    ordre = models.IntegerField(default=1, validators=[MaxValueValidator(8), MinValueValidator(1)])
    clubPreteur = models.ForeignKey(Club, on_delete=models.PROTECT, blank=True, null=True)

    tracker = FieldTracker(fields=['ordre'])

    def __str__(self):
        return f'{self.equipe.rencontre} - {self.grimpeur}'

    def clean(self):
        super().clean()
        if self.equipe_id is not None and self.equipe.membres.count() >= 8 and (self.pk is None or not self.equipe.membres.filter(pk=self.pk).exists()):
            raise ValidationError("Une équipe ne peut pas avoir plus de 8 membres.")


    # TODO: Il peut être judicieux de revoir ces méthodes.
    # Une fonction déclenché par un signal post_save permettant de remettre les indices dans l'ordre (sans trou)
    # à l'ajout/suppression d'un grimpeur ou à la modification de l'emplacement d'un grimpeur.
    def ordre_up(self):
        prev = self.equipe.membres.filter(ordre__lt=self.ordre).in_order().last()
        if prev is None: return
        prev.ordre += 1
        self.ordre -= 1
        prev.save()
        self.save()
    def ordre_down(self):
        next = self.equipe.membres.filter(ordre__gt=self.ordre).in_order().first()
        if next is None: return
        next.ordre -= 1
        self.ordre += 1
        next.save()
        self.save()
    def groupe(self, groupe):
        if self.pk is None or self.equipe_id is None or self.equipe.rencontre_id is None: return
        # Set des paramètres de la rencontre
        nbDiff = self.equipe.rencontre.nbDiff
        # Get des voies de la rencontre
        voies = self.equipe.rencontre.voies.diffs().order_by__nom()
        # Get des paramètres du groupe sélectionné
        groupe = voies.get(pk=groupe)
        # Get des 3 voies du groupe
        voies = list(voies)
        i = voies.index(groupe)
        voies = voies[i:i+nbDiff]
        # On enregistre la sélection dans les perfs du grimpeur
        perfs = list(self.performances.filter(Q(voie__type=TypeVoie.diff)|Q(voie=None)))
        for p,v in zip(perfs, voies):
            p.voie = v
            # TODO: Faire un update_bulk ou save_bulk pour éviter les notifications en cascade
            # Et appeler les notifications manuellement (3 perfs + 1 score + 1 equipe)
            p.save()


    def save(self, *args, **kwargs):
        creating = self._state.adding
        if creating:
            if self.grimpeur.club_id != self.equipe.club_id:
                self.clubPreteur = self.grimpeur.club
        return super().save(*args, **kwargs)


# Peut-être qu'il faudrait utiliser le polymorphisme pour la classe Performance
# Une classe PerformanceDiff (pour bloc et diff), une classe PerformanceVitesse
# - La diff n'a pas besoin du temps (quoique)
# - La vitesse n'a pas besoin de l'état (quoique: chute, abandon)
class Performance(CleanModel):
    class Meta:
        indexes = [
            models.Index(fields=['voie_id',]),
            models.Index(fields=['score_id',]),
            models.Index(fields=['temps',]),
        ]
    objects = PerformanceQuerySet().as_manager()

    id = models.BigAutoField(primary_key=True)
    voie = models.ForeignKey(Voie, on_delete=models.PROTECT, null=True, blank=True)
    score = models.ForeignKey(Score, on_delete=models.CASCADE, related_name="performances")
    temps = models.DurationField(null=True, blank=True)
    points = models.IntegerField(null=True, blank=True)
    etat = models.IntegerField(null=True, blank=True)

    tracker = FieldTracker(fields=['temps', 'points', 'etat', 'voie_id'])


    def save(self, *args, **kwargs):
        # TODO: Il peut être bénéfique de recalculer les points dans un signal post_save
        if self.voie_id != None:
            if self.etat is None:
                self.points = None
            elif self.etat is not None and self.etat in range(len(self.voie.zones)):
                points = self.voie.points(self.etat)
                if type(points) == str: pass
                else:                   self.points = points
                # TODO: Si les points sont une str, il faut les calculer...
        return super().save(*args, **kwargs)

    def clean(self):
        super().clean()
        if self.score_id and self.voie_id and self.tracker.has_changed('voie_id'):
            # La voie n'est autorisée QUE si elle n'est pas déjà utilisée dans la même rencontre
            if self.score.equipe_id and self.score.equipe.rencontre_id and not (self.score.equipe.rencontre.voiesReutilisables or self.score.equipe.rencontre.voiesGroupees):
                if self.score.performances.filter(~Q(id=self.id) & Q(voie=self.voie)).count():
                    raise ValidationError({'voie': ["Les voies ne sont faisables qu'une seule fois"]})


class RencontreVoie(CleanModel):
    class Meta:
        verbose_name = "rencontre-voie"
        verbose_name_plural = "rencontres-voies"
        constraints = [
            models.UniqueConstraint(fields=['rencontre', 'voie'], name='unique_rencontre_voie')
        ]
    objects = RencontreVoieQuerySet().as_manager()

    id = models.BigAutoField(primary_key=True)
    rencontre = models.ForeignKey(Rencontre, on_delete=models.CASCADE)
    voie = models.ForeignKey(Voie, on_delete=models.CASCADE)
    juge = models.ForeignKey(Juge, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.rencontre} - {self.voie}"
