from rest_framework import serializers

from django_eventstream import send_event
from itertools import groupby
from operator import itemgetter

from core.models import *

# Serializer spécial permettant d'être notifié des modifications sur le modèle
class SSESerializer(serializers.ModelSerializer):
    def save(self, **kwargs):
        ret = super().save(**kwargs)
        url = self.context['view'].basename + "-detail"
        send_event('events', reverse(url, args=[self.instance.id]), self.data)
        return ret

class ForeignKeyField(serializers.Field):
    def __init__(self, model_class, serializer, **kwargs):
        self.serializer = serializer
        self.model_class = model_class
        super().__init__(**kwargs)

    def to_representation(self, value):
        return self.serializer(value).data
    def to_internal_value(self, data):
        try:
            return self.model_class.objects.get(pk=data)
        except self.model_class.DoesNotExist:
            pass


class VoieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Voie
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


class RencontreSerializer(SSESerializer):
    voies = VoieSerializer(read_only=True, many=True)
    class Meta:
        model = Rencontre
        fields = '__all__'
        #exclude = ['rencontre']


class EquipeSerializer(SSESerializer):
    membres = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    club = ClubSerializer(read_only=True)
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


class ScoreSerializer(SSESerializer):
    __perfs = None
    __groupe = None
    grimpeur = GrimpeurSerializerIdentity(read_only=True)
    performances = serializers.SerializerMethodField('get_performances')
    groupe = serializers.SerializerMethodField('get_groupe')
    class Meta:
        model = Score
        fields = [
            'id',
            'ordre',
            'grimpeur', 'clubPreteur',
            'points', 'valide',
            'performances', 'groupe',
        ]
    def get_performances(self, instance):
        if self.__perfs is None:
            # TODO : grouper les performances par type de voie
            perfs = instance.performances.order_by('voie__type', 'voie__niveau').values('id', 'voie__type')
            perfs = {TypeVoie(k).label:list(v['id'] for v in l) for k,l in groupby(perfs, itemgetter('voie__type'))}
            self.__perfs = perfs
        return self.__perfs
    def get_groupe(self, instance):
        if self.__groupe is None:
            if not instance.equipe.rencontre.voiesGroupees: return None
            groupe = self.get_performances(instance)[TypeVoie.diff.label][0]
            groupe = instance.performances.get(pk=groupe).voie_id
            self.__groupe = groupe
        return self.__groupe

class PerformanceSerializer(SSESerializer):
    temps = DurationField(required=False)
    voie = ForeignKeyField(model_class=Voie, serializer=VoieSerializer)
    class Meta:
        model = Performance
        fields = [
            'id', 'voie',
            'temps', 'points', 'etat'
        ]
