from django.views.generic import FormView, CreateView, DeleteView, ListView, TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.db.models import Prefetch
from django.urls import reverse_lazy
from django.http import HttpResponseRedirect

import hashlib
from datetime import datetime

from admin.middleware import WithRencontreRequiredMixin
from core.models import *
from admin.models import *
from .forms import *


class JugeManageView(LoginRequiredMixin, WithRencontreRequiredMixin, ListView):
    template_name = 'judge/manage.html'

    def get_queryset(self):
        rencontre = self.request.interclub.rencontre
        return RencontreVoie.objects.filter(rencontre=rencontre).with_related()


class JugeCreateView(LoginRequiredMixin, WithRencontreRequiredMixin, CreateView):
    model = Juge
    form_class = JugeCreationForm
    template_name = 'judge/create.html'

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['rencontre'] = self.request.interclub.rencontre
        return kwargs

    def get_context_data(self, **kwargs):
        rencontre = self.request.interclub.rencontre
        juges = Juge.objects.prefetch_related('voies').filter(rencontre=rencontre)
        for juge in juges:
            token_input = f"{datetime.now()}:{rencontre}:" + ":".join(map(str, juge.voies.all()))
            juge.token = hashlib.md5(token_input.encode()).hexdigest()

        kwargs['object_list'] = juges
        return super().get_context_data(**kwargs)

    def form_valid(self, form):
        juge = form.save()

        import socket
        ip = socket.gethostbyname(socket.gethostname())
        if not ip or ip == "127.0.0.1": ip = socket.gethostbyname(socket.getfqdn())
        environ = self.request.environ if hasattr(self.request, 'environ') else self.request.META

        context = {
            'object': {
                'message': "Le juge a été assigné avec succès. Utilisez le QR-Code suivant pour y connecter l'appareil",
                'token': juge.user.username,
            },
            'server_ip': ip,
            'environ': environ,
        }
        return self.render_to_response(self.get_context_data(form=form, **context))
