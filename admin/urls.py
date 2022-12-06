from django.urls import path, include

from .views import *

urlpatterns = [
    path('clubs', ClubQRCodesView.as_view(), name='qrcode-clubs'),
]

