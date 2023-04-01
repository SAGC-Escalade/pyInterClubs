from django.views.generic import DetailView, ListView, FormView
from django.http import Http404
#from django.views.generic.detail import SingleObjectMixin, SingleObjectTemplateResponseMixin
from django.views.generic.edit import CreateView, UpdateView # BaseFormView, FormMixin, ProcessFormView
from django.forms.models import inlineformset_factory
from django.urls import reverse_lazy
from dal import autocomplete
from datetime import timedelta

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
    template_name = 'partials/p_frmScoreField.html'
    form_class_map = {
        'groupe': ScoreUpdateGroupeForm,
        'clubpreteur': ScoreUpdateClubPreteurForm,
        'bloc1': ScoreUpdateBloc1Form,
        'bloc2': ScoreUpdateBloc2Form,
        'voie1': ScoreUpdateVoie1Form,
        'voie2': ScoreUpdateVoie2Form,
        'voie3': ScoreUpdateVoie3Form,
        'voie4': ScoreUpdateVoie4Form,
        'vitesse': ScoreUpdateVitesseForm,
    }

    def get_form_class(self):
        return self.form_class_map.get(self.kwargs.get('field'))

    def get_context_data(self, **kwargs):
        kwargs = super().get_context_data(**kwargs)
        field = self.kwargs.get('field')
        kwargs.update({'field_type': field})
        form = kwargs['form']

        if   field is None: raise Http404
        elif field == 'groupe':      kwargs.update({'valid': self.object.IDVoie1 != None,                               'points': None,                   'label': form['IDVoie1']})
        elif field == 'clubpreteur': kwargs.update({'valid': None,                                                      'points': None,                   'label': form['ClubPreteur']})
        elif field == 'bloc1':       kwargs.update({'valid': self.object.IDBloc1 != None and self.object.Bloc1 != None, 'points': self.object.PtsBloc1,   'label': form['Bloc1']})
        elif field == 'bloc2':       kwargs.update({'valid': self.object.IDBloc2 != None and self.object.Bloc2 != None, 'points': self.object.PtsBloc2,   'label': form['Bloc2']})
        elif field == 'voie1':       kwargs.update({'valid': self.object.IDVoie1 != None and self.object.Voie1 != None, 'points': self.object.PtsVoie1,   'label': form['Voie1']})
        elif field == 'voie2':       kwargs.update({'valid': self.object.IDVoie2 != None and self.object.Voie2 != None, 'points': self.object.PtsVoie2,   'label': form['Voie2']})
        elif field == 'voie3':       kwargs.update({'valid': self.object.IDVoie3 != None and self.object.Voie3 != None, 'points': self.object.PtsVoie3,   'label': form['Voie3']})
        elif field == 'voie4':       kwargs.update({'valid': self.object.IDVoie4 != None and self.object.Voie4 != None, 'points': self.object.PtsVoie4,   'label': form['Voie4']})
        elif field == 'vitesse':     kwargs.update({'valid': self.object.Vitesse != timedelta(),                        'points': self.object.PtsVitesse, 'label': form['Vitesse']})

        return kwargs
