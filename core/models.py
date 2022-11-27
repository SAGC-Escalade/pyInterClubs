# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator

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

    Categorie = models.IntegerField(choices=Categorie.choices, blank=True, null=True)
    NomVoie = models.CharField(blank=True, null=True, max_length=250)
    NiveauVoie = models.CharField(blank=True, null=True, max_length=250)
    PtsValorises = models.IntegerField(blank=True, null=True)
    PtsVoieComplete = models.IntegerField(blank=True, null=True)
    Actif = models.BooleanField(default=False, blank=True, null=True)
    ID = models.AutoField(primary_key=True)


class Club(models.Model):
    class Meta:
        db_table = 'Clubs'

    Nom = models.TextField(blank=True, null=True)
    Localisation = models.TextField(blank=True, null=True)
    ID = models.AutoField(primary_key=True)


class Grimpeur(models.Model):
    class Meta:
        db_table = 'Grimpeurs'

    Nom = models.CharField(blank=True, null=True, max_length=250)
    Prenom = models.CharField(blank=True, null=True, max_length=250)
    AnneeNaissance = models.IntegerField(blank=True, null=True)
    Sexe = models.IntegerField(choices=Genre.choices, blank=True, null=True)
    Licence = models.IntegerField(default=0, blank=True, null=True)
    Club = models.ForeignKey(Club, on_delete=models.PROTECT, related_name='Grimpeurs', db_column='IDClub', blank=True, null=True)
    ID = models.AutoField(primary_key=True)


class Saison(models.Model):
    class Meta:
        db_table = 'Saisons'

    Annee = models.IntegerField(blank=True, null=True)
    ID = models.AutoField(primary_key=True)


class Rencontre(models.Model):
    class Meta:
        db_table = 'Rencontres'

    Saison = models.ForeignKey(Saison, on_delete=models.PROTECT, related_name='Rencontres', db_column='IDSaison', blank=True, null=True)
    Club = models.ForeignKey(Club, on_delete=models.PROTECT, related_name='Rencontres', db_column='IDClub', blank=True, null=True)
    Date = models.DateField(blank=True, null=True)
    ID = models.AutoField(primary_key=True)


class Equipe(models.Model):
    class Meta:
        db_table = 'Equipes'

    Rencontre = models.ForeignKey(Rencontre, on_delete=models.PROTECT, related_name='Equipes', db_column='IDRencontre', blank=True, null=True)
    Club = models.ForeignKey(Club, on_delete=models.PROTECT, related_name='Equipes', db_column='IDClub', blank=True, null=True)
    Numero = models.IntegerField(default=1, blank=True, null=True)
    Categorie = models.IntegerField(choices=Categorie.choices, blank=True, null=True)
    ID = models.AutoField(primary_key=True)


class Score(models.Model):
    class Meta:
        db_table = 'Scores'

    Equipe = models.ForeignKey(Equipe, on_delete=models.PROTECT, related_name='Scores', db_column='IDEquipe', blank=True, null=True)
    Grimpeur = models.ForeignKey(Grimpeur, on_delete=models.PROTECT, related_name='Scores', db_column='IDGrimpeur', blank=True, null=True)
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
    Vitesse = models.BigIntegerField(default=0, blank=True, null=True)
    PtsVitesse = models.IntegerField(default=0, blank=True, null=True)
    Points = models.IntegerField(default=0, blank=True, null=True)
    Ordre = models.IntegerField(default=1, validators=[MaxValueValidator(8), MinValueValidator(1)], blank=True, null=True)
    ClubPreteur = models.ForeignKey(Club, on_delete=models.PROTECT, db_column='IDClubPreteur', blank=True, null=True)
    ID = models.AutoField(primary_key=True)
