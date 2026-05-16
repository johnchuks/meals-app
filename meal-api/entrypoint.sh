#!/usr/bin/env bash
set -euo pipefail

case "${1:-api}" in
  api)
    # Migrations are generated at container start for the skeleton; in
    # production these would be committed and only `migrate` would run.
    python manage.py makemigrations --noinput
    python manage.py migrate --noinput
    DJANGO_SUPERUSER_USERNAME=mealAdmin \
    DJANGO_SUPERUSER_EMAIL=admin@meals.local \
    DJANGO_SUPERUSER_PASSWORD='MealAdmin!2026' \
      python manage.py createsuperuser --noinput || true
    python manage.py seed_users
    python manage.py seed_recipes
    python manage.py runserver 0.0.0.0:3000
    ;;
  *)
    exec "$@"
    ;;
esac
