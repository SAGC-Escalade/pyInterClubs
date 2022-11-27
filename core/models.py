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

    Nom = models.CharField(max_length=50)
    Localisation = models.CharField(max_length=50)
    ID = models.AutoField(primary_key=True)

    def __str__(self):
        return self.Nom if self.Nom else "Nouveau Club"


class Grimpeur(models.Model):
    class Meta:
        db_table = 'Grimpeurs'

    Nom = models.CharField(max_length=50)
    Prenom = models.CharField(max_length=50)
    AnneeNaissance = models.IntegerField()
    Sexe = models.IntegerField(choices=Genre.choices)
    Licence = models.IntegerField(default=0)
    Club = models.ForeignKey(Club, on_delete=models.PROTECT, related_name='Grimpeurs', db_column='IDClub')
    ID = models.AutoField(primary_key=True)

    def __str__(self):
        return f'{self.Nom} {self.Prenom}'


class Saison(models.Model):
    class Meta:
        db_table = 'Saisons'

    Annee = models.IntegerField()
    ID = models.AutoField(primary_key=True)

    def __str__(self):
        return f'Saison {self.Annee}-{self.Annee+1}'


class Rencontre(models.Model):
    class Meta:
        db_table = 'Rencontres'

    Saison = models.ForeignKey(Saison, on_delete=models.PROTECT, related_name='Rencontres', db_column='IDSaison')
    Club = models.ForeignKey(Club, on_delete=models.PROTECT, related_name='Rencontres', db_column='IDClub')
    Date = models.DateField()
    ID = models.AutoField(primary_key=True)

    def __str__(self):
        date = date_format(self.Date, format='SHORT_DATE_FORMAT', use_l10n=True)
        return f'{self.Club.Localisation} le {date}'


class Equipe(models.Model):
    class Meta:
        db_table = 'Equipes'

    Rencontre = models.ForeignKey(Rencontre, on_delete=models.PROTECT, related_name='Equipes', db_column='IDRencontre')
    Club = models.ForeignKey(Club, on_delete=models.PROTECT, related_name='Equipes', db_column='IDClub')
    Numero = models.IntegerField(default=1)
    Categorie = models.IntegerField(choices=Categorie.choices)
    ID = models.AutoField(primary_key=True)

    def __str__(self):
        return f'{self.Club.Nom} {self.Numero}'


class Score(models.Model):
    class Meta:
        db_table = 'Scores'

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
    Vitesse = models.BigIntegerField(default=0)
    PtsVitesse = models.IntegerField(default=0)
    Points = models.IntegerField(default=0)
    Ordre = models.IntegerField(default=1, validators=[MaxValueValidator(8), MinValueValidator(1)])
    ClubPreteur = models.ForeignKey(Club, on_delete=models.PROTECT, db_column='IDClubPreteur', blank=True, null=True)
    ID = models.AutoField(primary_key=True)

    def __str__(self):
        return f'{self.Equipe.Rencontre} - {Categorie(self.Equipe.Categorie).name} - {self.Grimpeur}'
