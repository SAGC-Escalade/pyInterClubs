-- =====================================================================
-- Tranche 7 — Nettoyage du jeu de données de démo / QA
-- Réf. : docs/spec/11-migration-donnees.md §1/§7 ; workflow migrations manuel
-- =====================================================================
-- Purge toutes les données applicatives pour pouvoir REJOUER `seed.sql`
-- (barème + jeux de démo T1/T4) sans doublon ni collision d'identité.
--
-- Contexte : pas de `db:reset` disponible ici (pas de Docker) — coller ce
-- script dans le SQL editor / psql AVANT de recoller `seed.sql`.
--
-- ⚠️ DESTRUCTIF : supprime clubs, grimpeurs, voies, rencontres, équipes,
--    scores et performances. Ne conserve que le schéma et les autres clés
--    `config`. À n'utiliser que sur une base de démo / QA.
--
-- REJOUABLE : `truncate ... restart identity` est idempotent. Les séquences
-- d'identité repartent de 1 (cf. réalignement doc 11 §1/§7).
-- =====================================================================

truncate table
  public.performance,
  public.score,
  public.equipe,
  public.rencontre_voie,
  public.rencontre,
  public.grimpeur,
  public.voie,
  public.club
restart identity cascade;

-- Rencontre courante par défaut (posée par les blocs de démo) — les autres
-- clés de config (Wi-Fi, etc.) sont conservées.
delete from public.config where key = 'DEFAULT_RENCONTRE';

-- Vérification : toutes ces tables doivent être vides (0).
-- select
--   (select count(*) from public.club)        as clubs,
--   (select count(*) from public.grimpeur)     as grimpeurs,
--   (select count(*) from public.voie)         as voies,
--   (select count(*) from public.rencontre)    as rencontres,
--   (select count(*) from public.performance)  as perfs;
