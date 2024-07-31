from django.urls import path
from django.views.generic import TemplateView, UpdateView, DetailView

from .views import *
from core.models import Score

urlpatterns = [
    path('create', EquipeCreateView.as_view(), name='create'),
    path('<int:pk>', EquipeUpdateView.as_view(), name='edit'),
]
