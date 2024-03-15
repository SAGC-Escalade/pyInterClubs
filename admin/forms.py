from django import forms
from django.forms.models import ModelChoiceIterator
from django.core.exceptions import ValidationError
from itertools import groupby
from operator import attrgetter

from core.models import *
from .models import *


class RencontreWidget(forms.RadioSelect):
    option_template_name = "widgets/rencontre-option.html"
    template_name = "widgets/rencontre.html"

class RencontreChoiceIterator(ModelChoiceIterator):
    def __iter__(self):
        if self.field.empty_label is not None:
            yield ("", self.field.empty_label)
        queryset = self.queryset
        # Can't use iterator() when queryset uses prefetch_related()
        if not queryset._prefetch_related_lookups:
            queryset = queryset.iterator()
        for group, objs in groupby(queryset, self.field.group_by):
            yield (self.field.group_label(group), [self.choice(obj) for obj in objs])

class RencontreChoiceField(forms.ModelChoiceField):
    group_by = attrgetter("saison")
    group_label = lambda self,annee: annee
    iterator = RencontreChoiceIterator


class RencontreSelectionForm(forms.Form):
    rencontre = RencontreChoiceField(
        required=True,
        queryset=Rencontre.objects.all().order_by("-saison", "date"),
        empty_label=None,
        to_field_name='id',
        widget=RencontreWidget
    )

    def save(self):
        if not hasattr(self.request.user, 'profil'):
            Profil(user=self.request.user, rencontre=self.instance).save()
        else:
            self.request.user.profil.rencontre = self.instance
            self.request.user.profil.save()
        #Config.set('CURRENT_RENCONTRE', self.cleaned_data['rencontre'].ID)
        #Config.set('CURRENT_CATEGORIE', int(self.cleaned_data['categorie']))
