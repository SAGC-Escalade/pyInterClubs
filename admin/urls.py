from django.urls import path, include
from django.views.generic import TemplateView

from .views import *

app_name = 'rencontre'

urlpatterns = [
    path('clubs', ClubQRCodesView.as_view(), name='qrcode-clubs'),
    path('', RencontreSelectionView.as_view(), name='select'),
    path('create', RencontreCreateView.as_view(), name='create'),
    path('<int:pk>/delete', RencontreDeleteView.as_view(), name='delete'),
]
