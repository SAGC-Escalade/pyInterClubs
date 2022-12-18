from django.db.models import Q

from core.models import Rencontre, Equipe, Grimpeur, Categorie, Club
from .models import Config


class pyInterClubsMiddleware:
    sync_capable = True
    async_capable = True

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.interclub = pyInterclubDetails()
        return self.get_response(request)


class pyInterclubDetails:
    _rencontreID = None
    _categorieID = None
    __rencontre = None

    def __init__(self):
        self._rencontreID = Config.get(Config.CURRENT_RENCONTRE)
        self._categorieID = Config.get(Config.CURRENT_CATEGORIE)

    # Sélection de la rencontre en cours
    @property
    def rencontre(self):
        if self.__rencontre is None:
            self.__rencontre = Rencontre.objects.get(ID=self._rencontreID)
        return self.__rencontre

    # Filtre sur les grimpeurs qui correspondent à la catégorie sélectionnée
    @property
    def grimpeurs(self):
        if self._categorieID == Categorie.Enfants: amin, amax = 8, 13
        else:                              amin, amax = 13, 19
        amax, amin= map(lambda x: self.rencontre.Saison.Annee + 1 - x, (amin, amax))
        return Grimpeur.objects.filter(Q(AnneeNaissance__gte=amin) & Q(AnneeNaissance__lte=amax))
