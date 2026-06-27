-- =====================================================================
-- Tranche 2 — Auth admin + RLS écriture référentiels + recalage etat
-- Réf. : docs/spec/10-auth-et-securite.md §2/§3, doc 02 §6
-- =====================================================================
-- L'admin est un utilisateur Supabase Auth (email/mot de passe). Plutôt que
-- de dépendre d'un claim JWT custom (qui nécessite un Auth Hook), on matérialise
-- l'appartenance au rôle admin dans une table `app_admin`. Une fonction
-- SECURITY DEFINER `fn_is_admin()` la consulte depuis les policies.
-- =====================================================================

-- --------------------------------------------------------------------
-- Rôle admin
-- --------------------------------------------------------------------

create table public.app_admin (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admin enable row level security;

-- security definer -> ne déclenche pas le RLS de app_admin (pas de récursion).
create or replace function public.fn_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_admin where user_id = auth.uid()
  );
$$;

grant execute on function public.fn_is_admin() to authenticated;

-- Un admin peut lire la liste des admins (utile pour la garde de route).
create policy "admin_read_admins" on public.app_admin
  for select to authenticated using (public.fn_is_admin());

-- Convenance : promouvoir un utilisateur existant en admin par e-mail.
-- À exécuter une fois dans le SQL Editor :  select public.fn_grant_admin('vous@exemple.fr');
create or replace function public.fn_grant_admin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where email = lower(p_email);
  if v_id is null then
    raise exception 'Aucun utilisateur Auth avec l''e-mail %', p_email;
  end if;
  insert into public.app_admin (user_id) values (v_id)
  on conflict (user_id) do nothing;
  return v_id;
end$$;

-- --------------------------------------------------------------------
-- RLS — écriture des référentiels réservée à l'admin (doc 10 §3).
-- Les policies sont permissives et s'ajoutent (OR) aux policies de lecture
-- existantes (read_anon / read_authenticated). Pour INSERT/UPDATE/DELETE,
-- seule cette policy s'applique -> admin uniquement.
-- --------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['club','grimpeur','voie','rencontre','rencontre_voie']
  loop
    execute format(
      'create policy "admin_write" on public.%I for all to authenticated '
      || 'using (public.fn_is_admin()) with check (public.fn_is_admin());',
      t
    );
    -- Privilèges de table (le RLS reste la garde réelle).
    execute format('grant select, insert, update, delete on public.%I to authenticated;', t);
  end loop;
end$$;

-- --------------------------------------------------------------------
-- Recalage des `etat` à l'édition des zones d'une voie (doc 02 §6).
-- Remplace core/signals.py:maj_performances_etat : on construit une table de
-- correspondance ancien_index -> nouvel_index par LIBELLÉ identique, puis on
-- remappe les performances existantes ; celles dont la zone a disparu sont
-- réinitialisées (etat null -> points null via trg_perf_points).
-- --------------------------------------------------------------------

create or replace function public.fn_remap_etat()
returns trigger language plpgsql as $$
declare
  map jsonb := '{}'::jsonb;   -- { "<ancien_index>": <nouvel_index> }
  i int;
  j int;
  lbl text;
  hit int;
begin
  for i in 0 .. jsonb_array_length(old.zones) - 1 loop
    lbl := old.zones->i->>'label';
    hit := null;
    for j in 0 .. jsonb_array_length(new.zones) - 1 loop
      if new.zones->j->>'label' = lbl then
        hit := j;
        exit;
      end if;
    end loop;
    if hit is not null then
      map := map || jsonb_build_object(i::text, hit);
    end if;
  end loop;

  -- Zones conservées : on remappe l'index. L'UPDATE de `etat` déclenche
  -- trg_perf_points qui recalcule `points` (bloc/diff) à partir des NOUVELLES zones.
  update public.performance p
  set etat = (map->>(p.etat::text))::int
  where p.voie_id = new.id
    and p.etat is not null
    and map ? (p.etat::text)
    and (map->>(p.etat::text))::int is distinct from p.etat;

  -- Zones disparues : réinitialisation.
  update public.performance p
  set etat = null, points = null
  where p.voie_id = new.id
    and p.etat is not null
    and not (map ? (p.etat::text));

  return new;
end$$;

-- N.B. pour une voie de vitesse, le remap d'etat ne recalcule pas les points
-- (calcul différé à fn_proceed_speed_points) ; éditer un barème vitesse en cours
-- de rencontre reste un cas rare à recalculer manuellement (cf. doc 02 §6).
create trigger trg_voie_remap_etat
after update of zones on public.voie
for each row
when (old.zones is distinct from new.zones)
execute function public.fn_remap_etat();
