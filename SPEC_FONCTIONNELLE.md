# Spécifications fonctionnelles — pyInterClubs

Document d'entrée des spécifications pour la **réécriture** de pyInterClubs (Django) vers
**Next.js + Supabase + Netlify**. Les spécifications détaillées se trouvent dans
[`docs/spec/`](docs/spec/README.md).

## Résumé

pyInterClubs gère des compétitions d'escalade InterClubs (FR) avec trois rôles
(administrateur, coach, juge), un scoring temps réel (bloc/difficulté statiques, **vitesse
dynamique par rang et par sexe**) et des rapports imprimables.

**Cible** : front + API en **Next.js** (Netlify) ; **Supabase** pour la base Postgres, le
temps réel (Realtime) et le planifié (pg_cron) ; **logique métier portée par Postgres**
(triggers/fonctions/vues) ; **authentification token/QR conservée et adaptée** (JWT + RLS).

## Sommaire des spécifications

| # | Document | Contenu |
|---|----------|---------|
| — | [README / index](docs/spec/README.md) | Décisions d'archi, conventions, ordre de lecture |
| 00 | [Vue d'ensemble](docs/spec/00-vue-ensemble.md) | Contexte, rôles, glossaire, checklist de couverture |
| 01 | [Modèle de données](docs/spec/01-modele-de-donnees.md) | Entités, enums, DDL Postgres, RLS |
| 02 | [Règles de scoring](docs/spec/02-regles-scoring.md) | Barèmes, calcul vitesse par rang, validation, U11–U21 |
| 03 | [Workflows admin](docs/spec/03-workflows-admin.md) | Cycle de vie rencontre, comptes, QR, config |
| 04 | [Workflows coach](docs/spec/04-workflows-coach.md) | Équipes, membres, ordre, prêt, groupes |
| 05 | [Workflows juge](docs/spec/05-workflows-juge.md) | Feuille de scoring, saisie, register |
| 06 | [API & contrats](docs/spec/06-api-et-contrats.md) | Endpoints, formes JSON, erreurs |
| 07 | [Temps réel](docs/spec/07-temps-reel.md) | SSE → Supabase Realtime |
| 08 | [UI / UX](docs/spec/08-ui-ux.md) | Écrans, composants, animations |
| 09 | [Rapports](docs/spec/09-rapports.md) | Stats, classements, inscriptions, saison |
| 10 | [Auth & sécurité](docs/spec/10-auth-et-securite.md) | Token/QR, JWT, RLS, provisioning |
| 11 | [Migration des données](docs/spec/11-migration-donnees.md) | Reprise SQLite → Postgres |

> Chaque règle est tracée vers le code source actuel (`fichier:ligne`) et accompagnée de
> sa traduction sur la stack cible. Les sections ⚠️ signalent les points de vigilance.
