# Pimentones La Cajita · API & Worker Microservice

Microservicio backend desarrollado en **NestJS 11 + Fastify**, con **Drizzle ORM** sobre **PostgreSQL 16** y cola de tareas en segundo plano.

## Estructura
* src/catalog/: Endpoints de catálogo público de conservas de pimentón.
* src/orders/: Creación y procesamiento de pedidos.
* src/payments/: Integración con pasarela Wompi y webhook de confirmación.
* src/admin/: Autenticación JWT y administración de backoffice.
* src/db/: Esquemas de base de datos Drizzle y migraciones SQL.
* src/jobs/: Worker para sincronización de stock y procesamiento de correos.

## Base de Datos
* PostgreSQL 16 (puerto local 5434).
* Migraciones automáticas al arrancar el servicio.

## Ejecución
1. Instalar dependencias:
   ``bash
   npm install
   ``
2. Iniciar en desarrollo:
   ``bash
   npm run dev
   ``
   API disponible en: [http://localhost:4001/api](http://localhost:4001/api)  
   Documentación Swagger: [http://localhost:4001/api/docs](http://localhost:4001/api/docs)
