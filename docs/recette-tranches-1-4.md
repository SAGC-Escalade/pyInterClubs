# Cahier de recette — pyInterClubs (tranches 1 à 4)

Recette manuelle (IHM) du front Next.js + Supabase, couvrant le classement public
(T1), l'auth admin et les référentiels (T2), l'administration des rencontres (T3)
et l'auth terrain + provisioning + écrans coach/juge (T4).

Réf. : `docs/spec/` (01 à 11). Chaque scénario indique des étapes et le résultat
attendu ; reporter le statut dans la dernière colonne.

## 1. Préparation de l'environnement

```bash
cd web
npm install
npm run db:start          # Supabase local (Postgres + Studio :54323)
npm run db:reset          # applique migrations 0001..0008 + seed.sql
npm run db:types          # régénère lib/supabase/database.types.ts
npm run dev               # http://localhost:3000
```

Données semées (cf. `web/supabase/seed.sql`) :

- Barème de voies (vitesse F/H, blocs, diffs M1–M4 / T1–T3).
- **Rencontre démo T1** (enfants, 2025-03-15) entièrement scorée → alimente
  `/resultats`.
- **Rencontre QA terrain T4** (enfants, 2025-04-12), définie comme rencontre
  courante, à l'état partiel (diffs à scorer, grimpeurs non inscrits, aucun juge
  affecté).
- Clubs : `CAF Bordeaux`, `Pyrénéa Escalade` (4 grimpeurs chacun).

## 2. Comptes et connexions

- **Admin** : créer un compte via `/login` (Supabase Auth), puis le promouvoir
  une fois dans Studio (SQL) : `select public.fn_grant_admin('admin@test.fr');`.
- **Coach / Juge** : pas de mot de passe. Les identités sont **provisionnées** par
  l'admin (Démarrer la rencontre / Affecter un juge), puis on se connecte via le
  **lien** affiché sur la page « Accès & QR » (`/auth/club?token=…`).
- Astuce : utiliser une fenêtre normale (admin) + une fenêtre privée (coach/juge)
  pour jouer plusieurs rôles en parallèle.

## 3. Légende des statuts

- ✅ Conforme.
- ❌ Non conforme (noter l'écart).
- ⏭️ Non testé / sans objet.

## 4. Tranche 1 — Classement public live

Réf. : `docs/spec/02 §5`, `08`, `07`.

| ID | Scénario | Étapes | Résultat attendu | Statut |
| ---- | ---------- | -------- | ------------------ | -------- |
| T1-01 | Affichage du classement | Ouvrir `/resultats` sans être connecté | Tableau par sexe, trié par points décroissants, colonnes points et validité | |
| T1-02 | Rang ex-æquo | Observer deux grimpeurs à points égaux | Même rang partagé, puis saut de rang ensuite | |
| T1-03 | Catégorie d'âge | Vérifier la colonne catégorie | U11..U21 selon `saison - année de naissance` | |
| T1-04 | Mise à jour live | Garder `/resultats` ouvert ; faire saisir une perf (admin ou juge) sur la rencontre courante | Le classement se met à jour sans rechargement (Realtime) | |
| T1-05 | Rencontre courante | Ouvrir `/resultats` puis `/resultats?rencontre=<id>` | Sans paramètre = `DEFAULT_RENCONTRE` ; avec paramètre = rencontre ciblée | |
| T1-06 | Accès anonyme | Naviguer déconnecté | `/resultats` accessible sans authentification | |

## 5. Tranche 2 — Auth admin et référentiels

Réf. : `docs/spec/10 §2/§3`, `02 §6`, `06 §5`.

| ID | Scénario | Étapes | Résultat attendu | Statut |
| ---- | ---------- | -------- | ------------------ | -------- |
| T2-01 | Connexion admin | Se connecter via `/login` avec le compte promu admin | Accès à `/admin` ; en-tête affiche l'e-mail | |
| T2-02 | Garde admin | Déconnecté, ouvrir `/admin` | Redirection vers `/login` (ou `/`) | |
| T2-03 | CRUD clubs | `/admin/clubs` : créer, éditer, supprimer un club | Liste à jour ; suppression d'un club référencé refusée avec message FR | |
| T2-04 | CRUD grimpeurs | `/admin/grimpeurs` : créer/éditer/supprimer | Liste à jour ; champs (sexe, année, club) cohérents | |
| T2-05 | CRUD voies + zones | `/admin/voies` : créer une voie, éditer le barème (zones) | Ordre des zones significatif ; points number / vide=null / expression vitesse acceptés | |
| T2-06 | Recalage des états | Éditer les zones d'une voie déjà scorée (renommer/réordonner) | Les performances existantes sont remappées par libellé ; zones disparues réinitialisées | |
| T2-07 | Messages d'erreur FR | Provoquer une violation (doublon, FK, action non autorisée) | Message en français (`frError`), pas d'erreur technique brute | |

## 6. Tranche 3 — Administration des rencontres

Réf. : `docs/spec/03 §3/§4`.

| ID | Scénario | Étapes | Résultat attendu | Statut |
| ---- | ---------- | -------- | ------------------ | -------- |
| T3-01 | Liste des rencontres | Ouvrir `/admin/rencontres` | Lignes avec club hôte, compteurs voies/équipes ; badge « Courante » | |
| T3-02 | Création (assistant) | `/admin/rencontres/create` : renseigner paramètres, voies, options | Saison par défaut = année (+1 après août), date du jour, `voies_groupees` coché si catégorie enfants ; rencontre créée avec ses `rencontre_voie` | |
| T3-03 | Rencontre courante | « Définir comme courante » sur une rencontre | `DEFAULT_RENCONTRE` mis à jour ; `/resultats` reflète la rencontre choisie | |
| T3-04 | Suppression | Supprimer une rencontre non démarrée | Suppression OK ; le bouton est désactivé si la rencontre est démarrée | |

## 7. Tranche 4 — Auth terrain, provisioning, coach et juge

Réf. : `docs/spec/10`, `03 §5/§6/§8`, `04`, `05`, `02 §4`.

### 7.1 Garde de rôle et provisioning (admin)

| ID | Scénario | Étapes | Résultat attendu | Statut |
| ---- | ---------- | -------- | ------------------ | -------- |
| T4-01 | Garde middleware | Tenter `/admin`, `/leader`, `/judge` selon le rôle | Anonyme : espaces protégés → `/` ; admin : tout ; coach : `/leader` ; juge : `/judge` | |
| T4-02 | Échange token invalide | Ouvrir `/auth/club` (sans token) puis `/auth/club?token=zzz` | Sans token → 400 ; token inconnu → 401 | |
| T4-03 | Démarrer la rencontre | `/admin/rencontres` → « Démarrer » sur la rencontre T4 | 1 coach créé par club ; badge « Démarrée » ; lien « Accès & QR » disponible ; « Supprimer » désactivé | |
| T4-04 | Affecter un juge | Page « Accès & QR » → saisir un nom + cocher des voies de diff → Affecter | Identité juge créée ; lien de connexion affiché ; voies marquées affectées | |
| T4-04b | Rendu QR scannable | Page « Accès & QR » : observer chaque ligne coach/juge | Un QR code s'affiche à côté de chaque lien ; le scanner (téléphone) ouvre `/auth/club?token=…` et connecte le rôle | |
| T4-05 | Idempotence du démarrage | Cliquer « Démarrer » une 2ᵉ fois | Aucun coach en double (un seul par club) | |

### 7.2 Écran coach (`/leader`)

| ID | Scénario | Étapes | Résultat attendu | Statut |
| ---- | ---------- | -------- | ------------------ | -------- |
| T4-06 | Connexion coach | Ouvrir le lien coach (`/auth/club?token=…`) | Session ouverte, redirection vers `/leader` ; cookies posés | |
| T4-07 | Périmètre coach | Observer la liste | Seules les équipes du club du coach, rencontre courante ; `/admin` et `/judge` refusés | |
| T4-08 | Créer / supprimer équipe | « Ajouter une équipe » ; supprimer une équipe vide | Numéro auto-incrémenté ; suppression OK | |
| T4-09 | Inscrire un grimpeur | Dans une équipe, rechercher un grimpeur libre du club → sélectionner | Score créé ; perfs générées : 2 blocs + 1 vitesse pré-affectés (selon sexe) + 3 diffs sans voie ; ordre = plus petit libre | |
| T4-09b | Filtre catégorie d'âge | Observer la liste des grimpeurs proposés à l'inscription | Seuls les grimpeurs dans la tranche d'âge de la rencontre sont proposés (enfants : 8–13 ans ; ado/mixte : 13–19 ans), en plus du club et de l'exclusion des déjà-inscrits | |
| T4-10 | Club prêteur | Inscrire un grimpeur d'un autre club (ou le définir via Réglages) | Badge « prêté » ; `club_preteur` renseigné | |
| T4-11 | Ordre des membres | Boutons ↑/↓ | Échange avec le voisin ; désactivés aux bornes ; pas de doublon d'ordre | |
| T4-12 | Diffs groupées | Sur une rencontre `voies_groupees = true`, choisir une voie de diff de départ | `nb_diff` voies de diff consécutives affectées aux perfs de diff | |
| T4-12b | Verrou « started » | Faire scorer une diff du grimpeur par un juge, puis rouvrir les Réglages du membre | Le sélecteur « Groupe » est désactivé dès qu'une diff a des points (re-affectation figée) | |
| T4-13 | Équipe complète | Inscrire jusqu'à 8 membres | Le champ d'ajout disparaît ; un 9ᵉ est refusé (message « 8 membres maximum ») | |
| T4-14 | Live côté coach | Pendant qu'un juge score, garder `/leader` ouvert | Points / validité du membre et de l'équipe se mettent à jour en direct | |

### 7.3 Écran juge (`/judge`)

| ID | Scénario | Étapes | Résultat attendu | Statut |
| ---- | ---------- | -------- | ------------------ | -------- |
| T4-15 | Connexion juge | Ouvrir le lien juge | Redirection vers `/judge` ; un onglet par voie affectée | |
| T4-16 | Feuille par voie | Observer un onglet | Badge « scorés / total » ; sections « À scorer » et « Scorés » ; recherche par nom | |
| T4-17 | Enregistrer un grimpeur | Voie de diff → autocomplétion « Enregistrer un grimpeur » → choisir | La 1ʳᵉ voie de diff non affectée du grimpeur est affectée à la voie du juge ; il apparaît dans « À scorer » | |
| T4-18 | Saisie bloc/diff | Choisir un état dans le menu | Points calculés immédiatement ; le grimpeur passe en « Scorés » | |
| T4-19 | Saisie vitesse | Saisir un temps `mm:ss.cc` puis Valider ; tester Chute / Abandon / À réaliser | Temps enregistré ; cas spéciaux = Chute (-1 min) / Abandon (-2 min) / null ; recalcul du rang vitesse | |
| T4-20 | Périmètre juge | Tenter d'agir hors de ses voies | Seules les voies affectées sont éditables (RLS) | |

### 7.4 Arrêt et confidentialité

| ID | Scénario | Étapes | Résultat attendu | Statut |
| ---- | ---------- | -------- | ------------------ | -------- |
| T4-21 | Arrêter la rencontre | `/admin/rencontres` → « Arrêter » | Comptes coach/juge supprimés ; rejouer un ancien lien `/auth/club?token=…` → refus | |
| T4-22 | Persistance des données | Après l'arrêt, ouvrir `/resultats` | Équipes / scores / performances et classement conservés | |
| T4-23 | Confidentialité config | En anonyme, tenter de lire `config` via l'API REST | Accès refusé (le Wi-Fi n'est jamais exposé) | |

## 8. Notes et limites connues

- **Recalcul vitesse** : assuré par le trigger `trg_speed_recalc` ; valider les
  cas de référence du `docs/spec/02 §7` (ex-æquo, Chute/Abandon n'incrémentent
  pas le rang).
- Le SQL (RLS, fonctions `SECURITY DEFINER`) n'est pas couvert par les tests
  Vitest : à éprouver via cette recette et l'inspection Studio.
