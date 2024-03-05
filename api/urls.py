from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *
__all__ = ('ClubViewSet', 'RencontreViewSet', 'NiveauxViewSet', 'GrimpeurViewSet', 'EquipeViewSet', 'ScoreViewSet')

router = DefaultRouter()
router.register('clubs', ClubViewSet, 'club')
router.register('niveaux', NiveauViewSet, 'niveau')
router.register('grimpeurs', GrimpeurViewSet, 'grimpeur')
router.register('equipes', EquipeViewSet, 'equipe')
router.register('scores', ScoreViewSet, 'score')
router.register('perfs', PerformanceViewSet, 'perf')

urlpatterns = [
    path('', include(router.urls)),
]
