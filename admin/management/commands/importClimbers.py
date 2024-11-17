from django.core.management.base import BaseCommand
from django.db.models import Q
import csv

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
    # Liste de prénoms masculins
    masculins = [
        'Achille', 'Adan', 'Adrien', 'Alex', 'Alexandre', 'Alban', 'Albin', 'Amichaï', 'Amory', 'Antoine', 'Anton', 'Antonin', 'Antone Gabriel', 'Armand', 'Arthur', 'Axel', 'Aubin', 'Augustin', 'Baptiste', 'Benjamin', 'Charles', 'Clément', 'Clovis', 'Colin', 'Constant', 'Daniel', 'Dorian', 'Edgar', 'Eliot', 'Elliot', 'Elouan', 'Emilien', 'Emile', 'Ethan', 'Eliott', 'Evan', 'Flavien', 'François', 'Gabin', 'Gabriel', 'Gaspard', 'Hadrien', 'Hector', 'Hugo', 'Iban', 'Isaac', 'Jaden', 'Jean', 'Jean-Baptiste', 'Jérémy', 'Joachim', 'Joanis', 'Jonathan', 'Joseph', 'Jules', 'Julien', 'Joris', 'Josué', 'Killian', 'Léo', 'Léon', 'Louis', 'Lucas', 'Luca', 'Malo', 'Manoa', 'Marc', 'Martin', 'Maxence', 'Maxim', 'Maxime', 'Michel', 'Milan', 'Milo', 'Naël', 'Nathan', 'Nicolas', 'Nino', 'Noah', 'Noé', 'Nolan', 'Owen', 'Paul', 'Paul-Anthony', 'Pierre', 'Quentin', 'Raphaël', 'Rayan', 'Rémi', 'Robin', 'Romain', 'Samuel', 'Sacha', 'Simon', 'Théo', 'Thomas', 'Timothé', 'Titan', 'Titouan', 'Ugo', 'Victor', 'Vincent', 'William', 'Zacharie'
    ]

    # Liste de prénoms féminins
    feminins = [
        'Adèle', 'Albane', 'Alicia', 'Alice', 'Amélie', 'Anaëlle', 'Anais', 'Anaïs', 'Angie', 'Annabelle', 'Apolline', 'April', 'Astrid', 'Camille', 'Caroline', 'Célia', 'Charlotte', 'Chloé', 'Clara', 'Clemence', 'Clémence', 'Cléophée', 'Daphné', 'Eléa', 'Elena', 'Elina', 'Elisabeth', 'Elise', 'Emma', 'Emilie', 'Emiline', 'Emma', 'Ema', 'Emeline', 'Enora', 'Elsa', 'Eva', 'Fanny', 'Faustine', 'Flavie', 'Garance', 'Héloïse', 'Inès', 'Isabelle', 'Julia', 'Juliette', 'Julie', 'Justine', 'Kara', 'Léna', 'Lénaïc', 'Lena', 'Lise', 'Lily', 'Lina', 'Lola', 'Lou', 'Louane', 'Louise', 'Lucie', 'Luna', 'Lyz', 'Maëlle', 'Manon', 'Margaux', 'Margot', 'Marine', 'Mathilde', 'Maïlyne', 'Maïlys', 'Mélanie', 'Mélina', 'Méline', 'Naelle', 'Nina', 'Ninon', 'Orane', 'Perrine', 'Prune', 'Rebeka', 'Rose', 'Salomé', 'Sarah', 'Sélène', 'Sidony', 'Solène', 'Thais', 'Valentine', 'Valérian', 'Zoé', 'Zoé'
    ]

    # Liste de prénoms indéterminés ou mixtes
    indeterminés = [
        'Alexis', 'Aloïs', 'Arthur', 'Charlie', 'Charly', 'Eliott', 'Gabriel', 'Hugo', 'Léonard', 'Louis', 'Maël', 'Marius', 'Maxence', 'Raphaël', 'Samuel', 'Sacha', 'Simon', 'Théo', 'Thibaud', 'Thomas', 'Valentin', 'Victor', 'Yoann'
    ]

    prenom = prenom.title()
    
    # Vérification dans les listes
    if prenom in masculins:
        return Genre.homme
    elif prenom in feminins:
        return Genre.femme
    elif prenom in indetermines:
        return None
    else:
        return None



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

        with open(filename, mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file, delimiter=',')
            for row in reader:
                # Récupération/Création du club
                club_nom = row[file_structure['club']]
                club = Club.objects.filter(nom__iexact=club_nom).first()
                if not club:
                    clubs.add(club_nom)
                    if saving:
                        club = Club.objects.create(club=club_nom, ville='')

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
                    #errors.append(f"{prenom} {nom} a changé de licence ET de club : {grimpeur.licence} {grimpeur.club} -> {licence} {club}")
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
                    #errors.append(f"{prenom} {nom} ({club}) a changé de numéro de licence : {grimpeur.licence} -> {licence}")
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
                    #errors.append(
                    #    f"Le numéro de licence {licence} est déjà attribué : "
                    #    f"{grimpeur.prenom} {grimpeur.nom} ({grimpeur.anneeNaissance} - {grimpeur.licence} - {grimpeur.club})"
                    #    " -> "
                    #    f"{prenom} {nom} ({anneeNaissance} - {licence} - {club})"
                    #)
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
                if saving:
                    grimpeur = Grimpeur.objects.create(
                        nom=nom, prenom=prenom,
                        anneeNaissance=annee_naissance,
                        sexe=get_sexe(prenom),
                        licence=licence, club=club,
                    )
                    if not grimpeur.sexe:
                        prenoms.add(prenom)
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

        print(f"Fin de l'importation : {existed} déjà existants, {updated} modifiés, {created} créés, {ignored} ignorés")
        if not saving:
            print("Aucune modification n'a été effectuée en base de données. Enlevez l'option --dry-run pour effectuer les mises à jour.")
