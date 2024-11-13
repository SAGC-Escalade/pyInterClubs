from django.core.management.base import BaseCommand, CommandError
from django.core.exceptions import ValidationError
import sqlite3
from datetime import timedelta, date

from core.models import *

def clubTranslation(row):
    id, nom, ville = row
    return [(id, {'nom': nom, 'ville': ville})]
def niveauTranslation(row):
    id, ptsValorise, ptsComplete, nom, niveau, categorie, actif = row
    if id == 44: return [(None, False)] # On ne crée pas le gardien, il devient inutile dans cette version
    zones = {'A réaliser': None, 'Chute': 0, 'Valorisée': ptsValorise, 'Réussie': ptsComplete}
    fields = {
        'zones': zones,
        'type': TypeVoie.bloc if nom == 'Bloc' else TypeVoie.diff,
        'nom': nom,
        'categorie': categorie,
        'niveau': niveau,
        'actif': False, # Aucune voie de la base historique n'est utilisable
        'genre': Genre.mixte,
    }
    return [(id, fields)]
def niveauVitesseTranslation(row):
    id, annee = row
    if annee > 2019: return [(None, False)] # On ne traite que les saisons 2018 et 2019 (les deux versions du règlement)
    zones2018 = { 'A réaliser': None, 'Abandon': 0, 'Chute': 0, '{rank}>25': '1', '{rank}>5':  '6-{rank}//5', '{rank}<=5': '10-{rank}' }
    zones     = { 'A réaliser': None, 'Abandon': 0, 'Chute': 1, '{rank}>44': '2', '{rank}>5': '11-{rank}//5', '{rank}<=5': '15-{rank}' }
    fields = {
        'zones': zones2018 if annee==2018 else zones,
        'type': TypeVoie.vitesse,
        'nom': 'Vitesse',
        'niveau': f"{annee}",
        'actif': annee >= 2019,
        'genre': Genre.mixte,
    }
    return [(f"v{annee}", {**fields, 'categorie': Categorie.mixte})]
def grimpeurTranslation(row):
    id, idclub, *row = row
    fields = {'club': Club.objects.get(pk=relations[Club][idclub])}
    fields.update(dict(zip(['nom', 'prenom', 'anneeNaissance', 'licence', 'sexe'], row)))
    fields['nom'] = fields['nom'].upper()
    fields['prenom'] = fields['prenom'].capitalize()
    return [(id, fields)]
def rencontreTranslation(row):
    id, idclub, date, saison = row
    #saison = Saison.objects.get(pk=relations[Saison][idsaison])
    date = date.split(' ')[0]
    fields = {
        'saison': saison,
        'club': Club.objects.get(pk=relations[Club][idclub]),
        'date': date,
        'nbBloc': 2,
        'nbVitesse': 1,
        'voiesReutilisables': False,
    }
    vieuxReglement = saison <= 2018
    return [
        (id, dict(**fields, categorie=Categorie.enfants, nbDiff=3, voiesGroupees=True)),
        (id, dict(**fields, categorie=Categorie.adolescents, nbDiff=3 if vieuxReglement else 4, voiesGroupees=vieuxReglement))
    ]
def equipeTranslation(row):
    id, idrencontre, idclub, numero, categorie = row
    fields = {
        'club': Club.objects.get(pk=relations[Club][idclub]),
        'rencontre': Rencontre.objects.get(pk__in=relations[Rencontre][idrencontre], categorie=categorie),
        'numero': numero,
    }
    return [(id, fields)]
def scoreTranslation(row):
    id, idequipe, idgrimpeur, idclubpreteur, ordre = row
    equipe = Equipe.objects.get(pk=relations[Equipe][idequipe])
    offset = 1 if equipe.rencontre.date.year >= 2020 else 0
    fields = {
        'equipe': equipe,
        'grimpeur': Grimpeur.objects.get(pk=relations[Grimpeur][idgrimpeur]),
        'clubPreteur': Club.objects.get(pk=relations[Club][idclubpreteur]) if not idclubpreteur in (None, 0) else None,
        'ordre': ordre + offset,
    }
    return [(id, fields)]
def performanceTranslation(row):
    id, *perf, vitesse, ptsvitesse = row
    perf = zip(perf[0::2], perf[1::2])
    score = Score.objects.get(pk=relations[Score][id])
    voies = list(score.equipe.rencontre.voies.all())
    ret = []
    # Traitement des bloc et des voies
    for idvoie,etat in perf:
        if idvoie == 44 or idvoie in (None, 0):
            ret.append((None, False))
            continue
        voie = Voie.objects.get(pk=relations[Voie][idvoie])
        if not voie in voies:
           print(f"Pb avec le score {id}, il essaye d'utiliser une voie inexistante dans la rencontre: {voie}")
        etat = ['A réaliser', 'Réussie', 'Valorisée', 'Chute', 'Interdite'][etat]
        if etat == 'Interdite':
            voie.zones['Interdite'] = 0
            voie.save()
        points = voie.zones.get(etat)
        etat = list(voie.zones.keys()).index(etat)
        ret.append((id, dict(score=score, voie=voie, etat=etat, points=points)))
    # Traitement de la vitesse
    annee = min(2019,score.equipe.rencontre.saison)
    voie = Voie.objects.get(pk=relations[Voie][f"v{annee}"])
    if   ptsvitesse is None:             etat = 0 # A réaliser (normalement inexistant dans la base de données)
    elif ptsvitesse > (annee==2019)*5+5: etat = 5 # rank <= 5
    elif ptsvitesse > (annee==2019)+1:   etat = 4 # rank <= 25 ou 45 (suivant l'année)
    elif vitesse ==  -600000000:         etat = 2 # Chute
    elif vitesse == -1200000000:         etat = 1 # Abandon
    else:                                etat = 3 # rank >= 25 ou 45 (suivant l'année)
    temps = timedelta(milliseconds=vitesse/10000)
    ret.append((id, dict(score=score, voie=voie, etat=etat, points=ptsvitesse, temps=timedelta(milliseconds=vitesse/10000))))
    return ret
def rencontreVoieVitesseTranslation(row):
    id, *voies = row
    rencontres = Rencontre.objects.filter(pk__in=relations[Rencontre][id])
    ret = []
    for rencontre in rencontres:
        annee = min(2019, rencontre.saison)
        # Les ID des voies correspondantes aux différentes rencontres sont inscrits en dur...
        # Je n'aime pas ça mais je n'ai pas le choix.
        if rencontre.categorie == Categorie.enfants:
            voies = [1,2,3,4,5,6,7,8,9,10]                            # M1->T7 enfants
            if rencontre.date > date(2019,1,1): voies += [21,22,24]   # Ajout de T8,T9 et T10
            voies += [26,27]                                          # Blocs enfants
            voies += [f"v{annee}"]                                    # Vitesse
        else:
            voies = [11,12,13,14,15,16,17,18,19,20]                   # T1->T10 ados
            if rencontre.date > date(2019,1,1): voies += [23,25]      # Ajout T11 et T12
            voies += [28,29]                                          # Blocs ados
            if rencontre.date > date(2019,9,1):
                voies = [30,31,32,33,34,35,36,37,38,39,40,41,42,43]   # 2019: nouveau set ados
            voies += [f"v{annee}"]                                    # Vitesse
        for idvoie in voies:
            voie = Voie.objects.get(pk=relations[Voie][idvoie])
            ret.append((id, dict(rencontre=rencontre, voie=voie)))
    return ret

TRANSLATIONS = [
    (Club, 'SELECT ID, Nom, Localisation FROM Clubs', clubTranslation),
    (Voie, 'SELECT ID, PtsValorises, PtsVoieComplete, NomVoie, NiveauVoie, Categorie, Actif FROM Niveaux', niveauTranslation),
    (Voie, 'SELECT ID, Annee FROM Saisons', niveauVitesseTranslation),
    (Grimpeur, 'SELECT ID, IDClub, Nom, Prenom, AnneeNaissance, Licence, Sexe FROM Grimpeurs', grimpeurTranslation),
    (Rencontre, 'SELECT Rencontres.ID, IDClub, Date, Annee FROM Rencontres LEFT JOIN Saisons ON Rencontres.IDSaison = Saisons.ID', rencontreTranslation),
    (Equipe, 'SELECT ID, IDRencontre, IDClub, Numero, Categorie FROM Equipes', equipeTranslation),
    (Score, 'SELECT ID, IDEquipe, IDGrimpeur, IDClubPreteur, Ordre FROM Scores', scoreTranslation),
    (RencontreVoie, 'SELECT ID FROM Rencontres', rencontreVoieVitesseTranslation),
    (Performance, 'SELECT ID, IDBloc1, Bloc1, IDBloc2, Bloc2, IDVoie1, Voie1, IDVoie2, Voie2, IDVoie3, Voie3, IDVoie4, Voie4, Vitesse, PtsVitesse FROM Scores', performanceTranslation),
]
relations = {k:{} for k,_,_ in TRANSLATIONS}


class Command(BaseCommand):
    help = "Import a POCInterclub database"

    def add_arguments(self, parser):
        parser.add_argument('filename', type=str)

    def handle(self, *args, **options):
        if not 'filename' in options:
            raise CommandError("Enter a filename to import.")

        db = sqlite3.connect(options.get('filename'))
        cur = db.cursor()

        for kls,query,func in TRANSLATIONS:
            j, k = 0, 0
            for i,row in enumerate(cur.execute(query)):
                for id,fields in func(row):
                    if id is None:
                        k += 1
                        continue
                    o = kls(**fields)
                    try:
                        # On valide le modèle et on l'enregistre sans passer par les signaux Django
                        # => Donc pas de recalcul des points de vitesse, ni de notifications
                        o.full_clean()
                        kls._base_manager.bulk_create([o])
                    except ValidationError:
                        print(kls, fields)
                        raise
                    if o.id is None:
                        raise RuntimeError("Dommage, il faut modifier le code pour récupérer manuellement l'id de l'objet créé...")
                    if id in relations[kls]:
                        if type(relations[kls][id]) == list:
                            relations[kls][id].append(o.id)
                        else:
                            relations[kls][id] = [relations[kls][id], o.id]
                    else:
                        relations[kls][id] = o.id
                    j += 1
            msg  = f"{i+1} {kls._meta.verbose_name_plural} importés"
            msg += f", {j} créés"
            if k: msg += f", {k} ignorés"
            self.stdout.write(self.style.SUCCESS(msg))

        db.close()
        self.stdout.write(self.style.SUCCESS("Fin de l'importation"))
