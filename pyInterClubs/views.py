from django.contrib.auth.views import LoginView
from django.http import HttpResponseRedirect, HttpResponse, Http404
from django.contrib.auth import authenticate, login
from django.utils._os import safe_join
from django.apps import apps
from django.conf import settings

from babel_transpiling.utils import get_options, get_file_content, get_transpiler

import os.path
from pathlib import Path

from core.models import *
from .forms import TokenAuthenticationForm

# Classe mixin d'ajout de log pour l'optimisation des requêtes SQL
# Elle est conservée (inutilisée) dans le code pour faire du debug
from django.db import connection
import logging
logger = logging.getLogger(__name__)
class SQLLoggingMixin:
    @staticmethod
    def _log_sql_queries():
        total_time = 0.0
        for query in connection.queries:
            sql = query['sql']
            time_taken = float(query['time'])
            total_time += time_taken

            # Filtrer les requêtes (ex: requêtes > 100ms)
            logger.debug(f"{sql}")
            if time_taken > 0.1:
                logger.warning(f"Long SQL query ({time_taken} ms): {sql}")

        logger.info(f"# Total SQL time for this request: {total_time} ms")

    # Surcharge DRF
    def finalize_response(self, request, response, *args, **kwargs):
        self._log_sql_queries()
        return super().finalize_response(request, response, *args, **kwargs)
    # Surcharge Django
    def dispatch(self, request, *args, **kwargs):
        response = super().dispatch(request, *args, **kwargs)
        self._log_sql_queries()
        return response

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


# Workaround permettant de servir du JSX sans précompilation
# L'état de l'art voudrait que le JSX soit précompilé et disponible dans les fichiers statiques du projet
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
