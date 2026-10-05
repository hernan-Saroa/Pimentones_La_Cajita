---
description: Publicar la tienda en un servidor con Docker (sigue docs/DESPLIEGUE.md)
---
1. Confirma que `npm run build && npm test -w apps/api && npm run lint -w apps/web` están en verde y que el último commit está en `main` (el CI publica las imágenes).
2. Revisa que `.env` (raíz) tenga SITE_DOMAIN, SITE_URL y DB_PASSWORD, y que `apps/api/.env` tenga JWT_SECRET, ADMIN_*, WOMPI_* y SMTP_*. Nunca los pongas en el repositorio.
3. En el servidor: `git pull && make deploy`. Espera a que `make smoke URL=https://...` diga "Humo OK".
4. Verifica a mano: portada, una ficha, una compra de prueba en sandbox de Wompi, `/admin` → Tablero y Pedidos.
5. Si algo falla: `make rollback TAG=<tag anterior>` y revisa `make logs S=api`.
