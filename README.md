# Laurean Shop

Sistema de tienda online + panel administrativo + punto de venta (POS).  
Stack: HTML5 / CSS3 / JavaScript vanilla — sin frameworks, sin build tools.  
Persistencia: `localStorage` (Fase 1). Auth previsto para Firebase en Fase 2.

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

## Credenciales por defecto

> Estas cuentas se crean automáticamente la primera vez que se carga la app.  
> Cambiarlas desde `admin.html → Configuración` o directamente en `localStorage`.

| Rol | Nombre | Email | Contraseña |
|---|---|---|---|
| Superusuario | AA Projects | super@aaprojects.com | SuperAA2026! |
| Administrador | Admin Laurean | admin@laurean.gt | Admin2026! |

**PIN de descuento manual** (checkout / POS): `1234`

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
