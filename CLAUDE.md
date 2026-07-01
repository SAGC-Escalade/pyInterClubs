# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**pyInterClubs** is a French-language Django web application for managing climbing competitions (InterClubs). It supports team coaches registering climbers, judges scoring performances, and administrators running competition sessions. The UI language is French throughout.

## Development Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Run development server (WSGI, no WebSocket)
python manage.py runserver 0.0.0.0:8000

# Run production server (ASGI, with WebSocket/SSE support)
daphne -b 0.0.0.0 -p 8000 pyInterClubs.asgi:application

# Run tests
python manage.py test

# Management commands
python manage.py addVoies          # Add climbing routes
python manage.py importClimbers    # Import climber data
python manage.py importHistoricDB  # Import historical database
```

## Architecture

### Apps

| App | Role |
|-----|------|
| `core` | Central data models shared by all apps |
| `admin` | Competition setup and administration |
| `leader` | Team coach interface (register/manage teams) |
| `judge` | Referee scoring interface |
| `api` | Django REST Framework endpoints + SSE real-time events |

### Core Models (`core/`)

- `Club` — Climbing clubs
- `Rencontre` — A competition event (the top-level entity)
- `Voie` — A climbing route (polymorphic: `Bloc`, `Difficulté`, `Vitesse`)
- `Grimpeur` — An individual climber
- `Equipe` — A team competing in a `Rencontre`
- `Score` — A climber's registration on a route
- `Performance` — An attempt result on a route
- `RencontreVoie` — Junction between routes and competitions

### Request Lifecycle

1. `pyInterClubsMiddleware` (in `admin/`) runs on every request and injects `request.rencontre`, `request.club`, and `request.voies` based on session/token.
2. Token-based auth (`ClubAuthenticationView`) uses MD5 hashes of rencontre+club identifiers.
3. REST API actions (in `api/`) emit Server-Sent Events via `django-eventstream` on the `"events"` channel.
4. React frontends (embedded in Django templates, transpiled on-the-fly with Babel) subscribe to SSE and update live.

### URL Structure

- `/` — Main entry
- `/admin/` — Django admin + competition management
- `/leader/` — Coach interface
- `/judge/` — Judge scoring interface
- `/api/` — REST API (clubs, voies, grimpeurs, equipes, scores, perfs)
- `/accounts/club` — Token login
- `/events/` — SSE stream

### Frontend

React/JSX components live inside Django app directories and are transpiled on-the-fly using `django-babel-transpiler` — **no build step required**. Bootstrap 5 is used for layout and Font Awesome for icons.

### Database

SQLite (`django.sqlite`). The `Config` model in `admin/` acts as a key-value store for runtime settings.

### Real-time

`django-eventstream` (SSE) broadcasts score/performance changes to connected clients. `django-channels` + `Daphne` provide the ASGI layer needed for this. Use `daphne` (not `runserver`) when real-time features must work.

## Migration Next.js/Supabase (`web/`)

The `web/` directory holds the ongoing port to Next.js + Supabase (see `docs/spec/`).

**SQL fixtures must track the schema.** Whenever a migration creates or changes a
table, column, enum or constraint, adapt the SQL test datasets accordingly so they
keep loading without error:

- `web/supabase/seed.sql` — barème + demo/QA datasets;
- `web/supabase/reset-demo.sql` — purge script (table list must stay in sync);
- `web/supabase/migrations/0010_seed_voies_reference.sql` — reference barème
  (regenerate via `node --experimental-strip-types web/scripts/gen-seed-voies.ts`,
  do not hand-edit the generated block).

No Docker here: migrations/seeds are applied by hand (SQL editor / psql), so every
migration and seed must be **replayable** (`create or replace`, `drop … if exists`,
idempotent inserts). After a schema-shape change, regenerate `lib/supabase/database.types.ts`
against the remote base (`supabase gen types typescript --linked`), not the local CLI.
