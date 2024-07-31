from django.views.generic import DetailView, CreateView #, ListView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.core.exceptions import BadRequest, ValidationError, ImproperlyConfigured

from core.models import *
from .forms import *

class WithRencontreMixin:
    # Classe permettant de s'assurer que la rencontre est sélectionnée au niveau du middleware
    # Si ce n'est pas le cas, une exception ValidationError sera levée.
    def dispatch(self, request, *args, **kwargs):
        if not hasattr(request, 'interclub'):
            raise ImproperlyConfigured("Le middleware 'interclub' n'est pas trouvé, peut-être n'a-t-il pas été configuré correctement.")
        if not request.interclub or not request.interclub.rencontre:
            raise ValidationError("L'administrateur n'a pas démarré de rencontre.")
        return super().dispatch(request, *args, **kwargs)



class EquipeUpdateView(LoginRequiredMixin, WithRencontreMixin, DetailView):
    model = Equipe
    template_name = 'leader/equipe.html'

    def _get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.setdefault('rencontre', RencontreSerializer(self.object.rencontre).data)
        return context

class EquipeCreateView(LoginRequiredMixin, WithRencontreMixin, CreateView):
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
        self.object.rencontre = self.request.interclub.rencontre
        numeros = self.request.interclub.equipes.filter(club=self.object.club).values_list('numero', flat=True)
        self.object.numero = min([i for i in range(1,max(numeros)+1) if not i in numeros])
        self.object.save()
        return super().form_valid(form)

    def get(self, *args, **kwargs):
        return self.post(*args, **kwargs)
