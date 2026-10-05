# De Antigravity a producción · guía paso a paso

## 0. Lo que necesitas instalado en tu computador

| Herramienta | Para qué | Comprobar |
|---|---|---|
| **Antigravity** (antigravity.google) | Editor con agente; abre la carpeta del proyecto | — |
| **Node.js 22** (nodejs.org) | Compilar y correr la web y la API | `node -v` → v22.x |
| **Docker Desktop** | Base de datos en local y despliegue | `docker compose version` |
| **Git** y una cuenta en **GitHub** | Versionar y que el CI construya las imágenes | `git -v` |

## 1. Abrir el proyecto en Antigravity

1. Descomprime `pimentones-la-cajita-plataforma.zip`. Queda la carpeta `lacajita-next`.
2. En Antigravity: **File → Open Folder** y elige `lacajita-next`. El agente detecta `AGENTS.md`, las reglas en `.agent/rules/` y los flujos en `.agent/workflows/`.
3. Primer mensaje al agente:

   > Lee AGENTS.md y docs/CONTENIDO-ORIGEN.md. Prepara el entorno: `npm install`, copia `apps/api/.env.example` a `apps/api/.env` y `apps/web/.env.example` a `apps/web/.env.local`, genera un JWT_SECRET largo, pon ADMIN_PASSWORD, y levanta todo con `make dev`. Confírmame que responden http://localhost:3000, http://localhost:3000/admin y http://localhost:4000/api/docs.

   `make dev` arranca PostgreSQL en Docker y la API y la web con recarga en caliente. La API crea las tablas y los datos iniciales sola.
4. Entra a `http://localhost:3000/admin` con el correo y la contraseña que pusiste en `apps/api/.env`.

## 2. Trabajar con el agente

- Una tarea por conversación. Para una funcionalidad nueva: "Implementa la épica E1 de docs/BACKLOG.md siguiendo `.agent/workflows/nueva-funcion-api.md`. No la des por terminada hasta cumplir sus criterios de aceptación y la definición de hecho de AGENTS.md".
- Para ajustes de la tienda: "Cambia X en la portada. Pruébalo en 390 px y en escritorio y corre `npm run lint -w apps/web`".
- Antes de aceptar cualquier cambio del agente: `npm run build && npm test -w apps/api && npm run lint -w apps/web` en verde.

## 3. Subir el código a GitHub

```bash
git init && git add . && git commit -m "Plataforma Pimentones La Cajita"
git remote add origin git@github.com:TU-USUARIO/lacajita.git
git push -u origin main
```
Con cada `push` a `main`, GitHub Actions construye todo, corre las pruebas y publica las imágenes `ghcr.io/TU-USUARIO/lacajita/api` y `.../web`. En GitHub, en **Settings → Secrets and variables → Actions → Variables**, crea `SITE_URL` = `https://www.pimentoneslacajita.com`.

## 4. Preparar las cuentas del negocio (antes de publicar)

| Cuenta | Qué sacar de ahí | Dónde va |
|---|---|---|
| **Wompi** (wompi.co, comercios) | Llave pública, secreto de integridad y secreto de eventos. Empieza con las de **sandbox** (`pub_test_…`) | `apps/api/.env` → `WOMPI_*` |
| **Correo** (Google Workspace, Zoho, Brevo o SES) | Servidor SMTP, usuario y contraseña de aplicación | `apps/api/.env` → `SMTP_*`, `MAIL_FROM`, `MAIL_NOTIFY` (ahí llegan pedidos, mensajes y reportes) |
| **Anthropic** (opcional) | Llave de API para el asistente "¿Qué vas a cocinar?" | `ANTHROPIC_API_KEY`; sin ella funciona con reglas |
| **Dominio** (donde esté registrado pimentoneslacajita.com) | Acceso al DNS | Paso 6 |

## 5. Elegir dónde publicar

**Opción A · Un servidor con Docker (recomendada para empezar).** Una VM pequeña (2 vCPU, 4 GB) en Azure, DigitalOcean o Hetzner, con Ubuntu 24 y Docker instalado. Cuesta poco, se opera con `make` y aguanta de sobra el volumen inicial. Todo el stack (proxy con HTTPS, web, API, worker, base de datos y respaldos diarios) corre ahí.

**Opción B · Azure Container Apps.** Tres apps (web, api, worker) desde las imágenes de GHCR, más **Azure Database for PostgreSQL Flexible Server**. Escala sola y no se administra servidor, pero cuesta más y la base de datos va aparte. Conviene cuando ya haya ventas constantes.

La guía sigue con la opción A. Para la B, `docs/MICROSERVICIOS.md` describe cómo se reparten los servicios.

## 6. Publicar (opción A)

En el servidor, por SSH:

```bash
sudo apt update && sudo apt install -y git docker.io docker-compose-v2 make
git clone https://github.com/TU-USUARIO/lacajita.git && cd lacajita
cp .env.example .env            # SITE_DOMAIN=www.pimentoneslacajita.com  SITE_URL=https://www.pimentoneslacajita.com  DB_PASSWORD=(larga y aleatoria)
cp apps/api/.env.example apps/api/.env   # JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, WOMPI_*, SMTP_*, MAIL_NOTIFY
make up
```

DNS: en el proveedor del dominio, crea un registro **A** de `www` apuntando a la IP del servidor, y otro **A** (o redirección) para el dominio sin `www`. Caddy obtiene el certificado HTTPS solo, en el primer acceso.

Verifica: `make smoke URL=https://www.pimentoneslacajita.com`. Debe decir "Humo OK".

## 7. Dejar la tienda lista para vender

1. Entra a `https://www.pimentoneslacajita.com/admin` (usuario propietario de `apps/api/.env`).
2. **Productos:** precios, gramaje, inventario y textos reales. Sube fotos definitivas.
3. **Envíos:** zonas por departamento con tarifa, días y si hay contraentrega. **Ajustes:** WhatsApp, correo, Instagram, envío gratis desde.
4. **Contenido:** revisa el lema, "Quiénes somos", preguntas frecuentes (tiempos de entrega y duración del frasco deben ser los reales).
5. **Usuarios:** crea las cuentas del equipo con su rol; no compartas la del propietario.
6. **Wompi:** en el panel de Wompi, URL de eventos = `https://www.pimentoneslacajita.com/api/webhooks/wompi`. Haz una compra de prueba con las tarjetas de sandbox; cuando apruebe, cambia a las llaves de producción y repite con una compra real pequeña.
7. **Correo:** haz un pedido de prueba y confirma que llegan el correo al cliente y el aviso al negocio.
8. Textos legales: política de tratamiento de datos (Ley 1581), términos y condiciones, derecho de retracto (Ley 1480) y registro INVIMA en las fichas. Pide al agente que los monte como páginas cuando el negocio te los entregue.
9. Apaga la página anterior y deja el dominio apuntando solo al servidor nuevo.

## 8. Operar después del lanzamiento

| Qué | Cómo |
|---|---|
| Publicar una nueva versión | en el servidor: `git pull && make deploy` (actualiza API → worker → web, sin corte). Si algo sale mal: `make rollback TAG=<anterior>` |
| Ver qué pasa | `make logs S=api` (o `worker`, `web`, `proxy`) |
| Respaldo manual | `make backup` (el automático corre a las 3 a. m. y conserva 14 días) |
| Restaurar | `make restore F=backups/lacajita-AAAAMMDD-HHMMSS.dump.gz` |
| Salud | `https://www.pimentoneslacajita.com/api/health` debe responder `{"ok":true}` |
| Reporte diario | llega a `MAIL_NOTIFY` a las 8 p. m.; inventario bajo a las 7 a. m. |

## Problemas frecuentes

- **`make up` falla por `DB_PASSWORD`:** falta definirlo en `.env` de la raíz.
- **La API no arranca:** revisa `make logs S=api`; si dice que falta una variable, es `apps/api/.env`.
- **No sale el certificado HTTPS:** el DNS aún no apunta al servidor o los puertos 80 y 443 están cerrados en el firewall de la VM.
- **El pago en línea no aparece en el checkout:** faltan `WOMPI_PUBLIC_KEY` o `WOMPI_INTEGRITY_SECRET`.
- **Los correos no llegan:** sin `SMTP_HOST` solo se registran en el log del worker; revisa `make logs S=worker`.
