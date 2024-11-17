from django.core.management.base import BaseCommand
from django.db.models import Q
import csv
import unicodedata

from core.models import Club, Grimpeur, Genre

file_structure = {
    'club': 'Structure',
    'licence': 'Numéro de licence',
    'identité': 'Nom complet',
    'dateNaissance': 'Date de naissance',
}

def update(grimpeur, **infos):
    for k,v in infos.items():
        setattr(grimpeur, k, v)
    grimpeur.save()

def get_same(nom, prenom, licence, anneeNaissance, club):
    return Grimpeur.objects.filter(
        nom__iexact=nom, prenom__iexact=prenom,
        anneeNaissance=anneeNaissance,
        licence=licence, club=club
    ).first()
def get_same_but_licence(nom, prenom, licence, anneeNaissance, club):
    return Grimpeur.objects.filter(
          Q(nom__iexact=nom) & Q(prenom__iexact=prenom)
        & Q(anneeNaissance=anneeNaissance)
        & ~Q(licence=licence)
        & Q(club=club)
    ).first()
def get_same_licence_but_other(nom, prenom, licence, anneeNaissance, club):
    return Grimpeur.objects.filter(
        (   ~Q(nom__iexact=nom) | ~Q(prenom__iexact=prenom)
          | ~Q(anneeNaissance=anneeNaissance)
          #| ~Q(club=club)
        ) &  Q(licence=licence)
    ).first()
def get_same_but_club(nom, prenom, licence, anneeNaissance, club):
    return Grimpeur.objects.filter(
          Q(nom__iexact=nom) & Q(prenom__iexact=prenom)
        & Q(anneeNaissance=anneeNaissance)
        & Q(licence=licence)
        & ~Q(club=club)
    ).first()
def get_same_but_licence_and_club(nom, prenom, licence, anneeNaissance, club):
    return Grimpeur.objects.filter(
          Q(nom__iexact=nom) & Q(prenom__iexact=prenom)
        & Q(anneeNaissance=anneeNaissance)
        & ~Q(licence=licence)
        & ~Q(club=club)
    ).first()

def get_sexe(prenom):
    # Prénoms masculins
    masculins = [
        'aaron', 'achille', 'adan', 'adrien', 'alexandre', 'alexis', 'alban', 'albin', 'amichai', 'amory', 'antoine', 'antone gabriel', 
        'anton', 'antonin', 'antony', 'armand', 'arthur', 'axel', 'baptiste', 'benjamin', 'charles', 'clement', 'colin', 'constant', 
        'corentin', 'daniel', 'dorian', 'edgar', 'ehsan', 'elias', 'eliot', 'elliot', 'eliott', 'elouan', 'emile', 'emilien', 'enzo', 
        'ethan', 'evan', 'flavien', 'francois', 'gabin', 'gabriel', 'gaspard', 'gregoire', 'hadrien', 'hector', 'hugo', 'iban', 'isaac', 
        'ismael', 'jaden', 'jean', 'jean-baptiste', 'jeremy', 'joachim', 'joanis', 'jonathan', 'joseph', 'joris', 'josue', 'jules', 
        'julien', 'kenzo', 'killian', 'leo', 'leo paul', 'leon', 'leonard', 'leopold', 'lino', 'louis', 'lucas', 'luca', 'luis', 'maceo', 
        'malo', 'manoa', 'marc', 'marcel', 'marius', 'martin', 'matteo', 'matthieu', 'mathieu', 'mathis', 'maxence', 'maxim', 'maxime', 
        'michel', 'micoud', 'milan', 'milo', 'moise', 'nathan', 'nazim', 'nael', 'nicolas', 'nino', 'noah', 'noe', 'nolan', 'oscar', 
        'owen', 'paul', 'paul-anthony', 'pierre', 'quentin', 'raphael', 'rayan', 'remi', 'robin', 'romain', 'samuel', 'simon', 
        'theo', 'thibaud', 'thomas', 'timeo', 'timothe', 'titan', 'titouan', 'ugo', 'valentin', 'victor', 'vincent', 'william', 'wilhem', 
        'yoann', 'yoen', 'zacharie', 'zakaria',
        'alan', 'aliocha', 'alphonse', 'anatole', 'antton', 'arsene', 'augustin', 'aymeric', 'chad', 'christopher', 'diwan', 'edouard',
        'emilio', 'etienne', 'evaristo', 'geoffroy', 'glenn', 'guiglini mignonat', 'harrison', 'jarek', 'leon-loup',
        'lorenzo', 'lubin', 'louis-gabriel', 'lucy', 'lukas', 'mahe', 'matty', 'maximilien', 'nayel', 'neil', 'noam', 'octave', 'pablo', 'paco',
        'philippe', 'rafael', 'romeo', 'sean', 'slevin', 'timothee', 'tom', 'valentino', 'yann', 'yanis', 'yvann'
    ]

    # Prénoms féminins
    feminins = [
        'adele', 'adeline', 'albane', 'alice', 'alicia', 'amandine', 'amelie', 'amicie', 'anaelle', 'anae', 'anais', 'ana-rose', 'angele', 
        'annabelle', 'apolline', 'arina', 'astrid', 'audrey', 'axelle', 'bahia', 'beryl', 'blanche', 'camille', 'candice', 'capucine', 
        'carla', 'caroline', 'celia', 'charlotte', 'chiara', 'chloe', 'clementine', 'clemence', 'cleophee', 'colombe', 'daphne', 'diane', 
        'elea', 'elena', 'eleonore', 'elina', 'elisa', 'elisabeth', 'elise', 'ella', 'elsa', 'emeline', 'emilie', 'emiline', 'emma', 
        'enora', 'evana', 'eva', 'fanny', 'faustine', 'fleur', 'flavie', 'flore', 'florine', 'gabrielle', 'garance', 'giulia', 'heloise', 
        'hermione', 'ines', 'isabelle', 'julia', 'julie', 'juliette', 'justine', 'kara', 'lena', 'lenaic', 'lila', 'lily', 'lina', 
        'line', 'lisa', 'lise', 'lisette', 'lou', 'louane', 'louisa', 'louise', 'lucie', 'lucinda', 'luna', 'lyz', 'maelle', 'maelys', 'maissa', 
        'mailyne', 'madeleine', 'margaux', 'margot', 'maria-cecile', 'marie', 'marion', 'martha', 'mathilde', 'melanie', 'meliana', 
        'melina', 'meline', 'melissa', 'mia', 'mila', 'mina', 'meloe', 'naelle', 'naia', 'naomi', 'nine', 'ninon', 'noemie', 
        'olivia', 'orane', 'paloma', 'pauline', 'perrine', 'prune', 'rebeka', 'romane', 'rose', 'salome', 'sarah', 'selene', 'selena', 
        'serena', 'sidony', 'solene', 'sofia', 'sophie', 'suzanne', 'tea', 'thais', 'tiphaine', 'valentina', 'valentine', 'victoria', 
        'violette', 'zoe',
        'aena', 'agathe', 'alba', 'alissa', 'alyssia', 'anahi', 'anouk', 'apoline', 'ariane', 'arielle', 'augustine', 'awena', 'aya', 'cassandre', 'calysta',
        'celeste', 'charlyne', 'charyne', 'clara', 'cloe', 'colette', 'constance', 'dali', 'dorynn', 'eileen', 'elya', 'eloise', 'emmy', 'esther',
        'gaelle', 'gaia', 'hanae', 'iliana', 'isaure', 'jeanne', 'lara', 'laura', 'lea', 'leane', 'leonie', 'lia', 'lilou', 'lily-anne', 'lola', 'loucia',
        'louna', 'lucia', 'lucile', 'luce', 'lydie', 'maeva', 'maialen', 'mailis', 'manon', 'marguerite', 'maya', 'maylis', 'maud',
        'mona', 'nellie', 'nina', 'nora', 'raphaelle', 'rosie', 'salena', 'sidonie', 'zelda', 'zelie'
    ]

    prenom = unicodedata.normalize('NFD', prenom).encode('ascii', 'ignore').decode('utf-8').lower()
    
    # Vérification dans les listes
    if prenom in masculins:
        return Genre.homme
    elif prenom in feminins:
        return Genre.femme
    else:
        return Genre.mixte



class Command(BaseCommand):
    help = "Importe le fichier CSV des grimpeurs"

    def add_arguments(self, parser):
        parser.add_argument('filename', type=str, help="Chemin vers le fichier CSV à importer")
        parser.add_argument(
            '--dry-run', '-n', 
            action='store_true', 
            help="Simuler l'importation sans modifier la base de données"
        )
        parser.add_argument(
            '--force', '-f', 
            action='store_true', 
            help="Force la mise à jour des informations (grimpeurs différents mais licences identiques)"
        )

    def handle(self, *args, **options):
        if not 'filename' in options:
            raise CommandError("Enter a filename to import.")
        filename = options['filename']
        saving = not options['dry_run']
        force = options['force']

        # Récupération de la liste des prénoms trié pour classer automatiquement les nouveaux grimpeurs
        #print([g.prenom for g in Grimpeur.objects.hommes()])
        #print([g.prenom for g in Grimpeur.objects.femmes()])
        #print([g.prenom for g in Grimpeur.objects.filter(sexe=Genre.mixte)])

        # Initialisation des compteurs et registres
        existed, created, updated, ignored = 0, 0, 0, 0
        clubs, prenoms, moved, errors = set(), set(), [], []
        garcons, filles = 0, 0

        with open(filename, mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file, delimiter=',')
            for row in reader:
                # Récupération/Création du club
                club_nom = row[file_structure['club']].title()
                club = Club.objects.filter(nom__iexact=club_nom).first()
                if not club:
                    clubs.add(club_nom)
                    if saving:
                        club = Club(nom=club_nom, ville='-')
                        club.save()

                # Récupération et traitement des informations du fichier
                licence = int(row[file_structure['licence']])
                identite = row[file_structure['identité']].split()
                prenom, nom = [], []
                for n in identite:
                    if n.isupper(): nom.append(n)
                    else:           prenom.append(n)
                prenom = " ".join(prenom)
                nom = " ".join(nom)
                dateNaissance = row[file_structure['dateNaissance']].split('/')
                anneeNaissance = int(dateNaissance[2])

                infos = {'nom': nom, 'prenom': prenom, 'licence': licence, 'anneeNaissance': anneeNaissance, 'club': club}

                #####################################################################
                # Sans modification

                # Le grimpeur existe déjà en base => pas de modification
                grimpeur = get_same(**infos)
                if grimpeur:
                    existed += 1
                    continue

                #####################################################################
                # Erreurs

                # Le grimpeur a changé de numéro de licence ET de club
                grimpeur = get_same_but_licence_and_club(**infos)
                if grimpeur:
                    print(f"{prenom} {nom} a changé de licence ET de club : {grimpeur.licence} {grimpeur.club} -> {licence} {club}")
                    if saving and force:
                        update(grimpeur, licence=licence, club=club)
                        updated += 1
                    else:
                        ignored += 1
                    continue

                # Le grimpeur a changé de numéro de licence mais pas de club
                grimpeur = get_same_but_licence(**infos)
                if grimpeur:
                    print(f"{prenom} {nom} ({club}) a changé de numéro de licence : {grimpeur.licence} -> {licence}")
                    if saving and force:
                        update(grimpeur, licence=licence)
                        updated += 1
                    else:
                        ignored += 1
                    continue

                # Le numéro de license existe déjà en base pour un autre grimpeur
                grimpeur = get_same_licence_but_other(**infos)
                if grimpeur:
                    print(
                        f"Le numéro de licence {licence} est déjà attribué : "
                        f"{grimpeur.prenom} {grimpeur.nom} ({grimpeur.anneeNaissance} - {grimpeur.licence} - {grimpeur.club})"
                        " -> "
                        f"{prenom} {nom} ({anneeNaissance} - {licence} - {club})"
                    )
                    if saving and force:
                        update(grimpeur, nom=nom, prenom=prenom, anneeNaissance=anneeNaissance, club=club)
                        updated += 1
                    else:
                        ignored += 1
                    continue

                #####################################################################
                # Mises à jour

                # Le grimpeur a changé de club
                grimpeur = get_same_but_club(**infos)
                if grimpeur:
                    moved.append(f"{prenom} {nom} - {grimpeur.licence} {grimpeur.club} -> {licence} {club_nom}")
                    if saving:
                        update(grimpeur, club=club)
                        updated += 1
                    else:
                        ignored += 1
                    continue

                # Nouveau grimpeur
                sexe = get_sexe(prenom)
                if sexe is Genre.mixte:
                    prenoms.add(unicodedata.normalize('NFD', prenom).encode('ascii', 'ignore').decode('utf-8').lower())
                elif sexe == Genre.homme:
                    garcons += 1
                elif sexe == Genre.femme:
                    filles += 1
                if saving:
                    grimpeur = Grimpeur.objects.create(
                        nom=nom, prenom=prenom,
                        anneeNaissance=anneeNaissance,
                        sexe=sexe,
                        licence=licence, club=club,
                    )
                created += 1

        # Rapport d'erreurs
        if errors:
            [print(err) for err in errors]
            print(" ")

        if clubs:
            print(f"{len(clubs)} clubs n'existe pas.", "Ils ont été créés" if saving else "")
            [print("\t", club) for club in clubs]
        if moved:
            print(f"{len(moved)} grimpeurs ont changé de club :")
            [print("\t", m) for m in moved]
        if prenoms:
            print(f"{len(prenoms)} prénoms pour lesquels il faut déterminer le sexe :")
            print(list(prenoms))

        if errors or clubs or moved or prenoms:
            print(" ")

        print(f"Fin de l'importation : {existed} déjà existants, {updated} modifiés, {created} créés ({filles} filles, {garcons} garçons), {ignored} ignorés")
        if not saving:
            print("Aucune modification n'a été effectuée en base de données. Enlevez l'option --dry-run pour effectuer les mises à jour.")
