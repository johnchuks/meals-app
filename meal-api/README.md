# Meal API

Backend for the meals app — a clinical meal request workflow covering patient admission, meal ordering with safety validation, and kitchen tray fulfillment.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for design rationale and module boundaries.

## Tech Stack

- **Python 3** + **Django 5** + **Django REST Framework**
- **PostgreSQL 16**
- **SimpleJWT** for auth (role-based access)
- **Docker Compose** for local orchestration

## Running

From the repo root:

```bash
make api        # build & start API + Postgres
make api-logs   # follow logs
make api-down   # stop containers
```

Or directly:

```bash
docker compose up --build
```

The API listens on `http://localhost:3000`. Postgres is exposed on `5432` (db/user/password all `meals`).

On startup the `api` container runs migrations and seeds the recipe catalog (see `entrypoint.sh`). The Django admin is available at `/admin/`.

## Endpoints

### Auth (`user/`)
- `POST /auth/token` — Obtain a JWT access + refresh pair (role embedded in token)
- `POST /auth/token/refresh` — Refresh an access token

### Patients (`patient/`)
- `POST /patients` — Admit a patient
- `GET /patients/:id` — Read patient (with allergies + diet)
- `PATCH /patients/:id/diet` — Update diet
- `POST /patients/:id/allergies` — Add allergy
- `DELETE /patients/:id/allergies/:aid` — Remove allergy

### Recipes (`recipe/`)
- `GET /recipes` — List recipes (filter `?active=true`)
- `GET /recipes/:id` — Read a recipe with allergens + compatible diets
- `POST /recipes` — Create a recipe (superuser only)

### Meal Requests (`meal_request/`)
- `POST /meal-requests` — Create a draft for a patient with selected recipes
- `GET /meal-requests/:id` — Read full request
- `PATCH /meal-requests/:id` — Replace the recipe set (DRAFT only)
- `POST /meal-requests/:id/finalize` — Run safety check, finalize or reject

### Trays (`kitchen/`)
- `GET /trays` — List trays (filter by status)
- `GET /trays/:id` — Read tray
- `GET /trays/:id/status-history` — Status transition history
- `POST /trays/:id/start-preparation` — `CREATED` → `PREPARATION_STARTED`
- `POST /trays/:id/validate-accuracy` — `PREPARATION_STARTED` → `ACCURACY_VALIDATED`
- `POST /trays/:id/dispatch` — `ACCURACY_VALIDATED` → `EN_ROUTE`
- `POST /trays/:id/deliver` — `EN_ROUTE` → `DELIVERED`
- `POST /trays/:id/retrieve` — `DELIVERED` → `RETRIEVED`

Tray transitions are linear and explicit per endpoint; invalid transitions return `409 Conflict`. Finalizing a meal request that violates patient allergies or diet returns `422` and is recorded as `REJECTED`.
