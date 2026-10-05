# Arquitectura · Pimentones La Cajita

## Visión

Una tienda que vende por Google y por WhatsApp, que un equipo pequeño pueda mantener sin miedo, y que crezca sin reescribirse.
Tres piezas, un contrato:

```
┌─────────────────────┐   HTTP (mismo origen)   ┌──────────────────────┐        ┌────────────┐
│  apps/web (Next 15) │ ──────────────────────▶ │  apps/api (NestJS)   │ ─────▶ │ PostgreSQL │
│  React 19, RSC, TS  │ ◀──────────────────────  │  Fastify, Drizzle    │        └────────────┘
└─────────┬───────────┘                          └──────────┬───────────┘
          │                 packages/shared                 │           ┌─ Wompi (pagos)
          └──────── esquemas Zod, tipos, reglas ───────────┘           ├─ SMTP (correos)
                                                                        └─ Claude (asistente, opcional)
```

## Decisiones (ADR resumidas)

| # | Decisión | Por qué | Alternativa descartada |
|---|---|---|---|
| 1 | **Next.js 15 App Router + React 19** | Catálogo y fichas renderizados en servidor: cada frasco es una página indexable con metadatos, JSON-LD de producto e imagen para WhatsApp. ISR (`revalidate: 60`) mantiene el sitio estático y fresco. | SPA con Vite: rápida de construir, pobre para SEO y para compartir enlaces. |
| 2 | **NestJS 11 sobre Fastify** | Módulos por dominio (catálogo, pedidos, pagos, notificaciones, asistente, admin), inyección de dependencias, guards, OpenAPI generado, pruebas con `@nestjs/testing`. Fastify por rendimiento. | Express plano: funciona, pero no impone estructura cuando el equipo crece. |
| 3 | **Drizzle ORM + migraciones SQL versionadas** | Consultas tipadas sin esconder el SQL; `FOR UPDATE` explícito donde importa (inventario); migraciones legibles en `src/db/migrations`. | Prisma: excelente DX, pero motor binario y migraciones opacas. |
| 4 | **Esquemas Zod en `packages/shared`** | El mismo esquema valida el cuerpo en la API y la respuesta en la web. Si cambia un campo, TypeScript lo señala en los dos lados. | Tipos duplicados a mano o OpenAPI → codegen. |
| 5 | **Web y API bajo el mismo origen** (rewrites `/api/*`) | Sin CORS en el navegador, una sola URL pública, cookies y cabeceras simples. La API sigue siendo desplegable aparte. | API en subdominio con CORS. |
| 6 | **Estado del carrito en el cliente (zustand + persistencia)** | Un carrito no necesita servidor; los precios se recalculan siempre en la API al crear el pedido. | Carrito en base de datos: más latencia y complejidad sin beneficio para 4 productos. |
| 7 | **Configuración validada al arranque** | Si falta `JWT_SECRET` o `DATABASE_URL`, el proceso no arranca a medias. | Leer `process.env` por todas partes. |
| 8 | **Cola de trabajos sobre PostgreSQL (pg-boss) y proceso worker** | Correos, eventos de pago y tareas programadas salen del camino de la petición, con reintentos y una sola ejecución de los cron. Sin Redis que operar; `JOBS_INLINE=true` lo ejecuta todo en un contenedor. | Redis + BullMQ desde el día uno: una pieza más para un volumen que no la necesita todavía. |
| 9 | **Observabilidad desde el día uno** | Logs JSON con `pino` (redactando `Authorization`), `/api/health` para el orquestador, OpenAPI en `/api/docs`. | Añadirlo "después". |

## Reglas de negocio que viven en la API (nunca en el cliente)

- **Precios y envío** se calculan en el servidor con los productos actuales y los ajustes de la tienda.
- **Inventario**: se reserva al crear el pedido con bloqueo de fila (`SELECT … FOR UPDATE`); se devuelve si el pago falla, se cancela, o si un pago en línea queda abandonado (tarea cada 10 min).
- **Pagos**: Wompi con firma de integridad; el webhook verifica el checksum y el monto; las transiciones son idempotentes (un evento repetido no hace nada). Al volver del pago, la web consulta la transacción como respaldo del webhook.
- **Asistente**: Claude si hay llave de API; reglas locales si no. Nunca deja la sección caída.
- **Asíncrono e idempotente**: el webhook de Wompi verifica la firma, encola y responde; el worker aplica el evento (reintentos automáticos, duplicados inofensivos). Los correos los envía el worker. Los pedidos abandonados expiran por una tarea programada cada 10 minutos.

## Estructura

```
apps/
  api/   src/{config,db,common,catalog,orders,payments,notifications,assistant,admin,health,jobs}  main.ts (API)  worker.ts (worker)  test/*.spec.ts
  web/   app/ (rutas RSC)  components/ (cliente)  lib/ (api, motion)  store/ (carrito)
packages/
  shared/ schemas, tipos, ciudades, reglas del asistente, formato de moneda
docs/      esta arquitectura y el análisis de microservicios
infra/     Caddy (proxy TLS) y respaldos
scripts/   up, deploy, rollback, backup, restore, logs, smoke, dev
.github/   CI: construye, prueba la API y compila la web contra la API real
```

## Flujo de una compra

1. La web (RSC) pide `/api/products` y `/api/store` y renderiza la portada en servidor.
2. El cliente agrega al carrito (estado local) y entra a `/pagar` (3 pasos, validación con los mismos esquemas).
3. `POST /api/orders` → la API valida con Zod, abre transacción, bloquea productos, calcula totales, reserva inventario y crea el pedido.
4. Si es Wompi, devuelve `paymentUrl` firmado; el cliente va a Wompi y vuelve a `/pedido/:ref?id=tx`.
5. Wompi notifica `POST /api/webhooks/wompi`; la API verifica la firma y **encola** el evento. El **worker** marca `paid` (o libera inventario si fue rechazado) y encola los correos al cliente y al negocio.
6. El admin gestiona el pedido en `/admin`: estado, guía, y el cliente recibe el correo de envío.

## Evolución prevista

- **Cambiar la cola a BullMQ + Redis** cuando el volumen lo pida (cambio local en `JobsService`). Ver `docs/MICROSERVICIOS.md`.
- **Caché de catálogo** (Redis) y CDN delante de la web; la API ya responde con `Cache-Control` amigable para ISR.
- **Múltiples administradores**: la autenticación ya está aislada en `admin/auth.ts`; pasar de credenciales en entorno a tabla de usuarios con hash es un cambio local.
- **Pruebas e2e** con Playwright contra `docker compose up` en CI.
