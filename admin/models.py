from django.db import models


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
