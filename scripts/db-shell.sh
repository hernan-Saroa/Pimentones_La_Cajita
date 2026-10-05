#!/usr/bin/env bash
# Consola SQL en la base de datos de producción.
cd "$(dirname "$0")/.."
docker compose exec db psql -U lacajita -d lacajita
