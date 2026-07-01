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

## 5. Tranche 6 — Temps réel avancé

Réf. : `docs/spec/07-temps-reel.md §3.1/§3.3/§4`. Remplace l'abonnement direct
aux tables (T1) par une **diffusion broadcast pilotée par triggers** (migration
`0009_realtime_broadcast.sql`), avec des topics préfixés par `rencontre:{id}:`.
Constructeurs de topics et réconciliation de cache couverts par Vitest
(`web/test/tranche6/`).

Logique testée automatiquement : `topics.ts` (chaînes de topics), `reconcile.ts`
(`reconcileCache`), hook `useRealtime` (abonnement broadcast, debounce, statut,
nettoyage). Le SQL (triggers, `realtime.send`) n'est pas couvert par Vitest : le
valider ici via Studio.

**Pré-requis de validation** : `npm run db:reset` doit appliquer `0009` sans
erreur. Pour observer les messages : Studio → SQL `select * from
realtime.messages order by inserted_at desc limit 20;` ou l'inspecteur réseau
(WebSocket Realtime) du navigateur.

| ID | Scénario | Étapes | Résultat attendu | Statut |
|----|----------|--------|------------------|--------|
| T6-00 | `realtime.send` disponible | Studio → `select realtime.send('{}'::jsonb, 'change', 'rencontre:0:test', false);` | Retourne sans erreur (sinon les broadcasts no-op : à traiter avant la suite) | |
| T6-01 | Broadcast par trigger | Rencontre courante ouverte ; un juge saisit une perf de diff | Des messages sont émis sur `rencontre:{r}:voie:{v}:perfs`, `…:perfs:{id}`, puis en cascade `…:scores*` et `…:equipes*` (agrégats recalculés) | |
| T6-02 | Isolation par rencontre | Ouvrir `/resultats?rencontre=A` et une saisie sur la rencontre B | Le classement de A **ne bouge pas** ; seul un client abonné à B se rafraîchit (topics préfixés `rencontre:{id}:`) | |
| T6-03 | Isolation par voie (juge) | Deux juges connectés sur des voies différentes ; scorer sur la voie du juge 1 | Seule la feuille du juge 1 se rafraîchit (abonnement `voie:{v}:perfs`) ; celle du juge 2 reste stable | |
| T6-04 | Debounce sur rafale | Enchaîner rapidement plusieurs saisies sur une voie | Le classement/feuille se met à jour de façon groupée (~150 ms), sans clignotement ni refetch par événement | |
| T6-05 | Cascade points/validité (coach) | Garder `/leader` ouvert ; un juge valide les perfs d'un membre | Points/validité de l'équipe se mettent à jour **en place** (reconcileCache) sans rechargement complet | |
| T6-06 | Ajout/suppression (coach) | Créer puis supprimer une équipe côté coach dans une autre fenêtre | La liste des équipes du club se met à jour (refetch ciblé sur `club:{c}:equipes`) | |
| T6-07 | Perte de connexion | Couper le réseau (ou arrêter la stack) pendant l'affichage | Un toast « Perte de la connexion au serveur » apparaît ; à la reprise, les données se resynchronisent | |
| T6-08 | Non-régression T1/T4 | Rejouer T1-04 (classement live) et T4-14 (live coach) | Comportement live conforme aux tranches 1 et 4 | |

## 6. Tranche 7 — Reprise de données

Réf. : `docs/spec/11-migration-donnees.md`. Port des commandes Django
`importClimbers` et `addVoies`. Logique de transformation couverte par Vitest
(`web/test/tranche7/` : `voies.ts`, `climbers.ts`).

**Périmètre livré** : barème de voies de référence (seed complet) + import CSV
des grimpeurs (route admin). L'**import de la base historique** (`importHistoricDB`)
est **différé** (spec §4 le juge optionnel/lourd) : cf. T7-03.

**Pré-requis SQL** (pas de `db:reset` ici — appliquer à la main, cf. §1 et la note
« workflow migrations manuel ») :

- Barème : appliquer `web/supabase/migrations/0010_seed_voies_reference.sql`
  (rejouable, 40 voies). Généré depuis `web/lib/import/voies.ts` via
  `node --experimental-strip-types web/scripts/gen-seed-voies.ts`.
- Rejouer un jeu de démo : coller `web/supabase/reset-demo.sql` (purge + `restart
  identity`) puis recoller `web/supabase/seed.sql`.
- Import CSV : page admin `/admin/import-grimpeurs` (onglet « Import »). CSV
  d'exemple prêt à l'emploi : `web/supabase/fixtures/grimpeurs-exemple.csv`
  (5 grimpeurs, 3 clubs). Sur base fraîche (barème seul) l'aperçu attendu est :
  **5 à créer** (3 F / 1 H + « Xyzzy » sexe indéterminé), **3 clubs à créer**
  (Caf Bordeaux, Pyrénéa Escalade, Us Cagouille), 0 ignoré. Ré-importer le même
  fichier → **5 inchangés** (idempotence, T7-04).

| ID | Scénario | Étapes | Résultat attendu | Statut |
|----|----------|--------|------------------|--------|
| T7-01 | Import grimpeurs (CSV) | `/admin/import-grimpeurs` → choisir un CSV FFME (Structure, Numéro de licence, Nom complet, Date de naissance) → observer l'aperçu → « Appliquer » | Aperçu (dry-run) listant Créer/Màj/Déplacer/Ignoré + compteurs (F/H) ; après application, grimpeurs créés, rattachés au club (club créé si absent), sexe déduit (colonne explicite sinon prénom) | |
| T7-02 | Barème de voies | Appliquer `0010_seed_voies_reference.sql` puis les requêtes de vérif en pied de fichier | 40 voies actives ; répartition type 4/31/5, catégorie 20/20 ; `zones` au format `[{label,points}]` commençant par « A réaliser » | |
| T7-03 | Import base historique | *(différé)* | Volet non livré en T7 (spec §4 optionnel) ; `importHistoricDB.py` reste la cartographie de référence (split rencontre enfants/ado, remap états, temps spéciaux, séquences) | ⏭️ |
| T7-04 | Idempotence | Rejouer l'import du même CSV ; ré-appliquer `0010` ; recoller `seed.sql` après `reset-demo.sql` | CSV : lignes identiques → « Inchangé » (aucun doublon), changements → màj en place ; `0010` gardé par `if not exists` (barème non redoublé) ; `seed` rejouable après purge | |
| T7-05 | Intégrité | Après import CSV + barème, ouvrir les rapports T5 | Aucune FK orpheline (grimpeur→club) ; licences en conflit signalées (ignorées sauf « Forcer ») ; rapports Inscriptions/Classements exploitables | |

## 7. Tranche 8 — Finitions & durcissement

Réf. : `docs/spec/08`, `10`, checklist `00 §6`. Migration `0011_durcissement_rls_lecture.sql`
(rejouable, à appliquer à la main — cf. §1 « workflow migrations manuel »).
Logique de décision portée en fonctions **pures** testées par Vitest
(`web/test/tranche8/`) : `lib/auth/visibility.ts` (visibilité lecture, miroir des
policies), `lib/print/page.ts` (feuille d'impression A4), `lib/a11y/labels.ts`
(libellés `aria-*`). Le SQL (policies) se valide ici via les requêtes d'accès
croisés en pied de la migration.

**Décisions T8 retenues** :

- **Lecture** : `config`/`coach`/`juge` réservées à l'admin ; les données de
  compétition restent en lecture large (anon + authentifié) — requis par le board
  public live et le classement global F/H (spec 10 §3). Le cloisonnement de
  lecture par club/voie n'est **pas** appliqué (il casserait ces parcours).
- **Écriture** : déjà cloisonnée (0004/0006), inchangée ; validée en accès croisés.
- **Realtime privé** : **non retenu** (documenté). Les payloads broadcast (0009)
  n'exposent rien de plus que le board REST déjà anonyme ; risque jugé faible.
  Nettoyage effectué : retrait de la publication `postgres_changes` (T1) devenue
  inutile depuis le broadcast (T6).

**Pré-requis SQL** : appliquer `0011` (SQL Editor / psql). Aucun changement de
forme du schéma → pas de régénération `database.types.ts`, pas d'adaptation
`seed.sql`/`reset-demo.sql`.

| ID | Scénario | Étapes | Résultat attendu | Statut |
|----|----------|--------|------------------|--------|
| T8-01 | RLS lecture par rôle | Coller les requêtes (a)(b)(c) du pied de `0011` avec un JWT coach, juge, puis admin (`set local request.jwt.claims`) | Coach & juge : `config`/`coach`/`juge` → **0 ligne** ; `equipe`/`performance` → **> 0** (data large). Admin : tout **> 0** | |
| T8-01b | RLS écriture croisée | Coller (d)(e) : coach `update` d'une équipe d'un **autre club** ; juge `update` d'une perf d'une **voie non affectée** | `UPDATE 0` dans les deux cas (coach_write borné club+rencontre ; juge_write borné aux voies) ; les écritures **dans** le périmètre passent (non-régression T4) | |
| T8-02 | Confidentialité config | Requête (a)/(b) sur `public.config` en coach/juge, et `select * from config` en anonyme | Coach/juge : **0 ligne** (Wi-Fi jamais exposé). Anonyme : refusé (aucune policy `read_anon` sur `config`). La rencontre courante reste résolue via `default_rencontre_id()` (SECURITY DEFINER) | |
| T8-03 | Impression A4 fine | Ouvrir un rapport, Ctrl+P (aperçu) sur Individuel/Équipes/Stats | Page A4, **marges 20 mm** ; en-têtes de table **répétés** à chaque page (`thead` group) ; aucun bloc équipe/ligne coupé (`break-inside: avoid`) ; boutons `no-print` masqués. Cf. `lib/print/page.ts` (`buildPrintCss`) et `app/globals.css` | |
| T8-04 | Accessibilité | Naviguer au clavier (Tab/Entrée) ; lecteur d'écran sur le classement | Boutons focusables avec `aria-label` (« Imprimer le rapport ») ; en-têtes `scope="col"` ; chaque ligne de classement annonce « Rang N, Prénom Nom, N points[, Médaille …] » (`ariaLabelClassementRow`) ; icônes médaille `aria-hidden` | |
| T8-05 | Checklist de couverture | Dérouler `00 §6` (cf. revue §7.1 ci-dessous) | Toutes entités, types de voie, workflows, endpoints, événements et rapports couverts ; manques explicitement listés | |

### 7.1 Revue de la checklist de couverture (`00 §6`)

- **Entités (8 + config + profils)** : ✅ Club, Grimpeur, Voie, Rencontre, Equipe,
  Score, Performance, RencontreVoie, Config, Coach, Juge — toutes migrées
  (`0001`), avec RLS durcie en T8 sur Config/Coach/Juge.
- **Types de voie** : ✅ Bloc & Difficulté (statiques, mode groupé) et Vitesse
  (dynamique par rang/sexe) — scoring `0002`, barème `0010`.
- **Rôles & workflows** : ✅ Admin (créer/démarrer/affecter juges/rapports/arrêter,
  T3/T4/T5), Coach (équipes/membres/ordre/prêt/groupe, T4), Juge (feuille/saisie/
  register, T4). Cloisonnement RLS finalisé en T8.
- **Endpoints/actions** : ✅ clubs, voies, grimpeurs, equipes, scores, perfs,
  scores/`ordre`, scores/`groupe`, scores/`register` (T4, via RLS + routes).
- **Événements temps réel** : ✅ equipes, scores, perfs (create/update/delete,
  cascade `etat`/`points`/`temps`/`voie`/`ordre`/`numero`) — broadcast `0009` (T6).
- **Rapports** : ✅ stats, équipes, individuel, inscriptions, saison
  (ranking/teams) — T5.
- **Reprise** : ✅ import grimpeurs (CSV, T7), ✅ barème de voies (`addVoies`→`0010`,
  T7) ; ⏭️ **import base historique** (`importHistoricDB`) **différé** hors
  périmètre (spec 11 §4 optionnel, cf. T7-03).

**Manques / choix assumés (fin de migration)** :

1. **Import base historique** (T7-03) — différé ; `importHistoricDB.py` reste la
   cartographie de référence.
2. **Realtime privé** — non retenu (canaux non privés documentés, risque faible ;
   payloads = données déjà publiques).
3. **Cloisonnement lecture par club/voie** — non appliqué à dessein (casserait le
   classement global et le board public) ; seules tokens + config sont durcis.
4. **Graphe Chart.js** (Stats) — rendu en tableau imprimable (cf. §8) ; graphe
   client optionnel ultérieur.

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
- **Broadcast Realtime (T6)** : `fn_rt_broadcast` encapsule `realtime.send` dans
  un `exception when others then null` — la migration `0009` s'applique donc même
  si la signature diffère, mais les broadcasts sont alors silencieux. Valider
  `realtime.send` (scénario T6-00) après `db:reset`. Canaux **non privés** : le
  cloisonnement par claims (canaux privés + RLS sur `realtime.messages`) a été
  **écarté en T8** (décision documentée §7 : les payloads n'exposent rien de plus
  que le board REST déjà anonyme). T8 a en revanche retiré la publication
  `postgres_changes` (T1) devenue inutile (`0011`).
