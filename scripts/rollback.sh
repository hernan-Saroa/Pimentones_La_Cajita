#!/usr/bin/env bash
# Vuelve a una versión anterior ya construida: scripts/rollback.sh <tag>
set -euo pipefail
cd "$(dirname "$0")/.."
[ $# -eq 1 ] || { echo "Uso: $0 <tag>"; docker images lacajita/api --format '  {{.Tag}}'; exit 1; }
export TAG=$1
sed -i.bak "s/^TAG=.*/TAG=$TAG/" .env && rm -f .env.bak
docker compose up -d --no-deps api worker web
echo "Activo: $TAG (si la migración de la versión nueva cambió el esquema, restaura también un respaldo)"
