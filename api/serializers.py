from rest_framework import serializers

from django_eventstream import send_event
from itertools import groupby
from operator import itemgetter

from core.models import *

# Serializer spécial permettant d'être notifié des modifications sur le modèle
class SSESerializer(serializers.ModelSerializer):
    def save(self, **kwargs):
        ret = super().save(**kwargs)
        self.notify()
        return ret

    @property
    def url_detail(self):
        return f"{self.url_list}/{self.instance.pk}"
    @property
    def url_list(self):
        return f"{self.context['view'].basename}s"

    def notify(self):
        send_event('events', self.url_detail, self.data)

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


class EquipeSerializer(SSESerializer):
    url_list = 'equipes'
    membres = serializers.SerializerMethodField()
    club = ClubSerializer(read_only=True)
    class Meta:
        model = Equipe
        fields = ['id', 'membres', 'club', 'numero', 'valide', 'points']

    def get_membres(self, obj):
        membres = obj.membres.all().order_by('ordre')
        return list(m.id for m in membres)

    def save(self, **kwargs):
        ret = super().save(**kwargs)
        if any(e in ('numero', 'club') for e in self.validated_data.keys()):
            send_event('events', self.url_list, None)
        return ret

    def create(self, validated_data):
        context = {}
        user = None
        if self.context.get('request'): user = self.context['request'].user
        if hasattr(user.profil, 'club'): context['club'] = user.profil.club
        if hasattr(user.profil, 'rencontre'): context['rencontre'] = user.profil.rencontre
        context.update(validated_data)
        return super().create(context)


class ScoreSerializer(SSESerializer):
    class Meta:
        model = Score
        fields = [
            'id',
            'ordre',
            'equipe',
            'grimpeur', 'clubPreteur',
            'points', 'valide',
            'performances', 'groupe',
        ]

    class EquipeField(serializers.PrimaryKeyRelatedField):
        def get_queryset(self):
            interclub = getattr(self.context.get('request', {}), 'interclub')
            if interclub is None: return None
            return interclub.equipes

    url_list = 'scores'
    __perfs = None
    __groupe = None

    equipe = EquipeField()
    grimpeur = ForeignKeyField(model_class=Grimpeur, serializer=GrimpeurSerializerIdentity)
    clubPreteur = ForeignKeyField(model_class=Club, serializer=ClubSerializer, required=False)
    performances = serializers.SerializerMethodField('get_performances')
    groupe = serializers.SerializerMethodField('get_groupe')

    def get_performances(self, instance):
        if self.__perfs is None:
            perfs = instance.performances.values('id', 'voie__type')
            perfs = {k:list(v['id'] for v in perfs if TypeVoie(v['voie__type'] or TypeVoie.diff).label == k) for k in ('Bloc', 'Difficulté', 'Vitesse')}
            self.__perfs = perfs
        return self.__perfs
    def get_groupe(self, instance):
        if self.__groupe is None:
            if not instance.equipe.rencontre.voiesGroupees: return None
            groupe = self.get_performances(instance).get(TypeVoie.diff.label, [None])[0]
            if groupe is None: return None
            groupe = instance.performances.get(pk=groupe).voie_id
            self.__groupe = groupe
        return self.__groupe


from datetime import timedelta
class PerformanceSerializer(SSESerializer):
    class DurationField(serializers.DurationField):
        def to_representation(self, value):
            if value == timedelta(microseconds=-1): return 'Chute'
            if value == timedelta(microseconds=-2): return 'Abandon'
            return super().to_representation(value)

        def to_internal_value(self, value):
            if value == 'Chute': return timedelta(microseconds=-1)
            if value == 'Abandon': return timedelta(microsecons=-2)
            return super().to_internal_value(value)

    temps = DurationField(required=False)
    voie = ForeignKeyField(model_class=Voie, serializer=VoieSerializer)
    class Meta:
        model = Performance
        fields = [
            'id', 'voie',
            'temps', 'points', 'etat'
        ]
