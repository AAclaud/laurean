# Laurean Shop

Sistema de tienda online + panel administrativo + punto de venta (POS).  
Stack: HTML5 / CSS3 / JavaScript vanilla — sin frameworks, sin build tools.  
Backend: **Supabase** (Postgres + Auth + Storage + Edge Functions).  
`localStorage` se usa como caché/offline; Supabase es la fuente de verdad cuando está conectado.  
Envíos: **Forza Delivery** vía Edge Function `forza-proxy`.

Marca/colores y tipografías centralizados en [`css/brand.css`](css/brand.css).

---

## Páginas

| Archivo | Descripción |
|---|---|
| `Laurean.html` | Tienda pública — catálogo, carrito, checkout |
| `login.html` | Inicio de sesión compartido |
| `admin.html` | Panel administrativo (admin / superuser) |
| `pos.html` | Punto de venta (vendedor / bodega / admin / superuser) |
| `vendedoras.html` | Landing de solicitud para vendedoras |

---

## Setup Supabase (resumen)

1. Crear proyecto en [app.supabase.com](https://app.supabase.com).
2. SQL Editor → ejecutar `supabase/schema.sql` y luego `supabase/seed.sql`.
3. Crear el primer usuario en **Authentication → Users → Add user** y correr el UPSERT de perfil en `seed.sql` con su UUID.
4. Copiar `js/config.example.js` → `js/config.js` y pegar `SUPABASE_URL` + `SUPABASE_ANON`.
5. Edge Functions (Forza + gestión de usuarios):

```bash
supabase login
supabase link --project-ref <tu-project-ref>
supabase secrets set FORZA_BASE_URL=... FORZA_COD_APP=... FORZA_SECRET_KEY=... \
  FORZA_CODE_OF_REFERENCE=... FORZA_ID_CLIENT=...
supabase functions deploy forza-proxy
supabase functions deploy forza-webhook
supabase functions deploy create-user
```

> `create-user` usa `SUPABASE_SERVICE_ROLE_KEY` (ya disponible en el entorno de Functions; no la pongas en el frontend).

Ver guía completa de hosting/DNS en [`Docs/deploy.md`](Docs/deploy.md).

**Usuarios**: no hay credenciales por defecto. Se crean desde `admin.html → Vendedores/Usuarios` (vía edge function) o en Supabase Auth.  
**PIN de descuento manual** (checkout / POS): sin valor por defecto. Configúralo desde el panel antes de usar descuentos manuales.

---

## Niveles de precio

| Rol | Descuento sobre precio público |
|---|---|
| Cliente / Guest | 0% |
| Vendedor | 15% (configurable) |
| Bodega | 30% (configurable) |

---

## Dev server

```bash
npx serve -l 8080 .
```

Abre `http://localhost:8080/Laurean.html`

---

## Estructura de datos (`data/products.js`)

```
parentCategories  →  categorías padre (Mujer, Hombre, Kids, Ofertas)
  subcategories   →  subcategorías (Blusas, T-Shirt, Pijamas…)
    products      →  productos con parent + subcat + is_new_arrival
accessories       →  accesorios y calzado (sección independiente)
```

---

## localStorage keys

| Key | Contenido |
|---|---|
| `laurean_users` | Usuarios registrados |
| `laurean_session` | Sesión activa |
| `laurean_orders` | Pedidos |
| `laurean_commissions` | Comisiones de vendedoras |
| `laurean_prices` | Overrides de precio por producto |
| `laurean_settings` | Configuración global (descuentos, PIN) |
| `laurean_vendor_apps` | Solicitudes de vendedoras |
| `laurean_custom_products` | Productos creados desde admin |
| `laurean_custom_categories` | Categorías creadas desde admin |
| `laurean_proveedores` | Proveedores |
| `laurean_bodegas` | Bodegas |
| `laurean_cotizaciones` | Cotizaciones |
