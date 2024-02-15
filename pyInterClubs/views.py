from django.contrib.auth.views import LoginView
from django.http import HttpResponseRedirect, HttpResponse, Http404
from django.contrib.auth import authenticate, login
from django.utils._os import safe_join
from babel_transpiling.utils import get_options, get_file_content, get_transpiler

import os.path
from pathlib import Path

from core.models import Club, Grimpeur, Niveau
from .forms import TokenAuthenticationForm


class ClubAuthenticationView(LoginView):
    template_name = 'auth_club.html'
    authentication_form = TokenAuthenticationForm

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        if self.request.method == "GET":
            kwargs.update({ "data": self.request.GET })
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

class NiveauAutocomplete(autocomplete.Select2QuerySetView):
    def get_queryset(self):
        qs = self.request.interclub.niveaux
        if self.q:
            qs = qs.filter(Nom__contains=self.q)
        # Ordonner le résultat dans l'ordre alphabétique
        return qs


options = get_options()
transpiler = get_transpiler(options)

def serve_react(request, path, document_root=None):
    path = Path(safe_join(document_root, path))
    if not path: raise Http404(f"path does not exists")

    result = transpiler.call('Babel.transform', get_file_content(path), options['options'])
    _, file_suffix = os.path.splitext(path)
    return HttpResponse(content=result['code'], content_type=options['mimetypes'][file_suffix])
