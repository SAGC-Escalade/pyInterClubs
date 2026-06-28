-- =====================================================================
-- Tranche 4 — Auth terrain (token/QR) + RLS par rôle
-- Réf. : docs/spec/10-auth-et-securite.md §2/§3, docs/spec/03-workflows-admin.md §9
-- =====================================================================
-- Les identités coach/juge (tables `coach`/`juge`, 0001) sont provisionnées à
-- l'ouverture de la rencontre / l'affectation : un utilisateur Supabase Auth +
-- un `token` aléatoire encodé dans le QR. L'échange token -> session se fait
-- côté serveur (app/auth/club/route.ts).
--
-- Plutôt qu'un claim JWT custom (Auth Hook), on matérialise le lien rôle <->
-- utilisateur dans les tables coach/juge (comme app_admin en 0004) et on le lit
-- via des fonctions SECURITY DEFINER consultées par les policies et le middleware.
-- Valeurs de rôle en français : 'admin' | 'coach' | 'juge'.
-- =====================================================================

-- --------------------------------------------------------------------
-- Résolution du rôle et du périmètre de l'utilisateur courant (doc 10 §2).
-- security definer -> contourne le RLS des tables consultées (pas de récursion).
-- --------------------------------------------------------------------

create or replace function public.fn_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (select 1 from public.app_admin a where a.user_id = auth.uid()) then 'admin'
    when exists (select 1 from public.coach c     where c.user_id = auth.uid()) then 'coach'
    when exists (select 1 from public.juge  j     where j.user_id = auth.uid()) then 'juge'
    else null
  end;
$$;

-- Rencontre courante : celle de l'identité terrain, sinon le défaut global.
create or replace function public.fn_current_rencontre()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select c.rencontre_id from public.coach c where c.user_id = auth.uid() limit 1),
    (select j.rencontre_id from public.juge  j where j.user_id = auth.uid() limit 1),
    public.default_rencontre_id()
  );
$$;

-- Club du coach courant.
create or replace function public.fn_current_club()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select c.club_id from public.coach c where c.user_id = auth.uid() limit 1;
$$;

-- Voies affectées au juge courant (via rencontre_voie.juge_id).
create or replace function public.fn_current_voies()
returns bigint[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(rv.voie_id), '{}')
  from public.rencontre_voie rv
  join public.juge j on j.id = rv.juge_id
  where j.user_id = auth.uid();
$$;

grant execute on function public.fn_current_role()      to authenticated;
grant execute on function public.fn_current_rencontre() to authenticated;
grant execute on function public.fn_current_club()      to authenticated;
grant execute on function public.fn_current_voies()     to authenticated;

-- --------------------------------------------------------------------
-- RLS écriture par rôle (doc 10 §3). Policies permissives qui s'ajoutent (OR)
-- à `read_authenticated` (0001). Le service_role (provisioning) contourne le RLS.
-- --------------------------------------------------------------------

-- equipe : admin, ou coach de son club pour la rencontre courante.
create policy "admin_write" on public.equipe for all to authenticated
  using (public.fn_is_admin()) with check (public.fn_is_admin());

create policy "coach_write" on public.equipe for all to authenticated
  using (
    public.fn_current_role() = 'coach'
    and rencontre_id = public.fn_current_rencontre()
    and club_id      = public.fn_current_club()
  )
  with check (
    public.fn_current_role() = 'coach'
    and rencontre_id = public.fn_current_rencontre()
    and club_id      = public.fn_current_club()
  );

grant select, insert, update, delete on public.equipe to authenticated;

-- score : adossé à l'équipe (club + rencontre du coach).
create policy "admin_write" on public.score for all to authenticated
  using (public.fn_is_admin()) with check (public.fn_is_admin());

create policy "coach_write" on public.score for all to authenticated
  using (
    exists (
      select 1 from public.equipe e
      where e.id = score.equipe_id
        and public.fn_current_role() = 'coach'
        and e.rencontre_id = public.fn_current_rencontre()
        and e.club_id      = public.fn_current_club()
    )
  )
  with check (
    exists (
      select 1 from public.equipe e
      where e.id = score.equipe_id
        and public.fn_current_role() = 'coach'
        and e.rencontre_id = public.fn_current_rencontre()
        and e.club_id      = public.fn_current_club()
    )
  );

grant select, insert, update, delete on public.score to authenticated;

-- performance : admin ; coach (création à l'inscription, scores de son club) ;
-- juge (mise à jour des perfs de ses voies affectées uniquement).
create policy "admin_write" on public.performance for all to authenticated
  using (public.fn_is_admin()) with check (public.fn_is_admin());

create policy "coach_write" on public.performance for all to authenticated
  using (
    exists (
      select 1 from public.score s
      join public.equipe e on e.id = s.equipe_id
      where s.id = performance.score_id
        and public.fn_current_role() = 'coach'
        and e.rencontre_id = public.fn_current_rencontre()
        and e.club_id      = public.fn_current_club()
    )
  )
  with check (
    exists (
      select 1 from public.score s
      join public.equipe e on e.id = s.equipe_id
      where s.id = performance.score_id
        and public.fn_current_role() = 'coach'
        and e.rencontre_id = public.fn_current_rencontre()
        and e.club_id      = public.fn_current_club()
    )
  );

create policy "juge_write" on public.performance for update to authenticated
  using (
    public.fn_current_role() = 'juge'
    and voie_id = any (public.fn_current_voies())
  )
  with check (
    public.fn_current_role() = 'juge'
    and voie_id = any (public.fn_current_voies())
  );

grant select, insert, update, delete on public.performance to authenticated;
