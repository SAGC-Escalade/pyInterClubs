from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.models import User
from django.db.models.functions import MD5, Concat
from django.db.models import Value as V
from core.models import Club, Rencontre
from admin.models import Coach, Juge

class ClubBackend(BaseBackend):
    def authenticate(self, request, token=None):
        try: return User.objects.get(username=token)
        except User.DoesNotExist: return None

    def get_user(self, user_id):
        try: return User.objects.get(pk=user_id)
        except User.DoesNotExist: return None
