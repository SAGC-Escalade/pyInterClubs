from django.core.exceptions import ValidationError as DjangoValidationError, NON_FIELD_ERRORS as DJANGO_NON_FIELD_ERRORS
from rest_framework.exceptions import ValidationError
from rest_framework.serializers import as_serializer_error
from rest_framework.settings import api_settings
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q

from core.models import *
from .serializers import *

__all__ = (
    'VoieViewSet', 'ClubViewSet', 'GrimpeurViewSet',
    'RencontreViewSet', 'EquipeViewSet',
    'ScoreViewSet', 'PerformanceViewSet'
)


def Response400(data):
    return Response(data, status=status.HTTP_400_BAD_REQUEST)
def Response204():
    return Response(status=status.HTTP_204_NO_CONTENT)

def django2drfValidation(exc):
    detail = as_serializer_error(exc)
    return {k if k != DJANGO_NON_FIELD_ERRORS else api_settings.NON_FIELD_ERRORS_KEY:v for k,v in detail.items()}

class DjangoModelViewSet(viewsets.ModelViewSet):
    def perform_create(self, serializer):
        try:
            return serializer.save()
        except DjangoValidationError as exc:
            raise ValidationError(detail=django2drfValidation(exc))
        except: raise

    def perform_update(self, serializer):
        try:
            return serializer.save()
        except DjangoValidationError as exc:
            raise ValidationError(detail=django2drfValidation(exc))
        except: raise

    def perform_destroy(self, instance):
        try:
            return instance.delete()
        except DjangoValidationError as exc:
            raise ValidationError(detail=django2drfValidation(exc))
        except: raise


class ClubViewSet(DjangoModelViewSet):
    serializer_class = ClubSerializer

    def get_queryset(self):
        queryset = Club.objects.all()
        filter = self.request.query_params.get('q')
        if filter: queryset = queryset.filter(nom__icontains=filter)
        return queryset

class VoieViewSet(DjangoModelViewSet):
    serializer_class = VoieSerializer
    queryset = Voie.objects.all()

class GrimpeurViewSet(DjangoModelViewSet):
    serializer_class = GrimpeurSerializerIdentity

    def get_queryset(self):
        interclub = getattr(self.request, 'interclub', None)
        if interclub is None: return Grimpeur.objects.none()

        queryset = self.request.interclub.grimpeurs
        # On ne garde que les grimpeurs qui ne sont pas inscrits
        alreadyRegistered = interclub.rencontre.scores.values('grimpeur_id')
        queryset = queryset.exclude(id__in=alreadyRegistered)
        # On ne garde que ceux qui correspondent au filtre de l'utilisateur
        filter = self.request.query_params.get('q')
        if filter:
            queryset = queryset.filter(
                Q(nom__icontains=filter) |
                Q(prenom__icontains=filter)
            )
        return queryset.order_by('nom', 'prenom')


class RencontreViewSet(DjangoModelViewSet):
    serializer_class = RencontreSerializer
    queryset = Rencontre.objects.all()

class EquipeViewSet(DjangoModelViewSet):
    serializer_class = EquipeSerializer

    def get_queryset(self):
        return self.request.interclub.equipes


    @action(detail=True, methods=['post'], permission_classes=[])
    def add(self, request, pk=None):
        equipe = self.get_object()
        data = dict(**request.data, equipe=equipe.id)

        score = ScoreSerializer(data=data, context={'request':request})
        if not score.is_valid():
            return Response400(score.errors)
        if score.validated_data['grimpeur'].club_id != equipe.id:
            score.validated_data['clubPreteur'] = score.validated_data['grimpeur'].club
        score = score.save()

        rencontre = equipe.rencontre
        voies = rencontre.voies
        blocs = [Performance(voie=v, score=score) for v in voies.filter(type=TypeVoie.bloc)][:rencontre.nbBloc]
        diffs = [Performance(score=score) for i in range(rencontre.nbDiff)]
        vitesse = [Performance(voie=v, score=score) for v in voies.filter(type=TypeVoie.vitesse)][:rencontre.nbVitesse]
        perfs = [p.save() for p in blocs + diffs + vitesse]

        EquipeSerializer(equipe).notify()
        return Response204()


class ScoreViewSet(DjangoModelViewSet):
    serializer_class = ScoreSerializer
    def get_queryset(self):
        return self.request.interclub.scores
    
    @action(detail=True, url_path=r'ordre/(?P<cmd>\w+)') #, permission_classes=[])
    def set_ordre(self, request, pk=None, cmd=None):
        if not cmd in ('up', 'down'): return Response({'no_field_errors': ["command not found"]}, status=status.HTTP_400_BAD_REQUEST)
        if pk is None: return Response({'no_field_errors': ["no score provided"]}, status=status.HTTP_400_BAD_REQUEST)
        score = self.get_object()
        if cmd == 'up': score.ordre_up()
        else:           score.ordre_down()
        EquipeSerializer(score.equipe).notify()
        return Response204()

    def perform_create(self, serializer):
        instance = super().perform_create(serializer)
        EquipeSerializer(instance.equipe).notify()
        EquipeSerializer(instance.equipe).notify(True)
    def perform_update(self, serializer):
        instance = super().perform_update(serializer)
        if any(f in serializer.initial_data for f in ('points', )):
            EquipeSerializer(instance.equipe).notify(True)
        if any(f in serializer.initial_data for f in ('ordre', 'grimpeur', 'clubPreteur', 'points')):
            EquipeSerializer(instance.equipe).notify()
    def perform_destroy(self, instance):
        equipe = instance.equipe
        super().perform_destroy(instance)
        EquipeSerializer(equipe).notify()
        EquipeSerializer(equipe).notify(True)


class PerformanceViewSet(DjangoModelViewSet):
    serializer_class = PerformanceSerializer
    queryset = Performance.objects.all()
