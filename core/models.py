# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator
from django.utils.formats import date_format
from django.db.models import Q

from datetime import timedelta

from push.models import Notification


class Categorie(models.IntegerChoices):
    __empty__   = 'Sélectionnez la catégorie'
    Enfants     = 1
    Adolescents = 2

class Genre(models.IntegerChoices):
    __empty__ = 'Sélectionnez le genre'
    Femme     = 1, 'Fille'
    Homme     = 2, 'Garçon'
    Mixte     = 3

class EtatVoie(models.IntegerChoices):
    __empty__ = 'A réaliser'
    Reussie   = 1, 'Réussie'
    Valorisee = 2, 'Valorisée'
    Echouee   = 3, 'Echouée'
    # Valeur conservée pour l'historique des saisons précédentes
    Interdite = 4


class Niveau(models.Model):
    class Meta:
        db_table = 'Niveaux'
    _using = 'interClubs'

    Categorie = models.IntegerField(choices=Categorie.choices)
    NomVoie = models.CharField(max_length=10)
    NiveauVoie = models.CharField(max_length=5)
    PtsValorises = models.IntegerField(default=0)
    PtsVoieComplete = models.IntegerField(default=0)
    Actif = models.BooleanField(default=False)
    ID = models.AutoField(primary_key=True)

    def __str__(self):
        nom = f'{self.NomVoie}/{self.NiveauVoie}' if self.NomVoie != 'Bloc' else f'Bloc {self.NiveauVoie}'
        if self.Categorie is Categorie.Enfants.value and self.NomVoie != 'Bloc':
            nom = f'G{self.PtsVoieComplete} - {nom}, ...'
        return nom


class Club(models.Model):
    class Meta:
        db_table = 'Clubs'
    _using = 'interClubs'

    Nom = models.CharField(max_length=50)
    Localisation = models.CharField(max_length=50)
    ID = models.AutoField(primary_key=True)

    def __str__(self):
        return self.Nom if self.Nom else "Nouveau Club"


class GrimpeurQuerySet(models.QuerySet):
    def hommes(self):
        return self.filter(Sexe=Genre.Homme)
    def femmes(self):
        return self.filter(Sexe=Genre.Femme)

class GrimpeurManager(models.Manager):
    def get_queryset(self):
        return GrimpeurQuerySet(self.model, using=self.db)

    def hommes(self):
        return self.get_queryset().hommes()
    def femmes(self):
        return self.get_queryset().femmes()

class Grimpeur(models.Model):
    class Meta:
        db_table = 'Grimpeurs'
    _using = 'interClubs'

    Nom = models.CharField(max_length=50)
    Prenom = models.CharField(max_length=50)
    AnneeNaissance = models.IntegerField()
    Sexe = models.IntegerField(choices=Genre.choices)
    Licence = models.IntegerField(default=0)
    Club = models.ForeignKey(Club, on_delete=models.PROTECT, related_name='Grimpeurs', db_column='IDClub')
    ID = models.AutoField(primary_key=True)

    def __str__(self):
        return f'{self.Nom} {self.Prenom}'

    objects = GrimpeurManager()


class Saison(models.Model):
    class Meta:
        db_table = 'Saisons'
    _using = 'interClubs'

    Annee = models.IntegerField()
    ID = models.AutoField(primary_key=True)

    def __str__(self):
        return f'Saison {self.Annee}-{self.Annee+1}'


class Rencontre(models.Model):
    class Meta:
        db_table = 'Rencontres'
    _using = 'interClubs'

    Saison = models.ForeignKey(Saison, on_delete=models.PROTECT, related_name='Rencontres', db_column='IDSaison')
    Club = models.ForeignKey(Club, on_delete=models.PROTECT, related_name='Rencontres', db_column='IDClub')
    Date = models.DateField()
    ID = models.AutoField(primary_key=True)

    def __str__(self):
        date = date_format(self.Date, format='SHORT_DATE_FORMAT', use_l10n=True)
        return f'{self.Club.Localisation} le {date}'

    @property
    def Scores(self):
        return Score.objects.filter(Equipe__Rencontre__pk=self.pk)

class EquipeManager(models.Manager):
    def adolescents(self):
        return self.filter(Categorie=Categorie.Adolescents)
    def enfants(self):
        return self.filter(Categorie=Categorie.Enfants)

class Equipe(models.Model):
    class Meta:
        db_table = 'Equipes'
    _using = 'interClubs'

    Rencontre = models.ForeignKey(Rencontre, on_delete=models.PROTECT, related_name='Equipes', db_column='IDRencontre')
    Club = models.ForeignKey(Club, on_delete=models.PROTECT, related_name='Equipes', db_column='IDClub')
    Numero = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    Categorie = models.IntegerField(choices=Categorie.choices)
    ID = models.AutoField(primary_key=True)

    def __str__(self):
        return f'{self.Club.Nom} {self.Numero}'

    objects = EquipeManager()


class ScoreQuerySet(models.QuerySet):
    def adolescents(self):
        return self.filter(Equipe__Categorie=Categorie.Adolescents)
    def enfants(self):
        return self.filter(Equipe__Categorie=Categorie.Enfants)

    def hommes(self):
        return self.filter(Grimpeur__Sexe=Genre.Homme)
    def femmes(self):
        return self.filter(Grimpeur__Sexe=Genre.Femme)

    def in_order(self):
        return self.order_by('Ordre')

class ScoreManager(models.Manager):
    def get_queryset(self):
        return ScoreQuerySet(self.model, using=self.db)

    def adolescents(self):
        return self.get_queryset().adolescents()
    def enfants(self):
        return self.get_queryset().enfants()
    def hommes(self):
        return self.get_queryset().hommes()
    def femmes(self):
        return self.get_queryset().femmes()

    def in_order(self):
        return self.get_queryset().in_order()

class Score(models.Model):
    class Meta:
        db_table = 'Scores'
    _using = 'interClubs'

    Equipe = models.ForeignKey(Equipe, on_delete=models.PROTECT, related_name='Scores', db_column='IDEquipe')
    Grimpeur = models.ForeignKey(Grimpeur, on_delete=models.PROTECT, related_name='Scores', db_column='IDGrimpeur')
    IDBloc1 = models.ForeignKey(Niveau, on_delete=models.PROTECT, related_name='score_bloc1_set', db_column='IDBloc1', blank=True, null=True)
    IDBloc2 = models.ForeignKey(Niveau, on_delete=models.PROTECT, related_name='score_bloc2_set', db_column='IDBloc2', blank=True, null=True)
    IDVoie1 = models.ForeignKey(Niveau, on_delete=models.PROTECT, related_name='score_voie1_set', db_column='IDVoie1', blank=True, null=True)
    IDVoie2 = models.ForeignKey(Niveau, on_delete=models.PROTECT, related_name='score_voie2_set', db_column='IDVoie2', blank=True, null=True)
    IDVoie3 = models.ForeignKey(Niveau, on_delete=models.PROTECT, related_name='score_voie3_set', db_column='IDVoie3', blank=True, null=True)
    IDVoie4 = models.ForeignKey(Niveau, on_delete=models.PROTECT, related_name='score_voie4_set', db_column='IDVoie4', blank=True, null=True)
    Bloc1 = models.IntegerField(choices=EtatVoie.choices, blank=True, null=True)
    Bloc2 = models.IntegerField(choices=EtatVoie.choices, blank=True, null=True)
    Voie1 = models.IntegerField(choices=EtatVoie.choices, blank=True, null=True)
    Voie2 = models.IntegerField(choices=EtatVoie.choices, blank=True, null=True)
    Voie3 = models.IntegerField(choices=EtatVoie.choices, blank=True, null=True)
    Voie4 = models.IntegerField(choices=EtatVoie.choices, blank=True, null=True)
    Vitesse = models.DurationField(default=0)
    PtsVitesse = models.IntegerField(default=0)
    Points = models.IntegerField(default=0)
    Ordre = models.IntegerField(default=1, validators=[MaxValueValidator(8), MinValueValidator(1)])
    ClubPreteur = models.ForeignKey(Club, on_delete=models.PROTECT, db_column='IDClubPreteur', blank=True, null=True)
    ID = models.AutoField(primary_key=True)

    def __str__(self):
        return f'{self.Equipe.Rencontre} - {Categorie(self.Equipe.Categorie).name} - {self.Grimpeur}'

    objects = ScoreManager()

    @property
    def Valid(self):
        return self.IDVoie1 != None and self.Voie1 != None \
           and self.IDVoie2 != None and self.Voie2 != None \
           and self.IDVoie3 != None and self.Voie3 != None \
           and True if (self.Equipe != None and self.Equipe.Categorie == Categorie.Enfants) else \
              (self.Voie4 != None if self.IDVoie4 != None else True) \
           and self.IDBloc1 != None and self.Bloc1 != None \
           and self.IDBloc2 != None and self.Bloc2 != None \
           and self.Vitesse != timedelta()


    @property
    def PtsVoie1(self):
        return self.PtsVoie(self.Voie1, self.IDVoie1)
    @property
    def PtsVoie2(self):
        return self.PtsVoie(self.Voie2, self.IDVoie2)
    @property
    def PtsVoie3(self):
        return self.PtsVoie(self.Voie3, self.IDVoie3)
    @property
    def PtsVoie4(self):
        return self.PtsVoie(self.Voie4, self.IDVoie4)
    @property
    def PtsBloc1(self):
        return self.PtsVoie(self.Bloc1, self.IDBloc1)
    @property
    def PtsBloc2(self):
        return self.PtsVoie(self.Bloc2, self.IDBloc2)

    def PtsVoie(self, result, niveau):
        if result is None or niveau is None: return 0
        if result == EtatVoie.Valorisee: return niveau.PtsValorises
        if result == EtatVoie.Reussie: return niveau.PtsVoieComplete
        return 0

    @property
    def NiveauxPossibles(self):
        qs = Q(Actif=True) & (~Q(NomVoie='Bloc'))
        if self.Equipe  != None: qs &= Q(Categorie=self.Equipe.Categorie)
        if self.IDVoie1 != None and not self.IDVoie1.Actif: qs = qs | Q(pk=self.IDVoie1.ID)
        if self.IDVoie2 != None and not self.IDVoie2.Actif: qs = qs | Q(pk=self.IDVoie2.ID)
        if self.IDVoie3 != None and not self.IDVoie3.Actif: qs = qs | Q(pk=self.IDVoie3.ID)
        if self.IDVoie4 != None and not self.IDVoie4.Actif: qs = qs | Q(pk=self.IDVoie4.ID)
        return Niveau.objects.filter(qs)


    def save(self, *args, **kwargs):
        if self.Equipe != None:
            categorie = self.Equipe.Categorie

            # On sélectionne les voies de Bloc
            self.IDBloc1 = Niveau.objects.get(Actif=True,NomVoie="Bloc",NiveauVoie=1,Categorie=categorie)
            self.IDBloc2 = Niveau.objects.get(Actif=True,NomVoie="Bloc",NiveauVoie=2,Categorie=categorie)
            Notification.send_event(f'/score/{self.ID}/IDBloc1')
            Notification.send_event(f'/score/{self.ID}/IDBloc2')

            # On sélectionne les voies 2 et 3 pour les enfants
            if categorie == Categorie.Enfants and self.IDVoie1 != None:
                self.IDVoie2 = self.NiveauxPossibles.get(PtsVoieComplete=self.IDVoie1.PtsVoieComplete+1)
                self.IDVoie3 = self.NiveauxPossibles.get(PtsVoieComplete=self.IDVoie1.PtsVoieComplete+2)
                Notification.send_event(f'/score/{self.ID}/IDVoie2')
                Notification.send_event(f'/score/{self.ID}/IDVoie3')

        self.Points = self.PtsBloc1 + self.PtsBloc2 + self.PtsVoie1 + self.PtsVoie2 + self.PtsVoie3 + self.PtsVoie4 + self.PtsVitesse
        Notification.send_event(f'/score/{self.ID}/Points')

        return super().save(*args, **kwargs)
