# 01 — Modèle de données

Source : `core/models.py`, `admin/models.py`. Le modèle est volontairement **simple et
plat** (pas de table polymorphe pour les voies : un champ `type` discrimine). Les pièces
de logique attachées aux modèles (`save()`, querysets annotés, signaux) sont décrites au
[doc 02](02-regles-scoring.md) et migrées en SQL côté cible.

## 1. Énumérations

| Enum | Valeurs | Source |
| ------ | --------- | -------- |
| `Categorie` | 1 = enfants, 2 = adolescents, 3 = mixte | `core/models.py:34` |
| `Genre` | 1 = femme, 2 = homme, 3 = mixte | `core/models.py:40` |
| `TypeVoie` | 1 = bloc, 2 = diff, 3 = vitesse | `core/models.py:46` |
| `Config.Types` | bool, int, float, string | `admin/models.py:6` |

> **Cible** : des `smallint` avec `CHECK` (ou des types `enum` Postgres). On conserve les
> **valeurs entières** pour rester compatible avec les barèmes et les données historiques.

## 2. Entités

### 2.1 Club — `core/models.py:297`

| Champ | Type | Notes |
| ------- | ------ | ------- |
| id | bigint PK | |
| nom | varchar(50) | |
| ville | varchar(50) | |

Tri par défaut : `nom`. Relations inverses : `grimpeurs`, `rencontres`, `equipes`.

### 2.2 Grimpeur — `core/models.py:309`

| Champ | Type | Notes |
| ------- | ------ | ------- |
| id | bigint PK | |
| nom | varchar(50) | |
| prenom | varchar(50) | |
| anneeNaissance | int | Sert au calcul de catégorie d'âge |
| sexe | int (Genre) | |
| licence | bigint | défaut 0 |
| club | FK Club **PROTECT** | `related_name='grimpeurs'` |

Index : `anneeNaissance`, `sexe`. Tri : `nom, prenom`.

### 2.3 Voie — `core/models.py:270`

| Champ | Type | Notes |
| ------- | ------ | ------- |
| id | bigint PK | |
| nom | varchar(15) | ex. `M1`, `T3`, `Bloc`, `Vitesse` |
| niveau | varchar(5) | ex. `4c`, `Homme`, `Femme` |
| categorie | int (Categorie) | |
| genre | int (Genre) | défaut mixte |
| type | int (TypeVoie) | bloc/diff/vitesse |
| zones | JSON **ordonné** | `{libellé: points}` — voir doc 02 |
| actif | bool | défaut false |

Index : `type`, `actif`. Méthodes : `points(index)` = `list(zones.values())[index]`,
`etat(index)` = `list(zones.keys())[index]` (`core/models.py:290-294`).

⚠️ **L'ordre des clés de `zones` est signifiant** (`etat` = index). En Postgres,
`jsonb` **ne garantit pas l'ordre des clés** → **utiliser `json` (texte ordonné)** ou,
mieux, **normaliser** en stockant un tableau ordonné : `zones: [{"label":..,"points":..}]`.
Voir doc 02 §6.

### 2.4 Rencontre — `core/models.py:330`

| Champ | Type | Notes |
| ------- | ------ | ------- |
| id | bigint PK | |
| saison | int | Année de saison |
| club | FK Club **PROTECT** | club hôte, `related_name='rencontres'` |
| date | date | |
| categorie | int (Categorie) | |
| nbBloc | int | défaut 2, min 1 |
| nbDiff | int | défaut 3, min 1 |
| nbVitesse | int | défaut 1, min 1 |
| voiesReutilisables | bool | défaut false |
| voiesGroupees | bool | défaut false |
| voies | M2M Voie **through RencontreVoie** | |

Index : `categorie`, `date`, `saison`. `nbBloc/nbDiff/nbVitesse` définissent le **nombre
de performances attendues par grimpeur** et par type.

### 2.5 Equipe — `core/models.py:408`

| Champ | Type | Notes |
| ------- | ------ | ------- |
| id | bigint PK | |
| rencontre | FK Rencontre **PROTECT** | `related_name='equipes'` |
| club | FK Club **PROTECT** | `related_name='equipes'` |
| numero | int | défaut 1, min 1 |

Index : `club`, `rencontre`. Tri : `club_id, numero`. `__str__` = `"{club.nom} {numero}"`.

### 2.6 Score — `core/models.py:426`

| Champ | Type | Notes |
| ------- | ------ | ------- |
| id | bigint PK | |
| equipe | FK Equipe **PROTECT** | `related_name='membres'` |
| grimpeur | FK Grimpeur **PROTECT** | `related_name='participations'` |
| ordre | int | 1–8 (min 1, max 8), défaut 1 |
| clubPreteur | FK Club **PROTECT**, null | rempli auto si grimpeur d'un autre club |

Index : `equipe`, `grimpeur`. Tri : `equipe_id, ordre`. Suivi de champ : `ordre`
(`FieldTracker`). Règles métier au doc 02 §4.

⚠️ Pas de contrainte d'unicité `(equipe, grimpeur)` ni `(equipe, ordre)` en base
aujourd'hui ; l'unicité de l'ordre est gérée applicativement. **Cible recommandée** :
ajouter `UNIQUE(equipe, grimpeur)` et envisager `UNIQUE(equipe, ordre)` (voir doc 02 §4).

### 2.7 Performance — `core/models.py:503`

| Champ | Type | Notes |
| ------- | ------ | ------- |
| id | bigint PK | |
| voie | FK Voie **PROTECT**, null | null tant que la voie de diff n'est pas affectée |
| score | FK Score **CASCADE** | `related_name='performances'` |
| temps | duration/interval, null | vitesse uniquement ; valeurs spéciales (doc 02) |
| points | int, null | calculé |
| etat | int, null | index dans `voie.zones` |

Index : `voie_id`, `score_id`, `temps`. Suivi de champ : `temps, points, etat, voie_id`.

### 2.8 RencontreVoie — `core/models.py:555`

| Champ | Type | Notes |
| ------- | ------ | ------- |
| id | bigint PK | |
| rencontre | FK Rencontre **CASCADE** | |
| voie | FK Voie **CASCADE** | |
| juge | FK Juge **SET NULL**, null | juge affecté à cette voie pour cette rencontre |

Contrainte : **UNIQUE(rencontre, voie)** (`unique_rencontre_voie`).

### 2.9 Config — `admin/models.py:13`

Magasin clé-valeur typé : `key` (PK), `type` (bool/int/float/string), `value` (texte).
`get/set` convertissent selon `type`. Clé connue : `DEFAULT_RENCONTRE` (rencontre courante
globale, `admin/middleware.py:27`). Aussi utilisé pour les paramètres Wi-Fi affichés sur
les QR codes (doc 03).

### 2.10 Profil / Coach / Juge — `admin/models.py:44-70`

- `Profil` (polymorphe) : `user` (OneToOne `auth.User`), `rencontre` (FK SET NULL).
- `Coach(Profil)` : `club` (FK CASCADE). `token = md5("{rencontre}:{club.nom}")`.
- `Juge(Profil)` : `voies` (M2M Voie through RencontreVoie).
  `token = md5("{rencontre}:" + ":".join(sorted(map(str, voie_ids))))`.

> **Cible** : voir doc 10 pour le remplacement des comptes Django par des identités
> Supabase (utilisateurs « techniques » coach/juge + claims JWT).

## 3. Diagramme relationnel

```text
Club 1─* Grimpeur          Club 1─* Rencontre (hôte)     Club 1─* Equipe
Rencontre 1─* Equipe       Rencontre *─* Voie (RencontreVoie, UNIQUE)
Equipe 1─* Score           Grimpeur 1─* Score            Club 0..1─* Score (clubPreteur)
Score 1─* Performance (CASCADE)    Voie 1─* Performance (PROTECT, null)
RencontreVoie *─0..1 Juge (SET NULL)
Profil 1─1 User · Coach⊂Profil(→Club) · Juge⊂Profil(→Voies via RencontreVoie)
```

`on_delete` : la plupart des FK sont **PROTECT** (empêche la suppression d'un club/voie
référencé → message FR, doc 06 §5). `Score→Performance` est **CASCADE**.
`RencontreVoie→juge` est **SET NULL**.

## 4. DDL Postgres cible (extrait de référence)

```sql
-- Enums (smallint + CHECK pour rester proche des valeurs Django)
-- Categorie: 1 enfants, 2 adolescents, 3 mixte
-- Genre:     1 femme, 2 homme, 3 mixte
-- TypeVoie:  1 bloc, 2 diff, 3 vitesse

create table club (
  id        bigint generated always as identity primary key,
  nom       varchar(50) not null,
  ville     varchar(50) not null
);

create table grimpeur (
  id              bigint generated always as identity primary key,
  nom             varchar(50) not null,
  prenom          varchar(50) not null,
  annee_naissance int  not null,
  sexe            smallint not null check (sexe in (1,2,3)),
  licence         bigint not null default 0,
  club_id         bigint not null references club(id) on delete restrict
);
create index on grimpeur(annee_naissance);
create index on grimpeur(sexe);

create table voie (
  id        bigint generated always as identity primary key,
  nom       varchar(15) not null,
  niveau    varchar(5)  not null,
  categorie smallint not null check (categorie in (1,2,3)),
  genre     smallint not null default 3 check (genre in (1,2,3)),
  type      smallint not null check (type in (1,2,3)),
  zones     json not null,          -- ordre des clés signifiant (cf. doc 02 §6)
  actif     boolean not null default false
);
create index on voie(type);
create index on voie(actif);

create table rencontre (
  id                  bigint generated always as identity primary key,
  saison              int not null,
  club_id             bigint not null references club(id) on delete restrict,
  date                date not null,
  categorie           smallint not null check (categorie in (1,2,3)),
  nb_bloc             int not null default 2 check (nb_bloc    >= 1),
  nb_diff             int not null default 3 check (nb_diff    >= 1),
  nb_vitesse          int not null default 1 check (nb_vitesse >= 1),
  voies_reutilisables boolean not null default false,
  voies_groupees      boolean not null default false
);
create index on rencontre(categorie);
create index on rencontre(date);
create index on rencontre(saison);

create table rencontre_voie (
  id           bigint generated always as identity primary key,
  rencontre_id bigint not null references rencontre(id) on delete cascade,
  voie_id      bigint not null references voie(id)      on delete cascade,
  juge_id      bigint references juge(id)               on delete set null,
  unique (rencontre_id, voie_id)
);

create table equipe (
  id           bigint generated always as identity primary key,
  rencontre_id bigint not null references rencontre(id) on delete restrict,
  club_id      bigint not null references club(id)      on delete restrict,
  numero       int not null default 1 check (numero >= 1)
);
create index on equipe(club_id);
create index on equipe(rencontre_id);

create table score (
  id             bigint generated always as identity primary key,
  equipe_id      bigint not null references equipe(id)   on delete restrict,
  grimpeur_id    bigint not null references grimpeur(id) on delete restrict,
  ordre          int not null default 1 check (ordre between 1 and 8),
  club_preteur_id bigint references club(id)             on delete restrict,
  unique (equipe_id, grimpeur_id)         -- recommandé (absent dans l'actuel)
);
create index on score(equipe_id);
create index on score(grimpeur_id);

create table performance (
  id       bigint generated always as identity primary key,
  voie_id  bigint references voie(id) on delete restrict,
  score_id bigint not null references score(id) on delete cascade,
  temps    interval,
  points   int,
  etat     int
);
create index on performance(voie_id);
create index on performance(score_id);
create index on performance(temps);
```

> Les tables `config`, `profil`/`coach`/`juge` et l'identité sont traitées au doc 10.

## 5. Politiques RLS (résumé ; détail au doc 10)

| Table | Lecture | Écriture |
| ------- | --------- | ---------- |
| club, voie, grimpeur | Authentifié (référentiel) | Admin |
| rencontre, rencontre_voie | Authentifié | Admin |
| equipe, score | Public/auth (classements) ; coach voit tout | **Coach** : seulement ses équipes/scores de la rencontre courante ; **Admin** : tout |
| performance | Public/auth (live) | **Juge** : seulement les perfs de ses voies ; **Coach** : crée à l'inscription ; **Admin** : tout |

Le cloisonnement reproduit les `get_queryset` de `api/views.py` (filtre par
`interclub.rencontre`, `interclub.club`, `profil.voies`) sous forme de **policies RLS**
fondées sur les **claims JWT** (`rencontre`, `role`, `club`, `voies`).
