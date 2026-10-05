---
trigger: glob
globs: apps/web/components/admin/**, apps/api/src/admin/**
---
Reglas del backoffice:
- Toda ruta nueva en apps/api/src/admin/admin.controller.ts declara el rol mínimo (viewer/ops/admin/owner) y registra la acción con AuditService.
- Toda lista tiene búsqueda, estado vacío con instrucción ("Aún no hay cupones. Crea el primero.") y exportación CSV si son datos de negocio.
- Los componentes del panel usan los bloques de apps/web/components/admin/ui.tsx (Kpi, BarChart, Distribution, tabla); no inventes otro sistema visual.
- Las métricas del tablero siempre comparan con el periodo anterior de la misma duración.
- Nunca mostrar datos personales de clientes más allá de nombre, correo, celular y ciudad.
