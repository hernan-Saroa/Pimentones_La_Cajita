#!/usr/bin/env bash
# Restaura un respaldo: scripts/restore.sh backups/lacajita-20261005-030000.dump.gz
# Detiene API y worker, restaura y los vuelve a levantar.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f "${1:-}" ] || { echo "Uso: $0 <archivo .dump.gz>"; exit 1; }
read -r -p "Esto reemplaza la base de datos actual. ¿Continuar? (escribe SI) " ok; [ "$ok" = "SI" ] || exit 1
docker compose stop api worker
gunzip -c "$1" | docker compose exec -T db pg_restore -U lacajita -d lacajita --clean --if-exists --no-owner
docker compose start api worker
echo "Restaurado desde $1"
