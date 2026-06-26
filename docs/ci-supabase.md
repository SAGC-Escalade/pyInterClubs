# CI — Application des migrations Supabase

Le workflow [`.github/workflows/supabase-migrations.yml`](../.github/workflows/supabase-migrations.yml)
applique automatiquement les migrations SQL (`web/supabase/migrations/`) sur la **bonne base
Supabase** selon la branche poussée.

## Mapping branche → environnement → projet

| Branche git | GitHub Environment | Projet Supabase |
|-------------|--------------------|-----------------|
| `migration/main` | `prod` | base de **production** |
| `migration/develop` | `recette` | base de **recette / dev** |

## Déclenchement

- À chaque **push** sur `migration/main` ou `migration/develop` **modifiant** un fichier
  sous `web/supabase/migrations/` (ou `config.toml`, ou le workflow lui-même).
- Manuellement via **Run workflow** (`workflow_dispatch`).

Un verrou de concurrence (`concurrency`) empêche deux applications simultanées sur la même base.

## Étapes du job

1. Installe le **Supabase CLI** (`supabase/setup-cli`).
2. `supabase link --project-ref <ref>` vers le projet de l'environnement.
3. `supabase db push` — applique les migrations non encore appliquées.

> Le seed (`seed.sql`) **n'est pas** appliqué par la CI (réservé au local). `db push`
> n'exécute que les migrations.

## Configuration requise (une seule fois)

### 1. Jeton d'accès Supabase (niveau dépôt)

Dashboard Supabase → **Account → Access Tokens** → générer un token.
GitHub → repo **Settings → Secrets and variables → Actions → New repository secret** :

| Secret | Valeur |
|--------|--------|
| `SUPABASE_ACCESS_TOKEN` | le token généré |

### 2. Deux GitHub Environments avec leurs secrets

GitHub → repo **Settings → Environments** → créer **`prod`** et **`recette`**.
Pour **chaque** environnement, ajouter ces secrets :

| Secret | Où le trouver |
|--------|---------------|
| `SUPABASE_PROJECT_REF` | Dashboard du projet → **Settings → General → Reference ID** |
| `SUPABASE_DB_PASSWORD` | Mot de passe DB du projet (défini à la création ; réinitialisable dans **Settings → Database**) |

> Renseigne le projet **prod** dans l'environnement `prod`, et le projet **recette** dans
> `recette`. Les secrets d'environnement sont isolés : aucun risque de pousser en prod
> depuis develop.

### 3. (Recommandé) Protéger l'environnement `prod`

Dans **Settings → Environments → prod**, activer **Required reviewers** : tout `db push`
en production devra être approuvé manuellement avant exécution.

## Vérification

1. Pousser une petite migration sur `migration/develop` → l'onglet **Actions** doit
   montrer le job ciblant l'environnement `recette`.
2. Vérifier dans le dashboard Supabase **recette** que la table/fonction est créée.
3. Promouvoir vers `migration/main` (merge) → le même job s'exécute sur `prod`.

## Lien avec le déploiement front (Netlify)

Ce workflow ne gère **que la base**. Le front Next.js est déployé séparément par Netlify
(cf. [`../netlify.toml`](../netlify.toml)), avec les variables `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` définies **par contexte de
branche** pointant vers le même projet Supabase que l'environnement CI correspondant.
