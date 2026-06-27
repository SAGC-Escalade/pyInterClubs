---
name: page-admin-crud
description: Génère une page d'administration CRUD pyInterClubs (page.tsx + composant <Entité>Manager.tsx) sur le patron React Query + Bootstrap + frError, client anon gardé par RLS. À utiliser pour « nouvelle page admin pour <entité> », « écran de gestion <table> ».
---

# Page admin CRUD

Crée un écran d'administration pour une entité (table) en copiant fidèlement le
patron de `components/admin/ClubsManager.tsx`.

## Entrées à demander

- Le nom de la table (`snake_case`) et ses colonnes éditables (+ types).
- Les colonnes affichées dans la liste et l'ordre de tri.
- Les éventuels selects (FK vers club, enums via `lib/constants.ts`).

## Fichiers à créer

1. `web/components/admin/<Entité>Manager.tsx` — composant client. Reproduire
   **exactement** la structure de `ClubsManager.tsx` :
   - `"use client"`, `createClient()` (client **anon** — la RLS garde l'écriture).
   - `type X` + `type Draft` + `const EMPTY: Draft`.
   - `useQuery({ queryKey: ["admin", "<table>"], queryFn })` avec `.select(...).order(...)`.
   - `save = useMutation` : `update().eq("id", d.id)` si `d.id`, sinon `insert(payload)`.
     Trimmer les chaînes dans `payload`. `onSuccess` → `setDraft(EMPTY)` +
     `qc.invalidateQueries`. `onError: (e) => setError(frError(e))`.
   - `remove = useMutation` avec `confirm(...)` côté table avant `remove.mutate(id)`.
   - Rendu : `<div className="alert alert-danger">` conditionnel, formulaire
     Bootstrap (`row g-2 align-items-end`), table `table table-hover align-middle`,
     boutons `btn-outline-secondary` (Éditer) / `btn-outline-danger` (Supprimer),
     ligne vide « Aucun … » quand la liste est vide.
   - Tous les libellés en **français** (« Ajouter » / « Mettre à jour » / « Annuler »).

2. `web/app/admin/<x>/page.tsx` — wrapper minimal (cf. `app/admin/clubs/page.tsx`) :
   ```tsx
   import <Entité>Manager from "@/components/admin/<Entité>Manager";
   export default function <Entité>Page() {
     return <<Entité>Manager />;
   }
   ```

3. Ajouter l'entrée dans la navigation admin (`components/admin/AdminNav.tsx`).

## Selects / enums

- Pour un statut/enum, importer le mapping depuis `lib/constants.ts`
  (`SEXE`, `CATEGORIE`, `TYPE_VOIE`) et rendre un `<select>` dont les `value` sont
  les codes `smallint` (1/2/3), les labels les valeurs françaises.
- Pour une FK (ex. `club_id`), charger la liste cible via un `useQuery` séparé.

## Pré-requis & vérification

- L'écriture nécessite une policy `admin_write` sur la table (voir `0004`). Si
  absente, créer d'abord la migration via la skill **nouvelle-migration**.
- `npm run lint` doit passer ; tester la page sous `/admin/<x>` après connexion
  admin et vérifier qu'un utilisateur non-admin reçoit bien le message
  « Action non autorisée » (RLS → `frError` code `42501`).
