-- =====================================================================
-- Tranche 4 (juge) — Affectation d'un grimpeur à la voie du juge (register)
-- Réf. : docs/spec/05-workflows-juge.md §5, doc 10 §3
-- =====================================================================
-- La saisie d'une performance (etat/temps) par le juge passe en écriture directe
-- (RLS `juge_write` de 0006 : voie ∈ fn_current_voies). En revanche `register`
-- affecte une performance de diff SANS voie (voie_id null) à la voie du juge :
-- l'ancienne ligne (voie nulle) n'est pas dans le périmètre RLS du juge -> on
-- passe par une fonction SECURITY DEFINER gardée (la voie cible doit appartenir
-- au juge courant).
-- =====================================================================

create or replace function public.fn_juge_register(
  p_score_id bigint,
  p_voie_id  bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perf_id bigint;
begin
  if not (
    public.fn_is_admin()
    or (public.fn_current_role() = 'juge'
        and p_voie_id = any (public.fn_current_voies()))
  ) then
    raise exception 'Action réservée au juge de cette voie.' using errcode = '42501';
  end if;

  -- Première performance de diff non encore affectée pour ce grimpeur.
  select id into v_perf_id
  from public.performance
  where score_id = p_score_id and voie_id is null
  order by id
  limit 1;
  if v_perf_id is null then
    raise exception 'Aucune voie de diff à affecter pour ce grimpeur.'
      using errcode = 'P0002';
  end if;

  update public.performance set voie_id = p_voie_id where id = v_perf_id;
  return v_perf_id;
end$$;

grant execute on function public.fn_juge_register(bigint, bigint) to authenticated;
