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
