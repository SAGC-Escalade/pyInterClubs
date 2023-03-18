from django.contrib.auth.views import LoginView
from django.http import HttpResponseRedirect
from django.contrib.auth import authenticate, login

from core.models import Club, Grimpeur
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


from dal import autocomplete

class GrimpeurAutocomplete(autocomplete.Select2QuerySetView):
    def get_queryset(self):
        qs = Grimpeur.objects.all()
        if self.q:
            qs = qs.filter(Nom__contains=self.q)
        # Ordonner le résultat dans l'ordre alphabétique
        return qs

class ClubAutocomplete(autocomplete.Select2QuerySetView):
    def get_queryset(self):
        qs = Club.objects.all()
        if self.q:
            qs = qs.filter(Nom__contains=self.q)
        # Ordonner le résultat dans l'ordre alphabétique
        return qs
