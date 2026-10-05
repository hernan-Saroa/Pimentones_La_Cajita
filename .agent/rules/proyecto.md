---
trigger: always_on
---
Lee AGENTS.md en la raíz antes de cualquier cambio y cúmplelo. Resumen operativo:
- Los esquemas compartidos viven en packages/shared/src/schemas.ts; compila ese paquete antes de web o api.
- Precios, descuentos, envío e inventario: solo en la API. El front cotiza con POST /api/orders/quote.
- Cambios de base de datos: editar apps/api/src/db/schema.ts y generar migración con drizzle-kit; nunca editar migraciones aplicadas.
- Trabajos asíncronos por JobsService con singletonKey; idempotentes.
- Interfaz en español de Colombia, mobile first, una sola tipografía, rojo solo en la acción principal.
- Antes de dar por terminado: npm run build, npm test -w apps/api, npm run lint -w apps/web.
