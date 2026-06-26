#!/usr/bin/env bash
set -e

echo "Generating migrations (if any)..."
python manage.py makemigrations accounts core --noinput

echo "Applying database migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput || true

echo "Seeding demo data (idempotent)..."
python manage.py seed

echo "Starting Gunicorn..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --access-logfile - \
    --error-logfile -
