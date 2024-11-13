from functools import wraps
from django.core.exceptions import ValidationError as DjangoValidationError, NON_FIELD_ERRORS as DJANGO_NON_FIELD_ERRORS
from django.db import transaction
from rest_framework.exceptions import ValidationError
from rest_framework.serializers import as_serializer_error
from rest_framework.settings import api_settings
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, F, Count, Case, When, Sum, Prefetch, BooleanField

from core.models import *
from admin.models import *
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

# Classe (et fonction) permettant de passer les ValidationError de Django à DRF
def django2drfValidation(exc):
    detail = as_serializer_error(exc)
    return {k if k != DJANGO_NON_FIELD_ERRORS else api_settings.NON_FIELD_ERRORS_KEY:v for k,v in detail.items()}

def handle_django_errors(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            # Appelle la fonction d'origine (perform_create, perform_update, etc.)
            return func(*args, **kwargs)
        except DjangoValidationError as exc:
            # Intercepte l'exception Django et la convertit en ValidationError DRF
            raise ValidationError(detail=django2drfValidation(exc))
        except:
            # Reraise toutes les autres exceptions sans les modifier
            raise
    return wrapper

class DjangoModelViewSet(WithRencontreRequiredMixin, viewsets.ModelViewSet):
    @handle_django_errors
    def perform_create(self, serializer):
        super().perform_create(serializer)

    @handle_django_errors
    def perform_update(self, serializer):
        super().perform_update(serializer)

    @handle_django_errors
    def perform_destroy(self, instance):
        super().perform_destroy(instance)


#######################################################################
# Les ViewSet de notre API

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
    serializer_class = GrimpeurSerializer

    def get_queryset(self):
        interclub = self.request.interclub
        user = self.request.user
        queryset = Grimpeur.objects.select_related('club').global_filter(club=interclub.club)

        if not user.is_superuser: # Coach
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
        return queryset


class RencontreViewSet(DjangoModelViewSet):
    serializer_class = RencontreSerializer
    queryset = Rencontre.objects.all()


class EquipeViewSet(DjangoModelViewSet):
    serializer_class = EquipeSerializer

    def get_queryset(self):
        interclub = self.request.interclub
        if not interclub.rencontre: return Equipe.objects.none()
        club = self.kwargs.get('club')
        queryset = Equipe.objects.with_related() \
            .global_filter(rencontre=interclub.rencontre, club=interclub.club) \
            .with_valide_and_points()
        #if self.request.user.is_superuser:
        #    queryset = queryset.order_by('-points')
        return queryset


class ScoreViewSet(DjangoModelViewSet):
    serializer_class = ScoreSerializer
    def get_queryset(self):
        interclub = self.request.interclub
        if not interclub.rencontre: return Score.objects.none()
        # TODO: Mettre ça dans une classe Permission
        #if interclub.user_is_coach and self.kwargs.get('club') and request.user.profil.club_id != self.kwargs.get('club'):
        #    raise NotAuthorizedError()

        # Juge (il est intéressé par les grimpeurs inscrits et leur club
        if interclub.user_is_juge:
            queryset = Score.objects.select_related('grimpeur__club') \
                .filter(performances__voie__isnull=True).distinct()

            filter = self.request.query_params.get('q')
            if filter:
                queryset = queryset.filter(
                    Q(grimpeur__nom__icontains=filter) |
                    Q(grimpeur__prenom__icontains=filter)
                )
            return queryset

        # Coach (ou admin) (il est intéressé par le score et son contenu - grimpeur, performances, points, valide, ...)
        club = self.kwargs.get('club')
        queryset = Score.objects.with_related() \
            .global_filter(rencontre=interclub.rencontre, club=club) \
            .with_valide_and_points()
        return queryset

    @action(detail=True, url_path=r'ordre/(?P<cmd>\w+)') #, permission_classes=[])
    def set_ordre(self, request, pk=None, cmd=None):
        if not cmd in ('up', 'down'): return Response({'no_field_errors': ["command not found"]}, status=status.HTTP_400_BAD_REQUEST)
        if pk is None: return Response({'no_field_errors': ["no score provided"]}, status=status.HTTP_400_BAD_REQUEST)
        score = self.get_object()
        if cmd == 'up': score.ordre_up()
        else:           score.ordre_down()
        return Response204()

    @action(detail=True, url_path=r'groupe', methods=['POST']) #, permission_classes=[])
    @transaction.atomic
    @handle_django_errors
    def set_groupe(self, request, pk=None):
        if pk is None: return Response({'no_field_errors': ["no score provided"]}, status=status.HTTP_400_BAD_REQUEST)
        score = self.get_object()
        score.groupe(self.request.data.get('id'))
        score.save() # Permet de forcer la notification pour le score
        return Response204()

    @action(detail=True, methods=['POST'])
    @handle_django_errors
    def register(self, request, pk=None):
        if pk is None: return Response({'no_field_errors': ["no score provided"]}, status=status.HTTP_400_BAD_REQUEST)
        score = self.get_object()
        voie = request.user.profil.voies.get(pk=request.data.get('voie'))
        perf = score.performances.filter(voie__isnull=True).first()
        perf.voie = voie
        perf.save()
        return Response204()

class PerformanceViewSet(DjangoModelViewSet):
    serializer_class = PerformanceSerializer
    queryset = Performance.objects.select_related('voie')

    def get_queryset(self):
        interclub = self.request.interclub
        if not interclub.rencontre: return Performance.objects.none()

        user = self.request.user
        queryset = Performance.objects.select_related('voie').global_filter(rencontre=interclub.rencontre)
        if 'voie' in self.kwargs.keys():
            # Juge: il a besoin du grimpeur et de son club
            queryset = queryset.select_related('score__grimpeur__club').global_filter(voie=self.kwargs.get('voie'))
        return queryset

    def get_serializer_class(self):
        interclub = self.request.interclub
        if interclub.user_is_juge:
            return FullPerformanceSerializer
        return super().get_serializer_class()
