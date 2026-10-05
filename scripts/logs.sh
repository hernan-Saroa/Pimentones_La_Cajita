#!/usr/bin/env bash
# Logs en vivo de un servicio (o de todos): scripts/logs.sh [api|worker|web|db|proxy|backup]
cd "$(dirname "$0")/.."
docker compose logs -f --tail=200 "$@"
