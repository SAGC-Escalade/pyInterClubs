from rest_framework import viewsets

from core.models import *
from .serializers import *

__all__ = ('ClubViewSet', 'SaisonViewSet', 'RencontreViewSet', 'NiveauViewSet', 'GrimpeurViewSet', 'EquipeViewSet', 'ScoreViewSet')


class ClubViewSet(viewsets.ModelViewSet):
    serializer_class = ClubSerializer
    queryset = Club.objects.all()

class SaisonViewSet(viewsets.ModelViewSet):
    serializer_class = SaisonSerializer
    queryset = Saison.objects.all()

class RencontreViewSet(viewsets.ModelViewSet):
    serializer_class = RencontreSerializer
    queryset = Rencontre.objects.all()


class NiveauViewSet(viewsets.ModelViewSet):
    serializer_class = NiveauSerializer
    def get_queryset(self):
        return self.request.interclub.niveaux

class GrimpeurViewSet(viewsets.ModelViewSet):
    serializer_class = GrimpeurSerializerDepth1
    def get_queryset(self):
        return self.request.interclub.grimpeurs

class EquipeViewSet(viewsets.ModelViewSet):
    serializer_class = EquipeSerializer
    def get_queryset(self):
        return self.request.interclub.equipes

class ScoreViewSet(viewsets.ModelViewSet):
    serializer_class = ScoreSerializer
    def get_queryset(self):
        return self.request.interclub.scores
