---
title: Vistas del dashboard admin — Laurean Shop
tags: [laurean, admin, dashboard, vistas]
project: laurean
---

# Vistas del dashboard admin.html

Ver tambien: [[estructura-paginas]] | [[inventario-bodegas]]

Todas las vistas viven en `admin.html` como tabs/secciones de una SPA.
Acceso restringido a roles `admin` y `superuser`.

## Lista de vistas (orden recomendado)

| # | Vista | Proposito |
|---|-------|-----------|
| 1 | **Dashboard / KPIs** | Metricas rapidas: ventas del dia, pedidos pendientes, stock bajo, comisiones pendientes |
| 2 | **Pedidos** | Lista completa de ordenes; cambio de estado; detalle + historial; link a guia Forza |
| 3 | **Comisiones** | Comisiones generadas por vendedores; marcar como pagado; filtro por vendedor |
| 4 | **Estadisticas** | Graficas de ventas por periodo, productos mas vendidos, rendimiento por bodega |
| 5 | **Analitica** | Contador propio del sitio: lee `analytics_page_visits`, muestra visitas totales, paginas mas visitadas y barras de 7/30 dias. Ver [[modelo-datos-supabase]] |
| 6 | **Productos** | CRUD de productos; precios publico/vendedor/bodega; imagenes (Supabase Storage) |
| 7 | **Categorias** | CRUD de categorias padre y subcategorias; imagen y precio desde |
| 8 | **Proveedores** | CRUD de proveedores; datos de contacto; vinculado a movimientos de inventario |
| 9 | **Bodegas** | CRUD de bodegas; nombre, direccion, township_code (Forza), asignacion de usuarios |
| 10 | **Inventario** | Stock por bodega, movimientos (entradas/salidas/ajustes), alertas de stock bajo. Incluye pestaña **Mayoreo** (import CSV → `inventory_items`, indicador semana=color, publicar al catálogo) — ver [[inventario-bodegas]] |
| 11 | **Cotizaciones** | Crear y gestionar cotizaciones para clientes mayoristas |
| 12 | **Vendedoras** | Lista de vendedoras activas; codigos de referido; asignacion de bodegas |
| 13 | **Solicitudes** | Solicitudes de reclutamiento recibidas desde `vendedoras.html`; aprobar/rechazar |
| 14 | **Envios** | Estado de guias Forza; cotizar tarifa; crear guia; tracking en tiempo real |
| 15 | **Pagos** | Transacciones QPayPro: lista de `payments` (monto, estado, orden, fecha) con join a `orders`. Vista construida; se llena cuando se active [[qpaypro]] (hoy registra intentos en modo diferido) |
| 16 | **Configuracion** | Descuentos globales (vendedor/bodega/referido), comision rate, PIN de descuento manual |

## Notas de implementacion

- El Dashboard (#1) usa `getLowStockItems()` de `js/auth.js` para alertas de stock.
- Pedidos (#2) hace dual-read: localStorage (offline) + Supabase si esta conectado.
- Analitica (#5) usa `renderAnalytics()` en `admin.html` y lee [[modelo-datos-supabase|analytics_page_visits]] via Supabase.
- Envios (#14) usa `window.Forza.*` de `js/forza-client.js`; requiere rol admin/superuser.
- La vista Pagos (#15) ya existe (`renderPagos()` en admin.html); la pestaña Mayoreo (#10) usa `js/inventory-import.js`. Ambas se llenan con datos reales al activar [[qpaypro]] / importar el CSV.
- Configuracion (#16) persiste en `localStorage` clave `laurean_settings`; incluye `discount_pin` (PIN requerido para aplicar descuentos manuales en POS).
