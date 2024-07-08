from django.views.generic import DetailView, CreateView #, ListView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy

from core.models import *
from .forms import *


class EquipeUpdateView(DetailView):
    model = Equipe
    template_name = 'leader/equipe.html'

    def _get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.setdefault('rencontre', RencontreSerializer(self.object.rencontre).data)
        return context

class EquipeCreateView(LoginRequiredMixin, CreateView):
    success_url = 'leader:edit'
    form_class = EquipeCreateForm
    template_name = 'leader/create.html'

    def get_initial(self):
        initial = super().get_initial()
        # initial.setdefault('rencontre', self.request.interclub.rencontre)
        user = self.request.user
        if user.profil and hasattr(user.profil, 'club'):
            initial.setdefault('club', user.profil.club)
            initial.setdefault('numero', user.profil.rencontre.equipes.filter(club=user.profil.club).count()+1)
        return initial

    def get_success_url(self):
        return reverse_lazy(self.success_url, args=[self.object.id])

    def form_valid(self, form):
        rencontre = self.request.interclub.rencontre
        self.object = form.save(commit=False)
        self.object.rencontre = rencontre
        self.object.numero = rencontre.equipes.filter(club=self.object.club).count() + 1
        self.object.save()
        return super().form_valid(form)

    def get(self, *args, **kwargs):
        return self.post(*args, **kwargs)
