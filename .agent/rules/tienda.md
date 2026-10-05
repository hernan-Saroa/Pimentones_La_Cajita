---
trigger: glob
globs: apps/web/app/**, apps/web/components/**, apps/web/store/**
---
Reglas de la tienda:
- Páginas de catálogo y fichas son Server Components con revalidate: 60; todo lo interactivo es un componente cliente pequeño.
- El carrito vive en apps/web/store/cart.ts (zustand); los precios ahí son informativos, la API recalcula.
- Todo botón de compra usa QtyButton o BuyBox; no dupliques la lógica de agregar.
- Eventos de analítica con track()/trackOnce() de apps/web/lib/track.ts; sin datos personales.
- Textos para personas sin conocimiento técnico; errores de formulario debajo del campo, en lenguaje claro.
- Probar en 390 px antes que en escritorio; nada fijo que tape contenido en pantallas de menos de 640 px de alto.
