# Pimentones La Cajita · Frontend (Storefront & Backoffice)

Aplicación web desarrollada en **Next.js 15 (App Router)** y **React 19**.

## Estructura
* pp/: Rutas públicas de la tienda, producto, carrito, checkout y portal de administración.
* components/: Componentes modulares y catálogo.
* components/admin/: Módulos del backoffice (pedidos, productos, inventario, clientes, etc.).
* packages/shared/: Contratos y esquemas Zod compartidos.
* rand/: Identidad visual, tipografías y logos.

## Configuración y Ejecución
1. Instalar dependencias:
   ``bash
   npm install
   ``
2. Crear archivo .env.local:
   ``env
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   API_URL=http://localhost:4001
   ``
3. Iniciar en desarrollo:
   ``bash
   npm run dev
   ``
   Disponible en: [http://localhost:3000](http://localhost:3000)
