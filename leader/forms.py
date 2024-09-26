from django import forms
from django.utils.datastructures import MultiValueDict
from django.core.exceptions import ValidationError
from django_bootstrap5.widgets import RadioSelectButtonGroup

from core.models import *


class ClubSelectWidget(forms.RadioSelect):
    template_name = 'widgets/club.html'
    option_template_name = 'widgets/club-option.html'


class EquipeCreateForm(forms.ModelForm):
    class Meta:
        model = Equipe
        fields = ['club']
        widgets = {
            'club': ClubSelectWidget,
        }

    def __init__(self, *args, **kwargs):
        self.rencontre = kwargs.pop('rencontre', None)
        initial = kwargs.get('initial', {})
        data = kwargs.pop('data', None) or (args.pop(0) if args else {})
        data = MultiValueDict({**{k:[v] for k,v in initial.items()}, **data})
        super().__init__(data, *args, **kwargs)

    def clean(self):
        if not self.rencontre:
            raise ValidationError("Attendez que l'administrateur démarre une rencontre.")
