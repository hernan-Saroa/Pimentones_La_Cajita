# Backlog · lo que sigue, listo para un agente

Cada épica trae contexto, alcance y criterios de aceptación verificables. Orden sugerido por impacto en ventas y riesgo. Antes de empezar una, lee `AGENTS.md`.

## E1 · Recuperación de carritos abandonados
**Por qué:** el embudo ya mide quién inicia el pago y no compra; recuperar una fracción es la venta más barata.
**Alcance:** en el paso 1 del checkout, al escribir el correo, guardar un "checkout abierto" (`checkouts`: email, items, total, sessionId, estado). Trabajo programado cada hora: a los abiertos con más de 2 h y sin pedido, enviar un correo "Tus frascos te esperan" con enlace que restaura el carrito (`/pagar?restore=<token>`). Máximo un correo por checkout. Pantalla "Carritos abandonados" en el panel con tasa de recuperación.
**Aceptación:** correo se envía una sola vez; el enlace restaura exactamente los frascos; el panel muestra abandonados, recuperados y monto recuperado; respeta baja de suscripción.

## E2 · Reseñas de clientes
**Alcance:** tabla `reviews` (orderId, productId, rating 1–5, texto, estado pendiente/aprobado/rechazado). Solo quien compró puede reseñar: enlace en el correo "pedido entregado" con token. Moderación en el panel. Ficha de producto muestra promedio y reseñas aprobadas; JSON-LD `AggregateRating`.
**Aceptación:** una reseña por producto por pedido; nada se publica sin aprobar; el promedio aparece en Google (datos estructurados válidos).

## E3 · Devoluciones y reembolsos
**Alcance:** estado `refunded` ya existe. Agregar `returns` (orderId, motivo, estado solicitado/aprobado/recibido/reembolsado, monto). El cliente la solicita desde `/pedido/<ref>` dentro de 5 días (retracto, Ley 1480). El panel aprueba, registra el reembolso (Wompi: anulación vía API o manual) y devuelve inventario con movimiento `return`.
**Aceptación:** una devolución no puede superar el total; inventario vuelve solo si se marca "recibido"; auditoría completa.

## E4 · Variantes y combos
**Alcance:** `product_variants` (tamaño 200 g / 350 g, precio, stock, SKU) y combos (la caja de 4 como producto compuesto con precio propio y descuento). Pedidos referencian variante. El inventario del combo se descuenta de sus componentes.
**Aceptación:** el selector de sabores y las tarjetas muestran variantes; el stock del combo es el mínimo de sus componentes; precios siempre desde la API.

## E5 · Facturación electrónica (DIAN)
**Alcance:** al marcar un pedido como pagado, generar factura con el proveedor que ya usa el negocio (**Siigo**, ver `docs/CONTENIDO-ORIGEN.md`) vía su API; guardar CUFE y PDF; enviar al cliente. Cédula/NIT ya se captura en el checkout.
**Aceptación:** factura emitida y archivada por pedido; reintentos si el proveedor falla; el panel muestra el estado de facturación.

## E6 · Guías con transportadora
**Alcance:** integración con una transportadora (Servientrega, Coordinadora, Envía) para cotizar en vivo por departamento/peso, generar la guía desde el panel y actualizar el estado del pedido con el seguimiento.
**Aceptación:** cotización en el checkout coincide con la guía; el estado "Entregado" se actualiza solo.

## E7 · Segunda pasarela y pagos recurrentes
**Alcance:** MercadoPago o PayU como alternativa a Wompi con la misma interfaz (`PaymentProvider`). Suscripción mensual a la caja de 4 (pago recurrente).
**Aceptación:** cambiar de proveedor es configuración; los webhooks de ambos son idempotentes.

## E8 · Campañas de correo
**Alcance:** desde Suscriptores, redactar y enviar una campaña (asunto, texto, imagen, enlace), con baja de suscripción y métricas de apertura/clic básicas. Envío por lotes desde el worker.
**Aceptación:** nadie recibe dos veces; la baja es inmediata; el panel muestra enviados, abiertos y clics.

## E9 · Observabilidad y alertas
**Alcance:** métricas Prometheus en API y worker (latencia, errores, trabajos fallidos), tablero Grafana, alerta a WhatsApp/Telegram si fallan webhooks o si un trabajo supera 5 intentos.
**Aceptación:** una caída de Wompi o SMTP genera alerta en menos de 5 minutos.

## E10 · Pruebas end-to-end en CI
**Alcance:** Playwright contra `docker compose up`: compra completa con cupón en móvil y escritorio, flujo del panel (crear cupón, lote, cambiar estado).
**Aceptación:** el CI falla si se rompe la compra.

## Deuda conocida
- Los textos de tiempos de entrega en FAQ son editables en Contenido pero deben ser confirmados por el negocio.
- `events` crece sin límite: agregar retención (p. ej., 180 días) como tarea programada.
- Fotos de producto en disco local: mover a almacenamiento de objetos antes de escalar a varias réplicas (ver `docs/MICROSERVICIOS.md`, fase 2).
