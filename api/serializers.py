from rest_framework import serializers
from core.models import Niveau, Club, Grimpeur, Saison, Rencontre, Equipe, Score

class NiveauSerializer(serializers.ModelSerializer):
    class Meta:
        model = Niveau
        #fields = '__all__'
        exclude = ['Actif']

class ClubSerializer(serializers.ModelSerializer):
    class Meta:
        model = Club
        fields = '__all__'

class GrimpeurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grimpeur
        fields = '__all__'
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
        #fields = '__all__'
        exclude = ['Rencontre']



from datetime import timedelta
class DurationField(serializers.DurationField):
    def to_representation(self, value):
        if value == timedelta(microseconds=-1): return 'Chute'
        if value == timedelta(microseconds=-2): return 'Abandon'
        return super().to_representation(value)

    def to_internal_value(self, value):
        if value == 'Chute': return timedelta(microseconds=-1)
        if value == 'Abandon': return timedelta(microsecons=-2)
        return super().to_internal_value(value)


class ScoreSerializer(serializers.ModelSerializer):
    Grimpeur = GrimpeurSerializerIdentity()
    Vitesse = DurationField()
    class Meta:
        model = Score
        fields = [
            'ID',
            'Ordre',
            'Grimpeur', 'ClubPreteur',
            'Bloc1', 'Bloc2',
            'Voie1', 'Voie2', 'Voie3', 'Voie4',
            'Vitesse',
            'IDBloc1', 'IDBloc2',
            'IDVoie1', 'IDVoie2', 'IDVoie3', 'IDVoie4',
            'PtsBloc1', 'PtsBloc2',
            'PtsVoie1', 'PtsVoie2', 'PtsVoie3', 'PtsVoie4',
            'PtsVitesse',
            'Points', 'Valid',
        ]


class EquipeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipe
        #fields = ['ID', 'Club', 'Numero', 'Categorie']
        exclude = ['Rencontre']
