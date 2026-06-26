-- =====================================================================
-- Tranche 1 — Vue de classement + exposition publique (lecture seule) + Realtime
-- Réf. : docs/spec/02-regles-scoring.md §5, doc 07, doc 08 §3/§5
-- =====================================================================

-- Classement individuel : rang par points décroissants, par rencontre et par sexe.
-- rank() reproduit la logique de ranking.jsx (ex æquo = même rang, saut ensuite).
create or replace view public.v_classement as
select
  sp.score_id,
  sp.rencontre_id,
  r.saison,
  sp.grimpeur_id,
  g.nom,
  g.prenom,
  g.sexe,
  g.annee_naissance,
  c.nom as club_nom,
  sp.points,
  sp.valide,
  rank() over (
    partition by sp.rencontre_id, g.sexe
    order by sp.points desc
  ) as rang
from public.v_score_points sp
join public.rencontre r on r.id = sp.rencontre_id
join public.grimpeur  g on g.id = sp.grimpeur_id
join public.club      c on c.id = g.club_id;

-- --------------------------------------------------------------------
-- Exposition publique du tableau de scores (lecture seule).
-- Le classement live est par nature public pendant la compétition
-- (l'ancien flux SSE Django n'était pas cloisonné). Cf. doc 10 §3.
-- --------------------------------------------------------------------

grant select on public.v_classement     to anon, authenticated;
grant select on public.v_score_points   to anon, authenticated;
grant select on public.v_equipe_points  to anon, authenticated;

-- Lecture anonyme sur les tables nécessaires à l'affichage / au Realtime.
do $$
declare t text;
begin
  foreach t in array array['club','grimpeur','voie','rencontre','equipe','score','performance']
  loop
    execute format(
      'create policy "read_anon" on public.%I for select to anon using (true);',
      t
    );
  end loop;
end$$;

-- --------------------------------------------------------------------
-- Realtime (Postgres Changes) — Tranche 1 : abonnement direct aux tables.
-- À l'écoute d'un changement, le front rafraîchit v_classement (doc 07 §3.2).
-- (Sera complété par une diffusion broadcast par trigger en Tranche 6.)
-- --------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.score;
exception when duplicate_object then null;
end$$;
do $$
begin
  alter publication supabase_realtime add table public.performance;
exception when duplicate_object then null;
end$$;
do $$
begin
  alter publication supabase_realtime add table public.equipe;
exception when duplicate_object then null;
end$$;

-- --------------------------------------------------------------------
-- Rencontre courante exposée aux clients publics SANS exposer la table
-- config (qui peut contenir des valeurs sensibles, ex. mot de passe Wi-Fi).
-- Renvoie DEFAULT_RENCONTRE si défini, sinon la rencontre la plus récente.
-- --------------------------------------------------------------------
create or replace function public.default_rencontre_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value::bigint from public.config where key = 'DEFAULT_RENCONTRE'),
    (select id from public.rencontre order by date desc, id desc limit 1)
  );
$$;

grant execute on function public.default_rencontre_id() to anon, authenticated;
