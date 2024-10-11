from django.urls import path, include
from django.views.generic import TemplateView

from .views import *

app_name = 'rencontre'

urlpatterns = [
    path('clubs', ClubQRCodesView.as_view(), name='qrcode-clubs'),
    path('resultats', TemplateView.as_view(template_name="admin/resultats.html"), name='resultats'),
    path('', RencontreSelectionView.as_view(), name='select'),
    path('create', RencontreCreateView.as_view(), name='create'),
    path('<int:pk>/delete', RencontreDeleteView.as_view(), name='delete'),
    path('<int:pk>/start', RencontreStartView.as_view(), name='start'),
    path('<int:pk>/stop', RencontreStopView.as_view(), name='stop'),
    path('<int:pk>/report', RencontreReportView.as_view(), name='report'),
]
