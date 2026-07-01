# 04 — Workflows coach (leader)

Source : `leader/views.py`, `leader/urls.py`, `leader/react/*.jsx`, `api/views.py`
(filtres coach). Le coach gère **les équipes et grimpeurs de son club** dans la
**rencontre courante**.

## 1. Connexion

Le coach scanne un **QR code** (fourni par l'admin) qui pointe vers
`/accounts/club?token=<md5>` ; le token l'authentifie sans mot de passe (doc 10). Son
`Profil` de type `Coach` porte le `club` et la `rencontre` → le middleware injecte
`interclub.club` et `interclub.rencontre` (`admin/middleware.py:38-41`).

## 2. Écrans et routes

| Route (`leader/`) | Vue / template | Contenu |
| ------ | ------ | --------- |
| `` | `mes-grimpeurs.html` (React `ListScore`) | Tous les grimpeurs inscrits par le club |
| `create` | `EquipeCreateView` (`leader/views.py:15-46`) | Créer une équipe (sélecteur de club) |
| `<pk>` | `EquipeUpdateView` (`leader/views.py:10-12`, React `Equipe`) | Éditer une équipe |

La page d'accueil `/` (template `p_index.html`) affiche aussi la liste des équipes du coach
(React `ListEquipe`), et le menu latéral (`p_menu.html`) expose « Mes grimpeurs »,
« Mes équipes », « Ajouter une équipe ».

## 3. Gestion d'une équipe

Composant `Equipe` (`leader/react/equipe.jsx`) :

- **Numéro d'équipe** éditable (PATCH `equipes/<id>`).
- **Accordéon** des membres (≤ 8). Chaque membre = composant `Score`.
- **Ajout d'un membre** (`AddScore`) : autocomplétion sur `grimpeurs/` (≥ 3 caractères),
  puis `POST scores/`. Masqué quand l'équipe a 8 membres.
- **Suppression de l'équipe** : `DELETE equipes/<id>` avec modale de confirmation
  (échoue avec message si l'équipe est protégée — voir doc 06 §5).

### Filtrage des grimpeurs proposés

`GrimpeurViewSet.get_queryset` (`api/views.py:84-106`) : grimpeurs **du club du coach**,
filtrés par **catégorie d'âge** de la rencontre (enfants/ado, via `saison`),
**excluant ceux déjà inscrits** (`exclude_inscrits`), + filtre texte `?q=`. Pour l'admin
(superuser) le filtre d'âge n'est pas appliqué (`:89`).

## 4. Gestion d'un membre (Score)

Composant `Score` (`leader/react/score.jsx`) — accordéon par grimpeur :

- **En-tête** : nom, icône de genre, badge club prêteur (si emprunté), badge points.
- **Réglages** (toggle) :
  - **Groupe** : sélecteur de voie de diff (mode groupé) → `POST scores/<id>/groupe/`
    `{id: <voie_id>}` ; affecte `nbDiff` voies consécutives (doc 02 §4).
  - **Club prêteur** : autocomplétion `clubs/` → PATCH `scores/<id>`.
  - **Ordre** : boutons monter/descendre → `POST scores/<id>/ordre/up` ou `/down`
    (`api/views.py:158-165`).
  - **Supprimer** le membre : `DELETE scores/<id>`.
- **Saisie des performances** par type (Bloc / Difficulté / Vitesse) via `PerfInput`
  (doc 05/08), regroupées d'après le champ `performances` du score
  (`api/serializers.py:204-206`).

> Côté coach, certaines actions se verrouillent quand `started=true` (le grimpeur a déjà
> des points en diff, `api/serializers.py:220-224`).

## 5. Création d'un membre — effets de bord

`ScoreSerializer.create` (`api/serializers.py:238-254`, transaction) :

1. choisit le **premier ordre libre** (1..8) si non fourni ;
2. crée le `Score` (et `clubPreteur` auto si autre club, `core/models.py:491-496`) ;
3. **crée les performances** : `nbBloc` perfs bloc + `nbDiff` perfs diff (sans voie) +
   `nbVitesse` perfs vitesse, selon le **genre** du grimpeur.

`EquipeSerializer.create` (`api/serializers.py:154-161`) : injecte automatiquement `club`
et `rencontre` depuis le profil du coach (le coach ne choisit que le numéro).

## 6. Temps réel

Les composants s'abonnent au flux SSE (doc 07) :

- `ListEquipe` ↔ `equipes/`, `club/{club}/equipes/` ;
- `Equipe` ↔ `equipes/{id}/` ;
- `Score` ↔ `scores/{id}/`, `perfs/{id}/` ;
- `ListScore` ↔ `scores/`, `club/{club}/scores/`.

Quand un juge saisit une performance, les points et la validité du membre/équipe se
mettent à jour en direct chez le coach (animations flip-move, doc 08).

## 7. Mapping cible

| Actuel | Cible |
| -------- | ------- |
| Filtres `get_queryset` coach | **RLS** : coach ne lit/écrit que ses équipes/scores de la rencontre courante |
| `scores/<id>/ordre\|groupe`,`register` | route handlers Next.js appelant `fn_score_ordre` / `fn_score_groupe` |
| Abonnements SSE | abonnements Supabase Realtime filtrés par club/rencontre (doc 07) |
| Autocomplétion grimpeurs | requête supabase filtrée (club, catégorie d'âge, non-inscrits) |
