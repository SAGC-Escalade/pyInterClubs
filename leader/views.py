from django.views.generic import DetailView, ListView, FormView
#from django.views.generic.detail import SingleObjectMixin, SingleObjectTemplateResponseMixin
from django.views.generic.edit import CreateView, UpdateView # BaseFormView, FormMixin, ProcessFormView
from django.forms.models import inlineformset_factory
from django.urls import reverse_lazy
from dal import autocomplete

from core.models import Equipe, Score
from admin.models import Config
from .forms import *

class SelfRedirectedViewMixin:
    def form_valid(self, form):
        self.object = form.save()
        return self.render_to_response(self.get_context_data(form=form))

class HTMXCreateView(SelfRedirectedViewMixin, CreateView): pass
class HTMXUpdateView(SelfRedirectedViewMixin, UpdateView): pass


class EquipeCreateView(CreateView):
    model = Equipe
    form_class = EquipeCreateForm
    template_name = 'leader/add_equipe.html'

    def get_initial(self):
        return self.request.interclub.get_initial(super().get_initial())


class EquipeUpdateView(HTMXUpdateView):
    model = Equipe
    fields = ['Numero']
    template_name = 'leader/edit_equipe.html'


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


class ScoreUpdateView(HTMXUpdateView):
    model = Score
    form_class = ScoreUpdateForm
    template_name = 'leader/edit_score.html'


class ScoreHeaderView(DetailView):
    model = Score
    template_name = "leader/p_hdrScore.html"
