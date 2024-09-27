from django.core.exceptions import ValidationError as DjangoValidationError, NON_FIELD_ERRORS as DJANGO_NON_FIELD_ERRORS
from rest_framework.exceptions import ValidationError
from rest_framework.serializers import as_serializer_error
from rest_framework.settings import api_settings
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, F, Count, Case, When, Sum, Prefetch, BooleanField

from core.models import *
from admin.middleware import WithRencontreRequiredMixin
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

class DjangoModelViewSet(WithRencontreRequiredMixin, viewsets.ModelViewSet):
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
        if filter: queryset = queryset.filter(Q(nom__icontains=filter) | Q(ville__icontains=filter))
        return queryset

class VoieViewSet(DjangoModelViewSet):
    serializer_class = VoieSerializer
    queryset = Voie.objects.all()

class GrimpeurViewSet(DjangoModelViewSet):
    serializer_class = GrimpeurSerializerIdentity

    def get_queryset(self):
        interclub = self.request.interclub
        queryset = Grimpeur.objects.global_filter(club=interclub.club)
        if not self.request.user.is_superuser:
            rencontre = Rencontre.objects.get(pk=interclub.rencontre)
            # On filtre les grimpeurs par rapport à leur âge
            if rencontre.categorie == Categorie.enfants:
                queryset = queryset.enfants(rencontre.saison)
            else:
                queryset = queryset.adolescents(rencontre.saison)

        # On ne garde que les grimpeurs qui ne sont pas inscrits
        queryset = queryset.exclude_inscrits(rencontre=interclub.rencontre)
        # On ne garde que ceux qui correspondent au filtre de l'utilisateur
        filter = self.request.query_params.get('q')
        if filter:
            queryset = queryset.filter(
                Q(nom__icontains=filter) |
                Q(prenom__icontains=filter)
            )
        return queryset #.order_by('nom', 'prenom') Normalement déjà ordonné par nom/prénom


class RencontreViewSet(DjangoModelViewSet):
    serializer_class = RencontreSerializer
    queryset = Rencontre.objects.all()

class EquipeViewSet(DjangoModelViewSet):
    serializer_class = EquipeSerializer

    def get_queryset(self):
        interclub = self.request.interclub
        if not interclub.rencontre: return Equipe.objects.none()
        queryset = Equipe.objects.with_related() \
            .global_filter(rencontre=interclub.rencontre, club=interclub.club) \
            .with_valide_and_points()
        if self.request.user.is_superuser:
            queryset = queryset.order_by('-points')
        return queryset


class ScoreViewSet(DjangoModelViewSet):
    serializer_class = ScoreSerializer
    def get_queryset(self):
        interclub = self.request.interclub
        if not interclub.rencontre: return Score.objects.none()
        queryset = Score.objects.with_related() \
            .global_filter(rencontre=interclub.rencontre, club=interclub.club) \
            .with_valide_and_points()

        order = self.request.query_params.get('order_by')
        if order: queryset = queryset.order_by(order)

        return queryset

    @action(detail=True, url_path=r'ordre/(?P<cmd>\w+)') #, permission_classes=[])
    def set_ordre(self, request, pk=None, cmd=None):
        if not cmd in ('up', 'down'): return Response({'no_field_errors': ["command not found"]}, status=status.HTTP_400_BAD_REQUEST)
        if pk is None: return Response({'no_field_errors': ["no score provided"]}, status=status.HTTP_400_BAD_REQUEST)
        score = self.get_object()
        if cmd == 'up': score.ordre_up()
        else:           score.ordre_down()
        # EquipeSerializer(score.equipe).notify() # Pas besoin de notifier celà pour le moment
        return Response204()

    @action(detail=True, url_path=r'groupe', methods=['POST']) #, permission_classes=[])
    def set_groupe(self, request, pk=None):
        if pk is None: return Response({'no_field_errors': ["no score provided"]}, status=status.HTTP_400_BAD_REQUEST)
        score = self.get_object()
        score.groupe(self.request.data.get('id'))
        for perf in score.performances.filter(voie__type=TypeVoie.diff):
            PerformanceSerializer(perf).notify()
        EquipeSerializer(score.equipe).notify(True)
        return Response(ScoreSerializer(score).data)

    def perform_create(self, serializer):
        instance = super().perform_create(serializer)
        EquipeSerializer(instance.equipe).notify()
        EquipeSerializer(instance.equipe).notify(True)
    def perform_update(self, serializer):
        instance = super().perform_update(serializer)
        if any(f in serializer.initial_data for f in ('points', )):
            EquipeSerializer(instance.equipe).notify(True)
        if any(f in serializer.initial_data for f in ('ordre', 'grimpeur', 'clubPreteur')):
            EquipeSerializer(instance.equipe).notify()
    def perform_destroy(self, instance):
        equipe = instance.equipe
        super().perform_destroy(instance)
        EquipeSerializer(equipe).notify(True)


class PerformanceViewSet(DjangoModelViewSet):
    serializer_class = PerformanceSerializer
    queryset = Performance.objects.select_related('voie').all()

    def perform_update(self, serializer):
        instance = super().perform_update(serializer)
        if any(f in serializer.initial_data for f in ('points', 'temps', 'voie', 'etat')):
            ScoreSerializer(instance.score).notify()
            EquipeSerializer(instance.score.equipe).notify(True)
