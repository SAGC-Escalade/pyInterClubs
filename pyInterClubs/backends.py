from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.models import User
from django.db.models.functions import MD5, Concat
from django.db.models import Value as V
from core.models import Club
from admin.models import Coach, Juge

class ClubBackend(BaseBackend):
    def authenticate(self, request, token=None):
        try: user = User.objects.get(username=token)
        except User.DoesNotExist:
            club = Club.objects.annotate(md5=MD5(Concat('nom', V(f"-{request.interclub.rencontre}")))).get(md5=token)
            user = User(username=token, first_name=club.nom, last_name=club.ville)
            user.save()
            Coach(club=club, rencontre=request.interclub.rencontre, user=user).save()
        return user

    def get_user(self, user_id):
        try: return User.objects.get(pk=user_id)
        except User.DoesNotExist: return None
