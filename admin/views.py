from django.views.generic.list import ListView
from django.db.models.functions import MD5

from core.models import Club


class ClubQRCodesView(ListView):
    model = Club
    template_name = 'qrcode_club.html'

    def get_queryset(self):
        query = super().get_queryset().annotate(md5=MD5('Nom'))
        print(query)
        return query