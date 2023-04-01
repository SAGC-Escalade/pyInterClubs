from django.urls import path
from django.views.generic import TemplateView, UpdateView, DetailView

from .views import *
from core.models import Score

urlpatterns = [
    # path('list', ListEquipesView.as_view(), name='list'),
    path('list', TemplateView.as_view(template_name="leader/list_equipes.html"), name='list-equipes'),
    path('add', EquipeCreateView.as_view(), name='add'),
    path('<int:pk>', EquipeUpdateView.as_view(), name='edit'),
    path('<int:pk>/form', EquipeUpdateView.as_view(template_name='partials/p_frmEquipe.html'), name='form'),
    # path('<int:pk>/edit', EquipeUpdateView.as_view(), name='edit'),
    path('<int:id_Equipe>/add', AddScoreView.as_view(), name='add-score'),
    path('<int:id_Equipe>/<int:pk>/edit', ScoreUpdateView.as_view(), name='edit-score'),

    path('score/<int:pk>/hdr', DetailView.as_view(model = Score, template_name = "partials/p_hdrScore.html"), name='hdr-score'),
    path('score/<int:pk>/edit/<str:field>', ScoreUpdateView.as_view(), name='edit-field'),
]
