from django import forms
from core.models import Equipe, Score, Club, Grimpeur

from django.forms.models import inlineformset_factory
from dal import autocomplete


class ModelFormWithFormset(forms.ModelForm):
    formset_class = None

    def __init__(self, *, formset_class=None, data=None, files=None, instance=None, **kwargs):
        super().__init__(data=data, files=files, instance=instance, **kwargs)
        if formset_class is None:
            formset_class = self.formset_class
        self.formset = formset_class(data, files, instance=instance)

    def is_valid(self):
        if super().is_valid():
            return self.formset.is_valid()
        return False

    def save(self, commit=True):
        instance = super().save(commit)
        self.formset.instance = instance
        self.formset.save(commit)


class InlineScoreForm(forms.ModelForm):
    class Meta:
        model   = Score
        # fields  = ['Grimpeur', 'ClubPreteur', 'Bloc1', 'Bloc2', 'Voie1', 'Voie2', 'Voie3', 'Voie4', 'Vitesse', 'PtsVitesse', 'Points']
        fields  = ['Grimpeur', 'ClubPreteur']
        labels  = {
            'ClubPreteur': 'Club prêteur',
        }
        help_texts = {
            'ClubPreteur': "Le grimpeur est un prêt d'un autre club ? Lequel ?",
        }
        widgets = {
            'Grimpeur': autocomplete.ModelSelect2(url='grimpeur-autocomplete'),
            'ClubPreteur': autocomplete.ModelSelect2(url='club-autocomplete'),
        }


class EquipeCreateForm(ModelFormWithFormset):
    class Meta:
        model   = Equipe
        fields  = ['Club', 'Numero', 'Categorie', 'Rencontre']
        widgets = {
            'Club': autocomplete.ModelSelect2(url='club-autocomplete'),
            'Categorie': forms.HiddenInput,
            'Rencontre': forms.HiddenInput,
        }

    formset_class = inlineformset_factory(Equipe, Score, max_num=8, extra=8, form=InlineScoreForm, can_delete=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if kwargs.get('initial', {}).get('Club', None) is not None:
            self.fields['Club'].disabled = True

class ScoreCreateForm(forms.ModelForm):
    class Meta:
        model   = Score
        fields  = ['Equipe', 'Grimpeur', 'ClubPreteur']
        widgets = {
            'Equipe': forms.HiddenInput,
            'Grimpeur': autocomplete.ModelSelect2(url='grimpeur-autocomplete'),
            'ClubPreteur': autocomplete.ModelSelect2(url='club-autocomplete'),
        }



from datetime import timedelta
class DurationField(forms.DurationField):
    def prepare_value(self, value):
        print(type(value), value, value.microseconds if type(value) is timedelta else None)
        if value == timedelta(microseconds=-1): return 'Chute'
        if value == timedelta(microseconds=-2): return 'Abandon'
        return super().prepare_value(value)

    def to_python(self, value):
        if value == 'Chute': return timedelta(microseconds=-1)
        if value == 'Abandon': return timedelta(microsecons=-2)
        return super().prepare_value(value)

class ScoreUpdateForm(forms.ModelForm):
    class Meta:
        model  = Score
        # fields = ['ClubPreteur', 'Bloc1', 'Bloc2', 'Voie1', 'Voie2', 'Voie3', 'Voie4', 'Vitesse', 'PtsVitesse', 'Points']
        fields = '__all__'
        widgets={
            'ClubPreteur': autocomplete.ModelSelect2(url='club-autocomplete'),
            'IDVoie1': autocomplete.ModelSelect2(url='niveau-autocomplete'),
            'IDVoie2': autocomplete.ModelSelect2(url='niveau-autocomplete'),
            'IDVoie3': autocomplete.ModelSelect2(url='niveau-autocomplete'),
            'IDVoie4': autocomplete.ModelSelect2(url='niveau-autocomplete'),
        }

    Vitesse = DurationField()