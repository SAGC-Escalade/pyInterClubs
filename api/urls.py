from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *
__all__ = ('ClubViewSet', 'RencontreViewSet', 'VoieViewSet', 'GrimpeurViewSet', 'EquipeViewSet', 'ScoreViewSet')

app_name = 'api'

router = DefaultRouter()
router.register('clubs', ClubViewSet, 'club')
router.register('voies', VoieViewSet, 'voie')
router.register('grimpeurs', GrimpeurViewSet, 'grimpeur')

router.register('equipes', EquipeViewSet, 'equipe')
router.register(r'club/(?P<club>\d+)/equipes', EquipeViewSet, 'club-equipe')

router.register('scores', ScoreViewSet, 'score')
router.register(r'club/(?P<club>\d+)/scores', ScoreViewSet, 'club-score')

router.register('perfs', PerformanceViewSet, 'perf')
router.register(r'voie/(?P<voie>\d+)/perfs', PerformanceViewSet, 'voie-perf')

urlpatterns = [
    path('', include(router.urls)),
]
