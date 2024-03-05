from django.views.generic import DetailView, ListView, FormView
from django.http import Http404
#from django.views.generic.detail import SingleObjectMixin, SingleObjectTemplateResponseMixin
from django.views.generic.edit import CreateView, UpdateView # BaseFormView, FormMixin, ProcessFormView
from django.forms.models import inlineformset_factory
from django.urls import reverse_lazy
from dal import autocomplete
from datetime import timedelta
from django_eventstream import send_event

from core.models import Equipe, Score
from admin.models import Config


class SelfRedirectedViewMixin:
    def form_valid(self, form):
        self.object = form.save()
        return self.render_to_response(self.get_context_data(form=form))

class HTMXCreateView(SelfRedirectedViewMixin, CreateView): pass
class HTMXUpdateView(SelfRedirectedViewMixin, UpdateView):
    def form_valid(self, form):
        self.object = form.save()
        send_event('test', 'message', self.request.path)
        return self.render_to_response(self.get_context_data(form=form))


class EquipeUpdateView(HTMXUpdateView):
    model = Equipe
    fields = ['numero']
    template_name = 'leader/edit_equipe.html'
