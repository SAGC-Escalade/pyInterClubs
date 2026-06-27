---
name: interface-terrain
description: Scaffolde les interfaces « terrain » coach (leader) et juge de pyInterClubs — CRUD équipe, ordre des grimpeurs, groupe de voies diff, saisie de performance (temps/etat), live via useRealtime. À utiliser pour « écran coach », « feuille de juge », « saisie perf », « inscription grimpeur ».
---

# Interfaces terrain (coach & juge)

Plus grosse tranche restante. Reproduit les workflows Django `leader/` et `judge/`
côté Next.js + Supabase. Réf. : `docs/spec/04-workflows-coach.md`,
`docs/spec/05-workflows-juge.md`, et le contrat `api/serializers.py` (legacy).

## Règles métier à respecter (depuis le legacy `core/models.py` + `api/serializers.py`)

- **Inscription d'un grimpeur (Score)** : à la création, auto-générer 3 lots de
  `performance` — `nbBloc` blocs (voie pré-affectée, filtrée par sexe), `nbDiff`
  diffs (`voie_id = null`, affectées ensuite), `nbVitesse` vitesses (pré-affectées).
  `ordre` = plus petit entier libre 1..8. `club_preteur` ≠ null si le grimpeur
  vient d'un autre club que l'équipe.
- **`ordre` up/down** : échange atomique avec le voisin (cf. `fn_score_ordre` à
  créer côté SQL ; jamais de trou ni de doublon).
- **`groupe` (diffs groupées)** : si `rencontre.voies_groupees`, le coach choisit
  une voie diff de départ → affecter cette voie + les `nbDiff-1` diffs contiguës.
- **Réutilisation de voie** : interdite deux fois pour le même grimpeur/rencontre
  sauf `voies_reutilisables` ou `voies_groupees`.
- **Saisie performance (juge)** : `etat` = index dans `voie.zones` ; `temps` =
  durée avec valeurs spéciales **Chute = -1 min**, **Abandon = -2 min**,
  `null` = « À réaliser ». Bloc/diff : points instantanés (trigger). Vitesse :
  recalcul par rang (trigger `trg_speed_recalc`).
- **Validité** : un score est `valide` si les `nbBloc`+`nbDiff`+`nbVitesse`
  performances ont des points non nuls (vue `v_score_points`).

## Côté SQL (créer d'abord, via skill nouvelle-migration)

- `fn_score_ordre(score_id, sens)` — swap ordre (security definer, garde coach).
- `fn_score_groupe(score_id, voie_id)` — affectation diffs groupées.
- `fn_inscrire_grimpeur(...)` — création score + performances (doc 02 §4).
- Policies RLS coach : écriture sur `equipe`/`score`/`performance` limitée à son
  `club` + `rencontre` (claims JWT, doc 10 §3) → dépend de la skill **auth-provisioning**.

## Côté front

- Composants client sous `web/components/leader/` et `web/components/juge/`,
  pages sous `web/app/leader/...` et `web/app/judge/...`.
- Réutiliser le patron React Query + `frError` (cf. `ClubsManager.tsx`) et
  `lib/constants.ts` pour les libellés.
- **Live** : `useRealtime(["score","performance","equipe"], () => refetch())`
  (cf. `lib/realtime/useRealtime.ts`, comme `components/Ranking.tsx`).
- Mutations via RPC : `supabase.rpc("fn_score_ordre", { ... })`,
  `supabase.rpc("fn_score_groupe", { ... })`.
- Saisie temps : helper de conversion `mm:ss.cc ↔ interval`, avec boutons
  dédiés « Chute » / « Abandon » mappant vers -1/-2 min.

## Vérification

- Seed un jeu de test via la skill **seed-qa** (équipe + grimpeurs + voies).
- Vérifier l'auto-création des performances à l'inscription, le swap d'ordre, le
  groupe de diffs, et le recalcul vitesse en confrontant à l'agent **scoring-validator**.
- Confirmer que le classement `/resultats` se met à jour en live après une saisie.
