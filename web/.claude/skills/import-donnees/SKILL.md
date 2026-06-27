---
name: import-donnees
description: Migre les données de l'ancienne base (SQLite Django/historique) vers Postgres Supabase pour pyInterClubs, en respectant l'ordre des dépendances, l'ordre des zones, les temps spéciaux, puis exécute la checklist de vérification. À utiliser pour « importer la base historique », « migrer SQLite vers Postgres », « import des données ».
---

# Import / migration des données

Réf. : `docs/spec/11-migration-donnees.md`, legacy
`admin/management/commands/importHistoricDB.py` et `importClimbers.py`.

## Ordre d'import (dépendances FK)

`club` → `grimpeur` → `voie` → `rencontre` → `rencontre_voie` → `equipe` →
`score` → `performance`.

## Règles critiques

- **Préserver les IDs** et les codes enum `smallint` (sexe/type/categorie ∈ 1,2,3).
- **`zones`** : convertir le dict ordonné Django en **tableau ordonné**
  `[{"label","points"}]`. ⚠️ L'ordre = l'index `etat` d'une performance : un
  décalage casse tout le scoring.
- **Temps vitesse** : valeurs spéciales `-2 min` = Abandon, `-1 min` = Chute,
  `null` = « À réaliser ».
- L'import historique **scinde** une `Rencontre` unique en deux (enfants + ado)
  par catégorie (cf. `importHistoricDB.py`).
- **Réalignement des séquences** d'identité après import (pas de collision d'id).
- Désactiver les triggers de scoring pendant l'insert en masse, puis les
  réactiver et **recalculer** pour comparer.

## Checklist de vérification (doc 11 §7) — tolérance nulle

1. Comptes de lignes par table : source vs cible.
2. Intégrité FK : aucune FK orpheline ; contraintes `restrict`/`unique` satisfaites.
3. Recalcul : régénérer les `points` (bloc/diff puis vitesse par rang) et
   **comparer** aux valeurs importées — via l'agent **scoring-validator** et les
   cas de référence du doc 02 §7.
4. Séquences réalignées (insérer une ligne test sans collision).
5. Ordre des zones préservé (échantillon de perfs : `etat` pointe le bon libellé).

## Sortie attendue

- Un script SQL/TS d'import idempotent (rejouable après `db:reset`).
- Un rapport de vérification listant chaque point de la checklist avec OK/écart.
