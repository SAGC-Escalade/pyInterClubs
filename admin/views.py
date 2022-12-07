from django.views.generic.list import ListView
from django.contrib.auth.mixins import UserPassesTestMixin
from django.db.models.functions import MD5

from core.models import Club, Saison


class SuperUserRequiredMixin(UserPassesTestMixin):
    def test_func(self):
        return self.request.user.is_superuser


class ClubQRCodesView(SuperUserRequiredMixin, ListView):
    model = Club
    template_name = 'admin/qrcode_club.html'

    def get_queryset(self):
        return super().get_queryset().annotate(md5=MD5('Nom'))


class RencontresListView(SuperUserRequiredMixin, ListView):
    model = Saison
    template_name = 'admin/rencontres-list.html'
