---
name: rapports
description: Crée les rapports pyInterClubs (stats, classements équipes/individuels H-F par catégorie, classement de saison) — vues d'agrégat Postgres + pages Next.js. À utiliser pour « rapport stats », « classement équipes », « classement individuel », « classement saison ».
---

# Rapports

Reproduit les rapports Django (`admin/views.py` : `StatsReportView`,
`TeamsReportView`, `RankingReportView`, `SeasonRankingReportView`) côté
Supabase + Next.js. Réf. : `docs/spec/09-rapports.md`.

## Côté SQL (migration via skill nouvelle-migration)

Créer les vues d'agrégat manquantes sur le modèle de `v_classement` /
`v_equipe_points` (`0003_views_classement.sql`) :

- **Classement individuel** : par `rencontre` + `sexe`, `rank()` sur les points
  (déjà fourni par `v_classement` — réutiliser).
- **Classement équipes** : `v_equipe_points` ordonné par points (réutiliser).
- **Classement de saison** : nouvelle vue agrégeant plusieurs rencontres d'une
  `saison`, par `categorie` + `sexe`.
- **Stats de passage** : comptes/temps par voie (pour graphiques).

Conventions : préfixe `v_*`, `grant select ... to authenticated` (et `anon`
uniquement si le rapport est public, comme `v_classement`).

## Côté front

- Pages sous `web/app/admin/rapports/...` (rapports admin) ; le classement public
  vit déjà sous `app/(public)/resultats`.
- Lecture via `useQuery` sur les vues (client anon, RLS). Tri/affichage H/F par
  catégorie, libellés via `lib/constants.ts`.
- Réutiliser `components/Ranking.tsx` et `react-flip-move` pour les classements
  animés. Pour les rapports figés (impression), prévoir une vue sans live.
- Graphiques : choisir une lib légère cohérente avec la stack (Bootstrap déjà
  présent) — confirmer avant d'ajouter une dépendance.

## Vérification

- Comparer les totaux aux annotations Django (`Score`/`Equipe.with_valide_and_points`)
  sur un jeu seedé.
- `npm run db:reset && npm run db:types`, puis `npm run lint`.
