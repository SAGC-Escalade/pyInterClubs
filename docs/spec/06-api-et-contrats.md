# 06 — API et contrats

Source : `api/urls.py`, `api/views.py`, `api/serializers.py`. L'API actuelle est en **DRF**
(routeur `DefaultRouter`). Toutes les vues exigent une **rencontre courante** sélectionnée
(`WithRencontreRequiredMixin`, `admin/middleware.py:57-65` → sinon « L'administrateur n'a
pas démarré de rencontre. »).

> **Cible** : conserver **les mêmes formes JSON** pour limiter la réécriture du front.
> Les endpoints deviennent des **route handlers Next.js** (ou des appels supabase-js
> directs protégés par RLS). Les calculs/validations sont délégués à Postgres (doc 02).

## 1. Endpoints (routeur)

| Ressource | Routes | ViewSet |
|-----------|--------|---------|
| Clubs | `clubs/`, `clubs/<id>/` | `ClubViewSet` |
| Voies | `voies/`, `voies/<id>/` | `VoieViewSet` |
| Grimpeurs | `grimpeurs/`, `grimpeurs/<id>/` | `GrimpeurViewSet` |
| Rencontres | `rencontres/`… | `RencontreViewSet` |
| Équipes | `equipes/`, `equipes/<id>/`, `club/<club>/equipes/` | `EquipeViewSet` |
| Scores | `scores/`, `scores/<id>/`, `club/<club>/scores/` | `ScoreViewSet` |
| Perfs | `perfs/`, `perfs/<id>/`, `voie/<voie>/perfs/` | `PerformanceViewSet` |

Actions personnalisées sur `scores/` :
- `POST scores/<id>/ordre/up` · `POST scores/<id>/ordre/down` → 204 (`api/views.py:158-165`)
- `POST scores/<id>/groupe/` `{id: <voie_id>}` → 204 (`:167-175`)
- `POST scores/<id>/register/` `{voie: <voie_id>}` → 204 (`:177-186`)

## 2. Filtrage par rôle (à reproduire en RLS)

| ViewSet | Règle |
|---------|-------|
| Club | tous ; filtre texte `?q=` sur nom/ville (`api/views.py:69-73`) |
| Voie | toutes (`:76-78`) |
| Grimpeur | club du coach + catégorie d'âge (sauf admin) + non-inscrits + `?q=` (`:84-106`) |
| Equipe | rencontre courante + club (coach) ; annoté `points`/`valide` (`:117-126`) |
| Score (coach/admin) | rencontre + club ; annoté `points`/`valide` ; perfs préchargées (`:151-156`) |
| Score (juge) | scores avec ≥1 perf sans voie + `?q=` (`:139-149`) |
| Performance | rencontre ; si route `voie/<voie>/`, filtre voie + grimpeur ; juge → `FullPerformanceSerializer` (`:192-207`) |

## 3. Formes JSON

### Club (`ClubSerializer`)
```json
{ "id": 5, "nom": "Club A", "ville": "Paris" }
```

### Voie (`VoieSerializer`, exclut `actif`)
```json
{ "id": 10, "nom": "T3", "niveau": "5b", "categorie": 2, "genre": 3, "type": 2,
  "zones": {"A réaliser": null, "Chute": 0, "Zone 2": 6, "Zone 1": 5, "Top": 8} }
```

### Grimpeur (`GrimpeurSerializer`)
```json
{ "id": 100, "nom": "Dupont", "prenom": "Jean", "anneeNaissance": 2010,
  "sexe": 2, "club_nom": "Club B" }
```

### Équipe (`EquipeSerializer`)
```json
{ "id": 42, "membres": [999, 1000], "club": {"id":5,"nom":"Club A","ville":"Paris"},
  "numero": 1, "valide": false, "points": 0 }
```
`membres` = liste d'**ids** de scores. `points`/`valide` en lecture seule (annotés).
Création : entrée `{ "numero": 1 }` (le `club`/`rencontre` sont injectés depuis le profil,
`api/serializers.py:154-161`).

### Score (`ScoreSerializer`)
```json
{ "id": 999, "ordre": 1,
  "equipe": 42,
  "grimpeur": {"id":100,"nom":"Dupont","prenom":"Jean","anneeNaissance":2010,"sexe":2,"club_nom":"Club B"},
  "clubPreteur": null,
  "points": 0, "valide": false,
  "performances": {"Bloc": [1,2], "Difficulté": [3,4,5], "Vitesse": [6]},
  "groupe": null, "started": false }
```
- `performances` : ids de perfs **groupés par type** (`api/serializers.py:204-206`).
- `groupe` : id de la 1ʳᵉ voie de diff (mode groupé) ou `null` (`:208-218`).
- `started` : booléen (`false` pour admin ; sinon vrai si ≥1 perf diff a des points, `:220-224`).
- En écriture : `equipe`, `grimpeur` (pk), `clubPreteur` (pk, optionnel) ; `ordre`
  optionnel (auto premier libre). `grimpeur`/`clubPreteur` sont renvoyés **imbriqués** en
  sortie (`to_representation`, `:226-236`).

### Performance (`PerformanceSerializer` / `FullPerformanceSerializer` pour juge)
```json
{ "id": 6, "voie": {"id":20,"nom":"Vitesse","niveau":"Homme", "...": "..."},
  "temps": "00:00:08.45", "points": 60, "etat": 4 }
```
`temps` : chaîne formatée `HH:MM:SS.CC`, ou « A réaliser » / « Chute » / « Abandon »
(`api/serializers.py:258-283`). `FullPerformanceSerializer` ajoute `grimpeur` imbriqué.

## 4. Effets de bord à l'écriture (à porter en triggers/fonctions)

- **POST score** : crée le score + génère les perfs bloc/diff/vitesse (doc 02 §4, §5).
- **PATCH perf** (etat) : recalcule `points` (bloc/diff).
- **PATCH perf** (temps, vitesse) : recalcule le **classement** par rang/sexe (doc 02 §3).
- **POST groupe** : affecte `nbDiff` voies de diff consécutives ; resauvegarde le score
  pour **forcer la notification** (`api/views.py:174`).
- **POST register** : affecte la voie du juge à la 1ʳᵉ perf sans voie.

## 5. Gestion des erreurs

- **Validation Django → DRF** : `handle_django_errors` (`api/views.py:35-47`) convertit les
  `ValidationError` en 400 (ex. « Une équipe ne peut pas avoir plus de 8 membres. »,
  « Les voies ne sont faisables qu'une seule fois »).
- **Suppression protégée** (`api/exceptions.py`) : un `ProtectedError` (FK PROTECT) →
  400 `{"delete": "Suppression impossible: cet élément est protégé..."}`. Concerne la
  suppression d'un club/grimpeur/voie référencé.

> **Cible** : centraliser les messages d'erreur FR. Les violations de contraintes Postgres
> (FK `restrict`, `check`, triggers `raise exception`) sont **mappées** vers ces mêmes
> messages dans la couche API Next.js.

## 6. Codes de retour

| Action | Code |
|--------|------|
| list/retrieve | 200 |
| create | 201 |
| update/patch | 200 |
| destroy | 204 |
| actions `ordre`/`groupe`/`register` | 204 |
| erreur de validation / protégé | 400 |
| rencontre non démarrée | 400 (ValidationError middleware) |
