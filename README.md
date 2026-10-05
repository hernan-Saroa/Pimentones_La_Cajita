# 🐳 Pimentones La Cajita · Infraestructura, Scripts & Documentación

Centro de orquestación, despliegue, automatización en PowerShell y especificaciones de arquitectura.

## ⚡ Scripts Disponibles (scripts/)
* dev.ps1: Inicia el entorno completo de desarrollo.
* up.ps1: Despliega los contenedores de producción.
* smoke.ps1: Ejecuta pruebas de verificación de endpoints.
* ackup.ps1: Genera volcado de respaldo de la base de datos PostgreSQL.
* logs.ps1: Muestra logs de todos los servicios.
* db-shell.ps1: Acceso interactivo a psql en Docker.

## 🐳 Contenedores y Proxy
* docker-compose.yml: Orquestación multi-servicio para producción.
* docker-compose.dev.yml: PostgreSQL 16 para desarrollo local (puerto 5434).
* infra/caddy/Caddyfile: Proxy inverso TLS con HTTP/3 y SSL automático.

## 📚 Documentación (docs/)
* ARQUITECTURA.md, MICROSERVICIOS.md, BACKOFFICE.md, DESPLIEGUE.md.
