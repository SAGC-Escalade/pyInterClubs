# Cahier de recette — pyInterClubs (tranches 5 à 8)

Recette manuelle (IHM) du front Next.js + Supabase, couvrant les rapports
imprimables (T5), le temps réel avancé (T6), la reprise de données (T7) et les
finitions/durcissement (T8).

Réf. : `docs/spec/` (07, 09, 10, 11) et la checklist de couverture `00 §6`.
Suite du cahier `docs/recette-tranches-1-4.md`. Chaque scénario indique des
étapes et le résultat attendu ; reporter le statut dans la dernière colonne.

## 1. Préparation de l'environnement

```bash
cd web
npm install
npm run db:start          # Supabase local (Postgres + Studio :54323)
npm run db:reset          # applique les migrations + seed.sql
npm run db:types          # régénère lib/supabase/database.types.ts
npm run dev               # http://localhost:3000
```

Données semées (cf. `web/supabase/seed.sql`) : voir le cahier tranches 1-4.
Les rapports s'appuient sur la **Rencontre démo T1** (entièrement scorée) pour
des tableaux non vides, et sur plusieurs rencontres d'une même **saison** pour
les rapports cumulés.

## 2. Comptes et connexions

- **Admin** : les rapports sont **réservés à l'admin** (garde de layout
  `/admin`). Se connecter via `/login` avec le compte promu admin.
- Les rôles coach/juge n'ont pas accès aux rapports.

## 3. Légende des statuts

- ✅ Conforme.
- ❌ Non conforme (noter l'écart).
- ⏭️ Non testé / non encore implémenté (tranches à venir).

## 4. Tranche 5 — Rapports imprimables

Réf. : `docs/spec/09-rapports.md`, port de `admin/views.py:161-398`.
Logique d'agrégation couverte par Vitest : `web/test/tranche5/` (helpers
`lib/reports/ranking.ts` et `lib/reports/stats.ts`).

### 4.1 Accès et navigation

| ID | Scénario | Étapes | Résultat attendu | Statut |
|----|----------|--------|------------------|--------|
| T5-01 | Garde admin | Déconnecté, ouvrir `/admin/reports` | Redirection vers `/login` | |
| T5-02 | Index des rapports | Connecté admin → onglet « Rapports » | Liste des rencontres (par date décroissante) avec 4 boutons (Stats, Équipes, Individuel, Inscriptions) ; section « Par saison » listant les saisons | |
| T5-03 | Navigation | Cliquer sur chaque bouton de rapport | Ouvre la page correspondante avec l'en-tête de rencontre (ville, date, catégorie) | |

### 4.2 Classement individuel — `report/<id>/ranking`

| ID | Scénario | Étapes | Résultat attendu | Statut |
|----|----------|--------|------------------|--------|
| T5-04 | Deux colonnes | Ouvrir le rapport « Individuel » | Colonnes **Femmes** et **Hommes** séparées, triées par points décroissants | |
| T5-05 | Ex æquo | Deux grimpeurs à points égaux | Même rang partagé, puis saut de rang (ex. 1, 1, 3) | |
| T5-06 | Médailles top 3 | Observer les 3 premiers de chaque colonne | Médaille or / argent / bronze sur les rangs 1 à 3 | |

### 4.3 Classement par équipes — `report/<id>/teams`

| ID | Scénario | Étapes | Résultat attendu | Statut |
|----|----------|--------|------------------|--------|
| T5-07 | Tri des équipes | Ouvrir le rapport « Équipes » | Équipes triées par points décroissants ; badge vert si l'équipe est valide, bleu sinon | |
| T5-08 | Colonnes par voie | Observer l'en-tête de table d'une équipe | Une colonne par voie (dans l'ordre d'affichage) + colonne « Points » ; cellule = points de la perf (`—` si absente), libellé d'état en infobulle | |
| T5-09 | Badge prêté | Grimpeur prêté par un autre club | Badge « prêté &lt;club&gt; » à côté du nom | |

### 4.4 Inscriptions — `report/<id>/inscriptions`

| ID | Scénario | Étapes | Résultat attendu | Statut |
|----|----------|--------|------------------|--------|
| T5-10 | Groupé par club | Ouvrir le rapport « Inscriptions » | Grimpeurs groupés par club, triés nom/prénom ; catégorie d'âge (U11..U21) affichée | |
| T5-11 | Dédoublonnage | Un grimpeur inscrit dans deux équipes | Il n'apparaît **qu'une seule fois** | |

### 4.5 Stats — `report/<id>/stats`

| ID | Scénario | Étapes | Résultat attendu | Statut |
|----|----------|--------|------------------|--------|
| T5-12 | Séries par genre/état/type | Ouvrir le rapport « Stats » | Trois tableaux : passages par **genre**, par **état**, par **type** ; une colonne par voie + colonne « Abandon » | |
| T5-13 | Colonne Abandon | Perf sans points (non scorée ou Abandon) | Comptée dans la colonne « Abandon », pas sous la voie | |
| T5-14 | États calculés ignorés | Voie de vitesse (barème `{rank}`) | Les états `{rank}` **n'apparaissent pas** dans le tableau par état | |
| T5-15 | Temps de vitesse | Perfs de vitesse chronométrées | Section « Temps de vitesse » listant les temps (mm:ss.cc) par voie | |

### 4.6 Rapports de saison

| ID | Scénario | Étapes | Résultat attendu | Statut |
|----|----------|--------|------------------|--------|
| T5-16 | Individuel de saison | `report/saison/<saison>/ranking` | Par **catégorie** (Enfants/Adolescents) × **sexe** ; points **cumulés** sur toutes les rencontres de la saison | |
| T5-17 | Équipes de saison | `report/saison/<saison>/teams` | Équipes regroupées par **club + numéro**, points cumulés, par catégorie | |
| T5-18 | Cumul multi-rencontres | Un grimpeur ayant couru 2 rencontres de la saison | Ses points sont **sommés** ; une seule ligne au classement de saison | |

### 4.7 Impression A4

| ID | Scénario | Étapes | Résultat attendu | Statut |
|----|----------|--------|------------------|--------|
| T5-19 | Aperçu impression | Bouton « Imprimer » (ou Ctrl+P) sur un rapport | Mise en page A4 ; contrôles (`no-print`) masqués ; pas de coupure au milieu d'une équipe/colonne (`no-page-break`) | |

## 5. Tranche 6 — Temps réel avancé (à implémenter)

Réf. : `docs/spec/07-temps-reel.md`. Remplace l'abonnement direct aux tables
(T1) par une **diffusion broadcast par trigger**, avec des topics par
rencontre/voie (cf. `0003_views_classement.sql:56`, `lib/realtime/useRealtime.ts:11`).

| ID | Scénario | Étapes | Résultat attendu | Statut |
|----|----------|--------|------------------|--------|
| T6-01 | Broadcast par trigger | Saisir une perf (juge) | Un message broadcast est émis sur le topic de la rencontre (au lieu d'un `postgres_changes` par table) | ⏭️ |
| T6-02 | Topic par rencontre | Deux rencontres ouvertes en parallèle | Un client n'écoute que sa rencontre ; pas de fuite d'événements entre rencontres | ⏭️ |
| T6-03 | Topic par voie (juge) | Deux juges sur des voies différentes | Chaque feuille ne se rafraîchit que pour ses voies | ⏭️ |
| T6-04 | Charge / débit | Rafale de saisies | Pas de perte d'événement ni de sur-rafraîchissement (debounce) | ⏭️ |
| T6-05 | Non-régression T1/T4 | Classement public + écrans coach/juge | Les mises à jour live restent conformes aux scénarios T1-04 et T4-14 | ⏭️ |

## 6. Tranche 7 — Reprise de données (à implémenter)

Réf. : `docs/spec/11-migration-donnees.md`. Port des commandes Django
`importClimbers`, `importHistoricDB`, `addVoies`.

| ID | Scénario | Étapes | Résultat attendu | Statut |
|----|----------|--------|------------------|--------|
| T7-01 | Import grimpeurs (CSV) | Importer un CSV de grimpeurs | Grimpeurs créés/mis à jour ; rattachement au club ; doublons gérés | ⏭️ |
| T7-02 | Barème de voies | Rejouer l'équivalent d'`addVoies` | Voies de référence (bloc/diff/vitesse) créées avec leurs `zones` | ⏭️ |
| T7-03 | Import base historique | Importer la base SQLite historique | Rencontres/équipes/scores/perfs repris ; classements cohérents | ⏭️ |
| T7-04 | Idempotence | Rejouer un import | Pas de doublon ; mise à jour en place | ⏭️ |
| T7-05 | Intégrité | Après import | Contraintes FK/uniques respectées ; rapports T5 exploitables | ⏭️ |

## 7. Tranche 8 — Finitions & durcissement (à implémenter)

Réf. : `docs/spec/08`, `10`, checklist `00 §6`.

| ID | Scénario | Étapes | Résultat attendu | Statut |
|----|----------|--------|------------------|--------|
| T8-01 | RLS par rôle | Tenter des accès croisés (coach↔juge↔admin) | Cloisonnement strict via RLS/claims JWT ; écritures hors périmètre refusées | ⏭️ |
| T8-02 | Confidentialité config | En anonyme/coach, lire `config` | Accès refusé (Wi-Fi jamais exposé) | ⏭️ |
| T8-03 | Impression A4 fine | Tous les rapports | Marges 20 mm, en-têtes de table répétés, sauts de page propres | ⏭️ |
| T8-04 | Accessibilité | Navigation clavier + lecteurs d'écran | Libellés, contrastes, `aria-*` conformes | ⏭️ |
| T8-05 | Checklist de couverture | Dérouler `00 §6` | Toutes les entités, types de voie, workflows, endpoints, événements et rapports couverts | ⏭️ |

## 8. Notes et limites connues

- **Graphe Chart.js** : le rapport « Stats » (T5) rend les séries sous forme de
  **tableau imprimable** (mêmes données que l'ancien graphe empilé). Le rendu
  graphique Chart.js côté client pourra être ajouté ultérieurement à partir de
  `stats.datasets` / `stats.temps`.
- **Agrégats de saison** : calculés côté TS (`lib/reports/ranking.ts`,
  couverts par Vitest) plutôt qu'en vues SQL, pour rester testables sans
  élargir la surface SQL/RLS.
- **SQL (RLS, fonctions `SECURITY DEFINER`)** : non couvert par Vitest ; à
  éprouver via cette recette et l'inspection Studio (cf. T8).
