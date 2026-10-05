---
description: Crear una pantalla nueva del backoffice conectada a la API
---
1. Define qué pregunta de negocio responde la pantalla y qué acción permite. Si no responde ni permite nada, no se construye.
2. Crea el componente cliente en apps/web/components/admin/<Nombre>.tsx usando los bloques de ui.tsx.
3. Crea la ruta en apps/web/app/admin/<ruta>/page.tsx y agrega el enlace en AdminShell.tsx respetando el rol mínimo.
4. Estados obligatorios: cargando, vacío con instrucción, error con mensaje claro, éxito con confirmación.
5. Si lista datos de negocio: búsqueda, filtro por periodo si aplica y exportación CSV desde la API.
6. Prueba en 1440 px y 390 px. El panel también se usa desde el celular del dueño.
