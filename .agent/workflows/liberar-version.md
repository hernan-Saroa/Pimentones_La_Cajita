---
description: Liberar una versión a producción con Docker
---
1. `npm run build && npm test -w apps/api && npm run lint -w apps/web` en verde.
2. `scripts/smoke.sh http://localhost:3000` contra `make dev` o `docker compose -f docker-compose.dev.yml up`.
3. Commit y push a main: el CI construye y publica las imágenes en ghcr.io.
4. En el servidor: `make deploy` (actualiza api → worker → web con el tag del commit). Si algo falla: `make rollback TAG=<anterior>`.
5. `make smoke URL=https://www.pimentoneslacajita.com` y revisar `/admin` → Tablero.
