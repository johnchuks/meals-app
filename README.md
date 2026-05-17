# Meals App

Monorepo containing the meals API (Django + Postgres, run via Docker) and the meals client (React + Vite).

## Prerequisites

### Common
- **Git**
- **GNU Make** — used to orchestrate the dev workflow via the root `makefile`.

### API (`meal-api/`)
- **Docker** (with Compose v2 — the `docker compose` CLI).
- Free local ports:
  - `3000` for the API
  - `5432` for Postgres
- No local Python install is required; the API and its Postgres 16 database run inside containers defined in `meal-api/docker-compose.yml`.

### Client (`meal-client/`)
- **Node.js** 20.19+ or 22.12+ (required by Vite 8).
- **npm** (bundled with Node).
- The API running on `http://localhost:3000`.

## Setup

```bash
# install client dependencies
make install
```

## Running

```bash
# start API (Docker) and client (Vite) together
make dev

# or individually
make api       # build & start API + Postgres in the background
make client    # start the Vite dev server in the foreground
```

Useful extras:

```bash
make api-logs  # follow API container logs
make api-down  # stop and remove API containers
```

## Services

| Service | URL                     |
| ------- | ----------------------- |
| Client  | http://localhost:5173   |
| API     | http://localhost:3000   |
| Postgres| localhost:5432 (`meals` / `meals` / db `meals`) |

## Sign-in accounts

> ⚠️ **Local development only.** The credentials below are baked into the
> repository for convenience and must **never** be used in a production,
> staging, or otherwise shared environment. Provision real accounts with strong,
> unique passwords (and disable / delete the seeded users) before deploying.

The API container seeds one user per staff role on startup (via
`python manage.py seed_users`, called from `entrypoint.sh`). Use either account
to sign in at http://localhost:5173 — the role embedded in the JWT determines
which workspace you land in (Dietary vs Kitchen).

| Role          | Username   | Password         | Lands on        |
| ------------- | ---------- | ---------------- | --------------- |
| Kitchen staff | `kitchen1` | `Kitchen!2026`   | Tray fulfillment |
| Dietary staff | `dietary1` | `Dietary!2026`   | Patient + meal requests |

A Django superuser is also created for the admin site at
http://localhost:3000/admin/ — username `mealAdmin`, password `MealAdmin!2026`.
The superuser is **not** a staff role and is not intended for the client app.

To re-run the seeder against an existing database (idempotent):

```bash
cd meal-api && docker compose exec api python manage.py seed_users
```
