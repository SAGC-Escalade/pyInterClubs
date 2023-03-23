from django.db.models import Q
from django.db.models.functions import MD5

from core.models import Rencontre, Equipe, Grimpeur, Categorie, Club, Niveau
from .models import Config


class pyInterClubsMiddleware:
    sync_capable = True
    async_capable = True

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.interclub = pyInterclubDetails(request)
        return self.get_response(request)


class pyInterclubDetails:
    _rencontreID = None
    _categorieID = None
    __rencontre = None

    def __init__(self, request):
        self._request = request
        self._rencontreID = Config.get('CURRENT_RENCONTRE')
        self._categorieID = Config.get('CURRENT_CATEGORIE')

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
        else:                                      amin, amax = 13, 19
        amax, amin= map(lambda x: self.rencontre.Saison.Annee + 1 - x, (amin, amax))
        return Grimpeur.objects.filter(Q(AnneeNaissance__gte=amin) & Q(AnneeNaissance__lte=amax))

    # Filtre sur les équipes appartenant au club en cours
    @property
    def equipes(self):
        qs = self.rencontre.Equipes.filter(Categorie=self._categorieID)
        if self._request.user is not None and self._request.user.username and not self._request.user.is_staff:
            qs = qs.annotate(md5=MD5('Club__Nom')).filter(md5=self._request.user.username)
        return qs

    # Filtre sur tous les scores de la rencontre pour la catégorie sélectionnée
    @property
    def scores(self):
        return self.rencontre.Scores.filter(Equipe__Categorie=self._categorieID)

    # Filtre sur les niveaux pour la catégorie sélectionnée
    @property
    def niveaux(self):
        return Niveau.objects.filter(Categorie=self._categorieID, Actif=True).exclude(NomVoie='Bloc')


    @property
    def is_enfants(self):
        return self._categorieID == Categorie.Enfants

    @property
    def is_adolescents(self):
        return self._categorieID == Categorie.Adolescents

    # Méthode d'initialisation des éléments statiques des formulaires
    def get_initial(self, initial):
        if not 'Categorie' in initial: initial['Categorie'] = self._categorieID
        if not 'Rencontre' in initial: initial['Rencontre'] = self._rencontreID
        if not 'Club' in initial:
            try:
                initial['Club'] = Club.objects.annotate(md5=MD5('Nom')).get(md5=self._request.user.username)
            except Club.DoesNotExist: pass
        return initial
