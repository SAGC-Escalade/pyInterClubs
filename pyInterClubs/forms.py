from django import forms
from django.core.exceptions import ValidationError
from django.contrib.auth import authenticate, login


class TokenAuthenticationForm(forms.Form):
    token = forms.CharField(required=True, widget=forms.HiddenInput)

    def __init__(self, request=None, *args, **kwargs):
        self.request = request
        self.user_cache = None
        super().__init__(*args, **kwargs)

    def clean(self):
        token = self.cleaned_data.get("token")
        if token is not None and token:
            self.user_cache = authenticate(self.request, token=token)
            if self.user_cache is None:
                raise ValidationError("Token d'authentification invalide.")
            if not self.user_cache.is_active:
                raise ValidationError("Ce compte est inactif.")
        return self.cleaned_data

    def get_user(self):
        return self.user_cache
