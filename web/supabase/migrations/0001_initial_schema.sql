-- =====================================================================
-- pyInterClubs — Schéma initial
-- Réf. : docs/spec/01-modele-de-donnees.md
-- =====================================================================
-- Enums (smallint + CHECK, valeurs identiques à Django) :
--   Categorie : 1 enfants, 2 adolescents, 3 mixte
--   Genre     : 1 femme,   2 homme,       3 mixte
--   TypeVoie  : 1 bloc,     2 diff,        3 vitesse
--
-- zones : jsonb tableau ORDONNÉ d'objets { "label": text, "points": int|null|text }
--   L'index dans le tableau = `etat` d'une performance (cf. doc 02 §6).
--   Pour la vitesse, `label` et `points` peuvent porter des expressions sur
--   {rank} (ex. ">44", "60-{rank}") — évaluées par fn_eval_rank (cf. 0002).
-- =====================================================================

-- --------------------------------------------------------------------
-- Référentiel
-- --------------------------------------------------------------------

create table public.club (
  id    bigint generated always as identity primary key,
  nom   varchar(50) not null,
  ville varchar(50) not null
);

create table public.grimpeur (
  id              bigint generated always as identity primary key,
  nom             varchar(50) not null,
  prenom          varchar(50) not null,
  annee_naissance int  not null,
  sexe            smallint not null check (sexe in (1, 2, 3)),
  licence         bigint not null default 0,
  club_id         bigint not null references public.club (id) on delete restrict
);
create index grimpeur_annee_naissance_idx on public.grimpeur (annee_naissance);
create index grimpeur_sexe_idx            on public.grimpeur (sexe);

create table public.voie (
  id        bigint generated always as identity primary key,
  nom       varchar(15) not null,
  niveau    varchar(5)  not null,
  categorie smallint not null check (categorie in (1, 2, 3)),
  genre     smallint not null default 3 check (genre in (1, 2, 3)),
  type      smallint not null check (type in (1, 2, 3)),
  zones     jsonb not null,
  actif     boolean not null default false,
  constraint voie_zones_is_array check (jsonb_typeof(zones) = 'array')
);
create index voie_type_idx  on public.voie (type);
create index voie_actif_idx on public.voie (actif);

-- --------------------------------------------------------------------
-- Compétition
-- --------------------------------------------------------------------

create table public.rencontre (
  id                  bigint generated always as identity primary key,
  saison              int not null,
  club_id             bigint not null references public.club (id) on delete restrict,
  date                date not null,
  categorie           smallint not null check (categorie in (1, 2, 3)),
  nb_bloc             int not null default 2 check (nb_bloc    >= 1),
  nb_diff             int not null default 3 check (nb_diff    >= 1),
  nb_vitesse          int not null default 1 check (nb_vitesse >= 1),
  voies_reutilisables boolean not null default false,
  voies_groupees      boolean not null default false
);
create index rencontre_categorie_idx on public.rencontre (categorie);
create index rencontre_date_idx      on public.rencontre (date);
create index rencontre_saison_idx    on public.rencontre (saison);

-- Identités terrain (cf. doc 10) -------------------------------------
-- Comptes provisionnés à l'ouverture (coach) / l'affectation (juge).
-- `token` = secret encodé dans le QR ; `user_id` lie à un utilisateur Supabase Auth.

create table public.coach (
  id           bigint generated always as identity primary key,
  rencontre_id bigint not null references public.rencontre (id) on delete cascade,
  club_id      bigint not null references public.club (id)      on delete cascade,
  user_id      uuid references auth.users (id) on delete set null,
  token        text unique,
  unique (rencontre_id, club_id)
);

create table public.juge (
  id           bigint generated always as identity primary key,
  rencontre_id bigint not null references public.rencontre (id) on delete cascade,
  nom          varchar(100) not null,
  user_id      uuid references auth.users (id) on delete set null,
  token        text unique
);

create table public.rencontre_voie (
  id           bigint generated always as identity primary key,
  rencontre_id bigint not null references public.rencontre (id) on delete cascade,
  voie_id      bigint not null references public.voie (id)      on delete cascade,
  juge_id      bigint references public.juge (id)               on delete set null,
  constraint unique_rencontre_voie unique (rencontre_id, voie_id)
);
create index rencontre_voie_juge_idx on public.rencontre_voie (juge_id);

create table public.equipe (
  id           bigint generated always as identity primary key,
  rencontre_id bigint not null references public.rencontre (id) on delete restrict,
  club_id      bigint not null references public.club (id)      on delete restrict,
  numero       int not null default 1 check (numero >= 1)
);
create index equipe_club_idx      on public.equipe (club_id);
create index equipe_rencontre_idx on public.equipe (rencontre_id);

create table public.score (
  id              bigint generated always as identity primary key,
  equipe_id       bigint not null references public.equipe (id)   on delete restrict,
  grimpeur_id     bigint not null references public.grimpeur (id) on delete restrict,
  ordre           int not null default 1 check (ordre between 1 and 8),
  club_preteur_id bigint references public.club (id) on delete restrict,
  -- Unicité recommandée (absente du modèle Django actuel, cf. doc 01 §2.6) :
  unique (equipe_id, grimpeur_id)
);
create index score_equipe_idx   on public.score (equipe_id);
create index score_grimpeur_idx on public.score (grimpeur_id);

create table public.performance (
  id       bigint generated always as identity primary key,
  voie_id  bigint references public.voie (id) on delete restrict,
  score_id bigint not null references public.score (id) on delete cascade,
  temps    interval,
  points   int,
  etat     int
);
create index performance_voie_idx  on public.performance (voie_id);
create index performance_score_idx on public.performance (score_id);
create index performance_temps_idx on public.performance (temps);

-- --------------------------------------------------------------------
-- Configuration clé-valeur (cf. admin/models.py Config, doc 03 §9)
-- --------------------------------------------------------------------

create table public.config (
  key   varchar(50) primary key,
  type  varchar(10) not null default 'string' check (type in ('bool','int','float','string')),
  value varchar(255)
);

-- =====================================================================
-- RLS — politiques PROVISOIRES
-- =====================================================================
-- Détail cible (par rôle, via claims JWT) : doc 10 §3.
-- Ici : lecture pour les utilisateurs authentifiés ; écriture réservée au
-- service_role (qui contourne le RLS) jusqu'à l'implémentation de l'auth
-- token/QR + claims. À RAFFINER dans une migration ultérieure.

alter table public.club           enable row level security;
alter table public.grimpeur       enable row level security;
alter table public.voie           enable row level security;
alter table public.rencontre      enable row level security;
alter table public.rencontre_voie enable row level security;
alter table public.coach          enable row level security;
alter table public.juge           enable row level security;
alter table public.equipe         enable row level security;
alter table public.score          enable row level security;
alter table public.performance    enable row level security;
alter table public.config         enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'club','grimpeur','voie','rencontre','rencontre_voie',
    'coach','juge','equipe','score','performance','config'
  ] loop
    execute format(
      'create policy "read_authenticated" on public.%I for select to authenticated using (true);',
      t
    );
  end loop;
end$$;
