from django.core.management.base import BaseCommand
from django.db.models import Q

from core.models import Categorie, Genre, TypeVoie, Voie

voies = [
    # Voies de vitesse
    *[
        {
            'type': TypeVoie.vitesse, 'nom': 'Vitesse', 'niveau': "Homme" if genre == Genre.homme else "Femme",
            'categorie': Categorie.enfants, 'genre': genre,
            'zones': {"A réaliser": None, "Abandon": 0, "Chute": 1, "{rank}>44": 2, "{rank}>5": "11-{rank}//5", "{rank}<=5": "15-{rank}"},
        }
        for genre in (Genre.homme, Genre.femme)
    ],
    *[
        {
            'type': TypeVoie.vitesse, 'nom': 'Vitesse', 'niveau': "Homme" if genre == Genre.homme else "Femme",
            'categorie': Categorie.adolescents, 'genre': genre,
            'zones': {"A réaliser": None, "Abandon": 0, "Chute": 1, "{rank}>50": 10, "{rank}<=50": "60-{rank}"},
        }
        for genre in Genre
    ],
            
    # Voies de bloc pour chaque catégorie
    {   'type': TypeVoie.bloc, 'nom': 'Bloc', 'niveau': '1',
        'categorie': Categorie.enfants, 'zones': {"A réaliser": None, "Chute": 0, "2e essai": 3, "1er essai": 4} },
    {   'type': TypeVoie.bloc, 'nom': 'Bloc', 'niveau': '2',
        'categorie': Categorie.enfants, 'zones': {"A réaliser": None, "Chute": 0, "3e essai": 4, "2e essai": 5, "1er essai": 6} },
    {   'type': TypeVoie.bloc, 'nom': 'Bloc', 'niveau': '1',
        'categorie': Categorie.adolescents, 'zones': {"A réaliser": None, "Chute": 0, "Zone 1": 10, "Top": 30} },
    {   'type': TypeVoie.bloc, 'nom': 'Bloc', 'niveau': '2',
        'categorie': Categorie.adolescents, 'zones': {"A réaliser": None, "Chute": 0, "Zone 2": 20, "Zone 1": 40, "Top": 60} },

    # Voies de difficulté pour les enfants
    *[
        {
            'type': TypeVoie.diff, 'nom': f'M{i+1}', 'niveau': niveau,
            'categorie': Categorie.enfants, 'zones': {"A réaliser": None, "Chute": 0, "Top": i}
        }
        for i,niveau in enumerate(['4c', '5a', '5b', '5c'])
    ],
    *[
        {
            'type': TypeVoie.diff, 'nom': f'T{i+1}', 'niveau': niveau,
            'categorie': Categorie.enfants, 'zones': {"A réaliser": None, "Chute": 0, "Zone": 3 + i//2 + i//9, "Top": i+5}
        }
        for i,niveau in enumerate(['4c', '5a', '5b', '5c', '6a', '6b', '6c', '7a', '7b', '7c'])
    ],
            
    # Voies de difficulté pour les adolescents
    *[
        {
            'type': TypeVoie.diff, 'nom': f'T{i+1}', 'niveau': niveau,
            'categorie': Categorie.adolescents, 'zones': {"A réaliser": None, "Chute": 0, "Zone 2": 2*i+1, "Zone 1": 2*i+2, "Top": 2*i+4}
        }
        for i,niveau in enumerate(['4c', '5a', '5b', '5c', '6a', '6b', '6c', '7a', '7b', '7c'])
    ],
]


class Command(BaseCommand):
    help = "Ajoute une liste prédéfinie de voies dans la base de données."

    def handle(self, *args, **kwargs):
        for voie_data in voies:
            voie = Voie(**voie_data, actif=True)
            voie.save()
