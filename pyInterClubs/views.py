from django.contrib.auth.views import LoginView
from django.http import HttpResponseRedirect, HttpResponse, Http404
from django.contrib.auth import authenticate, login
from django.utils._os import safe_join
from django.apps import apps
from django.conf import settings

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


options = get_options()
transpiler = get_transpiler(options)

def serve_react(request, path, document_root=None):
    def compile(path):
        result = transpiler.call('Babel.transform', get_file_content(path), options['options'])
        _, file_suffix = os.path.splitext(path)
        return HttpResponse(content=result['code'], content_type=options['mimetypes'][file_suffix])

    if document_root is None: document_root = getattr(settings, 'REACT_URL', 'react')
    for app in apps.get_app_configs():
        fullpath = Path(safe_join(app.path, document_root, path))
        if fullpath.is_file(): return compile(fullpath)
    raise Http404(f"{path} does not exists")
