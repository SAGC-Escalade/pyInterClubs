from django import forms
from django.core.exceptions import ValidationError

from core.models import Rencontre, Categorie
from .models import Config


class MancheSelectionForm(forms.Form):
    rencontre = forms.ModelChoiceField(required=True, queryset=Rencontre.objects.all(), empty_label=None, to_field_name='ID')
    categorie = forms.ChoiceField(required=True, choices=Categorie.choices)

    def save(self):
        Config.set(Config.CURRENT_RENCONTRE, self.cleaned_data['rencontre'].ID)
        Config.set(Config.CURRENT_CATEGORIE, self.cleaned_data['categorie'])
