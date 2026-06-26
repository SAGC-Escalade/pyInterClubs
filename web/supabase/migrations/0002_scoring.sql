-- =====================================================================
-- pyInterClubs — Logique de scoring (triggers + fonctions)
-- Réf. : docs/spec/02-regles-scoring.md
-- =====================================================================
-- Centralise la logique aujourd'hui éclatée côté Django (Performance.save,
-- Rencontre.proceed_speed_points, signaux). Remplace notamment l'eval() de
-- Python par un évaluateur restreint et SÛR (fn_eval_rank_*).
--
-- ⚠️ Le recalcul vitesse (fn_proceed_speed_points) reproduit l'algorithme du
--    doc 02 §3 ; il DOIT être validé par les cas de référence du doc 02 §7
--    avant mise en production.
-- =====================================================================

-- --------------------------------------------------------------------
-- Évaluateur restreint pour la vitesse (remplace eval()).
-- Grammaire supportée (cf. barèmes addVoies/importHistoricDB) :
--   conditions : "{rank}>N", "{rank}>=N", "{rank}<N", "{rank}<=N", "{rank}==N"
--   points     : entier | "A-{rank}" | "A-{rank}//B"  (// = division entière)
-- --------------------------------------------------------------------

create or replace function public.fn_eval_rank_condition(label text, rank int)
returns boolean language plpgsql immutable as $$
declare
  m text[];
  op text;
  n int;
begin
  m := regexp_match(label, '^\{rank\}\s*(>=|<=|>|<|==|=)\s*(-?\d+)$');
  if m is null then
    return false;
  end if;
  op := m[1];
  n  := m[2]::int;
  if    op = '>'  then return rank >  n;
  elsif op = '<'  then return rank <  n;
  elsif op = '>=' then return rank >= n;
  elsif op = '<=' then return rank <= n;
  else                 return rank =  n;   -- '==' ou '='
  end if;
end$$;

create or replace function public.fn_eval_rank_points(expr text, rank int)
returns int language plpgsql immutable as $$
declare
  m text[];
begin
  -- entier littéral
  if expr ~ '^-?\d+$' then
    return expr::int;
  end if;
  -- "A-{rank}//B"  =>  A - (rank // B)   (// prioritaire, comme en Python)
  m := regexp_match(expr, '^(-?\d+)\s*-\s*\{rank\}\s*//\s*(\d+)$');
  if m is not null then
    return m[1]::int - (rank / m[2]::int);   -- division entière (rank >= 0)
  end if;
  -- "A-{rank}"     =>  A - rank
  m := regexp_match(expr, '^(-?\d+)\s*-\s*\{rank\}$');
  if m is not null then
    return m[1]::int - rank;
  end if;
  raise exception 'Expression de points vitesse non supportée: %', expr;
end$$;

-- --------------------------------------------------------------------
-- Bloc / Difficulté : points statiques depuis zones[etat].points
-- (équivalent de Performance.save(), core/models.py:522 ; doc 02 §2)
-- Pour la vitesse : réinitialise etat/points si le temps repasse à null.
-- --------------------------------------------------------------------

create or replace function public.fn_calc_perf_points()
returns trigger language plpgsql as $$
declare
  v_type   smallint;
  z        jsonb;
  zpoints  jsonb;
begin
  if new.voie_id is null then
    return new;
  end if;
  select type, zones into v_type, z from public.voie where id = new.voie_id;

  if v_type = 3 then
    -- Vitesse : calcul des points différé à fn_proceed_speed_points.
    -- Si le temps est remis à null -> etat = zone "non réalisé" (points null).
    if new.temps is null then
      new.points := null;
      select pos - 1 into new.etat
      from jsonb_array_elements(z) with ordinality as e(elem, pos)
      where e.elem->'points' = 'null'::jsonb
      limit 1;
    end if;
    return new;
  end if;

  -- Bloc / Difficulté
  if new.etat is null then
    new.points := null;
  elsif new.etat >= 0 and new.etat < jsonb_array_length(z) then
    zpoints := z->(new.etat)->'points';
    if jsonb_typeof(zpoints) = 'number' then
      new.points := (zpoints #>> '{}')::int;
    else
      new.points := null;   -- barèmes bloc/diff : numériques ou null
    end if;
  end if;
  return new;
end$$;

create trigger trg_perf_points
before insert or update of etat, temps, voie_id on public.performance
for each row execute function public.fn_calc_perf_points();

-- --------------------------------------------------------------------
-- Vitesse : recalcul du classement par rang et par sexe.
-- (équivalent de Rencontre.proceed_speed_points, core/models.py:366 ; doc 02 §3)
-- security definer : un juge déclenche un recalcul global (au-delà de son RLS).
-- --------------------------------------------------------------------

create or replace function public.fn_proceed_speed_points(
  p_rencontre bigint,
  p_sexe      smallint default null
)
returns void language plpgsql security definer as $$
declare
  sexes          smallint[];
  s              smallint;
  grp            record;
  perf           record;
  processed_real int;
  v_rank         int;
  z              jsonb;
  i              int;
  zlabel         text;
  zpoints        jsonb;
  chosen_i       int;
  chosen_points  int;
  tkey           text;
  is_real        boolean;
begin
  if p_sexe is null then sexes := array[1, 2]; else sexes := array[p_sexe]; end if;

  foreach s in array sexes loop
    processed_real := 0;

    -- Groupes de temps identiques (ex æquo), triés par temps croissant.
    -- Les temps négatifs (Abandon -2min, Chute -1min) viennent avant les temps réels
    -- et n'incrémentent pas le rang (cf. doc 02 §3.2).
    for grp in
      select pf.temps as temps
      from public.performance pf
      join public.score    sc on sc.id = pf.score_id
      join public.equipe   eq on eq.id = sc.equipe_id
      join public.grimpeur g  on g.id  = sc.grimpeur_id
      join public.voie     v  on v.id  = pf.voie_id
      where eq.rencontre_id = p_rencontre
        and g.sexe = s
        and v.type = 3
        and pf.temps is not null
      group by pf.temps
      order by pf.temps
    loop
      v_rank  := processed_real;
      is_real := grp.temps >= interval '0';
      if    grp.temps = interval '-2 minutes' then tkey := 'Abandon';
      elsif grp.temps = interval '-1 minutes' then tkey := 'Chute';
      else  tkey := null;
      end if;

      for perf in
        select pf.id, v.zones
        from public.performance pf
        join public.score    sc on sc.id = pf.score_id
        join public.equipe   eq on eq.id = sc.equipe_id
        join public.grimpeur g  on g.id  = sc.grimpeur_id
        join public.voie     v  on v.id  = pf.voie_id
        where eq.rencontre_id = p_rencontre
          and g.sexe = s
          and v.type = 3
          and pf.temps = grp.temps
      loop
        z := perf.zones;
        chosen_i := null;
        for i in 0 .. jsonb_array_length(z) - 1 loop
          zlabel := z->i->>'label';
          if (tkey is not null and zlabel = tkey)
             or (zlabel like '%rank%' and public.fn_eval_rank_condition(zlabel, v_rank)) then
            chosen_i := i;
            zpoints  := z->i->'points';
            exit;
          end if;
        end loop;

        if chosen_i is null then
          raise exception 'Aucune condition vitesse trouvée (perf %, rank %)', perf.id, v_rank;
        end if;

        if jsonb_typeof(zpoints) = 'string' then
          chosen_points := public.fn_eval_rank_points(zpoints #>> '{}', v_rank);
        elsif jsonb_typeof(zpoints) = 'number' then
          chosen_points := (zpoints #>> '{}')::int;
        else
          chosen_points := null;
        end if;

        update public.performance
        set points = chosen_points, etat = chosen_i
        where id = perf.id;
      end loop;

      -- Le rang n'avance que pour les temps réels.
      if is_real then
        processed_real := processed_real + (
          select count(*)
          from public.performance pf
          join public.score    sc on sc.id = pf.score_id
          join public.equipe   eq on eq.id = sc.equipe_id
          join public.grimpeur g  on g.id  = sc.grimpeur_id
          join public.voie     v  on v.id  = pf.voie_id
          where eq.rencontre_id = p_rencontre
            and g.sexe = s and v.type = 3 and pf.temps = grp.temps
        );
      end if;
    end loop;
  end loop;
end$$;

-- Déclencheur : à chaque changement de temps d'une perf vitesse, recalcul du
-- classement du sexe concerné (équivalent du signal core/signals.py:14).
-- N'écrit que points/etat -> ne se redéclenche pas (pas de récursion).
create or replace function public.fn_speed_recalc()
returns trigger language plpgsql as $$
declare
  v_type      smallint;
  v_rencontre bigint;
  v_sexe      smallint;
begin
  select type into v_type from public.voie where id = new.voie_id;
  if v_type is distinct from 3 then
    return new;
  end if;
  select eq.rencontre_id, g.sexe into v_rencontre, v_sexe
  from public.score sc
  join public.equipe   eq on eq.id = sc.equipe_id
  join public.grimpeur g  on g.id  = sc.grimpeur_id
  where sc.id = new.score_id;

  if v_rencontre is not null then
    perform public.fn_proceed_speed_points(v_rencontre, v_sexe);
  end if;
  return new;
end$$;

create trigger trg_speed_recalc
after update of temps on public.performance
for each row execute function public.fn_speed_recalc();

-- --------------------------------------------------------------------
-- Vues d'agrégat (points / validité) — remplacent les querysets annotés.
-- (core/models.py with_valide_and_points ; doc 02 §5)
-- --------------------------------------------------------------------

create or replace view public.v_score_points as
select
  sc.id            as score_id,
  sc.equipe_id,
  eq.rencontre_id,
  sc.grimpeur_id,
  coalesce(sum(pf.points), 0)                                                          as points,
  count(*) filter (where v.type = 1 and pf.points is not null)                         as nb_blocs_valide,
  count(*) filter (where v.type = 2 and pf.points is not null)                         as nb_diffs_valide,
  count(*) filter (where v.type = 3 and pf.points is not null)                         as nb_vitesses_valide,
  (    count(*) filter (where v.type = 1 and pf.points is not null) = r.nb_bloc
   and count(*) filter (where v.type = 2 and pf.points is not null) = r.nb_diff
   and count(*) filter (where v.type = 3 and pf.points is not null) = r.nb_vitesse)    as valide
from public.score sc
join public.equipe    eq on eq.id = sc.equipe_id
join public.rencontre r  on r.id  = eq.rencontre_id
left join public.performance pf on pf.score_id = sc.id
left join public.voie v on v.id = pf.voie_id
group by sc.id, sc.equipe_id, eq.rencontre_id, sc.grimpeur_id,
         r.nb_bloc, r.nb_diff, r.nb_vitesse;

create or replace view public.v_equipe_points as
select
  eq.id            as equipe_id,
  eq.rencontre_id,
  eq.club_id,
  eq.numero,
  coalesce(sum(sp.points), 0) as points,
  count(sp.score_id)          as nb_membres,
  (count(sp.score_id) > 0 and bool_and(sp.valide)) as valide
from public.equipe eq
left join public.v_score_points sp on sp.equipe_id = eq.id
group by eq.id, eq.rencontre_id, eq.club_id, eq.numero;
