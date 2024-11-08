from django.db.models import Q, F, Count, Case, When, Sum, Prefetch, BooleanField, QuerySet
from django.db.models.functions import MD5
from django.utils.deprecation import MiddlewareMixin
from asgiref.sync import iscoroutinefunction, markcoroutinefunction
from django.core.exceptions import ValidationError, ImproperlyConfigured

from core.models import *
from .models import *


class pyInterClubsMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.interclub = pyInterclubDetails(request)


class pyInterclubDetails:
    __request = None
    __rencontreID = None
    __profil = None

    def __init__(self, request):
        self.__request = request

        if request.user and hasattr(request.user, 'profil'):
            self.__profil = request.user.profil

        self.__rencontreID = Config.get('DEFAULT_RENCONTRE')
        if self.__profil and self.__profil.rencontre_id:
            self.__rencontreID = self.__profil.rencontre_id
        if not request.GET.get('rencontre') is None:
            self.__rencontreID = request.GET.get('rencontre')

    @property
    def rencontre(self):
        return self.__rencontreID

    @property
    def club(self):
        if self.user_is_coach:
            return self.__profil.club_id
        return None

    @property
    def voies(self):
        if self.user_is_juge:
            return self.__profil.voies.all().values_list('id', flat=True)
        return None

    @property
    def user_is_coach(self):
        return isinstance(self.__profil, Coach)
    @property
    def user_is_juge(self):
        return isinstance(self.__profil, Juge)


class WithRencontreRequiredMixin:
    # Classe permettant de s'assurer que la rencontre est sélectionnée au niveau du middleware
    # Si ce n'est pas le cas, une exception ValidationError sera levée.
    def dispatch(self, request, *args, **kwargs):
        if not hasattr(request, 'interclub') or not request.interclub:
            raise ImproperlyConfigured("Le middleware 'interclub' n'est pas trouvé, peut-être n'a-t-il pas été configuré correctement.")
        if not request.interclub.rencontre:
            raise ValidationError("L'administrateur n'a pas démarré de rencontre.")
        return super().dispatch(request, *args, **kwargs)
