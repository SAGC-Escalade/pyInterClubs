# pyInterClubs — Front Next.js

Réécriture de pyInterClubs (Django) en **Next.js (App Router) + Supabase**, déployée sur
**Netlify**. Spécifications fonctionnelles : [`../docs/spec/`](../docs/spec/README.md).

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Bootstrap 5** + **react-bootstrap** (fidèle à l'UI actuelle, doc 08)
- **TanStack Query** (cache de données)
- **@supabase/ssr** + **supabase-js** (base, auth, Realtime)

## Prérequis

- Node.js ≥ 18
- [Supabase CLI](https://supabase.com/docs/guides/cli) (pour la base locale et les migrations)
- Docker (pour `supabase start` en local)

## Démarrage

```bash
cd web
npm install
cp .env.example .env.local      # renseigner les clés Supabase

# Option A — base Supabase locale (Docker)
npm run db:start                # démarre Postgres + applique les migrations
npm run db:types                # génère lib/supabase/database.types.ts

# Option B — projet Supabase distant
#   supabase link --project-ref <ref>
#   npm run db:push

npm run dev                     # http://localhost:3000
```

## Structure

```
web/
├── app/                    # App Router (layouts par rôle à venir : admin/coach/juge)
│   ├── layout.tsx          # layout racine + Providers
│   ├── page.tsx            # accueil (placeholder)
│   ├── providers.tsx       # TanStack Query (+ Realtime à venir)
│   └── globals.css         # Bootstrap + styles
├── lib/supabase/
│   ├── client.ts           # client navigateur (anon, RLS)
│   ├── server.ts           # client serveur (cookies) + admin (service_role)
│   └── database.types.ts   # types générés (placeholder)
├── middleware.ts           # refresh session (futur resolver rencontre/rôle, doc 03/10)
└── supabase/
    ├── config.toml
    ├── migrations/
    │   ├── 0001_initial_schema.sql   # schéma (doc 01)
    │   └── 0002_scoring.sql          # scoring bloc/diff + stub vitesse (doc 02)
    └── seed.sql                      # barème de voies de référence (addVoies, doc 11)
```

## Déploiement (Netlify)

Configuré dans [`../netlify.toml`](../netlify.toml) : `base = "web"`, plugin
`@netlify/plugin-nextjs`. Définir les variables d'env dans l'UI Netlify
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
Supabase est hébergé séparément ; les migrations s'appliquent via le CLI/CI, pas par Netlify.

## État

✅ Structure initialisée · ✅ Schéma de base · ⏳ Fonctions de scoring vitesse (stub)
· ⏳ Auth token/QR · ⏳ Realtime · ⏳ Interfaces admin/coach/juge · ⏳ Rapports
