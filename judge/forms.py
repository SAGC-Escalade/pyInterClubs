from django import forms
#from django.forms.models import ModelChoiceIterator
#from django.core.exceptions import ValidationError
#from itertools import groupby
#from operator import attrgetter

import hashlib
from datetime import datetime

from core.models import *
from admin.models import *
from admin.forms import VoiesSelectWidget


class VoiesSelectWidget(forms.SelectMultiple):
    option_template_name = "widgets/voierencontre-option.html"


class JugeCreationForm(forms.ModelForm):
    class Meta:
        model = Juge
        fields = ['rencontre_voies', 'nom']

    rencontre_voies = forms.ModelMultipleChoiceField(
        required=True,
        label="Voies à juger",
        queryset=RencontreVoie.objects.none(),
        to_field_name='id',
        widget=VoiesSelectWidget(attrs={'size': '16'})
    )
    nom = forms.CharField(label="Nom du juge", max_length=150)

    def __init__(self, *args, **kwargs):
        # On récupère la rencontre depuis les kwargs
        self.rencontre = kwargs.pop('rencontre', None)
        super().__init__(*args, **kwargs)
        if self.rencontre:
            self.fields['rencontre_voies'].queryset = RencontreVoie.objects \
                .global_filter(rencontre=self.rencontre).with_related() \
                .order_by__nom().order_by("voie__categorie", "voie__type")

    def clean_rencontre_voies(self):
        voies = self.cleaned_data.get('rencontre_voies')
        if voies is None: raise ValidationError("Vous devez sélectionner une voie")
        return [v.voie for v in voies]

    def save(self, commit=True):
        rencontre = self.rencontre
        nom = self.cleaned_data['nom']
        voies = self.cleaned_data['rencontre_voies']

        token_input = f"{datetime.now()}:{rencontre}:" + ":".join(map(str, voies))
        token = hashlib.md5(token_input.encode()).hexdigest()

        # Création du User
        user = User.objects.create(username=token, first_name=nom, last_name=", ".join([str(voie) for voie in voies]))
        #user.set_unusable_password()  # Empêche l'utilisateur de se connecter via mot de passe
        user.save()

        # Associer cet utilisateur au profil de juge
        juge = super().save(commit=False)
        juge.user = user
        juge.rencontre = Rencontre.objects.get(pk=rencontre)
        juge.save()
        
        # Mettre à jour la relation entre le juge et les voies sélectionnées
        voies = [v.id for v in voies]
        RencontreVoie.objects.filter(rencontre=rencontre, voie__in=voies).update(juge=juge)

        return juge
