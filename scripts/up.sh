#!/usr/bin/env bash
# Levanta producción: verifica variables, construye imágenes y arranca. Idempotente.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] || { cp .env.example .env; echo "Creé .env desde .env.example: edítalo (DB_PASSWORD, SITE_DOMAIN, SITE_URL) y vuelve a correr."; exit 1; }
[ -f apps/api/.env ] || { cp apps/api/.env.example apps/api/.env; echo "Creé apps/api/.env: define JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD (y Wompi/SMTP si aplican) y vuelve a correr."; exit 1; }
docker compose pull --ignore-buildable
docker compose build --pull
docker compose up -d --remove-orphans
docker compose ps
echo "Listo. Salud: $(docker compose exec -T api curl -fs http://localhost:4000/api/health || echo 'API aún arrancando')"
