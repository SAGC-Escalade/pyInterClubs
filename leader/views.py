from django.views.generic import DetailView, ListView, FormView
#from django.views.generic.detail import SingleObjectMixin, SingleObjectTemplateResponseMixin
from django.views.generic.edit import CreateView, UpdateView # BaseFormView, FormMixin, ProcessFormView
from django.forms.models import inlineformset_factory
from dal import autocomplete

from core.models import Equipe, Score
from admin.models import Config
from .forms import *


class EquipeCreateView(CreateView):
    model = Equipe
    form_class = EquipeCreateForm
    template_name = 'leader/add_equipe.html'

    def form_valid(self, form):
        raise RuntimeError("Interdiction de continuer pour le moment")


class EquipeUpdateView(UpdateView):
    model = Equipe
    fields = ['Numero']
    template_name = 'leader/edit_equipe.html'

    def form_valid(self, form):
        raise RuntimeError("Interdiction de continuer pour le moment")


class AddScoreView(CreateView):
    model = Score
    form_class = ScoreCreateForm
    template_name = 'leader/add_score.html'

    def form_valid(self, form):
        raise RuntimeError("Interdiction de continuer pour le moment")

    def get_initial(self):
        kws = super().get_initial()
        kws['Equipe'] = Equipe.objects.get(pk=self.kwargs['id_Equipe'])
        return kws
