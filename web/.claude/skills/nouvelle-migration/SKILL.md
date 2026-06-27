---
name: nouvelle-migration
description: Crée une nouvelle migration SQL Supabase pour pyInterClubs en respectant les conventions du projet (entête français citant docs/spec, nommage fn_/v_/trg_, enums smallint+CHECK, RLS read_*/admin_write, security definer). À utiliser pour « ajoute une migration », « nouvelle tranche SQL », « nouvelle table/vue/fonction Postgres ».
---

# Nouvelle migration Supabase

Scaffolde une migration `web/supabase/migrations/000N_<slug>.sql` conforme aux
conventions du projet, puis rejoue le schéma et régénère les types.

## Étapes

1. **Numéro & nom** : lister `web/supabase/migrations/` et prendre le prochain
   numéro à 4 chiffres (`0006`, `0007`, …). Slug `snake_case` décrivant la tranche
   (ex. `0006_auth_roles.sql`). Demander à quelle section de `docs/spec/NN-*.md`
   la migration se rattache.

2. **Entête** (obligatoire, en français, sur ce gabarit exact — cf.
   `0004_admin_rls.sql:1-9`) :
   ```sql
   -- =====================================================================
   -- Tranche N — <titre court>
   -- Réf. : docs/spec/NN-<doc>.md §X/§Y
   -- =====================================================================
   -- <2-4 lignes expliquant le pourquoi et le périmètre, comme les migrations
   -- existantes : ce qui est couvert, ce qui est différé à une tranche ultérieure>
   -- =====================================================================
   ```

3. **Conventions à respecter** (vérifier sur `0001`–`0005`) :
   - Tables/colonnes `snake_case` ; index `{table}_{col}_idx` ; vues `v_*` ;
     fonctions `fn_*` ; triggers `trg_{table}_{event}`.
   - Enums = `smallint` + `check (... in (1, 2, 3))` — **préserver les codes Django**
     (sexe : 1=F,2=M,3=Mixte ; type voie : 1=bloc,2=diff,3=vitesse ;
     categorie : 1=enfants,2=ado,3=mixte).
   - `zones` = `jsonb` **tableau ordonné** `[{"label","points"}]`, l'index = `etat`.
     Toujours `check (jsonb_typeof(zones) = 'array')`.
   - Fonctions qui contournent la RLS : `language sql/plpgsql ... security definer
     set search_path = public` (cf. `fn_is_admin`, `0004:23-33`). **Jamais** de
     security definer sans `set search_path`.
   - `grant execute on function ... to authenticated` (ou `anon` si lecture publique).

4. **Si la migration ajoute une table** : activer la RLS et poser les policies
   sur le patron du projet (cf. `0003`/`0004`) :
   ```sql
   alter table public.<t> enable row level security;
   create policy "read_authenticated" on public.<t> for select to authenticated using (true);
   -- lecture publique seulement si la donnée n'est PAS sensible (jamais sur config) :
   create policy "read_anon" on public.<t> for select to anon using (true);
   -- écriture gardée :
   create policy "admin_write" on public.<t> for all to authenticated
     using (public.fn_is_admin()) with check (public.fn_is_admin());
   grant select, insert, update, delete on public.<t> to authenticated;
   ```
   ⚠️ Le RLS reste la garde réelle ; ne pas exposer `config` à `anon`.

5. **Si la migration ajoute du temps réel** : ajouter les tables à la publication
   `alter publication supabase_realtime add table public.<t>;` (cf. `0003`).

6. **Appliquer & typer** (depuis `web/`) :
   ```bash
   npm run db:reset    # rejoue toutes les migrations + seed.sql
   npm run db:types    # régénère lib/supabase/database.types.ts
   ```
   Puis `npm run lint` et signaler toute rupture TypeScript dans les composants
   qui consomment le schéma modifié.

## Garde-fous

- Après écriture, proposer de lancer l'agent **rls-auditor** (sécurité) et, si le
  scoring est touché, **scoring-validator**.
- Ne jamais éditer une migration déjà appliquée en production : créer une nouvelle
  migration de correction.
