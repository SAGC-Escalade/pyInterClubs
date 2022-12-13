from django.db import models

class Config(models.Model):
    key = models.CharField(max_length=50, primary_key=True)
    value = models.IntegerField()

    @classmethod
    def get(kls, key, default=None):
        obj = kls.objects.filter(key=key).first()
        if obj is None: return default
        return obj.value

    @classmethod
    def set(kls, key, value):
        kls.objects.update_or_create(key=key, defaults={'value': value})

    CURRENT_RENCONTRE = 'CurrentRencontre'
    CURRENT_CATEGORIE = 'CurrentCategorie'
