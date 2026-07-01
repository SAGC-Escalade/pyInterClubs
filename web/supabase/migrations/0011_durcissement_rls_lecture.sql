-- =====================================================================
-- Tranche 8 — Durcissement RLS lecture (tokens + config) + nettoyage Realtime
-- Réf. : docs/spec/10-auth-et-securite.md §3/§4, docs/spec/07-temps-reel.md §4
-- =====================================================================
-- État avant cette migration :
--   * `read_authenticated` (0001) autorisait TOUT utilisateur authentifié à lire
--     les 11 tables — y compris `coach`/`juge` (tokens QR) et `config` (Wi-Fi).
--   * `read_anon` (0003) ouvre déjà en anonyme les données de compétition
--     (club, grimpeur, voie, rencontre, equipe, score, performance) pour le board
--     public live et le classement global F/H (spec 10 §3) : on le CONSERVE.
--
-- Décision T8 (source de vérité front : lib/auth/visibility.ts) :
--   * `config` / `coach` / `juge` : lecture ADMIN seul (fn_is_admin). Les tokens
--     et la configuration sensible ne fuient plus vers le terrain ni l'anonyme.
--   * Données de compétition : lecture large inchangée (ne casse aucun parcours
--     recetté T1–T7 : board public, classement global, feuille juge inter-clubs).
--   * Écriture : déjà cloisonnée (admin_write 0004 ; coach_write/juge_write 0006).
--     Rien à modifier ici ; validée par les requêtes d'accès croisés en pied.
--
-- Realtime privé : NON retenu en T8 (décision documentée). Les payloads broadcast
-- (0009) n'exposent rien de plus que le board REST déjà anonyme ; le risque est
-- jugé faible. On se limite à retirer la publication postgres_changes (T1) devenue
-- inutile depuis le passage au broadcast (T6), pour réduire la surface anon.
--
-- Migration REJOUABLE (pas de Docker : appliquée à la main) :
--   drop policy if exists … avant create policy ; publication guardée.
-- Aucun changement de FORME du schéma -> pas de régénération database.types.ts,
-- pas d'adaptation seed.sql / reset-demo.sql.
-- =====================================================================

-- --------------------------------------------------------------------
-- 1. Lecture ADMIN seule sur les tables sensibles (tokens + config).
--    On retire `read_authenticated` (trop large) et on pose `read_admin`.
-- --------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['coach','juge','config']
  loop
    execute format('drop policy if exists "read_authenticated" on public.%I;', t);
    execute format('drop policy if exists "read_admin" on public.%I;', t);
    execute format(
      'create policy "read_admin" on public.%I for select to authenticated '
      || 'using (public.fn_is_admin());',
      t
    );
  end loop;
end$$;

-- Note : le login terrain (app/auth/club/route.ts) lit coach/juge via le client
-- service_role (contourne le RLS) ; les écrans admin (AccesManager,
-- RencontresManager) lisent ces tables en tant qu'admin -> read_admin les couvre.
-- La rencontre courante reste résolue sans lire `config` en direct : la fonction
-- default_rencontre_id() (0003) est SECURITY DEFINER.

-- --------------------------------------------------------------------
-- 2. Nettoyage Realtime : retrait de la publication postgres_changes (T1).
--    Depuis T6 le client consomme le broadcast par trigger (0009) ; les tables
--    n'ont plus besoin d'être publiées en row-changes (surface anon en moins).
--    Guardé : rejouable même si déjà retiré.
-- --------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['score','performance','equipe']
  loop
    begin
      execute format('alter publication supabase_realtime drop table public.%I;', t);
    exception
      when undefined_object then null;  -- table absente de la publication
      when undefined_table  then null;  -- publication absente
    end;
  end loop;
end$$;

-- =====================================================================
-- REQUÊTES DE VÉRIFICATION — accès croisés (à coller dans le SQL Editor Studio)
-- =====================================================================
-- Le RLS n'étant pas testable par Vitest, on prouve le cloisonnement en
-- simulant un JWT coach/juge. Adapter les <uuid> aux user_id réels
-- (select user_id from public.coach ; select user_id from public.juge ;).
--
-- ---- (a) LECTURE : un coach ne voit NI config NI les tokens -----------------
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<uuid_coach>","role":"authenticated"}';
--   select count(*) as config_visibles      from public.config;      -- attendu : 0
--   select count(*) as coachs_visibles      from public.coach;       -- attendu : 0
--   select count(*) as juges_visibles       from public.juge;        -- attendu : 0
--   select count(*) as equipes_visibles     from public.equipe;      -- attendu : > 0 (data large)
-- rollback;
--
-- ---- (b) LECTURE : un juge non plus --------------------------------------------
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<uuid_juge>","role":"authenticated"}';
--   select count(*) from public.config;   -- attendu : 0
--   select count(*) from public.juge;     -- attendu : 0
--   select count(*) from public.performance;  -- attendu : > 0 (feuille inter-clubs)
-- rollback;
--
-- ---- (c) LECTURE : l'admin voit tout -------------------------------------------
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<uuid_admin>","role":"authenticated"}';
--   select count(*) from public.config;   -- attendu : > 0
--   select count(*) from public.coach;    -- attendu : > 0
-- rollback;
--
-- ---- (d) ÉCRITURE : un coach ne modifie PAS une équipe d'un autre club ----------
--   Choisir <equipe_hors_club> = une equipe.id d'un club != jwt.club du coach.
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<uuid_coach>","role":"authenticated"}';
--   update public.equipe set numero = numero where id = <equipe_hors_club>;
--   -- attendu : UPDATE 0 (aucune ligne visée par la policy coach_write)
-- rollback;
--
-- ---- (e) ÉCRITURE : un juge ne modifie PAS une perf hors de ses voies ----------
--   Choisir <perf_hors_voie> = une performance.id dont voie_id n'est pas affectée
--   au juge (voie_id not in fn_current_voies()).
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<uuid_juge>","role":"authenticated"}';
--   update public.performance set etat = etat where id = <perf_hors_voie>;
--   -- attendu : UPDATE 0 (juge_write borne voie_id = any(fn_current_voies()))
-- rollback;
-- =====================================================================
