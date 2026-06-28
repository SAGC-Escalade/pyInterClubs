-- =====================================================================
-- Tranche 4 (coach) — Inscription des grimpeurs + ordre + groupe
-- Réf. : docs/spec/04-workflows-coach.md §4/§5, docs/spec/02-regles-scoring.md §4
-- =====================================================================
-- Ports des effets de bord de ScoreSerializer.create / ordre / groupe (legacy
-- api/serializers.py, core/models.py). Ces opérations dépassent le périmètre RLS
-- du coach (création de performances pré-affectées) -> fonctions SECURITY DEFINER
-- gardées manuellement : l'appelant doit être admin, ou le coach du club et de la
-- rencontre de l'équipe visée (doc 10 §3, via fn_current_* de 0006).
-- =====================================================================

-- --------------------------------------------------------------------
-- Garde commune : l'appelant peut-il écrire sur cette équipe ?
-- --------------------------------------------------------------------
create or replace function public.fn_peut_gerer_equipe(p_equipe_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.fn_is_admin() or exists (
    select 1 from public.equipe e
    where e.id = p_equipe_id
      and public.fn_current_role() = 'coach'
      and e.club_id      = public.fn_current_club()
      and e.rencontre_id = public.fn_current_rencontre()
  );
$$;

-- --------------------------------------------------------------------
-- Inscription d'un grimpeur dans une équipe (doc 04 §5, doc 02 §4).
-- Crée le score (ordre = plus petit libre 1..8, club_preteur si autre club) puis
-- les performances : nb_bloc blocs + nb_vitesse vitesses PRÉ-AFFECTÉS selon le
-- sexe (voie.genre ∈ {sexe, mixte}), et nb_diff diffs SANS voie (affectées
-- ensuite par le juge ou par le mode groupé).
-- --------------------------------------------------------------------
create or replace function public.fn_inscrire_grimpeur(
  p_equipe_id   bigint,
  p_grimpeur_id bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_equipe       record;
  v_sexe         smallint;
  v_grimpeur_club bigint;
  v_ordre        int;
  v_club_preteur bigint;
  v_score_id     bigint;
  v_nb_bloc      int;
  v_nb_diff      int;
  v_nb_vitesse   int;
begin
  if not public.fn_peut_gerer_equipe(p_equipe_id) then
    raise exception 'Action réservée au coach de ce club.' using errcode = '42501';
  end if;

  select e.club_id, e.rencontre_id, r.nb_bloc, r.nb_diff, r.nb_vitesse
    into v_equipe
  from public.equipe e
  join public.rencontre r on r.id = e.rencontre_id
  where e.id = p_equipe_id;
  if not found then
    raise exception 'Équipe % introuvable.', p_equipe_id using errcode = 'P0002';
  end if;
  v_nb_bloc := v_equipe.nb_bloc; v_nb_diff := v_equipe.nb_diff;
  v_nb_vitesse := v_equipe.nb_vitesse;

  select sexe, club_id into v_sexe, v_grimpeur_club
  from public.grimpeur where id = p_grimpeur_id;
  if not found then
    raise exception 'Grimpeur % introuvable.', p_grimpeur_id using errcode = 'P0002';
  end if;

  -- Ordre : plus petit entier libre dans 1..8.
  select min(o) into v_ordre
  from generate_series(1, 8) o
  where o not in (select ordre from public.score where equipe_id = p_equipe_id);
  if v_ordre is null then
    raise exception 'Équipe complète : 8 membres maximum.';
  end if;

  -- Club prêteur si le grimpeur vient d'un autre club que l'équipe.
  v_club_preteur := case
    when v_grimpeur_club <> v_equipe.club_id then v_grimpeur_club else null
  end;

  insert into public.score (equipe_id, grimpeur_id, ordre, club_preteur_id)
  values (p_equipe_id, p_grimpeur_id, v_ordre, v_club_preteur)
  returning id into v_score_id;

  -- Blocs pré-affectés (voies du sexe), limités à nb_bloc.
  insert into public.performance (voie_id, score_id)
  select v.id, v_score_id
  from public.rencontre_voie rv
  join public.voie v on v.id = rv.voie_id
  where rv.rencontre_id = v_equipe.rencontre_id
    and v.type = 1 and v.genre in (v_sexe, 3)
  order by v.id
  limit v_nb_bloc;

  -- Vitesses pré-affectées (voies du sexe), limitées à nb_vitesse.
  insert into public.performance (voie_id, score_id)
  select v.id, v_score_id
  from public.rencontre_voie rv
  join public.voie v on v.id = rv.voie_id
  where rv.rencontre_id = v_equipe.rencontre_id
    and v.type = 3 and v.genre in (v_sexe, 3)
  order by v.id
  limit v_nb_vitesse;

  -- Diffs sans voie (affectées ensuite par le juge / mode groupé).
  insert into public.performance (voie_id, score_id)
  select null, v_score_id from generate_series(1, v_nb_diff);

  return v_score_id;
end$$;

-- --------------------------------------------------------------------
-- Déplacement d'un membre dans l'ordre (échange avec le voisin, doc 04 §4).
-- p_sens : 'up' (ordre-1) ou 'down' (ordre+1). Aux bornes : sans effet.
-- --------------------------------------------------------------------
create or replace function public.fn_score_ordre(
  p_score_id bigint,
  p_sens     text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_equipe_id bigint;
  v_ordre     int;
  v_cible     int;
  v_voisin    bigint;
begin
  select equipe_id, ordre into v_equipe_id, v_ordre
  from public.score where id = p_score_id;
  if not found then
    raise exception 'Membre % introuvable.', p_score_id using errcode = 'P0002';
  end if;
  if not public.fn_peut_gerer_equipe(v_equipe_id) then
    raise exception 'Action réservée au coach de ce club.' using errcode = '42501';
  end if;

  v_cible := case p_sens when 'up' then v_ordre - 1
                         when 'down' then v_ordre + 1
                         else null end;
  if v_cible is null then
    raise exception 'Sens invalide (attendu up/down).';
  end if;

  select id into v_voisin
  from public.score where equipe_id = v_equipe_id and ordre = v_cible;
  if v_voisin is null then
    return; -- déjà à une borne : rien à échanger.
  end if;

  -- Échange (pas de contrainte d'unicité sur ordre : permutation directe).
  update public.score set ordre = v_ordre  where id = v_voisin;
  update public.score set ordre = v_cible  where id = p_score_id;
end$$;

-- --------------------------------------------------------------------
-- Mode groupé : affecte nb_diff voies de diff consécutives à partir de
-- p_voie_id aux performances de diff sans voie du score (doc 04 §4, doc 02 §4).
-- --------------------------------------------------------------------
create or replace function public.fn_score_groupe(
  p_score_id bigint,
  p_voie_id  bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_equipe_id  bigint;
  v_rencontre  bigint;
  v_sexe       smallint;
  v_nb_diff    int;
begin
  select sc.equipe_id, e.rencontre_id, g.sexe, r.nb_diff
    into v_equipe_id, v_rencontre, v_sexe, v_nb_diff
  from public.score sc
  join public.equipe   e on e.id = sc.equipe_id
  join public.rencontre r on r.id = e.rencontre_id
  join public.grimpeur g on g.id = sc.grimpeur_id
  where sc.id = p_score_id;
  if not found then
    raise exception 'Membre % introuvable.', p_score_id using errcode = 'P0002';
  end if;
  if not public.fn_peut_gerer_equipe(v_equipe_id) then
    raise exception 'Action réservée au coach de ce club.' using errcode = '42501';
  end if;

  with cibles as (
    select id, row_number() over (order by id) rn
    from public.performance
    where score_id = p_score_id and voie_id is null
  ),
  src as (
    select v.id as voie_id, row_number() over (order by v.id) rn
    from public.rencontre_voie rv
    join public.voie v on v.id = rv.voie_id
    where rv.rencontre_id = v_rencontre
      and v.type = 2 and v.genre in (v_sexe, 3)
      and v.id >= p_voie_id
    order by v.id
    limit v_nb_diff
  )
  update public.performance p
  set voie_id = src.voie_id
  from cibles, src
  where p.id = cibles.id and cibles.rn = src.rn;
end$$;

grant execute on function public.fn_peut_gerer_equipe(bigint)        to authenticated;
grant execute on function public.fn_inscrire_grimpeur(bigint, bigint) to authenticated;
grant execute on function public.fn_score_ordre(bigint, text)         to authenticated;
grant execute on function public.fn_score_groupe(bigint, bigint)      to authenticated;
