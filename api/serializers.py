from rest_framework.serializers import raise_errors_on_nested_writes
from rest_framework.utils import model_meta

from rest_framework import serializers

from django_eventstream import send_event
from itertools import groupby
from operator import itemgetter
import re

from core.models import *

__all__ = (
    "VoieSerializer", "ClubSerializer",
    "GrimpeurSerializer",
    "RencontreSerializer", "EquipeSerializer",
    "ScoreSerializer", "PerformanceSerializer", "FullPerformanceSerializer"
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

    @property
    def url_detail(self):
        return f"{self.url_list}/{self.instance.pk}"
    @property
    def url_list(self):
        return f"{self.context['view'].basename}s"


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
            return None


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
    club_nom = serializers.SlugRelatedField(source='club', slug_field='nom', read_only=True)
    class Meta:
        model = Grimpeur
        fields = ['id', 'nom', 'prenom', 'sexe', 'club_nom']
class GrimpeurField(serializers.PrimaryKeyRelatedField):
    def get_queryset(self):
        request = self.context.get('request', {})
        interclub = getattr(request, 'interclub', None)
        if interclub is None or interclub.rencontre is None:
            return Grimpeur.objects.none()

        queryset = Grimpeur.objects.global_filter(club=interclub.club)
        if request and request.user and not request.user.is_superuser:
            rencontre = Rencontre.objects.get(pk=interclub.rencontre)
            # On filtre les grimpeurs par rapport à leur âge
            if rencontre.categorie == Categorie.enfants:
                queryset = queryset.enfants(rencontre.saison)
            else:
                queryset = queryset.adolescents(rencontre.saison)

        # On ne garde que les grimpeurs qui ne sont pas inscrits
        return queryset.exclude_inscrits(rencontre=interclub.rencontre)


class RencontreSerializer(SSESerializer):
    voies = VoieSerializer(read_only=True, many=True)
    class Meta:
        model = Rencontre
        fields = '__all__'


class EquipeSerializer(SSESerializer):
    url_list = 'equipes'
    points = serializers.IntegerField(read_only=True)
    valide = serializers.BooleanField(read_only=True)
    membres = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    club = ClubSerializer(read_only=True)
    class Meta:
        model = Equipe
        fields = ['id', 'membres', 'club', 'numero', 'valide', 'points']

    def create(self, validated_data):
        context = {}
        user = None
        if self.context.get('request'): user = self.context['request'].user
        if hasattr(user.profil, 'club'): context['club'] = user.profil.club
        if hasattr(user.profil, 'rencontre'): context['rencontre'] = user.profil.rencontre
        context.update(validated_data)
        return super().create(context)
class EquipeField(serializers.PrimaryKeyRelatedField):
    def get_queryset(self):
        interclub = getattr(self.context.get('request', {}), 'interclub', None)
        if interclub is None or interclub.rencontre is None: return Equipe.objects.none()
        return Equipe.objects \
            .global_filter(rencontre=interclub.rencontre, club=interclub.club)



class ScoreSerializer(SSESerializer):
    re_nom = re.compile(r'([TM])(\d+)', re.IGNORECASE)
    @staticmethod
    def _cut_nom(voie):
        if voie is None: return 0
        m = ScoreSerializer.re_nom.search(voie.nom)
        if m is None: return None
        l,n = m.groups()
        return l,int(n)

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
    points = serializers.IntegerField(read_only=True)
    valide = serializers.BooleanField(read_only=True)
    equipe = EquipeField()
    grimpeur = GrimpeurField()
    clubPreteur = serializers.PrimaryKeyRelatedField(queryset=Club.objects.all(), required=False, allow_null=True)
    performances = serializers.SerializerMethodField()
    groupe = serializers.SerializerMethodField()

    def get_performances(self, instance):
        perfs = instance.performances.all() #.values('id', 'voie__type') Inutile, tout est déjà chargé
        return {k: [v.id for v in perfs if TypeVoie(getattr(v.voie, 'type', None) or TypeVoie.diff).label == k] for k in ('Bloc', 'Difficulté', 'Vitesse')}

    def get_groupe(self, instance):
        class Empty:
            id = None

        if not instance.equipe.rencontre.voiesGroupees:
            return None
        diffs = instance.performances.all()
        diffs = [p.voie for p in diffs if p.voie is None or p.voie.type == TypeVoie.diff]
        diffs = min(diffs, key=self._cut_nom, default=Empty)
        if diffs: return diffs.id
        return None

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Overwrite the grimpeur field with the nested serializer data
        if instance.grimpeur:
            ret['grimpeur'] = GrimpeurSerializer(instance.grimpeur, context=self.context).data
        if instance.clubPreteur:
            ret['clubPreteur'] = ClubSerializer(instance.clubPreteur, context=self.context).data
        if not 'points' in ret:
            #print(list(p.points for p in instance.performances.all()))
            ret['points'] = sum(p.points for p in instance.performances.all() if p.points)
        return ret

    def create(self, validated_data):
        if not 'ordre' in validated_data:
            # On cherche le premier ordre libre
            ordre = validated_data['equipe'].membres.values_list('ordre', flat=True)
            ordre = min([i for i in range(1,9) if not i in ordre])
            validated_data['ordre'] = ordre
        instance = super().create(validated_data)

        rencontre = instance.equipe.rencontre
        voies = rencontre.voies.genre(instance.grimpeur.sexe) # On ne garde que les voies pour le genre du grimpeur
        blocs = [Performance(voie=v, score=instance) for v in voies.blocs()][:rencontre.nbBloc]
        diffs = [Performance(score=instance) for i in range(rencontre.nbDiff)]
        vitesse = [Performance(voie=v, score=instance) for v in voies.vitesses()][:rencontre.nbVitesse]
        perfs = [p.save() for p in blocs + diffs + vitesse]

        return instance


from datetime import timedelta
class DurationField(serializers.DurationField):
    values = {
        'A réaliser': None,
        'Chute': timedelta(minutes=-1),
        'Abandon': timedelta(minutes=-2),
    }
    rvalues = {v:k for k,v in values.items()}
    def to_representation(self, duration):
        if duration in self.rvalues: return self.rvalues[duration]

        days = duration.days
        seconds = duration.seconds
        hundredths = duration.microseconds//10000
        minutes = seconds // 60
        seconds %= 60
        hours = minutes // 60
        minutes %= 60

        string = "{:02d}:{:02d}:{:02d}.{:02d}".format(hours, minutes, seconds, hundredths)
        if days:
            string = "{} ".format(days) + string
        return string

    def to_internal_value(self, value):
        if value in self.values: return self.values[value]
        return super().to_internal_value(value)

class PerformanceSerializer(SSESerializer):
    temps = DurationField(required=False)
    voie = ForeignKeyField(model_class=Voie, serializer=VoieSerializer)

    url_list = 'perfs'
    class Meta:
        model = Performance
        fields = [
            'id', 'voie',
            'temps', 'points', 'etat'
        ]

class FullPerformanceSerializer(SSESerializer):
    temps = DurationField(required=False)
    voie = ForeignKeyField(model_class=Voie, serializer=VoieSerializer)
    grimpeur = GrimpeurSerializer(source='score.grimpeur', read_only=True)

    url_list = 'perfs'
    class Meta:
        model = Performance
        fields = [
            'id', 'voie',
            'temps', 'points', 'etat',
            'grimpeur',
        ]
