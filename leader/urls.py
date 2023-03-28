from django.urls import path
from django.views.generic import TemplateView

from .views import *

urlpatterns = [
    # path('list', ListEquipesView.as_view(), name='list'),
    path('list', TemplateView.as_view(template_name="leader/list_equipes.html"), name='list-equipes'),
    path('add', EquipeCreateView.as_view(), name='add'),
    path('<int:pk>', EquipeUpdateView.as_view(), name='edit'),
    path('<int:pk>/form', EquipeUpdateView.as_view(template_name='leader/p_frmEquipe.html'), name='form'),
    # path('<int:pk>/edit', EquipeUpdateView.as_view(), name='edit'),
    path('<int:id_Equipe>/add', AddScoreView.as_view(), name='add-score'),
    path('<int:id_Equipe>/<int:pk>/form', ScoreUpdateView.as_view(), name='edit-score'),
    path('<int:id_Equipe>/<int:pk>/hdr', ScoreHeaderView.as_view(), name='hdr-score'),
]
