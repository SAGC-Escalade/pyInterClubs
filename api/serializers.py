from rest_framework.serializers import raise_errors_on_nested_writes
from rest_framework.utils import model_meta

from rest_framework import serializers

from django_eventstream import send_event
from itertools import groupby
from operator import itemgetter

from core.models import *

__all__ = (
    #"SSESerializer", "ForeignKeyField",
    "VoieSerializer", "ClubSerializer",
    "GrimpeurSerializer", "GrimpeurSerializerIdentity",
    "RencontreSerializer", "EquipeSerializer",
    "ScoreSerializer", "PerformanceSerializer",
)


# Serializer spécial permettant d'être notifié des modifications sur le modèle
# Il permet également de remonter les erreurs de validation Django via la surcharge de la méthode create
class SSESerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        """
        Cette surcharge et presque identique à l'originale.
        Le petit plus est qu'elle remonte les erreurs Django qui surviennent durant le create du manager
        """
        raise_errors_on_nested_writes('create', self, validated_data)

        ModelClass = self.Meta.model

        # Remove many-to-many relationships from validated_data.
        info = model_meta.get_field_info(ModelClass)
        many_to_many = {}
        for field_name, relation_info in info.relations.items():
            if relation_info.to_many and (field_name in validated_data):
                many_to_many[field_name] = validated_data.pop(field_name)

        try:
            instance = ModelClass._default_manager.create(**validated_data)
        except TypeError:
            tb = traceback.format_exc()
            msg = ( 'Got a `TypeError` when calling `%s.%s.create()`. '
                    'This may be because you have a writable field on the '
                    'serializer class that is not a valid argument to '
                    '`%s.%s.create()`. You may need to make the field '
                    'read-only, or override the %s.create() method to handle '
                    'this correctly.\nOriginal exception was:\n %s' % (
                        ModelClass.__name__,
                        ModelClass._default_manager.name,
                        ModelClass.__name__,
                        ModelClass._default_manager.name,
                        self.__class__.__name__,
                        tb
                    )
                )
            raise TypeError(msg)
        except: raise

        # Save many-to-many relationships after the instance is created.
        if many_to_many:
            for field_name, value in many_to_many.items():
                field = getattr(instance, field_name)
                field.set(value)

        return instance

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

    def notify(self, all_objects=False):
        if all_objects:
            send_event('events', self.url_list, None)
        else:
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


################################################################################
# Serializers pour chaque membres de l'API

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
    class EquipeField(serializers.PrimaryKeyRelatedField):
        def get_queryset(self):
            interclub = getattr(self.context.get('request', {}), 'interclub', None)
            if interclub is None:
                return Equipe.objects.none()
            return interclub.equipes

    class GrimpeurField(serializers.PrimaryKeyRelatedField):
        def get_queryset(self):
            interclub = getattr(self.context.get('request', {}), 'interclub', None)
            if interclub is None:
                return Grimpeur.objects.none()
            queryset = interclub.grimpeurs
            # On filtre sur les enfants qui ne sont pas encore inscrits uniquement
            alreadyRegistered = interclub.rencontre.scores.values('grimpeur_id')
            queryset = queryset.exclude(id__in=alreadyRegistered)

            return queryset

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

    url_list = 'scores'
    __perfs = None
    equipe = EquipeField()
    grimpeur = GrimpeurField()
    clubPreteur = serializers.PrimaryKeyRelatedField(queryset=Club.objects.all(), required=False, allow_null=True)
    performances = serializers.SerializerMethodField()
    groupe = serializers.SerializerMethodField()

    def get_performances(self, instance):
        perfs = instance.performances.values('id', 'voie__type')
        return {k: [v['id'] for v in perfs if TypeVoie(v['voie__type'] or TypeVoie.diff).label == k] for k in ('Bloc', 'Difficulté', 'Vitesse')}

    def get_groupe(self, instance):
        if not instance.equipe.rencontre.voiesGroupees:
            return None
        diffs = self.get_performances(instance).get(TypeVoie.diff.label, [None])
        if not diffs or diffs[0] is None:
            return None
        return instance.performances.get(pk=diffs[0]).voie_id

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Overwrite the grimpeur field with the nested serializer data
        if instance.grimpeur:
            ret['grimpeur'] = GrimpeurSerializerIdentity(instance.grimpeur, context=self.context).data
        if instance.clubPreteur:
            ret['clubPreteur'] = ClubSerializer(instance.clubPreteur, context=self.context).data
        return ret

    def create(self, validated_data):
        if not 'ordre' in validated_data:
            # On cherche le premier ordre libre
            ordre = validated_data['equipe'].membres.all().values('ordre')
            ordre = min([i for i in range(1,9) if not i in ordre])
            validated_data['ordre'] = ordre
        instance = super().create(validated_data)

        rencontre = instance.equipe.rencontre
        voies = rencontre.voies
        blocs = [Performance(voie=v, score=instance) for v in voies.filter(type=TypeVoie.bloc)][:rencontre.nbBloc]
        diffs = [Performance(score=instance) for i in range(rencontre.nbDiff)]
        vitesse = [Performance(voie=v, score=instance) for v in voies.filter(type=TypeVoie.vitesse)][:rencontre.nbVitesse]
        perfs = [p.save() for p in blocs + diffs + vitesse]

        return instance


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
