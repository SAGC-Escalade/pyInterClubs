from django.db.models import Q
from django.db.models.functions import MD5
from django.utils.deprecation import MiddlewareMixin
from asgiref.sync import iscoroutinefunction, markcoroutinefunction

from core.models import *
from .models import *


class pyInterClubsMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.interclub = pyInterclubDetails(request)


class pyInterclubDetails:
    __request = None
    __rencontreID = None
    __rencontre = None

    def __init__(self, request):
        self.__request = request

        self.__rencontreID = Config.get('DEFAULT_RENCONTRE')
        if request.user and hasattr(request.user, 'profil') and request.user.profil.rencontre_id:
            self.__rencontreID = request.user.profil.rencontre_id
        if not request.GET.get('rencontre') is None:
            self.__rencontreID = request.GET.get('rencontre')

    @property
    def rencontre_id(self):
        return self.__rencontreID

    # Sélection de la rencontre en cours
    @property
    def rencontre(self):
        if self.__rencontre is None and not self.__rencontreID is None:
            self.__rencontre = Rencontre.objects.get(pk=self.__rencontreID)
        return self.__rencontre

    # Filtre sur les grimpeurs qui correspondent à la catégorie sélectionnée
    # et au club de l'utilisateur
    @property
    def grimpeurs(self):
        user = self.__request.user
        if user.is_superuser:
            return Grimpeur.objects.all()
        if self.rencontre is None:
            return Grimpeur.objects.none()
        queryset = Grimpeur.objects.all()
        if hasattr(user, 'profil') and hasattr(user.profil, 'club'):
            queryset = queryset.filter(club=user.profil.club)
        # TODO : On pourrait ajouter le modèle "Catégorie" en paramétrant les ages min et max
        if self.rencontre.categorie == Categorie.enfants: amin, amax = 8, 13
        else:                                             amin, amax = 13, 19
        amax, amin= map(lambda x: self.rencontre.saison + 1 - x, (amin, amax))
        return queryset.filter(Q(anneeNaissance__gte=amin) & Q(anneeNaissance__lte=amax))

    # Filtre sur les équipes appartenant au club en cours
    @property
    def equipes(self):
        if self.rencontre is None: return []
        qs = self.rencontre.equipes.all()
        # On filtre uniquement les équipes du club pour les coachs
        #if Coach.objects.filter(user=self.__request.user).exists():
        if hasattr(self.__request.user, 'profil') and hasattr(self.__request.user.profil, 'club'):
            #qs = qs.filter(club__nom=self.__request.user.profil.club.nom)
            qs = qs.filter(club_id=self.__request.user.profil.club_id)
        return qs
