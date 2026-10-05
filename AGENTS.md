# Guía para agentes de código (Antigravity, Claude Code, Cursor, Copilot)

Este repositorio es la plataforma de comercio electrónico de **Pimentones La Cajita**: tienda, backoffice y API. Léelo antes de tocar nada; las reglas de abajo no son sugerencias.

## Mapa en 30 segundos

| Carpeta | Qué es | Tecnología |
|---|---|---|
| `apps/web` | Tienda pública (`/`) y backoffice (`/admin`) | Next.js 15 App Router, React 19, TypeScript, CSS propio en `app/globals.css` |
| `apps/api` | API REST, worker de trabajos, migraciones | NestJS 11 + Fastify, Drizzle ORM, PostgreSQL, pg-boss |
| `packages/shared` | Esquemas Zod, tipos, ciudades, reglas | TypeScript |
| `docs/` | Arquitectura, microservicios, backoffice, backlog | Markdown |
| `infra/`, `scripts/`, `docker-compose*.yml` | Despliegue y operación | Docker, Caddy, bash |

Documentos clave: `docs/ARQUITECTURA.md` (decisiones), `docs/MICROSERVICIOS.md` (límites y fallas), `docs/BACKOFFICE.md` (funciones del panel y su conexión con la tienda), `docs/CONTENIDO-ORIGEN.md` (qué venía de la página actual y dónde quedó), `docs/BACKLOG.md` (qué sigue, con criterios de aceptación), `docs/DESPLIEGUE.md` (cómo publicar y operar).

## Reglas que no se negocian

1. **Precios, descuentos, envío e inventario se calculan en la API** (`apps/api/src/orders/pricing.service.ts`, `orders.service.ts`). El cliente nunca envía precios. Si una tarea te pide "aplicar el descuento en el front", la respuesta es cotizar con `POST /api/orders/quote`.
2. **Un contrato, un lugar.** Cualquier campo nuevo que viaje entre web y API se declara en `packages/shared/src/schemas.ts` (Zod) y se consume en ambos lados. Compila con `npm run build -w packages/shared` antes que nada.
3. **Cambios de esquema = migración.** Edita `apps/api/src/db/schema.ts`, corre `npm run db:generate -w apps/api -- --name <nombre>`, revisa el SQL generado y súbelo. Nunca edites la base a mano. Nunca edites migraciones ya aplicadas.
4. **Todo lo asíncrono es idempotente.** Correos, eventos de pago y tareas van por `JobsService` (pg-boss) con `singletonKey`. Un reintento no puede cobrar dos veces ni enviar dos correos.
5. **Validación en el borde con `ZodPipe`**, mensajes de error en español claro para una persona sin conocimiento técnico (`"Revisa el correo: debe tener una @…"`), nunca mensajes técnicos.
6. **Roles del backoffice**: `viewer < ops < admin < owner` (`apps/api/src/admin/auth.ts`). Toda ruta nueva del admin declara su rol mínimo con el guard existente y registra la acción en `AuditService`.
7. **Español de Colombia en toda la interfaz.** Tuteo, frases cortas, sin anglicismos innecesarios ("Agregar", no "Add"; "Inventario", no "Stock").
8. **Diseño**: una sola familia tipográfica (Bricolage Grotesque), rojo de marca solo en la acción principal, controles de mínimo 44 px, todo funciona con teclado y respeta `prefers-reduced-motion`. Mobile first: empieza por 390 px y sube.
9. **Sin dependencias nuevas sin justificación** en el PR. Antes de agregar una librería, revisa si lo resuelve lo que ya hay (Zod, Drizzle, pg-boss, zustand).
10. **Nada de datos inventados en producción**: precios, tiempos de entrega, textos legales y FAQ son del negocio y se editan en `/admin`, no en código.
11. **No borrar contenido heredado.** Lema, texto de "Quiénes somos", video, datos de contacto y redirecciones de la página anterior se conservan (ver `docs/CONTENIDO-ORIGEN.md`). Se pueden mejorar, nunca omitir.

## Cómo trabajar

```bash
npm install && npm run build -w packages/shared
make dev                         # DB en Docker, API en :4000 (docs en /api/docs), web en :3000
npm test -w apps/api             # pruebas unitarias
npm run lint -w apps/web         # ESLint
```

Definición de hecho para cualquier tarea:
- compila (`npm run build`), pasa `npm test -w apps/api` y `npm run lint -w apps/web`;
- si tocaste la API, actualizaste el esquema compartido y `docs/BACKOFFICE.md` o `docs/ARQUITECTURA.md` si cambió algo relevante;
- si tocaste la tienda, probaste en 390 px y en escritorio, y el flujo de compra completo sigue funcionando (`scripts/smoke.sh`);
- si agregaste una tarea asíncrona, es idempotente y tiene reintentos.

## Dónde está cada cosa

- Flujo de compra: `apps/web/components/Checkout.tsx` → `POST /api/orders` → `OrdersService.create` → `JobsService`.
- Pagos Wompi: `apps/api/src/payments/wompi.service.ts`; webhook en `orders.controller.ts`; aplicación en el worker (`jobs/handlers.ts`).
- Analítica: `apps/api/src/admin/analytics.service.ts` (ventas, clientes, embudo desde `events`); tracking en `apps/web/lib/track.ts`.
- Backoffice: `apps/web/components/admin/*` y `apps/api/src/admin/*`.
- Tareas programadas: `apps/api/src/jobs/handlers.ts` (expirar pedidos, reporte diario, inventario bajo, aviso de contacto).
- Contacto: `apps/web/app/contacto`, `apps/api/src/contact`, panel en `components/admin/Messages.tsx`.
