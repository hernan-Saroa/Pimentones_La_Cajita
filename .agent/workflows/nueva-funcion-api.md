---
description: Agregar un endpoint o campo nuevo a la API y consumirlo en la web
---
1. Declara el esquema Zod en packages/shared/src/schemas.ts (entrada y salida) y exporta su tipo.
2. Si hay datos nuevos: edita apps/api/src/db/schema.ts y corre `npm run db:generate -w apps/api -- --name <nombre>`. Revisa el SQL.
3. Implementa el servicio en el módulo de dominio correspondiente (catalog, orders, payments, admin, assistant). Nada de lógica en el controlador.
4. Expón la ruta en el controlador con `new ZodPipe(Esquema)`, `@ApiOperation` y, si es admin, el rol mínimo + AuditService.
5. Agrega el método en apps/web/lib/api.ts validando la respuesta con el esquema compartido.
6. Consume desde el componente. Prueba: `npm run build`, `npm test -w apps/api`, `npm run lint -w apps/web`, y una llamada real con curl contra `/api/docs`.
7. Documenta en docs/BACKOFFICE.md o docs/ARQUITECTURA.md si cambia algo relevante.
