# 09 — Rapports imprimables

Source : `admin/views.py:161-398`, templates `admin/templates/reports/`. Les rapports
étendent `reports/ranking.html` (basé sur `base.html`, **mise en page print A4**, marges
20 mm, sauts de page, Chart.js). Réservés au **superuser**.

## 1. Données communes

`RencontreReportViewMixin.get_queryset` (`admin/views.py:180-194`) précharge la rencontre
avec équipes/scores/perfs annotés (`with_valide_and_points`) et `with_counts/with_valide`.
Helper de **classement avec ex æquo** (`ranking`, `:166-174`) : rang +1 par groupe de
même `points`.

## 2. Rapports d'une rencontre

### Stats — `report/<pk>/stats` (`StatsReportView`, `:232-310`)

Graphique **Chart.js empilé** par voie :

- **axe X** : voies (triées) + colonne « Abandon » ;
- **axe Y gauche** : nombre de passages (barres empilées) ;
- **axe Y droit** : temps (s) en nuage de points (`temps`, `:274-275`) ;
- **empilements** : par **genre** (H/F/mixte), par **état** (Chute, Zone, Zone 1/2, Top…
  dans l'ordre du barème, `:280-298`), par **type** (Bloc/Diff/Vitesse).
- Les perfs sans points / « Abandon » sont rangées dans la colonne « Abandon » (`:271-273`).
- Les états calculés (`{rank}`) sont ignorés (`:286`). `max` Y calculé dynamiquement (`:306`).

Le contexte fournit aussi `classements` (H/F), `equipes` triées, `inscrits` groupés par
club — réutilisés par les autres rapports.

### Classement par équipes — `report/<pk>/teams` (`TeamsReportView`, `:311-320`)

Équipes triées par points décroissants. Template `p_equipe.html` : par équipe (sans saut de
page interne), en-tête colonnes (Grimpeur, colonnes Bloc×`nbBloc`, Diff×`nbDiff`, Vitesse,
Points), une ligne par grimpeur (nom + badge club prêteur, points + libellé d'état par
voie, total).

### Classement individuel — `report/<pk>/ranking` (`RankingReportView`, `:321-335`)

Deux colonnes **Femmes / Hommes**, table (rang, nom, club, points), médailles top 3.
Template `p_individuel.html`.

### Inscriptions — `report/<date>/registration` (`RegistrationReportView`, `:336-349`)

Liste des grimpeurs **par club** (dédupliqués, triés club/nom/prénom). Filtré par **date**.
Template `p_inscrits.html`.

## 3. Rapports de saison (multi-rencontres)

`MultiRencontreReportViewMixin` (`:209-229`) filtre par `date` ou `saison` et **agrège par
grimpeur** (somme des points sur toutes les rencontres, `sort`, `:210-219`).

- **Classement individuel de saison** — `report/<saison>-/ranking`
  (`SeasonRankingReportView`, `:351-367`) : par **catégorie** (enfants/ado) × **sexe**,
  classement cumulé.
- **Classement équipes de saison** — `report/<saison>-/teams`
  (`SeasonTeamsReportView`, `:368-397`) : regroupe les équipes par **club+numéro** (clé
  `__str__`), somme des points, classement par catégorie.

## 4. Mise en page imprimable

- CSS print A4 (portrait/landscape selon rapport), marges 20 mm, `font-size` réduit (~11 px).
- Sauts de page entre équipes (`no-page-break`), en-têtes de table répétés (`thead`),
  classe `no-print` pour masquer les contrôles, Chart.js mis à l'échelle pour l'impression.

## 5. Mapping cible

| Actuel | Cible |
| -------- | ------- |
| Vues Django + templates print | **Pages Next.js imprimables** (`app/(admin)/reports/...`), CSS `@media print` A4 |
| Agrégats (`ranking`, sommes, ex æquo) | **vues SQL** `v_classement`, `v_equipe_points`, `v_saison_*` (doc 02) |
| Chart.js | Chart.js (idem) côté client |
| Filtres date/saison | params de route + requêtes Supabase |
| Restriction superuser | RLS + garde de route admin |

> Les rapports sont en **lecture seule** : ils peuvent être générés côté serveur Next.js
> (rendu statique/SSR) à partir des vues SQL, sans dépendre du temps réel.
