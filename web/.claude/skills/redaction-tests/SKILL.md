---
name: redaction-tests
description: Rédige des tests Vitest pour le front Next.js de pyInterClubs (helpers serveur/client mockés Supabase, composants React via Testing Library, fonctions pures). À utiliser pour « écris des tests pour … », « teste cette fonctionnalité », « couvre la tranche N » — et systématiquement AVANT d'implémenter une fonctionnalité (TDD).
---

# Rédaction de tests (Vitest)

Outillage et conventions de test du dossier `web/`. **Workflow TDD imposé** : écrire les
tests d'abord, les voir échouer, implémenter, toute la suite au vert, puis committer.
Un hook PreToolUse bloque le commit si `npm test` échoue (`.claude/settings.local.json`).

## Lancer les tests

```bash
cd web && npm test          # vitest run (une passe, ce que fait le hook)
cd web && npm run test:watch
```

## Où placer les tests

- Racine : `web/test/`. Regrouper par **tranche** (`tranche1/`, `tranche2/`, …) ou par
  domaine quand ce n'est pas lié à une tranche.
- Un fichier par module/composant testé : `<sujet>.test.ts` (logique) ou
  `<sujet>.test.tsx` (composant React).
- Helpers partagés dans `web/test/helpers/`. Mock Supabase réutilisable :
  `web/test/helpers/supabaseMock.ts` (`makeSupabaseMock({ tableResult, rpcResult, authUser })`).
- Config : `web/vitest.config.ts` (env jsdom, alias `@/`, `setupFiles: test/setup.ts`).
  `web/test/setup.ts` importe `@testing-library/jest-dom/vitest` et `cleanup()` après chaque test.

## Imports & en-tête type

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
// composant :
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
```

Les libellés assertés sont en **français** (l'app est francophone) : `getByText("Aucun grimpeur inscrit")`, badges, messages `frError`.

## Patrons par type de cible

### 1. Fonction pure (`lib/categorie.ts`, `lib/errors.ts`, `lib/rencontre-admin.ts`)

Test direct, table de cas avec `it.each`. Couvrir les **bornes** (tranches d'âge,
bascule de saison en septembre) et les cas limites (null, code inconnu).

### 2. Helper serveur/client Supabase (`lib/rencontre.ts`, `lib/auth/admin.ts`)

Mocker le module client puis injecter `makeSupabaseMock` :

```ts
const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));
import { getRencontreEntete } from "@/lib/rencontre";
// dans le test :
createClient.mockReturnValue(makeSupabaseMock({ tableResult: { rencontre: { data: ... } } }));
```

Couvrir : chemin nominal, fallback (`default_rencontre_id`), absence de donnée (→ null),
formes de jointure PostgREST (club en objet **et** en tableau).

### 3. Composant React (`components/**`)

Mocker les dépendances réseau, contrôler l'état :

- `vi.mock("@tanstack/react-query", () => ({ useQuery: () => useQuery() }))` puis piloter
  `useQuery.mockReturnValue({ data, isLoading, refetch })`.
- `vi.mock("@/lib/realtime/useRealtime", () => ({ useRealtime: vi.fn() }))`.
- `vi.mock("@/lib/supabase/client", ...)`, `vi.mock("react-flip-move", ...)` (rendre `children`).
- Asserter les **états** : chargement (placeholder), liste vide, ligne peuplée, et les
  variantes visuelles (`badge bg-success`/`bg-primary`, symboles ♀/♂).

### 4. Composant interactif contrôlé (`ZonesEditor`, `Autocomplete`)

Le parent ne re-rend pas l'état → pour une valeur complète d'un input contrôlé, utiliser
`fireEvent.change(input, { target: { value: "60-{rank}" } })` (PAS `userEvent.type`
caractère-par-caractère, qui ne s'accumule pas). Pour clic/focus/filtrage, `userEvent`
convient. Vérifier les `onChange.mock` (dernier appel) et les états désactivés (boutons).

## Garde-fous

- Après écriture : `cd web && npm test` doit être **vert** ; lancer `npx tsc --noEmit`
  (les fichiers `test/**` sont inclus au type-check, donc importer les types React
  manquants — ex. `import type { ReactNode } from "react"` plutôt que `React.ReactNode`).
- Ne pas tester la logique SQL (triggers/vues/RPC des migrations) ici : cela demande un
  Postgres de test (pgTAP), hors périmètre Vitest — le signaler si demandé.
- Toujours `vi.mock` les modules Supabase : **aucun** test ne doit toucher le réseau.
