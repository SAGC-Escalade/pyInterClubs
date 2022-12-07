from django.urls import path, include
from django.views.generic import TemplateView

from .views import *

urlpatterns = [
    path('clubs', ClubQRCodesView.as_view(), name='qrcode-clubs'),
    path('', RencontresListView.as_view(), name='rencontres'),
]
