from django import forms
from django.db.models import Prefetch, Q, F, Count, Sum
from django.forms.models import ModelChoiceIterator
from django.core.exceptions import ValidationError
from itertools import groupby
from operator import attrgetter

from core.models import *
from .models import *


class RencontreWidget(forms.RadioSelect):
    option_template_name = "widgets/rencontre-option.html"
    template_name = "widgets/rencontre.html"
    class Media:
        css = {
            'all': ['css/collapsible.css'],
        }

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
        queryset=Rencontre.objects \
            .annotate(
                equipes_count=Count('equipes', distinct=True),
                grimpeurs_count=Count('equipes__membres', distinct=True),
                users_count=Count('profil__user', filter=Q(profil__user__is_superuser=False), distinct=True)
            ) \
            .select_related('club') \
            .order_by("-saison", "-date"),
        empty_label=None,
        to_field_name='id',
        widget=RencontreWidget
    )


class VoiesSelectWidget(forms.SelectMultiple):
    option_template_name = "widgets/voies-option.html"

class RencontreCreateForm(forms.ModelForm):
    class Meta:
        model = Rencontre
        fields = ('saison', 'date', 'club', 'categorie', 'nbBloc', 'nbDiff', 'nbVitesse', 'voiesReutilisables', 'voiesGroupees', 'voies')
        labels = {
            'club': "Club d'accueil",
            'categorie': 'Catégorie',
            'nbBloc': 'Nombre de blocs',
            'nbDiff': 'Nombre de voies en diff',
            'nbVitesse': 'Nombre de voie de vitesse',
            'voiesReutilisables': 'Voies réutilisables',
            'voiesGroupees': 'Voies groupées',
        }
        help_texts = {
            #'nbBloc': 'Indiquez le nombre de voies de bloc à réaliser.',
            #'nbDiff': 'Indiquez le nombre de voies de difficulté à réaliser.',
            'nbVitesse': 'Indiquez le nombre de voies à réaliser.',
            'voiesReutilisables': 'Indiquez si les voies de difficulté sont réalisables plusieurs fois.',
            'voiesGroupees': 'Indiquez si le compétiteur sélectionne un groupe globale ou ses voies de difficulté individuellement.',
            'voies': 'Sélectionnez les voies réalisables pour la rencontre',
        }

    voies = forms.ModelMultipleChoiceField(
        required=False,
        queryset=Voie.objects.actifs().order_by__nom().order_by("categorie", "type"),
        to_field_name='id',
        widget=VoiesSelectWidget(attrs={'size':'16'}),
    )

    def clean_voies(self):
        # Je traite le required=True ici pour que l'erreur soit visible sur le formulaire
        data = self.cleaned_data["voies"]
        if len(data) == 0: raise ValidationError('Sélectionnez les voies de la rencontre.')
        return data

    def clean(self):
        cleaned_data = super().clean()
        categorie = cleaned_data.get('categorie')
        voies = cleaned_data.get('voies')
        if voies and any(v.categorie != categorie for v in voies):
            raise ValidationError({'voies': 'Sélectionnez uniquement les voies de la catégorie concernée.'})

class ConfirmationForm(forms.Form):
    pass
