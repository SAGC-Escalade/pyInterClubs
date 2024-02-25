
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *
__all__ = ('ClubViewSet', 'SaisonViewSet', 'RencontreViewSet', 'NiveauxViewSet', 'GrimpeurViewSet', 'EquipeViewSet', 'ScoreViewSet')

router = DefaultRouter()
router.register('clubs', ClubViewSet, 'club')
#router.register('saisons', SaisonViewSet, 'saison')
#router.register('rencontres', RencontreViewSet, 'rencontre')
router.register('niveaux', NiveauViewSet, 'niveau')
router.register('grimpeurs', GrimpeurViewSet, 'grimpeur')
router.register('equipes', EquipeViewSet, 'equipe')
router.register('scores', ScoreViewSet, 'score')

urlpatterns = [
    path('', include(router.urls)),
]
