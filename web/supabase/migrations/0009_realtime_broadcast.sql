-- =====================================================================
-- Tranche 6 — Temps réel avancé : diffusion Broadcast pilotée par triggers
-- Réf. : docs/spec/07-temps-reel.md §3.1/§3.3/§4
-- =====================================================================
-- Remplace l'abonnement postgres_changes générique de la Tranche 1 par une
-- diffusion « broadcast » reproduisant fidèlement les topics de l'ancien SSE
-- (api/signals.py), préfixés par `rencontre:{id}:` pour isoler les rencontres
-- simultanées. La cascade perf→score→équipe est préservée : chaque changement
-- réémet les topics parents avec les agrégats recalculés (v_score_points /
-- v_equipe_points). Canaux NON privés pour l'instant ; le cloisonnement par
-- claims (canaux privés + RLS sur realtime.messages) est différé à la Tranche 8.
-- =====================================================================

-- --------------------------------------------------------------------
-- Helper : émet un message broadcast sans jamais faire échouer la
-- transaction métier (un incident Realtime ne doit pas bloquer un score).
-- --------------------------------------------------------------------
create or replace function public.fn_rt_broadcast(
  p_topic   text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform realtime.send(p_payload, 'change', p_topic, false);
exception when others then
  null;
end$$;

-- Payloads d'agrégat (forme alignée sur les lignes de vue consommées côté front).
create or replace function public.fn_rt_equipe_payload(p_equipe bigint)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'equipe_id', ep.equipe_id, 'numero', ep.numero, 'club_id', ep.club_id,
    'points', ep.points, 'nb_membres', ep.nb_membres, 'valide', ep.valide
  )
  from public.v_equipe_points ep
  where ep.equipe_id = p_equipe;
$$;

create or replace function public.fn_rt_score_payload(p_score bigint)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'score_id', sp.score_id, 'equipe_id', sp.equipe_id,
    'grimpeur_id', sp.grimpeur_id, 'points', sp.points, 'valide', sp.valide
  )
  from public.v_score_points sp
  where sp.score_id = p_score;
$$;

-- Cascade équipe : réémet les 3 topics équipe avec les agrégats recalculés.
create or replace function public.fn_rt_cascade_equipe(
  p_rencontre bigint,
  p_club      bigint,
  p_equipe    bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pfx     text := 'rencontre:' || p_rencontre;
  payload jsonb := public.fn_rt_equipe_payload(p_equipe);
begin
  if payload is null then
    return;   -- équipe supprimée (cascade) : rien à réémettre
  end if;
  perform public.fn_rt_broadcast(pfx || ':equipes', payload);
  perform public.fn_rt_broadcast(pfx || ':club:' || p_club || ':equipes', payload);
  perform public.fn_rt_broadcast(pfx || ':equipes:' || p_equipe, payload);
end$$;

-- --------------------------------------------------------------------
-- Équipe : create/delete -> collection + club + item ; update -> idem.
-- (équivalent EquipeNotifier, api/signals.py:71-102)
-- --------------------------------------------------------------------
create or replace function public.fn_rt_equipe()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rencontre bigint;
  v_club      bigint;
  v_id        bigint;
  pfx         text;
  payload     jsonb;
begin
  if TG_OP = 'DELETE' then
    v_rencontre := old.rencontre_id; v_club := old.club_id; v_id := old.id;
    payload := jsonb_build_object('deleted', jsonb_build_object('id', v_id));
  else
    v_rencontre := new.rencontre_id; v_club := new.club_id; v_id := new.id;
    payload := public.fn_rt_equipe_payload(v_id);
  end if;

  pfx := 'rencontre:' || v_rencontre;
  perform public.fn_rt_broadcast(pfx || ':equipes', payload);
  perform public.fn_rt_broadcast(pfx || ':club:' || v_club || ':equipes', payload);
  perform public.fn_rt_broadcast(pfx || ':equipes:' || v_id, payload);
  return null;
end$$;

drop trigger if exists trg_equipe_broadcast on public.equipe;
create trigger trg_equipe_broadcast
after insert or update or delete on public.equipe
for each row execute function public.fn_rt_equipe();

-- --------------------------------------------------------------------
-- Score : collection + club + item, puis cascade vers l'équipe parente.
-- (équivalent ScoreNotifier, api/signals.py:107-155)
-- --------------------------------------------------------------------
create or replace function public.fn_rt_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_equipe    bigint;
  v_rencontre bigint;
  v_club      bigint;
  v_id        bigint;
  pfx         text;
  payload     jsonb;
begin
  if TG_OP = 'DELETE' then
    v_equipe := old.equipe_id; v_id := old.id;
    payload := jsonb_build_object('deleted', jsonb_build_object('id', v_id));
  else
    v_equipe := new.equipe_id; v_id := new.id;
    payload := public.fn_rt_score_payload(v_id);
  end if;

  select eq.rencontre_id, eq.club_id into v_rencontre, v_club
  from public.equipe eq where eq.id = v_equipe;
  if v_rencontre is null then
    return null;   -- équipe déjà supprimée
  end if;

  pfx := 'rencontre:' || v_rencontre;
  perform public.fn_rt_broadcast(pfx || ':scores', payload);
  perform public.fn_rt_broadcast(pfx || ':club:' || v_club || ':scores', payload);
  perform public.fn_rt_broadcast(pfx || ':scores:' || v_id, payload);

  perform public.fn_rt_cascade_equipe(v_rencontre, v_club, v_equipe);
  return null;
end$$;

drop trigger if exists trg_score_broadcast on public.score;
create trigger trg_score_broadcast
after insert or update or delete on public.score
for each row execute function public.fn_rt_score();

-- --------------------------------------------------------------------
-- Performance : feuille de voie + item, puis cascade score et équipe.
-- Changement de voie -> suppression sur l'ancienne feuille.
-- (équivalent PerformanceNotifier, api/signals.py:160-231)
-- --------------------------------------------------------------------
create or replace function public.fn_rt_perf()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score     bigint;
  v_id        bigint;
  v_voie      bigint;
  v_old_voie  bigint;
  v_equipe    bigint;
  v_rencontre bigint;
  v_club      bigint;
  pfx         text;
  payload     jsonb;
  sc_payload  jsonb;
begin
  if TG_OP = 'DELETE' then
    v_score := old.score_id; v_id := old.id; v_voie := old.voie_id;
    payload := jsonb_build_object('deleted', jsonb_build_object('id', v_id));
  else
    v_score := new.score_id; v_id := new.id; v_voie := new.voie_id;
    payload := jsonb_build_object(
      'id', new.id, 'voie_id', new.voie_id, 'score_id', new.score_id,
      'etat', new.etat, 'points', new.points, 'temps', new.temps::text
    );
    if TG_OP = 'UPDATE' and new.voie_id is distinct from old.voie_id then
      v_old_voie := old.voie_id;
    end if;
  end if;

  select sc.equipe_id, eq.rencontre_id, eq.club_id
    into v_equipe, v_rencontre, v_club
  from public.score sc
  join public.equipe eq on eq.id = sc.equipe_id
  where sc.id = v_score;
  if v_rencontre is null then
    return null;   -- score/équipe déjà supprimé (cascade)
  end if;

  pfx := 'rencontre:' || v_rencontre;

  -- Feuille de juge (par voie) + ancienne feuille si la voie a changé.
  if v_voie is not null then
    perform public.fn_rt_broadcast(pfx || ':voie:' || v_voie || ':perfs', payload);
  end if;
  if v_old_voie is not null then
    perform public.fn_rt_broadcast(
      pfx || ':voie:' || v_old_voie || ':perfs',
      jsonb_build_object('deleted', jsonb_build_object('id', v_id))
    );
  end if;
  perform public.fn_rt_broadcast(pfx || ':perfs:' || v_id, payload);

  -- Cascade score (points/validité recalculés).
  sc_payload := public.fn_rt_score_payload(v_score);
  if sc_payload is not null then
    perform public.fn_rt_broadcast(pfx || ':scores', sc_payload);
    perform public.fn_rt_broadcast(pfx || ':club:' || v_club || ':scores', sc_payload);
    perform public.fn_rt_broadcast(pfx || ':scores:' || v_score, sc_payload);
  end if;

  -- Cascade équipe.
  perform public.fn_rt_cascade_equipe(v_rencontre, v_club, v_equipe);
  return null;
end$$;

drop trigger if exists trg_performance_broadcast on public.performance;
create trigger trg_performance_broadcast
after insert or update or delete on public.performance
for each row execute function public.fn_rt_perf();

-- --------------------------------------------------------------------
-- Note : la publication `supabase_realtime` (postgres_changes, Tranche 1) n'est
-- plus utilisée par le client une fois passé au broadcast. On la laisse en place
-- (sans effet de bord) ; son retrait éventuel est un point de durcissement T8.
-- --------------------------------------------------------------------
