# Supabase — base de données pyInterClubs

Schéma, fonctions de scoring et RLS. Réf. spec : [`../../docs/spec/`](../../docs/spec/README.md).

## Migrations

| Fichier | Contenu | Spec |
| --------- | --------- | ------ |
| `migrations/0001_initial_schema.sql` | Tables (club, grimpeur, voie, rencontre, equipe, score, performance, rencontre_voie, coach, juge, config), index, RLS provisoire | doc 01 |
| `migrations/0002_scoring.sql` | Évaluateur `{rank}` sûr, scoring bloc/diff (trigger), recalcul vitesse par rang/sexe, vues d'agrégat `v_score_points`/`v_equipe_points` | doc 02 |
| `seed.sql` | Barème de voies de référence (vitesse, blocs, diffs) | doc 11 §6 |

## Conventions importantes

- **`zones`** = `jsonb` **tableau ordonné** `[{ "label", "points" }]`. L'index dans le
  tableau = `etat` d'une performance (doc 02 §6). Pour la vitesse, `label`/`points`
  peuvent porter des expressions sur `{rank}`.
- **Pas d'`eval()`** : les expressions vitesse sont interprétées par
  `fn_eval_rank_condition` / `fn_eval_rank_points` (grammaire restreinte).
- **RLS provisoire** : lecture authentifiée, écriture via `service_role`. À raffiner par
  rôle (claims JWT) selon doc 10 §3.

## Utilisation

```bash
# Depuis web/ :
supabase start            # stack locale (Docker) + applique migrations + seed
supabase db reset         # réinitialise + rejoue migrations + seed
supabase db push          # applique sur le projet distant lié
supabase gen types typescript --local > lib/supabase/database.types.ts
```

## ⚠️ À valider

`fn_proceed_speed_points` reproduit l'algorithme du doc 02 §3 mais **n'a pas encore été
testé**. Le valider contre les **cas de référence du doc 02 §7** (ex æquo, Abandon/Chute
qui n'incrémentent pas le rang, formules `15-{rank}` / `11-{rank}//5` / `60-{rank}`) avant
toute mise en production.

## Reste à faire

- Politiques RLS par rôle (admin/coach/juge) + claims JWT (doc 10).
- Fonctions `fn_score_ordre` (swap), `fn_score_groupe` (affectation diffs groupées),
  création des performances à l'inscription (doc 02 §4, doc 04 §5).
- Recalage des `etat` à l'édition des `zones` d'une voie (doc 02 §6).
- Vue de classement `v_classement` (rang par points/sexe) pour les rapports (doc 09).
- Diffusion temps réel (Realtime broadcast par trigger) (doc 07).
