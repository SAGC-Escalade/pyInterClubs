from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.models import User
from django.db.models.functions import MD5
from core.models import Club

class ClubBackend(BaseBackend):
    def authenticate(self, request, token=None):
        print("authenticate", token)
        club = Club.objects.annotate(md5=MD5('Nom')).get(md5=token)
        try: user = User.objects.get(username=token)
        except User.DoesNotExist:
            user = User(username=token)
            user.first_name = club.Nom
            user.last_name = club.Localisation
            user.save()
        return user

    def get_user(self, user_id):
        print("get_user", user_id)
        try: return User.objects.get(pk=user_id)
        except User.DoesNotExist: return None
