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
