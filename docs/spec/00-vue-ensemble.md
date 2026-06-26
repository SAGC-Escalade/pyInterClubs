# 00 — Vue d'ensemble

## 1. Contexte et objectif

`pyInterClubs` est une application web **francophone** de gestion de compétitions
d'escalade **InterClubs** (FFME). Une compétition (une **rencontre**) réunit des
**clubs** qui inscrivent des **équipes** de **grimpeurs** ; des **juges** saisissent les
résultats (**performances**) sur des **voies** (bloc, difficulté, vitesse) ; un
**administrateur** pilote la rencontre et édite les classements. Les classements et
feuilles de scoring se mettent à jour **en temps réel**.

L'application actuelle est un projet **Django 5.1** (ORM + DRF + django-eventstream/SSE,
servi par Daphne/ASGI), avec des composants **React/JSX transpilés à la volée** (Babel,
sans build). L'objectif est de **réécrire** l'application sur :

- **Next.js** (App Router) pour le front et les API — hébergé sur **Netlify** ;
- **Supabase** (Postgres + Realtime + pg_cron + stockage) pour la base et le temps réel.

La réécriture doit **reproduire le comportement à l'identique** (mêmes règles de
scoring, mêmes workflows, mêmes écrans), ce document en étant la référence.

## 2. Les trois rôles

| Rôle | Auth | Périmètre | Interface |
|------|------|-----------|-----------|
| **Administrateur** | Compte Django superuser/staff (mot de passe) | Toutes les rencontres, tous les clubs | Création/pilotage de rencontre, affectation des juges, QR codes, rapports |
| **Coach** (`Coach`) | Token/QR (sans mot de passe), provisionné à l'ouverture de la rencontre | Son **club** dans la **rencontre courante** | Gestion de ses équipes/grimpeurs, suivi des points |
| **Juge** (`Juge`) | Token/QR (sans mot de passe), créé par l'admin | Les **voies** qui lui sont affectées | Feuille de scoring : saisie des performances |

Les rôles coach/juge sont des sous-classes polymorphes de `Profil`
(`admin/models.py:44-70`). Le rôle est déterminé à chaque requête par un middleware
(`admin/middleware.py:11-54`) qui injecte la **rencontre courante**, le **club** (coach)
ou les **voies** (juge).

## 3. Périmètre fonctionnel

Couvert par la réécriture :

1. **Administration de rencontre** : créer, sélectionner, démarrer (provisioning des
   comptes coachs), affecter les juges, arrêter (déprovisioning).
2. **Inscription** : un coach crée des équipes (≤ 8 grimpeurs), ordonne les grimpeurs,
   gère les prêts entre clubs, affecte les voies de difficulté (mode groupé).
3. **Scoring live** : les juges saisissent l'état/temps de chaque grimpeur sur leurs
   voies ; les points sont calculés (bloc/diff statiques, **vitesse par rang dynamique**).
4. **Temps réel** : équipes, scores et performances se propagent en direct aux clients.
5. **Rapports imprimables** : statistiques, classement par équipes, classement individuel
   (H/F), liste des inscrits, classements de saison.
6. **Reprise de données** : import des grimpeurs (CSV), import de la base historique.

Hors périmètre (à confirmer) : gestion multi-rencontres simultanées (le canal SSE actuel
est unique, `pyInterClubs/urls.py:40-44` note la limitation), comptes self-service.

## 4. Glossaire

| Terme | Définition | Source |
|-------|-----------|--------|
| **Rencontre** | Une compétition (entité racine) : saison, date, club hôte, catégorie, nombres de voies, options. | `core/models.py:330` |
| **Club** | Un club d'escalade (nom, ville). | `core/models.py:297` |
| **Grimpeur** | Un compétiteur (nom, prénom, année de naissance, sexe, licence, club). | `core/models.py:309` |
| **Voie** | Une voie/un bloc à grimper. Polymorphe par champ `type` (bloc/diff/vitesse). | `core/models.py:270` |
| **Équipe** (`Equipe`) | Une équipe d'un club dans une rencontre (numéro). Max 8 membres. | `core/models.py:408` |
| **Score** | L'inscription d'un grimpeur dans une équipe (ordre 1–8, club prêteur éventuel). Porte les performances. | `core/models.py:426` |
| **Performance** | La tentative d'un grimpeur sur une voie : `etat` (index de zone), `temps` (vitesse), `points`. | `core/models.py:503` |
| **RencontreVoie** | Jonction rencontre↔voie + juge affecté. Unicité (rencontre, voie). | `core/models.py:555` |
| **zones** | Barème JSON **ordonné** `{libellé: points}` d'une voie. L'index dans cet ordre = `etat`. | `core/models.py:284` |
| **etat** | Index entier dans les clés de `zones` ; désigne l'état atteint (« Top », « Chute »…). | `core/models.py:517` |
| **ordre** | Position du grimpeur dans l'équipe (1–8). | `core/models.py:438` |
| **clubPreteur** | Club d'origine d'un grimpeur « prêté » à une autre équipe. | `core/models.py:439` |
| **valide** | Un score/équipe est « valide » quand toutes les performances attendues ont des points. | `core/models.py:160-181, 203-223` |
| **rank** | Rang (à partir de 0) d'un grimpeur au classement vitesse, par sexe ; sert au barème vitesse. | `core/models.py:382` |
| **Catégorie** | enfants (1), adolescents (2), mixte (3). | `core/models.py:34-38` |
| **Genre** | femme (1), homme (2), mixte (3). | `core/models.py:40-44` |
| **TypeVoie** | bloc (1), diff (2), vitesse (3). | `core/models.py:46-50` |

## 5. Stack actuelle vs cible

| Préoccupation | Actuel (Django) | Cible |
|---------------|-----------------|-------|
| Données | SQLite + ORM Django | Postgres (Supabase) + migrations SQL |
| API | DRF viewsets/serializers | Route handlers Next.js / supabase-js (selon RLS) |
| Logique métier | `save()` + signaux + querysets annotés | Triggers/fonctions PL/pgSQL + vues SQL |
| Temps réel | `django-eventstream` (SSE), canal `events` | Supabase Realtime (Postgres changes / broadcast) |
| Planifié | aucun | pg_cron (si besoin) |
| Auth | token MD5 + backend custom + sessions Django | JWT custom + liens token/QR + RLS |
| Front | Templates Django + React/JSX (Babel runtime) | Composants React/Next, 1 layout par rôle |
| Hébergement | serveur ASGI (Daphne) auto-hébergé | Netlify (serverless) + Supabase managé |

## 6. Checklist de couverture (à valider en fin de réécriture)

**Entités (8 + config + profils)** : ☐ Club ☐ Grimpeur ☐ Voie ☐ Rencontre ☐ Equipe
☐ Score ☐ Performance ☐ RencontreVoie ☐ Config ☐ Coach ☐ Juge.

**Types de voie** : ☐ Bloc (statique) ☐ Difficulté (statique, mode groupé) ☐ Vitesse
(dynamique par rang/sexe).

**Rôles & workflows** : ☐ Admin (créer/démarrer/affecter juges/rapports/arrêter)
☐ Coach (équipes/membres/ordre/prêt/groupe) ☐ Juge (feuille/saisie/register).

**Endpoints/actions** : ☐ clubs ☐ voies ☐ grimpeurs ☐ equipes ☐ scores ☐ perfs
☐ scores/`ordre` ☐ scores/`groupe` ☐ scores/`register`.

**Événements temps réel** : ☐ equipes ☐ scores ☐ perfs (création/maj/suppression,
changements `etat`/`points`/`temps`/`voie`/`ordre`/`numero`).

**Rapports** : ☐ stats ☐ équipes ☐ individuel ☐ inscriptions ☐ saison (ranking/teams).

**Reprise** : ☐ import grimpeurs ☐ import base historique ☐ barème de voies (`addVoies`).
