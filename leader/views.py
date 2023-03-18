from django.views.generic import DetailView, ListView, FormView
#from django.views.generic.detail import SingleObjectMixin, SingleObjectTemplateResponseMixin
from django.views.generic.edit import CreateView, UpdateView # BaseFormView, FormMixin, ProcessFormView
from django.forms.models import inlineformset_factory
from dal import autocomplete

from core.models import Equipe, Score
from admin.models import Config


class ListEquipesView(ListView):
    model = Equipe
    template_name = 'leader/equipes.html'

    def get_context_data(self, **kwargs):
        if 'rencontre' not in kwargs: kwargs['rencontre'] = Config.get(Config.CURRENT_RENCONTRE)
        if 'categorie' not in kwargs: kwargs['categorie'] = Config.get(Config.CURRENT_CATEGORIE)
        return super().get_context_data(**kwargs)


class EquipeDetailView(DetailView):
    model = Equipe
    template_name = 'leader/equipe.html'


from .forms import *


class EquipeCreateView(CreateView):
    model = Equipe
    form_class = EquipeForm
    template_name = 'leader/equipe.html'

    def form_valid(self, form):
        raise RuntimeError("Interdiction de continuer pour le moment")


class EquipeUpdateView(UpdateView):
    model = Equipe
    form_class = EquipeForm
    template_name = 'leader/equipe.html'

    def form_valid(self, form):
        raise RuntimeError("Interdiction de continuer pour le moment")
