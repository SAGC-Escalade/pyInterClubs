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


EquipiersFormSet = inlineformset_factory(Equipe, Score, max_num=8, extra=1,
    fields=['Grimpeur', 'ClubPreteur', 'Bloc1', 'Bloc2', 'Voie1', 'Voie2', 'Voie3', 'Voie4', 'Vitesse', 'PtsVitesse', 'Points'],
    widgets={
        'Grimpeur': autocomplete.ModelSelect2(url='grimpeur-autocomplete')
    },
    labels={'Grimpeur': 'Mon grimpeur'}
)

class EquipeCreateView(CreateView):
    model = Equipe
    fields = ['Club', 'Numero']
    template_name = 'leader/equipe.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.request.POST:
            context['equipiers'] = EquipiersFormSet(self.request.POST)
        else:
            context['equipiers'] = EquipiersFormSet()
        return context

    def form_valid(self, form):
        context = self.get_context_data()
        equipiers = context['equipiers']
        if equipiers.is_valid():
            self.object = form.save()
            equipiers.instance = self.object
            equipiers.save()
        return super().form_valid(form)

class EquipeUpdateView(UpdateView):
    model = Equipe
    fields = ['Club', 'Numero']
    template_name = 'leader/equipe.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.request.POST:
            context['equipiers'] = EquipiersFormSet(self.request.POST, instance=self.object)
        else:
            context['equipiers'] = EquipiersFormSet(instance=self.object)
        return context

    def form_valid(self, form):
        context = self.get_context_data()
        equipiers = context['equipiers']
        if equipiers.is_valid():
            self.object = form.save()
            equipiers.instance = self.object
            equipiers.save()
        return super().form_valid(form)


#class EquipeDetailView(SingleObjectTemplateResponseMixin, FormMixin, SingleObjectMixin, ProcessFormView):
#    model = Equipe
#    template_name = 'leader/equipe.html'

#    def get_form_class(self):
#        return modelformset_factory(Score, exclude=('Equipe', 'ID', 'Ordre'), max_num=8, extra=1)

#    def get(self, request, *args, **kwargs):
#        self.object = self.get_object()
#        return super().get(request, *args, **kwargs)

#    def post(self, request, *args, **kwargs):
#        self.object = self.get_object()
#        return super().post(request, *args, **kwargs)
