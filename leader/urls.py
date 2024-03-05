from django.urls import path
from django.views.generic import TemplateView, UpdateView, DetailView

from .views import *
from core.models import Score

urlpatterns = [
    path('list', TemplateView.as_view(template_name="leader/list_equipes.html"), name='list-equipes'),
    path('<int:pk>', EquipeUpdateView.as_view(), name='edit'),
]
