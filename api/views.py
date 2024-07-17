from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q

from core.models import *
from .serializers import *

__all__ = ('ClubViewSet', 'RencontreViewSet', 'VoieViewSet', 'GrimpeurViewSet', 'EquipeViewSet', 'ScoreViewSet', 'PerformanceViewSet')


def Response400(data):
    return Response(data, status=status.HTTP_400_BAD_REQUEST)
def Response204():
    return Response(status=status.HTTP_204_NO_CONTENT)


class ClubViewSet(viewsets.ModelViewSet):
    serializer_class = ClubSerializer

    def get_queryset(self):
        queryset = Club.objects.all()
        filter = self.request.query_params.get('q')
        if filter: queryset = queryset.filter(nom__icontains=filter)
        return queryset

class VoieViewSet(viewsets.ModelViewSet):
    serializer_class = VoieSerializer
    queryset = Voie.objects.all()

class GrimpeurViewSet(viewsets.ModelViewSet):
    serializer_class = GrimpeurSerializer

    def get_queryset(self):
        if hasattr(self.request, 'interclub'):
            queryset = self.request.interclub.grimpeurs
        else:
            queryset = Grimpeur.objects.all()

        filter = self.request.query_params.get('q')
        if filter:
            queryset = queryset.filter(
                Q(nom__icontains=filter) |
                Q(prenom__icontains=filter)
            )
        return queryset.order_by('nom', 'prenom')


class RencontreViewSet(viewsets.ModelViewSet):
    serializer_class = RencontreSerializer
    queryset = Rencontre.objects.all()

class EquipeViewSet(viewsets.ModelViewSet):
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


class ScoreViewSet(viewsets.ModelViewSet):
    serializer_class = ScoreSerializer
    queryset = Score.objects.all()

    def destroy(self, request, pk=None):
        score = self.get_object()
        equipe = score.equipe
        response = super().destroy(request, pk)
        EquipeSerializer(equipe).notify()
        return response
    
    @action(detail=True, url_path=r'ordre/(?P<cmd>\w+)') #, permission_classes=[])
    def set_ordre(self, request, pk=None, cmd=None):
        if not cmd in ('up', 'down'): return Response({'no_field_errors': ["command not found"]}, status=status.HTTP_400_BAD_REQUEST)
        if pk is None: return Response({'no_field_errors': ["no score provided"]}, status=status.HTTP_400_BAD_REQUEST)
        score = self.get_object()
        if cmd == 'up': score.ordre_up()
        else:           score.ordre_down()
        EquipeSerializer(score.equipe).notify()
        return Response204()


class PerformanceViewSet(viewsets.ModelViewSet):
    serializer_class = PerformanceSerializer
    queryset = Performance.objects.all()
