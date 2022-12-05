from django.views.generic.edit import FormView
from django.views.generic.list import ListView
from django.contrib.auth.views import LoginView
from django.http import HttpResponseRedirect
from django.contrib.auth import authenticate, login
from django.db.models.functions import MD5

from core.models import Club
from .forms import TokenAuthenticationForm


class ClubAuthenticationView(LoginView):
    template_name = 'auth_club.html'
    authentication_form = TokenAuthenticationForm

    def form_valid(self, form):
        login(self.request, form.get_user())
        return HttpResponseRedirect(self.get_success_url())

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs["request"] = self.request
        return kwargs


class ClubQRCodesView(ListView):
    model = Club
    template_name = 'qrcode_club.html'

    def get_queryset(self):
        query = super().get_queryset().annotate(md5=MD5('Nom'))
        print(query)
        return query