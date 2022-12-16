from django.contrib.auth.views import LoginView
from django.http import HttpResponseRedirect
from django.contrib.auth import authenticate, login

from core.models import Club
from .forms import TokenAuthenticationForm


class ClubAuthenticationView(LoginView):
    template_name = 'auth_club.html'
    authentication_form = TokenAuthenticationForm

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        if self.request.method == "GET":
            kwargs.update({ "data": self.request.GET })
        print(kwargs)
        return kwargs

    def get(self, *args, **kwargs):
        return self.post(*args, **kwargs)
