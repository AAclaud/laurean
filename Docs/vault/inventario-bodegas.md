---
title: Inventario y bodegas — Laurean Shop
tags: [laurean, inventario, bodegas, stock]
project: laurean
---

# Inventario y distribucion por bodegas

Ver tambien: [[modelo-datos-supabase]] | [[orden-dashboards]]

## Concepto general

Laurean opera con multiples bodegas (puntos de distribucion). El inventario
central se gestiona desde una hoja de calculo y se distribuye por bodega.

- Una bodega puede ser un local fisico, un punto de venta o un deposito.
- Cada vendedor o usuario con rol `bodega` tiene asignadas una o mas bodegas (`bodega_ids` en `profiles`).
- El POS opera en el contexto de una bodega activa (`setActiveBodega` en `js/auth.js`).

## Fuente de datos actual

Google Sheet: **"INVENTARIO ACTUALIZADO SW AÑO 20256"**

Disponible exportado en:
- `Docs/INVENTARIO ACTUALIZADO SW AÑO 20256.xlsx`
- `Docs/INVENTARIO ACTUALIZADO SW AÑO 20256.xlsx - Hoja1.csv`

Hay tambien una plantilla limpia en: `Docs/plantilla-inventario.csv`

## Concepto de "color = periodo" (control interno)

Cada articulo del inventario tiene una **fecha de entrada** representada como un
color (indicador visual en la vista admin). Es **control interno de Laurean**:
nunca se renderiza en paginas publicas (`Laurean.html`, `catalogo.html`,
`producto.html`, `coleccion.html`).

- **Por defecto el periodo es el MES** (`entry_month`, 1–12, derivado de `entry_date`).
  Leyenda configurable mes=color en `inventory_month_legend` (LS
  `laurean_inventory_month_legend`).
- **La SEMANA queda como opcion/toggle del admin** (`week_number` ISO + leyenda
  `inventory_week_legend`, LS `laurean_inventory_week_legend`). El admin elige
  mes o semana con el setting `inventory_period_mode` (`'month'` default | `'week'`)
  via `window.setInventoryPeriodMode(...)`. Ambas leyendas conviven.

Ejemplo: color verde = enero, color azul = febrero, etc. El campo de color crudo
de la semana se llama `week_color` en el modelo.

## Tablas en Supabase (creadas en schema.sql, sin datos aun)

El importador vive en `js/inventory-import.js` y la UI en la pestaña **Mayoreo** de la vista Inventario de `admin.html`. Sube el CSV exportado del Sheet, parsea precios (ES decimales, US en rangos "Qx a Qy"), hace UPSERT por `cod`, deriva `entry_month` y `week_number` de `entry_date`, y permite asignar periodo=color (mes por defecto, semana opcional) y "Publicar al catálogo" (crea/actualiza fila en `products`). El CSV de demo (`Docs/INVENTARIO ACTUALIZADO SW AÑO 20256.xlsx - Hoja1.csv`, 109 items) se importa en local.

### inventory_items
Stock maestro de articulos. Columnas:

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| cod | text PK | Codigo de articulo |
| entry_date | date | Fecha de entrada al inventario |
| supplier | text | Proveedor |
| brand | text | Marca |
| description | text | Descripcion del articulo |
| cost_price | numeric | Precio de costo |
| sale_price_min | numeric | Precio de venta minimo |
| sale_price_max | numeric | Precio de venta maximo |
| stock_count | int | Stock total (suma de todas las bodegas) |
| photo_url | text | URL imagen en Supabase Storage |
| entry_month | int | Mes de entrada (1–12), indicador de periodo **por defecto**; control interno |
| week_number | int | Numero de semana de entrada (opcion/toggle del admin) |
| week_color | text | Color asociado a la semana (hex o nombre) |
| observation | text | Notas adicionales |
| active | boolean | Activo en catalogo |

### inventory_stock
Distribucion de stock por bodega. Columnas:

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| cod | text FK → inventory_items | |
| bodega_id | text FK → bodegas | |
| stock | int | Unidades disponibles en esa bodega |

Clave primaria compuesta: `(cod, bodega_id)`.

### inventory_week_legend
Leyenda configurable semana=color: `(week_number PK, color, label)`. Editable desde la pestaña Mayoreo; se usa cuando `inventory_period_mode='week'`. La paleta la define el usuario.

### inventory_month_legend
Leyenda configurable mes=color: `(month_number PK 1–12, color, label)`. Default del indicador interno; se usa cuando `inventory_period_mode='month'`. Convive con la semanal.

## Estado actual (POS sigue en localStorage)

El POS aun lee/descuenta stock desde localStorage; la migracion a `inventory_stock` queda pendiente de pruebas con Supabase en vivo. Hoy el inventario operativo vive en localStorage:

- `localStorage['laurean_inventory']`: objeto `{ productId: { bodegaId: { stock, updatedAt } } }`.
- Funciones: `getStockValue`, `updateStock`, `ajustarStock`, `getInventoryMovements` (en `js/auth.js`).
- Alertas de stock bajo: `getLowStockItems()` compara stock contra `product.lowStockThreshold` (default 5).

## Migracion desde Google Sheet

El flujo previsto de migracion:
1. Exportar CSV desde Google Sheet.
2. Limpiar y mapear columnas al schema de `inventory_items`.
3. Importar via script o carga en Supabase Table Editor.
4. Poblar `inventory_stock` segun la distribucion inicial por bodega.

Ver `Docs/plantilla-inventario.csv` como referencia de columnas esperadas.
