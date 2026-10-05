#!/usr/bin/env bash
# Respaldo manual inmediato (además del diario automático). Deja el archivo en el volumen "backups" y lo copia a ./backups.
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose exec -T backup /scripts/backup.sh
mkdir -p backups && docker compose cp backup:/backups/. ./backups/
ls -lh backups | tail -3
