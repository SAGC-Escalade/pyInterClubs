from django.db import models
from django.contrib.auth.models import User
from polymorphic.models import PolymorphicModel
import hashlib

class Types(models.TextChoices):
    bool    = 'bool',   'Booléen'
    int     = 'int',    'Entier'
    float   = 'float',  'Flottant'
    string  = 'string', 'Chaine'


class Config(models.Model):
    key = models.CharField(max_length=50, primary_key=True)
    type = models.CharField(choices=Types.choices, max_length=10, default=Types.string.value)
    value = models.CharField(max_length=255)

    @classmethod
    def get(kls, key, default=None):
        obj = kls.objects.filter(key=key).first()
        if obj is None: return default
        if obj.type == Types.bool.value: return bool(obj.value)
        if obj.type == Types.int.value: return int(obj.value)
        if obj.type == Types.float.value: return float(obj.value)
        return obj.value

    @classmethod
    def set(kls, key, value):
        t = Types.string.value
        if type(value) == int:   t = Types.int.value
        if type(value) == float: t = Types.float.value
        if type(value) == bool:  t = Types.bool.value

        kls.objects.update_or_create(key=key, defaults={'value': str(value), 'type': t})

    def __getattr__(self, key):
        class NoEntry: pass
        obj = self.get(key, NoEntry)
        if obj == NoEntry: raise AttributeError
        return obj


# Profil générique
class Profil(PolymorphicModel):
    id = models.BigAutoField(primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    rencontre = models.ForeignKey('core.Rencontre', on_delete=models.SET_NULL, null=True)


# Profil coach (gestion des grimpeurs d'un même club)
class Coach(Profil):
    club = models.ForeignKey('core.Club', on_delete=models.CASCADE)

    @property
    def token(self):
        token = f"{self.rencontre}:{self.club.nom}"
        return hashlib.md5(token.encode()).hexdigest()


# Profil juge (gestion des grimpeurs inscrits sur une même voie)
class Juge(Profil):
    voies = models.ManyToManyField('core.Voie', through='core.RencontreVoie', related_name='juges')

    def get_token(self, voies):
        token = f"{self.rencontre}:" + ":".join(sorted(map(str, voies)))
        return hashlib.md5(token.encode()).hexdigest()

    @property
    def token(self):
        return self.get_token(self.voies.all())
