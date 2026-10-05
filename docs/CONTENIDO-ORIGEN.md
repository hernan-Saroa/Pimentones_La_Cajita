# Contenido de la página actual (www.pimentoneslacajita.com) y dónde vive ahora

Nada de la página actual se pierde. Esta tabla dice qué había, dónde quedó en la plataforma nueva y desde dónde se edita.

| En la página actual | En la plataforma nueva | Se edita en |
|---|---|---|
| Lema "Productos Siempre Frescos" | Etiqueta sobre "Quiénes somos" en la portada; también en la descripción para buscadores | Admin → Contenido → Lema |
| "Nuestras cosechas de Pimentón se escogen con calidad y amor." | Texto de "Quiénes somos" (ampliado con Bogotá, tandas a mano y sin conservantes) | Admin → Contenido → Quiénes somos |
| Video de YouTube (`nKZEfpe_bng`) | Sección "Quiénes somos", se carga solo al tocar play (rápido y sin cookies de terceros: `youtube-nocookie`) | Admin → Contenido → Video |
| Formulario "Contáctenos" (nombre, email, teléfono, mensaje) | Página `/contacto` con el mismo formulario; los mensajes se guardan, llegan por correo al negocio y se gestionan en el panel | Admin → Mensajes |
| WhatsApp +57 310 334 7621 | Botones de WhatsApp en carrito, confirmación de pedido, contacto y pie | Admin → Ajustes → WhatsApp / Teléfono visible |
| contacto@pimentoneslacajita.com | Página de contacto y pie; destinatario sugerido para los avisos del negocio (`MAIL_NOTIFY`) | Admin → Ajustes → Correo de contacto |
| Bogotá, Colombia | Página de contacto y pie | Admin → Ajustes → Ciudad |
| Instagram @pimentones_la_cajita | Pie, contacto y sección "Únete" | Admin → Ajustes → Instagram |
| Logo (horizontal y vertical) | Reconstruido en vector (`apps/web/public/img/logo.svg`, `logo-vertical.svg`, `isotipo.svg`), íconos y favicon derivados; kit completo con PNG en alta resolución, versiones blanca y negra en `brand/` | `brand/build_logo.py` |
| Intranet (Siigo) | Enlace "Siigo" en la barra del panel de administración | `AdminShell.tsx` |
| Correo web | No aplica a la tienda; sigue en el proveedor de correo | — |
| `index.html#form1-2` y enlaces antiguos | Redirecciones permanentes a `/` y `/contacto` | `next.config.ts` |

Datos del negocio que se cargan como valores iniciales en la base de datos (`apps/api/src/db/seed.ts`) y se pueden cambiar sin desplegar: WhatsApp, correo, teléfono visible, ciudad e Instagram.

## Notas para el agente

- La página actual está hecha con Mobirise y contiene enlaces de muestra del constructor (Facebook, Behance, YouTube de Mobirise) que **no** son del negocio; no se migraron.
- Siigo es el software de facturación que ya usa el negocio: la épica E5 del backlog (facturación electrónica) debe evaluar primero la API de Siigo.
