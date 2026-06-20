---
title: Modelo de datos Supabase — Laurean Shop
tags: [laurean, supabase, postgres, schema, rls]
project: laurean
---

# Modelo de datos Supabase

Archivo fuente: `supabase/schema.sql`

Ver tambien: [[auth-roles]] | [[inventario-bodegas]] | [[qpaypro]]

## Tablas actuales

### categories
| Columna | Tipo | Notas |
|---------|------|-------|
| id | text PK | |
| name | text | |
| image_url | text | |
| starting_price_gtq / usd | numeric | Precio desde |
| display_order | int | |
| active | boolean | |

### subcategories
| Columna | Tipo | Notas |
|---------|------|-------|
| id | text PK | |
| parent_id | text FK → categories | cascade delete |
| name | text | |
| display_order | int | |

### products
| Columna | Tipo | Notas |
|---------|------|-------|
| id | text PK | |
| name | text | |
| image_url | text | |
| description | text | |
| price_gtq / price_usd | numeric | Precio publico |
| parent_id | text FK → categories | |
| subcat_id | text FK → subcategories | |
| is_new_arrival | boolean | |
| flash_end | timestamptz | Para ofertas con tiempo |
| stock | int | Stock global (sin bodega); el detallado va en `inventory_stock` (PLANIFICADO) |
| active | boolean | |
| show_price | boolean | default true. Si false → catalogo/detalle muestran CTA "Contactar a Laurean" en vez de precio |
| week_number | int | Para agrupar "Productos — Semana X" en catalogo y portada |
| gallery | jsonb | URLs de imagenes para la galeria de `producto.html` |
| size_chart | jsonb | Guia de tallas (medidas por talla); opcional, editable en admin |
| source_cod | text | Referencia al `inventory_items.cod` de origen (traza de publicacion) |

**Regla de validacion de precio**: a `products` solo llega el precio publico validado (`price_gtq` = `public_price_gtq` del item de mayoreo, y solo si el admin lo valido con `show_price`). Nunca se copian `cost_price`, `supplier` ni `sale_price_*`.

### bodegas
| Columna | Tipo | Notas |
|---------|------|-------|
| id | text PK | |
| name | text | |
| address / city | text | |
| township_code | text | HeaderCodeTownship de Forza Delivery |
| active | boolean | |

### profiles
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK FK → auth.users | |
| email | text unique | |
| name | text | |
| role | text CHECK | superuser, admin, vendedor, bodega, agente_pedidos |
| phone | text | |
| code | text | Codigo de referido (vendedores/bodegas) |
| active | boolean | |
| can_login_pos | boolean | Acceso al POS |
| bodega_ids | text[] | Bodegas asignadas (rol bodega) |
| commission_rate | numeric | Override de comisión por vendedor (fracción 0–0.99); `null` = usa el % global de `settings`. Se aplica en `createCommission` (auth.js). |
| created_by | uuid FK → auth.users | |

Ver [[auth-roles]] para logica de roles y sesion.

### orders
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | gen_random_uuid() |
| order_number | text unique | `ORD-YYMMDD-XXXXXX` |
| customer_name/phone/email/address | text | Snapshot del cliente |
| customer_township_code | text | Para Forza Delivery |
| customer_department / city | text | |
| subtotal_gtq / discount_gtq / shipping_gtq / total_gtq | numeric | |
| items | jsonb | Snapshot: [{id, name, qty, price_gtq, image}] |
| status | text CHECK | pendiente, confirmado, en_preparacion, enviado, entregado, cancelado, devuelto |
| payment_method | text | transfer, cod, card, qr, cash |
| payment_status | text | pendiente, pagado, fallido... |
| forza_guide_serie | text | 'FD' |
| forza_guide_number | text | |
| forza_tracking_status | text | |
| forza_label_url | text | PDF de etiqueta Forza |
| referral_code | text | Codigo del vendedor que origino la venta |
| bodega_id | text FK → bodegas | |
| created_by | uuid FK → auth.users | |

### order_tracking_events
Historial de eventos de guia Forza por pedido.

| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| order_id | uuid FK → orders | cascade delete |
| event_code / event_name / description | text | |
| latitude / longitude | numeric | |
| raw_payload | jsonb | Para auditoria |
| occurred_at | timestamptz | |

## Tablas de inventario y pagos (creadas en schema.sql, sin datos aun)

### inventory_items
Stock maestro importado desde el Google Sheet "INVENTARIO ACTUALIZADO SW AÑO 20256".
Ver [[inventario-bodegas]] para detalle de columnas. RLS: lectura staff (is_admin OR role='bodega'), escritura admin.

Columnas de curaduria/publicacion (internas, nunca publicas salvo `public_price_gtq` validado):
- `public_price_gtq numeric` — precio al publico validado por el admin; independiente de `sale_price_min/max` crudos. Solo este viaja a `products.price_gtq`.
- `show_in_catalog boolean default false` — check "aparece o no" (controla `products.active`).
- `show_price boolean default false` — check "tiene precio o no" (controla `products.show_price`).
- `cat_parent_id` / `cat_subcat_id` — categoria asignada para el sitio (FK a categories/subcategories).
- `gallery jsonb default '[]'` — URLs de la galeria del producto.
- `entry_month int` — derivado (1–12) de `entry_date` al importar. **Indicador de período por defecto** (color = mes). Control interno de Laurean: nunca se expone al público.
- `week_number int` — derivado (ISO) de `entry_date` al importar, editable; opción de período por semana (toggle del admin).

> **Período = control interno.** El admin elige mes (default) o semana con el setting `inventory_period_mode` (`'month'|'week'`, en `laurean_settings` / `DEFAULT_SETTINGS`). El indicador de color (mes o semana) **nunca** se renderiza en páginas públicas (`Laurean.html`, `catalogo.html`, `producto.html`, `coleccion.html`); el catálogo público agrupa por criterios customer-facing (novedades/categoría).

Los campos `cost_price`, `supplier` y `sale_price_*` permanecen internos y nunca se exponen al frontend publico.

### inventory_stock
Stock por bodega: `(cod, bodega_id, stock)`, PK compuesta. Version persistida del `KEYS.INVENTORY` de localStorage.

### inventory_week_legend
Leyenda configurable semana=color: `(week_number PK, color, label)`. La paleta la define el usuario. Se usa cuando `inventory_period_mode = 'week'`. LS: `laurean_inventory_week_legend`.

### inventory_month_legend
Leyenda configurable mes=color: `(month_number PK 1–12, color, label)`. Default del indicador interno; convive con la semanal (cuál se usa lo decide `inventory_period_mode`). RLS staff igual que `inventory_week_legend`. LS: `laurean_inventory_month_legend`.

### site_settings
Contenido editable desde el dashboard (módulo "Contenido del sitio" en `admin.html` → vista Configuración). `(key text PK, value jsonb, updated_at)`. Claves:
- `marquee` → array de strings (anuncios del letrero del hero de `Laurean.html`).
- `social_links` → array de `{type,url,label,visible}` (Instagram/Facebook/TikTok/WhatsApp del footer).
- `whatsapp` → text (número de WhatsApp).

RLS: **lectura pública** (el sitio la necesita sin login), escritura admin (`is_admin()`). Trigger `set_updated_at`. Espejo en localStorage `laurean_site_settings` (patrón local-first, helpers `getSiteSettings`/`saveSiteSettings`/`hydrateSiteSettings` en auth.js).

### payments
Registro de transacciones QPayPro: `id uuid PK, order_id FK→orders, provider, amount_gtq, currency, status (iniciado/aprobado/rechazado/error), response_code, response_text, qpaypro_audit, checkout_token, raw_response jsonb`. Escritura solo via Edge Function `qpaypro-proxy` (service_role); RLS de lectura admin. Ver [[qpaypro]].

**Flujo de pago con tarjeta (Hosted Page):** en `action:'create'` la función `qpaypro-proxy`
**crea la orden** en `orders` y el intento en `payments` con **service_role** (omite RLS del
checkout público), **revalidando los precios contra `products`** (no confía en el monto del
navegador). El frontend (`Laurean.html`) ya **no** inserta la orden en Supabase cuando el pago
es con tarjeta — la función es la dueña. Ver [[qpaypro]].

### analytics_page_visits
Contador propio de visitas del sitio. Columnas: `id`, `site_key`, `page_path`, `session_id`, `referer`, `user_agent`, `created_at`.

Flujo: las paginas publicas cargan `js/visit-tracker.js`, que deduplica por pagina/sesion y llama la Edge Function publica `supabase/functions/log-visit/`. La funcion inserta con `SUPABASE_SERVICE_ROLE_KEY` para omitir RLS. RLS: `anon` puede INSERT; solo admin puede SELECT. La vista [[orden-dashboards|Analitica]] en `admin.html` lee la tabla con `window.LAUREAN_DB`.

## Storage

Bucket `product-images` (publico):
- Lectura: todos.
- Escritura: admin/superuser via policy `is_admin()`.

## Enfoque RLS

- Catalogo (categories, subcategories, products): lectura publica; escritura admin.
- bodegas: lectura autenticada; escritura admin.
- profiles: cada usuario ve el suyo; admin ve todos.
- orders: admin ve todo; vendedor ve los suyos; roles autorizados pueden insertar.
- order_tracking_events: admin o dueno del pedido puede leer; escritura admin / Edge Function con service_role.
- analytics_page_visits: insercion publica; lectura admin.

Funcion auxiliar `is_admin()` (security definer): retorna true si el `auth.uid()` tiene role admin/superuser y active=true.

## Triggers

`tg_set_updated_at`: actualiza `updated_at` antes de cada UPDATE en `categories`, `products`, `orders`.

## Dual-write frontend

El frontend escribe primero en localStorage y luego, si `window.LAUREAN_DB` existe, hace un insert/upsert a Supabase de forma fire-and-forget. Esto permite operatividad offline y resiliencia ante errores de red.
