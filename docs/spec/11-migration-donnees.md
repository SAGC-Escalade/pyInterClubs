# 11 — Migration des données

Source : `admin/management/commands/addVoies.py`, `importClimbers.py`, `importHistoricDB.py`,
base actuelle `django.sqlite`. Objectif : reprendre les données existantes vers Postgres
(Supabase) sans perte ni rupture des barèmes/scoring.

## 1. Schéma source → cible

La base actuelle est **SQLite** (modèle Django, doc 01). La reprise se fait table à table
vers Postgres avec **conservation des valeurs d'enum** (entiers) et des **ids** (pour
préserver les FK). Voir DDL doc 01 §4.

Étapes recommandées :

1. Créer le schéma Postgres (DDL doc 01) + fonctions/triggers (doc 02) **désactivés**
   pendant l'import (ou import avec `points`/`etat` déjà calculés pour éviter les recalculs).
2. Copier les tables dans l'ordre des dépendances : `club` → `grimpeur`, `voie` →
   `rencontre` → `rencontre_voie` → `equipe` → `score` → `performance`.
3. Réaligner les **séquences** d'identité sur le max(id) de chaque table.
4. Réactiver triggers ; lancer un **recalcul de contrôle** (vitesse) et comparer aux points
   importés (non-régression, doc 02 §7).

## 2. Sérialisation de `zones` (ordre des clés)

⚠️ Point critique : l'`etat` est un **index dans l'ordre des clés de `zones`**. SQLite/Django
préserve l'ordre d'insertion du JSON ; **Postgres `jsonb` ne le garantit pas**. Lors de
l'import :

- soit stocker `zones` en **`json`** (texte, ordre préservé) ;
- soit **normaliser** en tableau ordonné `[{"label","points"}]` (recommandé, doc 02 §6) et
  **remapper** les `etat` existants vers le nouvel index (identité si l'ordre est conservé).

## 3. Valeurs spéciales `temps` (vitesse)

La base historique stocke le temps vitesse en **dix-millièmes** ; conversions
(`importHistoricDB.py:108-112`) :

- `temps = timedelta(milliseconds = vitesse / 10000)` ;
- `-600 000 000` → **Chute** (−1 min) ; `-1 200 000 000` → **Abandon** (−2 min).

En cible : `interval`. Conserver la convention Chute=−1 min / Abandon=−2 min (doc 02 §3.1)
pour que le recalcul par rang reste correct.

## 4. Spécificités de l'import historique (`importHistoricDB.py`)

À reproduire/documenter si on reprend l'historique complet :

- **Clubs** : `Localisation` → `ville` (`:8-10`).
- **Voies** : ancienne table `Niveaux` → bloc/diff avec
  `zones = {A réaliser:null, Chute:0, Valorisée:ptsValorise, Réussie:ptsComplete}` (`:11-24`).
  La voie « gardien » (id 44) est **supprimée** dans la nouvelle version (`:13`).
- **Voies vitesse** : par **saison** (2018 et 2019, deux règlements), barèmes `{rank}`
  dédiés (`:25-38`).
- **Grimpeurs** : nom en MAJUSCULES, prénom capitalisé (`:39-45`).
- **Rencontres** : **une rencontre source → DEUX rencontres** (enfants + ado), car la
  catégorie est désormais portée par la rencontre (`:46-61`). Ancien règlement (≤2018) :
  `nbDiff=3`, `voiesGroupees=True` ; nouveau (2019+) : `nbDiff=3 ou 4`, `voiesGroupees=False`.
- **Équipes** : filtrées par catégorie pour rattacher la bonne des deux rencontres (`:62-69`).
- **Scores** : décalage d'ordre `+1` pour les données ≥ 2020 (`:70-80`).
- **Performances** : ancien système 5 états
  `['A réaliser','Réussie','Valorisée','Chute','Interdite']` → index de zone ; l'état
  « Interdite » ajoute dynamiquement une zone `Interdite:0` (`:81-101`). 6 perfs/grimpeur
  (2 bloc + 3 diff + 1 vitesse).
- **RencontreVoie vitesse** : ids de voies **codés en dur** par catégorie/année (`:114-137`).

> Si l'historique n'est **pas** repris, ne migrer que la base courante (rencontres
> actives + référentiels) ; l'`importHistoricDB` reste une référence de cartographie.

## 5. Import des grimpeurs (CSV) — `importClimbers.py`

Outil d'alimentation du référentiel grimpeurs depuis un CSV FFME (Structure, Licence,
Nom complet, Date de naissance). Logique à porter en script/route d'import :

- parse nom/prénom (MAJUSCULES = nom), déduction du **sexe** par liste de prénoms
  (`get_sexe`, ~650 prénoms en dur, `:56-104`) ;
- gestion des conflits : exact = skip, licence changée = update (`--force`), club changé =
  déplacement, doublon de licence = erreur sauf `--force` ; mode `--dry-run`.

> **Cible** : réécrire en **Edge Function** / route d'import (upload CSV), ou job ponctuel.
> La détection de sexe par liste de prénoms est fragile → envisager une colonne explicite
> dans le CSV source si disponible.

## 6. Barème de voies de référence — `addVoies.py`

Jeu de voies « modèle » (barèmes bloc/diff/vitesse enfants & ado) servant à initialiser une
base neuve (doc 02 §1, §3.3). À reprendre comme **seed SQL** côté Supabase (insertion des
voies actives avec leurs `zones`).

## 7. Vérification de la migration

1. **Comptes de lignes** par table source vs cible.
2. **Intégrité FK** : aucune FK orpheline ; contraintes `restrict`/`unique` satisfaites.
3. **Recalcul** : régénérer les `points` (bloc/diff puis vitesse par rang) et **comparer**
   aux valeurs importées (tolérance nulle) — utilise les cas de référence doc 02 §7.
4. **Séquences** d'identité réalignées (pas de collision d'id sur de nouvelles insertions).
5. **Ordre des zones** préservé (échantillon de perfs : `etat` pointe le bon libellé).
