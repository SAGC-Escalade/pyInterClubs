# Spécifications fonctionnelles — pyInterClubs (cible Next.js / Supabase / Netlify)

Ce dossier décrit **fidèlement** le comportement de l'application Django actuelle
(`pyInterClubs`) et le **mapping vers l'architecture cible** (Next.js + Supabase +
Netlify). Il sert de référence pour réécrire l'application à l'identique fonctionnellement.

## Décisions d'architecture retenues

- **Front + API** : Next.js (App Router), déployé sur **Netlify**.
- **Base de données + temps réel + cron** : **Supabase** (Postgres, Realtime, pg_cron).
- **Logique métier** (scoring, validation, calcul vitesse par rang) : **portée par
  Postgres** — triggers + fonctions PL/pgSQL, vues SQL pour les agrégats. La couche
  Next.js orchestre, expose l'API et l'UI.
- **Authentification** : modèle **token/QR conservé et adapté** (login terrain sans mot
  de passe), reposant sur JWT custom + **RLS** Postgres pour le cloisonnement par rôle.

## Ordre de lecture

| # | Document | Contenu |
| --- | ---------- | --------- |
| 00 | [Vue d'ensemble](00-vue-ensemble.md) | Contexte, rôles, glossaire, périmètre, checklist de couverture |
| 01 | [Modèle de données](01-modele-de-donnees.md) | Entités, enums, contraintes, DDL Postgres, RLS |
| 02 | [Règles de scoring](02-regles-scoring.md) | Barèmes bloc/diff/vitesse, calcul par rang, validation, catégories d'âge |
| 03 | [Workflows admin](03-workflows-admin.md) | Cycle de vie rencontre, comptes, QR, configuration |
| 04 | [Workflows coach](04-workflows-coach.md) | Équipes, membres, ordre, club prêteur, groupes |
| 05 | [Workflows juge](05-workflows-juge.md) | Feuille de scoring, saisie perf, register |
| 06 | [API & contrats](06-api-et-contrats.md) | Endpoints, formes JSON, actions, erreurs |
| 07 | [Temps réel](07-temps-reel.md) | Événements SSE → canaux Supabase Realtime |
| 08 | [UI / UX](08-ui-ux.md) | Écrans, composants, animations, responsive |
| 09 | [Rapports](09-rapports.md) | Stats, classements équipes/individuels, inscriptions, saison |
| 10 | [Auth & sécurité](10-auth-et-securite.md) | Token/QR, JWT, RLS, provisioning |
| 11 | [Migration des données](11-migration-donnees.md) | Reprise SQLite → Postgres |

## Conventions

- Chaque règle métier renvoie à sa source `fichier:ligne` dans le code Django.
- Les sections **« Cible »** indiquent comment réimplémenter la règle sur la stack Supabase/Next.js.
- ⚠️ signale un point de vigilance (sécurité, dette technique, ambiguïté à trancher).
