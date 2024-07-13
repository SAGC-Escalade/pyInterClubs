from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from core.models import *
from .serializers import *

__all__ = ('ClubViewSet', 'RencontreViewSet', 'VoieViewSet', 'GrimpeurViewSet', 'EquipeViewSet', 'ScoreViewSet', 'PerformanceViewSet')


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
    queryset = Grimpeur.objects.all()


class RencontreViewSet(viewsets.ModelViewSet):
    serializer_class = RencontreSerializer
    queryset = Rencontre.objects.all()

class EquipeViewSet(viewsets.ModelViewSet):
    serializer_class = EquipeSerializer
    def get_queryset(self):
        return self.request.interclub.equipes

    @action(detail=True, permission_classes=[])
    def add(self, request, pk=None):
        equipe = get_object_or_404(Equipe, pk=pk)
        equipe.membres.create()
        #return Response({'non_field_errors': ["Not Implemented Yet"]}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return EquipeSerializer(equipe).data
        #request.user.equipes.create()

class ScoreViewSet(viewsets.ModelViewSet):
    serializer_class = ScoreSerializer
    queryset = Score.objects.all()
    
    @action(detail=True, url_path=r'ordre/(?P<cmd>\w+)') #, permission_classes=[])
    def set_ordre(self, request, pk=None, cmd=None):
        if not cmd in ('up', 'down'): return Response({'no_field_errors': ["command not found"]}, status=status.HTTP_400_BAD_REQUEST)
        if pk is None: return Response({'no_field_errors': ["no score provided"]}, status=status.HTTP_400_BAD_REQUEST)
        score = self.get_object()
        if cmd == 'up': score.ordre_up()
        else:           score.ordre_down()
        send_event('events', reverse("equipe-detail", args=[score.equipe_id]), EquipeSerializer(score.equipe).data)
        return Response()


class PerformanceViewSet(viewsets.ModelViewSet):
    serializer_class = PerformanceSerializer
    queryset = Performance.objects.all()
