from rest_framework import serializers
from core.models import Niveau, Club, Grimpeur, Saison, Rencontre, Equipe, Score

class NiveauSerializer(serializers.ModelSerializer):
    class Meta:
        model = Niveau
        fields = '__all__'
        exclude = ['Actif']
class NiveauSerializerRestricted(serializers.ModelSerializer):
    class Meta:
        model = Niveau
        fields = ['ID', 'NomVoie', 'NiveauVoie']

class ClubSerializer(serializers.ModelSerializer):
    class Meta:
        model = Club
        fields = '__all__'

class GrimpeurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grimpeur
        fields = '__all__'
class GrimpeurSerializerDepth1(GrimpeurSerializer):
    class Meta(GrimpeurSerializer.Meta):
        depth = 1
class GrimpeurSerializerIdentity(serializers.ModelSerializer):
    class Meta:
        model = Grimpeur
        fields = ['ID', 'Nom', 'Prenom', 'Sexe']

class SaisonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Saison
        fields = '__all__'

class RencontreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rencontre
        fields = '__all__'
        exclude = ['Rencontre']

class ScoreSerializer(serializers.ModelSerializer):
    Grimpeur = GrimpeurSerializerIdentity()
    IDBloc1 = NiveauSerializerRestricted()
    IDBloc2 = NiveauSerializerRestricted()
    IDVoie1 = NiveauSerializerRestricted()
    IDVoie2 = NiveauSerializerRestricted()
    IDVoie3 = NiveauSerializerRestricted()
    IDVoie4 = NiveauSerializerRestricted()
    class Meta:
        model = Score
        fields = ['ID', 'Bloc1', 'Bloc2', 'Voie1', 'Voie2', 'Voie3', 'Voie4', 'Vitesse', 'Ordre', 'Grimpeur', 'ClubPreteur', 'IDBloc1', 'IDBloc2', 'IDVoie1', 'IDVoie2', 'IDVoie3', 'IDVoie4', 'Points', 'PtsVitesse']

class EquipeSerializer(serializers.ModelSerializer):
    Scores = ScoreSerializer(many=True, read_only=True)
    class Meta:
        model = Equipe
        fields = ['ID', 'Club', 'Numero', 'Categorie', 'Scores']
        #exclude = ['Rencontre']
        depth = 1
