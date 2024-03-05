from rest_framework import serializers
from core.models import Niveau, Club, Grimpeur, Rencontre, Equipe, Score, Performance

class NiveauSerializer(serializers.ModelSerializer):
    class Meta:
        model = Niveau
        #fields = '__all__'
        exclude = ['actif']


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
        fields = ['id', 'nom', 'prenom', 'sexe']


class RencontreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rencontre
        #fields = '__all__'
        exclude = ['rencontre']


class EquipeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipe
        #fields = ['ID', 'Club', 'Numero', 'Categorie']
        exclude = ['rencontre']


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
    Grimpeur = GrimpeurSerializerIdentity(read_only=True)
    class Meta:
        model = Score
        fields = [
            'id',
            'ordre',
            'grimpeur', 'clubPreteur',
            'points', 'valid',
        ]


class PerformanceSerializer(serializers.ModelSerializer):
    temps = DurationField(required=False)
    class Meta:
        model = Performance
        exclude = ['participation', 'niveau']
