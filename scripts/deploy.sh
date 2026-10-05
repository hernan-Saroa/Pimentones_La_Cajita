#!/usr/bin/env bash
# Despliegue sin corte perceptible: construye la nueva versión, actualiza API+worker y luego la web.
# Uso: scripts/deploy.sh [tag]   (el tag se guarda en .env como TAG para poder volver atrás)
set -euo pipefail
cd "$(dirname "$0")/.."
TAG=${1:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)}
export TAG
docker compose build --pull api web
sed -i.bak "s/^TAG=.*/TAG=$TAG/" .env && rm -f .env.bak
docker compose up -d --no-deps api            # la API migra la base de datos al arrancar
docker compose exec -T api sh -c 'for i in $(seq 1 30); do curl -fs http://localhost:4000/api/health && exit 0; sleep 2; done; exit 1'
docker compose up -d --no-deps worker web
docker image prune -f > /dev/null
echo "Desplegado $TAG"
