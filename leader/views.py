from django.views.generic import DetailView, CreateView #, ListView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy

from core.models import *
from admin.middleware import WithRencontreRequiredMixin
from .forms import *


class EquipeUpdateView(LoginRequiredMixin, WithRencontreRequiredMixin, DetailView):
    model = Equipe
    template_name = 'leader/equipe.html'


class EquipeCreateView(LoginRequiredMixin, WithRencontreRequiredMixin, CreateView):
    success_url = 'leader:edit'
    form_class = EquipeCreateForm
    template_name = 'leader/create.html'

    def get_initial(self):
        initial = super().get_initial()
        user = self.request.user
        if user.profil and hasattr(user.profil, 'club'):
            initial.setdefault('club', user.profil.club)
        return initial

    def get_success_url(self):
        return reverse_lazy(self.success_url, args=[self.object.id])

    def form_valid(self, form):
        self.object = form.save(commit=False)
        rencontre = Rencontre.objects.prefetch_related('equipes').get(pk=self.request.interclub.rencontre)
        self.object.rencontre = rencontre
        numeros = [e.numero for e in rencontre.equipes.all() if e.club_id == self.object.club_id]
        self.object.numero = min([i for i in range(1,max(numeros)+2) if not i in numeros]) if len(numeros) else 1
        self.object.save()
        return super().form_valid(form)

    def get(self, *args, **kwargs):
        return self.post(*args, **kwargs)
