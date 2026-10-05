# Backoffice · funciones y su conexión con la tienda

El panel (`/admin`) y la tienda (`/`) comparten la misma API y la misma base de datos. Nada que se vea en el panel es una copia: cada pantalla lee o escribe exactamente lo que la tienda usa para vender.

## Mapa de funciones

| Pantalla | Qué responde / permite | Efecto en la tienda | Rol mínimo |
|---|---|---|---|
| **Tablero** | Ventas pagadas, pedidos, ticket promedio, frascos vendidos, clientes nuevos vs. recurrentes, descuentos otorgados; todo comparado con el periodo anterior (7 / 30 / 90 días). Ventas por día, estados de pedidos, medios de pago, ciudades, más vendidos, inventario bajo. **Embudo de conversión**: visitas → producto → carrito → pago → compra, tasa de conversión y carritos abandonados, a partir de eventos anónimos que la tienda envía en segundo plano. | Solo lectura | viewer |
| **Pedidos** | Buscar por referencia, nombre o correo; filtrar por estado; ver detalle (cliente, entrega, cupón, transacción Wompi); cambiar estado, guía y transportadora; notas internas; exportar CSV. Cancelar un pendiente devuelve inventario. Marcar como enviado manda el correo con la guía. | El cliente ve el estado y la guía en `/pedido/<ref>` | ops (cambios), viewer (lectura) |
| **Clientes** | Lista agregada por correo: pedidos, total gastado, ciudad, primera y última compra; historial de pedidos por cliente; exportar CSV. | — | viewer |
| **Productos** | Nombre, frase corta, descripción, "va con", precio, gramaje, foto, orden, visible/oculto. Desactivar en lugar de borrar conserva el historial. | Catálogo, fichas y portada (selector de sabores) se regeneran en ≤ 60 s | admin |
| **Inventario** | Stock actual, vendidos a 30 días, días de inventario estimados. Registrar **lotes** (fecha de producción, vencimiento) que suman stock. **Ajustes** con motivo obligatorio. Historial de movimientos (venta, devolución, lote, ajuste) con autor. Alerta diaria por correo con productos en 5 o menos. | Stock en vivo: "Últimos 3", "Agotado", límite del selector de cantidad | ops |
| **Cupones** | Porcentaje, monto fijo o envío gratis; compra mínima; usos máximos; vigencia; activar/desactivar. | El cliente escribe el código en el paso de pago; la API valida, aplica y cuenta usos | admin |
| **Envíos** | Zonas por departamento: tarifa, días de entrega, contraentrega disponible. | Costo y "llega en X a Y días hábiles" en el checkout; contraentrega se oculta donde no hay cobertura | admin |
| **Contenido** | Frase de marca, lema, "Quiénes somos" y su video, misión, valores, caja regalo, foto grande, conservación y preguntas frecuentes. | Portada, fichas y FAQ cambian sin desplegar código | admin |
| **Ajustes** | Tarifa nacional, tarifa local y su ciudad, envío gratis desde, WhatsApp, correo de contacto, teléfono visible, ciudad, Instagram, instrucciones de transferencia. | Barra de "envío gratis", botones de WhatsApp, página de contacto, pie de página, confirmación | admin |
| **Mensajes** | Formulario de contacto de la página actual: nuevos, leídos, respondidos; responder abre el correo con el mensaje citado; aviso por correo al negocio al llegar cada uno. | Página `/contacto` | ops |
| **Usuarios** | Cuentas del panel con rol: viewer, ops, admin, owner. Activar/desactivar. Último acceso. **Auditoría**: quién hizo qué y cuándo. | — | owner |

## Correos automáticos (worker)

| Cuándo | A quién | Contenido |
|---|---|---|
| Pedido confirmado (pago aprobado, transferencia o contraentrega) | cliente y negocio | detalle, total, dirección |
| Pedido enviado | cliente | guía y transportadora |
| Mensaje de contacto nuevo | negocio | mensaje, con el correo del cliente como "responder a" |
| 8:00 p. m. todos los días | negocio | ventas del día, pedidos, frascos, pendientes de pago, más vendidos |
| 7:00 a. m. todos los días | negocio | productos con 5 frascos o menos |

## Cómo llega cada dato del tablero

- **Ventas, pedidos, ticket, frascos, ciudades, medios de pago**: tablas `orders` y `order_items`; solo estados pagados (`paid`, `preparing`, `shipped`, `delivered`).
- **Clientes nuevos vs. recurrentes**: primera compra por correo dentro o fuera del periodo.
- **Embudo**: tabla `events` alimentada por `POST /api/events` desde la tienda (`apps/web/lib/track.ts`): `page_view`, `product_view`, `add_to_cart`, `begin_checkout`, `purchase`, `assistant_query`. Sin cookies de terceros; respeta "Do Not Track".
- **Inventario**: `products.stock` y `stock_movements`; días de inventario = stock ÷ (vendidos 30 días ÷ 30).

## Qué NO hace todavía (ver `docs/BACKLOG.md`)

Reseñas de clientes, devoluciones y reembolsos con flujo propio, variantes de producto (tamaños), facturación electrónica DIAN, pasarela adicional (MercadoPago), campañas de correo, multi-bodega, integración con transportadoras para generar guías.
