-- =====================================================================
-- Tranche 7 — Reprise de données : barème de voies de référence
-- Réf. : docs/spec/11-migration-donnees.md §6 (port de addVoies.py),
--        docs/spec/02 §1/§3.3/§6 (barèmes, format des zones)
-- =====================================================================
-- Jeu complet des 40 voies « modèle » (vitesse enfants/ado par genre, blocs,
-- diffs M1..M4 + T1..T10 enfants et ado, doublons Cestas inclus) servant à
-- initialiser une base neuve. Les `zones` sont au format tableau ORDONNÉ
-- [{label, points}] (doc 02 §6, doc 11 §2) : l'ordre porte l'index `etat`.
--
-- SOURCE UNIQUE : ce bloc est GÉNÉRÉ par web/lib/import/voies.ts (fonction pure
-- `voiesVersSql`, couverte par web/test/tranche7/voies.test.ts). Ne pas éditer à
-- la main : régénérer via `node --experimental-strip-types web/scripts/gen-seed-voies.ts`.
--
-- REJOUABLE : gardé par un « if not exists » (sentinelle = vitesse Homme enfants),
-- aucune contrainte d'unicité sur `voie` → ne pas dupliquer à chaque exécution.
-- =====================================================================

do $$
begin
  if not exists (
    select 1 from public.voie
    where nom = 'Vitesse' and niveau = 'Homme' and categorie = 1
  ) then
    insert into public.voie (nom, niveau, categorie, genre, type, zones, actif) values
    ('Vitesse', 'Femme', 1, 1, 3, '[{"label":"A réaliser","points":null},{"label":"Abandon","points":0},{"label":"Chute","points":1},{"label":"{rank}>44","points":2},{"label":"{rank}>5","points":"11-{rank}//5"},{"label":"{rank}<=5","points":"15-{rank}"}]', true),
    ('Vitesse', 'Homme', 1, 2, 3, '[{"label":"A réaliser","points":null},{"label":"Abandon","points":0},{"label":"Chute","points":1},{"label":"{rank}>44","points":2},{"label":"{rank}>5","points":"11-{rank}//5"},{"label":"{rank}<=5","points":"15-{rank}"}]', true),
    ('Vitesse', 'Femme', 2, 1, 3, '[{"label":"A réaliser","points":null},{"label":"Abandon","points":0},{"label":"Chute","points":1},{"label":"{rank}>50","points":10},{"label":"{rank}<=50","points":"60-{rank}"}]', true),
    ('Vitesse', 'Homme', 2, 2, 3, '[{"label":"A réaliser","points":null},{"label":"Abandon","points":0},{"label":"Chute","points":1},{"label":"{rank}>50","points":10},{"label":"{rank}<=50","points":"60-{rank}"}]', true),
    ('Vitesse', '2025', 2, 3, 3, '[{"label":"A réaliser","points":null},{"label":"Abandon","points":0},{"label":"Chute","points":1},{"label":"{rank}>50","points":10},{"label":"{rank}<=50","points":"60-{rank}"}]', true),
    ('Bloc', '1', 1, 3, 1, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"2e essai","points":3},{"label":"1er essai","points":4}]', true),
    ('Bloc', '2', 1, 3, 1, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"3e essai","points":4},{"label":"2e essai","points":5},{"label":"1er essai","points":6}]', true),
    ('Bloc', '1', 2, 3, 1, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone 1","points":10},{"label":"Top","points":30}]', true),
    ('Bloc', '2', 2, 3, 1, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone 2","points":40},{"label":"Zone 1","points":20},{"label":"Top","points":60}]', true),
    ('M1', '4c', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Top","points":0}]', true),
    ('M2', '5a', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Top","points":1}]', true),
    ('M3', '5b', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Top","points":2}]', true),
    ('M4', '5c', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Top","points":3}]', true),
    ('T1', '4c', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone","points":3},{"label":"Top","points":5}]', true),
    ('T2', '5a', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone","points":3},{"label":"Top","points":6}]', true),
    ('T3', '5b', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone","points":4},{"label":"Top","points":7}]', true),
    ('T4', '5c', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone","points":4},{"label":"Top","points":8}]', true),
    ('T5', '6a', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone","points":5},{"label":"Top","points":9}]', true),
    ('T6', '6b', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone","points":5},{"label":"Top","points":10}]', true),
    ('T7', '6c', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone","points":6},{"label":"Top","points":11}]', true),
    ('T8', '7a', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone","points":6},{"label":"Top","points":12}]', true),
    ('T9', '7b', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone","points":7},{"label":"Top","points":13}]', true),
    ('T10', '7c', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone","points":8},{"label":"Top","points":14}]', true),
    ('T3', '5b', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone","points":4},{"label":"Top","points":7}]', true),
    ('T4', '5c', 1, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone","points":4},{"label":"Top","points":8}]', true),
    ('T1', '4c', 2, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone 2","points":2},{"label":"Zone 1","points":1},{"label":"Top","points":4}]', true),
    ('T2', '5a', 2, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone 2","points":4},{"label":"Zone 1","points":3},{"label":"Top","points":6}]', true),
    ('T3', '5b', 2, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone 2","points":6},{"label":"Zone 1","points":5},{"label":"Top","points":8}]', true),
    ('T4', '5c', 2, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone 2","points":8},{"label":"Zone 1","points":7},{"label":"Top","points":10}]', true),
    ('T5', '6a', 2, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone 2","points":10},{"label":"Zone 1","points":9},{"label":"Top","points":12}]', true),
    ('T6', '6b', 2, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone 2","points":12},{"label":"Zone 1","points":11},{"label":"Top","points":14}]', true),
    ('T7', '6c', 2, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone 2","points":14},{"label":"Zone 1","points":13},{"label":"Top","points":16}]', true),
    ('T8', '7a', 2, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone 2","points":16},{"label":"Zone 1","points":15},{"label":"Top","points":18}]', true),
    ('T9', '7b', 2, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone 2","points":18},{"label":"Zone 1","points":17},{"label":"Top","points":20}]', true),
    ('T10', '7c', 2, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone 2","points":20},{"label":"Zone 1","points":19},{"label":"Top","points":22}]', true),
    ('T1', '4c', 2, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone 2","points":2},{"label":"Zone 1","points":1},{"label":"Top","points":4}]', true),
    ('T2', '5a', 2, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone 2","points":4},{"label":"Zone 1","points":3},{"label":"Top","points":6}]', true),
    ('T3', '5b', 2, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone 2","points":6},{"label":"Zone 1","points":5},{"label":"Top","points":8}]', true),
    ('T4', '5c', 2, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone 2","points":8},{"label":"Zone 1","points":7},{"label":"Top","points":10}]', true),
    ('T5', '6a', 2, 3, 2, '[{"label":"A réaliser","points":null},{"label":"Chute","points":0},{"label":"Zone 2","points":10},{"label":"Zone 1","points":9},{"label":"Top","points":12}]', true);
  end if;
end $$;


-- --------------------------------------------------------------------
-- Vérification (doc 11 §7) — à coller dans le SQL editor après application :
--   -- 40 voies actives attendues
--   select count(*) from public.voie where actif;
--   -- Répartition par type (1 bloc, 2 diff, 3 vitesse) : 4 / 31 / 5
--   select type, count(*) from public.voie group by type order by type;
--   -- Répartition par catégorie (1 enfants, 2 ado) : 20 / 20
--   select categorie, count(*) from public.voie group by categorie order by categorie;
--   -- Les zones commencent toutes par « A réaliser » (index etat 0)
--   select count(*) from public.voie where zones->0->>'label' <> 'A réaliser';  -- attendu 0
-- --------------------------------------------------------------------
