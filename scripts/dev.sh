#!/usr/bin/env bash
# Desarrollo local sin Docker para las apps (solo la base de datos en Docker).
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose -f docker-compose.dev.yml up -d db
[ -f apps/api/.env ] || { cp apps/api/.env.example apps/api/.env; sed -i.bak 's/^JWT_SECRET=.*/JWT_SECRET=secreto-de-desarrollo-largo-123/; s/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=clave-de-desarrollo/' apps/api/.env; rm -f apps/api/.env.bak; echo "JOBS_INLINE=true" >> apps/api/.env; }
[ -f apps/web/.env.local ] || cp apps/web/.env.example apps/web/.env.local
npm install && npm run build -w packages/shared
echo "API: http://localhost:4001/api/docs · Web: http://localhost:3000 · Admin: http://localhost:3000/admin"
npm run dev -w apps/api &
API_PID=$!
npm run dev -w apps/web &
WEB_PID=$!
trap "kill $API_PID $WEB_PID 2>/dev/null || true" EXIT INT TERM
wait

