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

### variant_stock — **fuente de verdad de las existencias**
Existencias por producto x bodega x color x talla. Es lo que vende el POS, lo que
muestra la tienda y sobre lo que operan todos los movimientos.

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| product_id | text FK → products | |
| bodega_id | text FK → bodegas | |
| color | text | `''` si el producto no maneja color |
| size | text | `''` si el producto no maneja talla |
| stock | int | Unidades de esa combinacion en esa bodega |

Clave primaria compuesta: `(product_id, bodega_id, color, size)`.
RLS: lectura publica (la tienda necesita saber que tallas ofrecer), escritura
`admin` o `bodega`.

Un producto sin colores ni tallas tiene **una** fila con `color=''` y `size=''`.
No hay caso "producto sin variante": eso evita que un movimiento se aplique al
total sin llegar nunca al POS, que era el origen de los traslados fantasma.

### inventory_stock — total **derivado**, no se escribe a mano
Total por COD y bodega. Ya **no** es una fuente independiente: el trigger
`agregado_desde_variantes` sobre `variant_stock` lo recalcula como la suma de las
variantes de ese producto en esa bodega (funcion `refrescar_stock_agregado`).
Los productos sin `source_cod` no tienen fila aqui; su total lo arma el frontend
sumando variantes en `syncStockFromSupabase()`.

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| cod | text FK → inventory_items | |
| bodega_id | text FK → bodegas | |
| stock | int | Suma de las variantes de ese producto en esa bodega |

Clave primaria compuesta: `(cod, bodega_id)`.

### inventory_week_legend
Leyenda configurable semana=color: `(week_number PK, color, label)`. Editable desde la pestaña Mayoreo; se usa cuando `inventory_period_mode='week'`. La paleta la define el usuario.

### inventory_month_legend
Leyenda configurable mes=color: `(month_number PK 1–12, color, label)`. Default del indicador interno; se usa cuando `inventory_period_mode='month'`. Convive con la semanal.

## Movimientos: un solo motor, `mover_inventario`

Todos los movimientos (ingreso, salida, ajuste, traslado) pasan por la funcion
`public.mover_inventario(...)` en Postgres. Definicion completa y comentada en
[[supabase/movimientos-por-variante.sql]].

Firma: `mover_inventario(p_tipo, p_product_id, p_product_name, p_origen,
p_destino, p_lineas, p_motivo, p_notas, p_proveedor, p_costo_unit, p_pagado)`
donde `p_lineas` es `[{ "color": "Negro", "size": "M", "qty": 10 }, …]`.

Por que vive en la base y no en el navegador:

- **Atomica.** Aplica `stock = stock + delta`, no un total calculado en el
  navegador. Dos equipos moviendo a la vez ya no se pisan.
- **Valida de verdad.** Si no alcanza la existencia lanza un error con nombre,
  combinacion, disponible y pedido; no se escribe nada.
- **SECURITY DEFINER.** Un usuario con rol `bodega` puede registrar movimientos
  aunque `inventory_movements` sea de escritura solo-admin.
- **Deja traza siempre.** Incluye color, talla, costo unitario y pagado. Un
  traslado deja **un** movimiento con `from_bodega` → `to_bodega`, no dos.

En `js/auth.js`, `moverInventario(mov)` la envuelve y devuelve `{ ok, error }`.
Si la funcion no estuviera instalada, cae a escrituras directas equivalentes
(leyendo el valor vigente de la base antes de escribir) y reporta los errores en
vez de tragarselos. Despues de cada movimiento, `refrescarExistencias()` vuelve a
leer de la base: lo que se ve en pantalla es lo guardado.

## En el admin

`admin.html` → Inventario:

- **Existencias**: total por bodega + boton que despliega el desglose por color y
  talla. Ahi se comprueba si un traslado llego.
- **Movimientos**: columna Color / Talla; el filtro por bodega encuentra el
  traslado desde cualquiera de sus dos lados.
- **Modal de movimiento**: cuadricula de combinaciones (color, talla, disponible,
  cantidad) con filtro, "Todo" y "Limpiar". Un traslado mueve varias
  combinaciones de una sola vez. Funciones: `invCombinacionesDe`,
  `renderInvVarGrid`, `invVarLineas`, `saveInvMovement`.
- **Ingreso**: cada linea lleva Color + cantidades por talla, y eso es lo que
  alimenta `variant_stock`.

Cache local (`localStorage`), reconstruido desde la base en cada sync:

- `laurean_variant_stock`: `{ 'productId|bodegaId|color|size': stock }`.
- `laurean_inventory`: `{ productId: { bodegaId: { stock, updatedAt } } }` (total).
- Alertas de stock bajo: `getLowStockItems()` contra `product.lowStockThreshold`
  (default 5).

Orden obligatorio de sincronizacion: `syncVariantStockFromSupabase()` **antes**
de `syncStockFromSupabase()`, porque el segundo completa los totales de los
productos sin COD sumando variantes.
