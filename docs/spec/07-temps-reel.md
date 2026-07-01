# 07 — Temps réel (SSE → Supabase Realtime)

Source : `api/signals.py`, `api/react/observer.jsx`, `pyInterClubs/urls.py:44`. Aujourd'hui
le temps réel repose sur **`django-eventstream`** (SSE) sur un **canal unique `events`**.
Seuls **3 modèles** émettent des événements : `Equipe`, `Score`, `Performance`
(`api/signals.py:62-66`) — les autres ne changent pas pendant la rencontre.

## 1. Modèle d'événement actuel

Un événement = `(channel="events", event_id, data)` envoyé sur **commit de transaction**
(`transaction.on_commit`). L'`event_id` joue le rôle de **topic logique** ; le front
s'abonne par `event_id`. `data` = objet sérialisé, ou `{"deleted": {"id": N}}`.

### Topics émis

| Modèle | Action | Topics (`event_id`) | Source |
| -------- | -------- | --------------------- | -------- |
| Equipe | create | `club/{club}/equipes/`, `equipes/` | `api/signals.py:76-78` |
| Equipe | delete | `club/{club}/equipes/`, `equipes/`, `equipes/{id}/` | `:80-83` |
| Equipe | update | `equipes/{id}/` si un de `ordre,numero,score.deleted,score.created,points` a changé | `:85-89` |
| Score | create | `club/{club}/scores/`, `scores/` + `equipe.update({score.created})` | `:126-129` |
| Score | delete | `club/{club}/scores/`, `scores/` + `equipe.update({score.deleted})` | `:131-135` |
| Score | update | `scores/{id}/` ; si `ordre`/`points` changent → `equipe.update` | `:137-142` |
| Performance | create | `voie/{voie}/perfs/` | `:187-190` |
| Performance | delete | `voie/{voie}/perfs/` | `:192-193` |
| Performance | update (voie_id) | `voie/{voie}/perfs/` + `voie/{ancienne}/perfs/` (suppression) | `:196-199` |
| Performance | update (etat) | `voie/{voie}/perfs/` | `:201-210` |
| Performance | update (always) | `perfs/{id}/` ; si `points` change → `score.update` | `:212-216` |

Les champs « changed » proviennent du `FieldTracker` (`tracker.changed()`,
`api/signals.py:151,225`). La propagation est **en cascade** : une perf qui change ses
points notifie son score, qui notifie son équipe.

## 2. Côté client actuel

`SSEProvider` (`api/react/observer.jsx`) ouvre `new EventSource('/events/')`, expose
`subscribe(topic, cb)` / `unsubscribe`. `useSSEUpdater({queryKey, endpoint, debounceTime})`
écoute un topic et **met à jour le cache React Query** :

- tableau : si `data.deleted.id` → retirer ; si trouvé → remplacer ; sinon → ajouter ;
- objet : fusion par id, ou mise à null si supprimé.
Perte de connexion → toast.

Abonnements par composant (doc 04/05) : `equipes/`, `club/{club}/equipes/`, `equipes/{id}/`,
`scores/`, `club/{club}/scores/`, `scores/{id}/`, `perfs/{id}/`, `voie/{voie}/perfs/`.

## 3. Mapping cible — Supabase Realtime

Deux approches possibles ; **recommandée : Broadcast piloté par triggers** pour reproduire
fidèlement la granularité actuelle (topics logiques, payloads sérialisés, cascade).

### 3.1 Option A — Broadcast (recommandée)

- Des **triggers Postgres** (les mêmes que pour le scoring, doc 02 §8) appellent
  `realtime.broadcast_changes` / `pg_notify` avec un **topic** dérivé de l'`event_id`
  actuel et un **payload** équivalent au serializer.
- Le front s'abonne aux topics via `supabase.channel(topic)` — **un mapping 1:1** avec les
  `event_id` ci-dessus (ex. `voie:{id}:perfs`, `equipes`, `club:{club}:equipes`,
  `scores:{id}`…). On garde la sémantique « ajout/maj/suppression » et `{deleted:{id}}`.

| Topic actuel | Topic Realtime cible |
| -------------- | ---------------------- |
| `equipes/` | `equipes` |
| `club/{club}/equipes/` | `club:{club}:equipes` |
| `equipes/{id}/` | `equipes:{id}` |
| `scores/` | `scores` |
| `club/{club}/scores/` | `club:{club}:scores` |
| `scores/{id}/` | `scores:{id}` |
| `perfs/{id}/` | `perfs:{id}` |
| `voie/{voie}/perfs/` | `voie:{voie}:perfs` |

### 3.2 Option B — Postgres Changes

- Activer Realtime sur `equipe`, `score`, `performance` et s'abonner par filtres
  (`rencontre_id`, `club_id`, `voie_id`). Plus simple à câbler mais **payloads = lignes
  brutes** (pas les agrégats `points`/`valide`) → il faut **recomposer côté client** ou via
  des **vues** Realtime. Convient si on accepte de recalculer les agrégats au client.

### 3.3 Cascade & agrégats

La cascade perf→score→équipe (points/valide) doit être préservée :

- en **Option A**, le trigger émet aussi les topics parents avec les agrégats recalculés
  (depuis les vues `v_score_points`/`v_equipe_points`, doc 02) ;
- en **Option B**, le client réagrège ou s'abonne aux vues.

## 4. Multi-rencontres

Le canal unique `events` empêche plusieurs rencontres simultanées (TODO noté
`pyInterClubs/urls.py:40-43`). **Cible** : **préfixer les topics par `rencontre:{id}:`**
(ex. `rencontre:{r}:voie:{v}:perfs`) pour isoler les rencontres — résout d'emblée la
limitation actuelle.

## 5. Remplacement du hook client

`useSSEUpdater` → un hook `useRealtime(topic, onMessage)` au-dessus de `supabase.channel`,
conservant : debounce, mise à jour optimiste du cache (TanStack Query), gestion
ajout/maj/suppression, toast sur perte de connexion. La logique de réconciliation du cache
(doc §2) est reprise telle quelle.
