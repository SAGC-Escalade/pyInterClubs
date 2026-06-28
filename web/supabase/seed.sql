-- =====================================================================
-- Seed — barème de voies de référence
-- Réf. : admin/management/commands/addVoies.py (doc 02 §1/§3.3, doc 11 §6)
-- =====================================================================
-- zones au format tableau ORDONNÉ [{label, points}] (doc 02 §6).
-- Sous-ensemble représentatif (vitesse + blocs + diffs M1-M4) suffisant pour
-- exercer le scoring. Le jeu complet de voies de difficulté (T1..T12 enfants/ado)
-- est à générer depuis addVoies.py.
-- Genre : 1 femme, 2 homme, 3 mixte | Catégorie : 1 enfants, 2 ado | Type : 1 bloc, 2 diff, 3 vitesse

-- Vitesse enfants (par genre) ----------------------------------------
insert into public.voie (nom, niveau, categorie, genre, type, zones, actif) values
('Vitesse', 'Femme', 1, 1, 3,
 '[{"label":"A réaliser","points":null},{"label":"Abandon","points":0},{"label":"Chute","points":1},{"label":"{rank}>44","points":2},{"label":"{rank}>5","points":"11-{rank}//5"},{"label":"{rank}<=5","points":"15-{rank}"}]', true),
('Vitesse', 'Homme', 1, 2, 3,
 '[{"label":"A réaliser","points":null},{"label":"Abandon","points":0},{"label":"Chute","points":1},{"label":"{rank}>44","points":2},{"label":"{rank}>5","points":"11-{rank}//5"},{"label":"{rank}<=5","points":"15-{rank}"}]', true);

-- Vitesse adolescents (par genre) ------------------------------------
insert into public.voie (nom, niveau, categorie, genre, type, zones, actif) values
('Vitesse', 'Femme', 2, 1, 3,
 '[{"label":"A réaliser","points":null},{"label":"Abandon","points":0},{"label":"Chute","points":1},{"label":"{rank}>50","points":10},{"label":"{rank}<=50","points":"60-{rank}"}]', true),
('Vitesse', 'Homme', 2, 2, 3,
 '[{"label":"A réaliser","points":null},{"label":"Abandon","points":0},{"label":"Chute","points":1},{"label":"{rank}>50","points":10},{"label":"{rank}<=50","points":"60-{rank}"}]', true);

-- Blocs ---------------------------------------------------------------
insert into public.voie (nom, niveau, categorie, genre, type, zones, actif) values
('Bloc', '1', 1, 3, 1,
 '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"2e essai","points":3},{"label":"1er essai","points":4}]', true),
('Bloc', '2', 1, 3, 1,
 '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"3e essai","points":4},{"label":"2e essai","points":5},{"label":"1er essai","points":6}]', true),
('Bloc', '1', 2, 3, 1,
 '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone 1","points":10},{"label":"Top","points":30}]', true),
('Bloc', '2', 2, 3, 1,
 '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone 2","points":40},{"label":"Zone 1","points":20},{"label":"Top","points":60}]', true);

-- Difficulté enfants M1..M4 ------------------------------------------
insert into public.voie (nom, niveau, categorie, genre, type, zones, actif) values
('M1', '4c', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Top","points":0}]', true),
('M2', '5a', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Top","points":1}]', true),
('M3', '5b', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Top","points":2}]', true),
('M4', '5c', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Top","points":3}]', true);

-- Difficulté enfants T1..T3 (exemples ; compléter depuis addVoies.py) -
insert into public.voie (nom, niveau, categorie, genre, type, zones, actif) values
('T1', '4c', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone","points":3},{"label":"Top","points":5}]', true),
('T2', '5a', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone","points":3},{"label":"Top","points":6}]', true),
('T3', '5b', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone","points":4},{"label":"Top","points":7}]', true);

-- =====================================================================
-- Jeu de données de DÉMO (Tranche 1) — pour tester l'IHM /resultats
-- =====================================================================
-- Catégorie enfants (1), saison 2025. Les points bloc/diff sont calculés par
-- le trigger trg_perf_points ; la vitesse est insérée avec points/etat explicites
-- (pas de recalcul au seed — l'INSERT ne déclenche pas trg_speed_recalc).

do $$
declare
  c1 bigint; c2 bigint;
  r  bigint;
  e1 bigint; e2 bigint;
  v_bloc1 bigint; v_bloc2 bigint;
  v_m1 bigint; v_m2 bigint; v_m3 bigint;
  v_vf bigint; v_vh bigint;
  s  bigint;
  eq bigint;
  ord1 int := 0; ord2 int := 0; ord int;
  g  record;
begin
  -- Clubs
  insert into public.club (nom, ville) values ('CAF Bordeaux', 'Bordeaux')     returning id into c1;
  insert into public.club (nom, ville) values ('Pyrénéa Escalade', 'Tarbes')   returning id into c2;

  -- Grimpeurs (saison 2025 -> enfants : naissance 2012..2017 ; sexe 1=F, 2=H)
  insert into public.grimpeur (nom, prenom, annee_naissance, sexe, club_id) values
    ('DUPONT',  'Emma',   2015, 1, c1),
    ('MARTIN',  'Lucas',  2014, 2, c1),
    ('BERNARD', 'Chloé',  2016, 1, c1),
    ('PETIT',   'Hugo',   2013, 2, c1),
    ('ROBERT',  'Léa',    2015, 1, c2),
    ('RICHARD', 'Tom',    2014, 2, c2),
    ('DURAND',  'Jade',   2016, 1, c2),
    ('MOREAU',  'Nathan', 2013, 2, c2);

  -- Voies de référence (issues du seed ci-dessus)
  v_bloc1 := (select id from public.voie where type = 1 and categorie = 1 and niveau = '1' limit 1);
  v_bloc2 := (select id from public.voie where type = 1 and categorie = 1 and niveau = '2' limit 1);
  v_m1    := (select id from public.voie where nom = 'M1' limit 1);
  v_m2    := (select id from public.voie where nom = 'M2' limit 1);
  v_m3    := (select id from public.voie where nom = 'M3' limit 1);
  v_vf    := (select id from public.voie where type = 3 and categorie = 1 and genre = 1 limit 1);
  v_vh    := (select id from public.voie where type = 3 and categorie = 1 and genre = 2 limit 1);

  -- Rencontre (enfants, 2 blocs + 3 diffs + 1 vitesse ; voies réutilisables pour la démo)
  insert into public.rencontre
    (saison, club_id, date, categorie, nb_bloc, nb_diff, nb_vitesse, voies_reutilisables, voies_groupees)
  values
    (2025, c1, date '2025-03-15', 1, 2, 3, 1, true, false)
  returning id into r;

  -- Rencontre courante par défaut (résolue par /resultats)
  insert into public.config (key, type, value) values ('DEFAULT_RENCONTRE', 'int', r::text)
    on conflict (key) do update set value = excluded.value, type = excluded.type;

  -- Voies de la rencontre
  insert into public.rencontre_voie (rencontre_id, voie_id)
  select r, id from public.voie
  where id in (v_bloc1, v_bloc2, v_m1, v_m2, v_m3, v_vf, v_vh);

  -- Équipes (une par club)
  insert into public.equipe (rencontre_id, club_id, numero) values (r, c1, 1) returning id into e1;
  insert into public.equipe (rencontre_id, club_id, numero) values (r, c2, 1) returning id into e2;

  -- Inscriptions + performances
  for g in select id, sexe, club_id from public.grimpeur order by id loop
    if g.club_id = c1 then ord1 := ord1 + 1; eq := e1; ord := ord1;
    else                   ord2 := ord2 + 1; eq := e2; ord := ord2;
    end if;

    insert into public.score (equipe_id, grimpeur_id, ordre) values (eq, g.id, ord) returning id into s;

    -- 2 blocs (etat varie -> points calculés par le trigger)
    insert into public.performance (voie_id, score_id, etat) values (v_bloc1, s, 2 + (g.id % 2));
    insert into public.performance (voie_id, score_id, etat) values (v_bloc2, s, 2 + (g.id % 3));

    -- 3 diffs M1..M3 au Top (etat = 2 = "Top")
    insert into public.performance (voie_id, score_id, etat) values (v_m1, s, 2);
    insert into public.performance (voie_id, score_id, etat) values (v_m2, s, 2);
    insert into public.performance (voie_id, score_id, etat) values (v_m3, s, 2);

    -- 1 vitesse (temps + points/etat explicites ; etat 5 = "{rank}<=5")
    if g.sexe = 1 then
      insert into public.performance (voie_id, score_id, temps, points, etat)
      values (v_vf, s, make_interval(secs => 8 + (g.id % 5)), 15 - (g.id % 5), 5);
    else
      insert into public.performance (voie_id, score_id, temps, points, etat)
      values (v_vh, s, make_interval(secs => 8 + (g.id % 5)), 15 - (g.id % 5), 5);
    end if;
  end loop;
end$$;

-- =====================================================================
-- Jeu de données de DÉMO (Tranche 4) — écrans coach & juge
-- =====================================================================
-- Objectif : exercer l'auth terrain + provisioning + saisie (doc 04/05, doc 10).
-- Cette rencontre devient la « rencontre courante » (DEFAULT_RENCONTRE) pour que
-- coach/juge la résolvent après provisioning.
--
-- État volontairement PARTIEL :
--   • équipe c1 : 2 grimpeurs inscrits avec blocs+vitesse scorés mais 3 diffs
--     SANS voie (voie_id null) -> « à enregistrer/scorer » côté juge ;
--     2 grimpeurs du club NON inscrits -> à ajouter côté coach.
--   • équipe c2 : 2 grimpeurs entièrement scorés (diffs M1..M3 au Top) -> donnent
--     du contenu validé à /resultats ; 2 grimpeurs NON inscrits.
--   • Aucun juge affecté (juge_id null) -> l'admin affecte via « Accès & QR ».
--
-- ⚠️ Les comptes coach/juge (Supabase Auth + tokens) NE sont PAS créés ici :
--    ils se provisionnent via l'admin (« Démarrer » la rencontre, puis
--    « Affecter » un juge), qui appelle l'API Auth (hors SQL).
--
-- Rejouable : ne s'exécute que si la rencontre T4 (date 2025-04-12) n'existe pas.
-- =====================================================================
do $$
declare
  c1 bigint; c2 bigint;
  r  bigint;
  e1 bigint; e2 bigint;
  v_bloc1 bigint; v_bloc2 bigint;
  v_m1 bigint; v_m2 bigint; v_m3 bigint; v_m4 bigint;
  v_t1 bigint; v_t2 bigint; v_t3 bigint;
  v_vf bigint; v_vh bigint;
  s  bigint;
  ord int;
  g  record;
begin
  if exists (select 1 from public.rencontre where saison = 2025 and date = date '2025-04-12') then
    return; -- déjà semé
  end if;

  c1 := (select id from public.club where nom = 'CAF Bordeaux'     limit 1);
  c2 := (select id from public.club where nom = 'Pyrénéa Escalade' limit 1);
  if c1 is null or c2 is null then
    return; -- le bloc démo Tranche 1 (clubs) doit avoir été semé d'abord
  end if;

  v_bloc1 := (select id from public.voie where type = 1 and categorie = 1 and niveau = '1' limit 1);
  v_bloc2 := (select id from public.voie where type = 1 and categorie = 1 and niveau = '2' limit 1);
  v_m1 := (select id from public.voie where nom = 'M1' limit 1);
  v_m2 := (select id from public.voie where nom = 'M2' limit 1);
  v_m3 := (select id from public.voie where nom = 'M3' limit 1);
  v_m4 := (select id from public.voie where nom = 'M4' limit 1);
  v_t1 := (select id from public.voie where nom = 'T1' limit 1);
  v_t2 := (select id from public.voie where nom = 'T2' limit 1);
  v_t3 := (select id from public.voie where nom = 'T3' limit 1);
  v_vf := (select id from public.voie where type = 3 and categorie = 1 and genre = 1 limit 1);
  v_vh := (select id from public.voie where type = 3 and categorie = 1 and genre = 2 limit 1);

  -- Rencontre T4 (enfants, 2 blocs + 3 diffs + 1 vitesse), non groupée.
  insert into public.rencontre
    (saison, club_id, date, categorie, nb_bloc, nb_diff, nb_vitesse, voies_reutilisables, voies_groupees)
  values
    (2025, c1, date '2025-04-12', 1, 2, 3, 1, true, false)
  returning id into r;

  -- Rencontre courante par défaut.
  insert into public.config (key, type, value) values ('DEFAULT_RENCONTRE', 'int', r::text)
    on conflict (key) do update set value = excluded.value, type = excluded.type;

  -- Voies de la rencontre (plusieurs diffs pour l'affectation/le register du juge).
  insert into public.rencontre_voie (rencontre_id, voie_id)
  select r, id from public.voie
  where id in (v_bloc1, v_bloc2, v_m1, v_m2, v_m3, v_m4, v_t1, v_t2, v_t3, v_vf, v_vh);

  insert into public.equipe (rencontre_id, club_id, numero) values (r, c1, 1) returning id into e1;
  insert into public.equipe (rencontre_id, club_id, numero) values (r, c2, 1) returning id into e2;

  -- Club c1 : 2 inscrits PARTIELS (diffs à scorer), 2 laissés libres pour le coach.
  ord := 0;
  for g in select id, sexe from public.grimpeur where club_id = c1 order by id loop
    ord := ord + 1;
    exit when ord > 2;
    insert into public.score (equipe_id, grimpeur_id, ordre) values (e1, g.id, ord) returning id into s;
    insert into public.performance (voie_id, score_id, etat) values (v_bloc1, s, 3);
    insert into public.performance (voie_id, score_id, etat) values (v_bloc2, s, 2);
    -- 3 diffs SANS voie (à enregistrer/scorer côté juge)
    insert into public.performance (voie_id, score_id)
    select null::bigint, s from generate_series(1, 3);
    if g.sexe = 1 then
      insert into public.performance (voie_id, score_id, temps, points, etat)
      values (v_vf, s, make_interval(secs => 9), 12, 5);
    else
      insert into public.performance (voie_id, score_id, temps, points, etat)
      values (v_vh, s, make_interval(secs => 9), 12, 5);
    end if;
  end loop;

  -- Club c2 : 2 inscrits COMPLETS (diffs M1..M3 au Top), 2 laissés libres.
  ord := 0;
  for g in select id, sexe from public.grimpeur where club_id = c2 order by id loop
    ord := ord + 1;
    exit when ord > 2;
    insert into public.score (equipe_id, grimpeur_id, ordre) values (e2, g.id, ord) returning id into s;
    insert into public.performance (voie_id, score_id, etat) values (v_bloc1, s, 3);
    insert into public.performance (voie_id, score_id, etat) values (v_bloc2, s, 3);
    insert into public.performance (voie_id, score_id, etat) values (v_m1, s, 2);
    insert into public.performance (voie_id, score_id, etat) values (v_m2, s, 2);
    insert into public.performance (voie_id, score_id, etat) values (v_m3, s, 2);
    if g.sexe = 1 then
      insert into public.performance (voie_id, score_id, temps, points, etat)
      values (v_vf, s, make_interval(secs => 8), 13, 5);
    else
      insert into public.performance (voie_id, score_id, temps, points, etat)
      values (v_vh, s, make_interval(secs => 8), 13, 5);
    end if;
  end loop;
end$$;
