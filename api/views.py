from rest_framework import viewsets

from core.models import *
from .serializers import *

__all__ = ('ClubViewSet', 'RencontreViewSet', 'NiveauViewSet', 'GrimpeurViewSet', 'EquipeViewSet', 'ScoreViewSet', 'PerformanceViewSet')


class ClubViewSet(viewsets.ModelViewSet):
    serializer_class = ClubSerializer
    queryset = Club.objects.all()

class NiveauViewSet(viewsets.ModelViewSet):
    serializer_class = NiveauSerializer
    queryset = Niveau.objects.all()

class GrimpeurViewSet(viewsets.ModelViewSet):
    serializer_class = GrimpeurSerializer
    queryset = Grimpeur.objects.all()


class RencontreViewSet(viewsets.ModelViewSet):
    serializer_class = RencontreSerializer
    queryset = Rencontre.objects.all()

class EquipeViewSet(viewsets.ModelViewSet):
    serializer_class = EquipeSerializer
    queryset = Equipe.objects.all()

class ScoreViewSet(viewsets.ModelViewSet):
    serializer_class = ScoreSerializer
    queryset = Score.objects.all()

class PerformanceViewSet(viewsets.ModelViewSet):
    serializers_class = PerformanceSerializer
    queryset = Performance.objects.all()
