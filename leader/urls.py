from django.urls import path

from .views import *

urlpatterns = [
    path('list', ListEquipesView.as_view(), name='list'),
    path('add', EquipeCreateView.as_view(), name='add'),
    path('<int:pk>', EquipeDetailView.as_view(), name='detail'),
    path('<int:pk>/edit', EquipeUpdateView.as_view(), name='edit'),
]
