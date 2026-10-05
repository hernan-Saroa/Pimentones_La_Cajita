# Pimentones La Cajita · Infraestructura y Automatización

Configuración de contenedores Docker, proxy inverso seguro Caddy con SSL automático, scripts PowerShell de gestión y documentación de arquitectura.

## Contenido
* docker-compose.yml: Orquestación para producción (web, api, worker, db postgres, caddy, backup).
* docker-compose.dev.yml: Base de datos PostgreSQL en contenedor para entorno de desarrollo.
* scripts/:
  * dev.ps1: Inicia el entorno completo de desarrollo.
  * up.ps1: Levanta la plataforma en Docker.
  * smoke.ps1: Pruebas de verificación de salud de endpoints.
  * ackup.ps1: Genera volcado de respaldo de la base de datos PostgreSQL.
  * logs.ps1: Monitoreo de registros de los servicios.
* docs/: Documentación de arquitectura, diagramas de microservicios y despliegue.
