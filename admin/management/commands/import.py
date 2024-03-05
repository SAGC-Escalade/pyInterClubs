from django.core.management.base import BaseCommand, CommandError
from core.models import *
import sqlite3
from datetime import timedelta

def clubTranslation(row):
    id, nom, ville = row
    return [(id, {'nom': nom, 'ville': ville})]
def niveauTranslation(row):
    id, ptsValorise, ptsComplete, nom, niveau, actif = row
    if id == 44: return [(None, False)] # On ne crée pas le gardien, il devient inutile dans cette version
    zones = {'A réaliser': None, 'Chute': 0}
    if ptsValorise: zones['Valorisée'] = ptsValorise
    zones['Réussie'] = ptsComplete
    fields = {
        'zones': zones,
        'type': TypeVoie.bloc if nom == 'Bloc' else TypeVoie.diff,
        'nom': nom,
        'niveau': niveau,
        'actif': actif,
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
        'niveau': '2018' if annee==2018 else '2019',
        'actif': True,
    }
    return [(f"v{annee}", fields)]
def grimpeurTranslation(row):
    id, idclub, *row = row
    fields = {'club': Club.objects.get(pk=relations[Club][idclub])}
    fields.update(dict(zip(['nom', 'prenom', 'anneeNaissance', 'licence', 'sexe'], row)))
    return [(id, fields)]
def saisonTranslation(row):
    id, annee = row
    return [(id, {'annee': annee})]
def rencontreTranslation(row):
    id, idclub, idsaison, date = row
    fields = {
        'saison': Saison.objects.get(pk=relations[Saison][idsaison]),
        'club': Club.objects.get(pk=relations[Club][idclub]),
        'date': date,
        'nbBloc': 2,
        'nbDiff': 3,
        'nbVitesse': 1,
        'voieReutilisable': False,
    }
    return [(id, dict(**fields, categorie=Categorie.enfants)), (id, dict(**fields, categorie=Categorie.adolescents))]
def equipeTranslation(row):
    id, idrencontre, idclub, numero, categorie = row
    fields = {
        'club': Club.objects.get(pk=relations[Club][idclub]),
        'rencontre': Rencontre.objects.get(pk__in=relations[Rencontre][idrencontre], categorie=categorie),
        'numero': numero,
    }
    return [(id, fields)]
def scoreTranslation(row):
    id, idequipe, idgrimpeur, idclubpreteur, points, ordre = row
    fields = {
        'equipe': Equipe.objects.get(pk=relations[Equipe][idequipe]),
        'grimpeur': Grimpeur.objects.get(pk=relations[Grimpeur][idgrimpeur]),
        'clubPreteur': Club.objects.get(pk=relations[Club][idclubpreteur]) if idclubpreteur != None else None,
        'points': points,
        'ordre': ordre,
    }
    return [(id, fields)]
def performanceTranslation(row):
    id, *perf, vitesse, ptsvitesse = row
    perf = zip(perf[0::2], perf[1::2])
    score = Score.objects.get(pk=relations[Score][id])
    ret = []
    # Traitement des bloc et des voies
    for idniveau,etat in perf:
        if idniveau == 44 or idniveau is None: continue
        niveau = Niveau.objects.get(pk=relations[Niveau][idniveau])
        etat = ['A réaliser', 'Réussie', 'Valorisée', 'Chute', 'Interdite'][etat]
        if etat == 'Interdite':
            niveau.zones['Interdite'] = 0
            niveau.save()
        points = niveau.zones.get(etat)
        etat = list(niveau.zones.keys()).index(etat)
        ret.append((id, dict(score=score, niveau=niveau, etat=etat, points=points)))
    # Traitement de la vitesse
    annee = min(2019,score.equipe.rencontre.saison.annee)
    niveau = Niveau.objects.get(pk=relations[Niveau][f"v{annee}"])
    if   ptsvitesse is None:             etat = 0 # A réaliser (normalement inexistant dans la base de données)
    elif ptsvitesse > (annee==2019)*5+5: etat = 5 # rank <= 5
    elif ptsvitesse > (annee==2019)+1:   etat = 4 # rank <= 25 ou 45 (suivant l'année)
    elif vitesse == -1:                  etat = 2 # Chute
    elif vitesse == -2:                  etat = 1 # Abandon
    else:                                etat = 3 # rank >= 25 ou 45 (suivant l'année)
    ret.append((id, dict(score=score, niveau=niveau, etat=etat, points=ptsvitesse, temps=timedelta(milliseconds=vitesse/10000))))
    return ret

TRANSLATIONS = [
    (Club, 'SELECT ID, Nom, Localisation FROM Clubs', clubTranslation),
    (Niveau, 'SELECT ID, PtsValorises, PtsVoieComplete, NomVoie, NiveauVoie, Actif FROM Niveaux', niveauTranslation),
    (Niveau, 'SELECT ID, Annee FROM Saisons', niveauVitesseTranslation),
    (Grimpeur, 'SELECT ID, IDClub, Nom, Prenom, AnneeNaissance, Licence, Sexe FROM Grimpeurs', grimpeurTranslation),
    (Saison, 'SELECT ID, Annee FROM Saisons', saisonTranslation),
    (Rencontre, 'SELECT ID, IDClub, IDSaison, Date FROM Rencontres', rencontreTranslation),
    (Equipe, 'SELECT ID, IDRencontre, IDClub, Numero, Categorie FROM Equipes', equipeTranslation),
    (Score, 'SELECT ID, IDEquipe, IDGrimpeur, IDClubPreteur, Points, Ordre FROM Scores', scoreTranslation),
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
            j = 0
            for i,row in enumerate(cur.execute(query)):
                for id,fields in func(row):
                    if id is None: continue
                    o = kls(**fields)
                    o.save()
                    if id in relations[kls]:
                        if type(relations[kls][id]) == list:
                            relations[kls][id].append(o.id)
                        else:
                            relations[kls][id] = [relations[kls][id], o.id]
                    else:
                        relations[kls][id] = o.id
                    j += 1
            self.stdout.write(self.style.SUCCESS(f"{i+1} {kls.__name__} importés, {j} créés"))

        db.close()
        self.stdout.write(self.style.SUCCESS("Fin de l'importation"))
