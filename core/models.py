from django.contrib import admin
from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator
from django.core.exceptions import ValidationError
from django.utils.formats import date_format
from django.db.models import Q
from django.urls import reverse

from datetime import timedelta

from admin.models import Juge


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


class Voie(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['type',]),
            models.Index(fields=['actif',]),
        ]
    id = models.BigAutoField(primary_key=True)
    nom = models.CharField(max_length=15)
    niveau = models.CharField(max_length=5)
    type = models.IntegerField(choices=TypeVoie.choices)
    zones = models.JSONField()
    actif = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.nom}/{self.niveau}'

    def points(self, index):
        return list(self.zones.values())[index]

class Club(models.Model):
    id = models.BigAutoField(primary_key=True)
    nom = models.CharField(max_length=50)
    ville = models.CharField(max_length=50)

    def __str__(self):
        return self.nom


class GrimpeurQuerySet(models.QuerySet):
    def hommes(self):
        return self.filter(sexe=Genre.homme)
    def femmes(self):
        return self.filter(sexe=Genre.femme)

class GrimpeurManager(models.Manager):
    def get_queryset(self):
        return GrimpeurQuerySet(self.model, using=self.db)

    def hommes(self):
        return self.get_queryset().hommes()
    def femmes(self):
        return self.get_queryset().femmes()

class Grimpeur(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['anneeNaissance',]),
            models.Index(fields=['sexe',]),
        ]
    id = models.BigAutoField(primary_key=True)
    nom = models.CharField(max_length=50)
    prenom = models.CharField(max_length=50)
    anneeNaissance = models.IntegerField()
    sexe = models.IntegerField(choices=Genre.choices)
    licence = models.BigIntegerField(default=0)
    club = models.ForeignKey(Club, on_delete=models.PROTECT, related_name='grimpeurs')

    def __str__(self):
        return f'{self.nom} {self.prenom}'

    objects = GrimpeurManager()


class Rencontre(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['categorie',]),
            models.Index(fields=['date',]),
        ]
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
    def scores(self):
        return Score.objects.filter(equipe__rencontre__pk=self.pk)


class Equipe(models.Model):
    id = models.BigAutoField(primary_key=True)
    rencontre = models.ForeignKey(Rencontre, on_delete=models.PROTECT, related_name='equipes')
    club = models.ForeignKey(Club, on_delete=models.PROTECT, related_name='equipes')
    numero = models.IntegerField(default=1, validators=[MinValueValidator(1)])

    def __str__(self):
        return f'{self.club.nom} {self.numero}'


class ScoreQuerySet(models.QuerySet):
    def hommes(self):
        return self.filter(Grimpeur__Sexe=Genre.Homme)
    def femmes(self):
        return self.filter(Grimpeur__Sexe=Genre.Femme)

    def in_order(self):
        return self.order_by('ordre')

class ScoreManager(models.Manager):
    def get_queryset(self):
        return ScoreQuerySet(self.model, using=self.db)

    def hommes(self):
        return self.get_queryset().hommes()
    def femmes(self):
        return self.get_queryset().femmes()

    def in_order(self):
        return self.get_queryset().in_order()

class Score(models.Model):
    id = models.BigAutoField(primary_key=True)
    equipe = models.ForeignKey(Equipe, on_delete=models.PROTECT, related_name='membres')
    grimpeur = models.ForeignKey(Grimpeur, on_delete=models.PROTECT, related_name='participations')
    points = models.IntegerField(default=0)
    ordre = models.IntegerField(default=1, validators=[MaxValueValidator(8), MinValueValidator(1)])
    clubPreteur = models.ForeignKey(Club, on_delete=models.PROTECT, blank=True, null=True)

    @admin.display(boolean=True)
    def valide(self):
        if self.pk is None or self.equipe_id is None or self.equipe.rencontre_id is None: return None
        if self.performances.filter(voie__type=TypeVoie.bloc).count() != self.equipe.rencontre.nbBloc: return False
        if self.performances.filter(voie__type=TypeVoie.diff).count() != self.equipe.rencontre.nbDiff: return False
        if self.performances.filter(voie__type=TypeVoie.vitesse).count() != self.equipe.rencontre.nbVitesse: return False
        if self.performances.filter(points=None).count(): return False
        return True

    def __str__(self):
        return f'{self.equipe.rencontre} - {self.grimpeur}'

    objects = ScoreManager()

    def clean(self):
        super().clean()
        if self.equipe_id is not None and self.equipe.membres.count() >= 8:
            raise ValidationError("Une équipe ne peut pas avoir plus de 8 membres.")


    def ordre_up(self):
        prev = self.equipe.membres.filter(ordre__lt=self.ordre).order_by('ordre').last()
        prev.ordre += 1
        self.ordre -= 1
        prev.save()
        self.save()
    def ordre_down(self):
        next = self.equipe.membres.filter(ordre__gt=self.ordre).order_by('ordre').first()
        next.ordre -= 1
        self.ordre += 1
        next.save()
        self.save()

    def _save(self, *args, **kwargs):
        if self.Equipe != None:
            categorie = self.Equipe.Categorie

            # On sélectionne les voies de Bloc
            self.IDBloc1 = Niveau.objects.get(Actif=True,NomVoie="Bloc",NiveauVoie=1,Categorie=categorie)
            self.IDBloc2 = Niveau.objects.get(Actif=True,NomVoie="Bloc",NiveauVoie=2,Categorie=categorie)

            # On sélectionne les voies 2 et 3 pour les enfants
            if categorie == Categorie.Enfants and self.IDVoie1 != None:
                self.IDVoie2 = self.NiveauxPossibles.get(PtsVoieComplete=self.IDVoie1.PtsVoieComplete+1)
                self.IDVoie3 = self.NiveauxPossibles.get(PtsVoieComplete=self.IDVoie1.PtsVoieComplete+2)

        self.Points = self.PtsBloc1 + self.PtsBloc2 + self.PtsVoie1 + self.PtsVoie2 + self.PtsVoie3 + self.PtsVoie4 + self.PtsVitesse

        #send_event('events', reverse("score-detail", args=[self.ID]), "updated")
        return super().save(*args, **kwargs)

# Peut-être qu'il faudrait utiliser le polymorphisme pour la classe Performance
# Une classe PerformanceDiff (pour bloc et diff), une classe PerformanceVitesse
# - La diff n'a pas besoin du temps (quoique)
# - La vitesse n'a pas besoin de l'état (quoique: chute, abandon)
class Performance(models.Model):
    id = models.BigAutoField(primary_key=True)
    voie = models.ForeignKey(Voie, on_delete=models.PROTECT)
    score = models.ForeignKey(Score, on_delete=models.CASCADE, related_name="performances")
    temps = models.DurationField(null=True)
    points = models.IntegerField(default=0, null=True)
    etat = models.IntegerField()

    def save(self, *args, **kwargs):
        if self.voie != None:
            zone = None
            if self.etat is not None and self.etat in range(len(self.voie.zones)):
                #self.points = list(self.voie.zones.values())[self.etat]
                self.points = self.voie.points(self.etat)
        #send_event('events', reverse("perf-detail", args=[self.id]), "updated")
        return super().save(*args, **kwargs)

class RencontreVoie(models.Model):
    class Meta:
        verbose_name = "rencontre-voie"
        verbose_name_plural = "rencontres-voies"
        constraints = [
            models.UniqueConstraint(fields=['rencontre', 'voie'], name='unique_rencontre_voie')
        ]
    id = models.BigAutoField(primary_key=True)
    rencontre = models.ForeignKey(Rencontre, on_delete=models.CASCADE)
    voie = models.ForeignKey(Voie, on_delete=models.CASCADE)
    juge = models.ForeignKey(Juge, on_delete=models.CASCADE, null=True)#, related_name="voies")

    def __str__(self):
        return f"{self.rencontre} - {self.voie}"
