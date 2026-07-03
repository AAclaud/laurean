---
title: Estructura de paginas — Laurean Shop
tags: [laurean, paginas, frontend]
project: laurean
---

# Estructura de paginas

Ver tambien: [[auth-roles]] | [[orden-dashboards]]

## Paginas del sitio

| Archivo | Proposito | Acceso |
|---------|-----------|--------|
| `Laurean.html` | Tienda publica: catalogo, carrito, checkout, tracking + vitrina "Catalogo disponible". Copy con identidad oficial ([[marca-laurean]]), seccion "Las colecciones" (entradas Women/Men/Kids), selector del hero **ambientado por color de categoria** (transicion + ruteo a paginas de submarca), barra de rol *glass*, banda de vendedores realzada | Publico |
| `catalogo.html` | Catalogo publico completo: lee solo productos validados de Supabase, agrupados por criterios customer-facing (Novedades/categoria) — **ya no por semana/mes** (el periodo es control interno); cada tarjeta abre `producto.html?id=` | Publico |
| `coleccion.html` | Pagina de coleccion por `?cat=hombre\|mujer\|kids\|accesorios\|ofertas`; una sola plantilla ambientada por categoria via `data-col` (paleta propia dentro del marco Laurean); filtra `data.products` por `parent`, tarjetas con placeholder de marca → `producto.html?id=` | Publico |
| `producto.html` | Detalle de producto estilo Dior: galeria que scrollea + panel sticky a la derecha + guia de tallas; lee por `?id=`. **Variantes de color/diseno**: si `product.variants[]` existe, muestra swatches; al hacer clic baja la galeria a la foto enlazada (`imageIndex`) y actualiza descripcion + tallas disponibles de esa variante | Publico |
| `nosotros.html` | Página "Nosotros" con identidad oficial (historia, tarjetas, valores, visión/misión, firma "by Seong Woo"). Destino de "Nosotros" y "Conoce la marca" | Publico |
| `lookbook.html` | Lookbook editorial publico tipo revista: scroll horizontal con scroll-snap, logo fijo, boton "Volver a la tienda", transicion firma con IntersectionObserver y cierre Women/Men/Kids con hover ambiental. Lee `site_settings.lookbook` via `window.LAUREAN_DB` cuando existe; fallback con fotos reales en `images/lookbook/`. Copy basado en [[marca-laurean]]. | Publico |
| `js/site-footer.js` | Footer compartido (inyectado en todas las páginas vía `<footer id="site-footer">`): logo 53px, firma, y Canales dinámicos (`CHANNEL_ICONS` + `site_settings.social_links`) | — |
| `js/visit-tracker.js` | Tracker publico de visitas: usa [[modelo-datos-supabase|analytics_page_visits]] via Edge Function `log-visit`; deduplica por pagina/sesion con `sessionStorage` | Publico |
| `js/cursor.js` / `css/cursor.css` | Cursor de marca compartido ([[marca-laurean]]): punto + anillo con `mix-blend-mode`, activo solo en hover/pointer fino; `js/cursor.js` crea `.cursor-dot`/`.cursor-ring` en `<body>` y aplica hover en elementos interactivos. | Todas las paginas principales |
| `js/lookbook.js` | Render/config del lookbook: normaliza slides, consulta `site_settings` key `lookbook`, aplica fallback, maneja rueda/teclado/drag/swipe, barra de progreso y ambiente Women/Men/Kids | — |
| `js/gt-territorios.js` | Lista local de departamentos y municipios de Guatemala (`window.GT_TERRITORIOS`). La usa el selector de entrega del checkout cuando Forza no responde; si Forza está disponible se prefiere su catálogo (trae HeaderCode → guía 1-clic) | — |
| `laurean-women.html` / `laurean-men.html` / `laurean-kids.html` | Pantallas editoriales de submarca (estilo Dior: imagen grande → pocas piezas → otra imagen grande). Paleta oficial por `data-seccion` + lockup de `images/categorias/logo-*.jpg` sobre banda del color de la submarca. Filtran `data.products` por `parent` (mujer/hombre/kids) → `producto.html?id=`. CTA → `coleccion.html?cat=`. Copy: ver [[marca-laurean]] | Publico |
| `admin.html` | Panel de administracion completo (ver [[orden-dashboards]]); modal "Publicar al catalogo" con precio publico validado + curaduria por semana | admin, superuser |
| `pos.html` | Punto de venta: venta presencial, historial POS, cierre de caja | Roles POS + flags activos |
| `login.html` | Autenticacion via Supabase Auth; redirige segun rol tras login | Publico |
| `vendedoras.html` | Landing de reclutamiento; formulario de solicitud para ser vendedora | Publico |
| `envios.html` | Pagina publica de informacion de envios; ya no redirige al admin; enlazada desde footer; usa [[site-footer.js]], [[cursor.js]] y [[analytics.js]] | Publico |
| `cambios-devoluciones.html` | Pagina legal/informacion publica con SEO propio; enlazada desde footer; usa [[site-footer.js]], [[cursor.js]] y [[analytics.js]] | Publico |
| `faq.html` | Pagina legal/informacion publica con SEO propio; enlazada desde footer; usa [[site-footer.js]], [[cursor.js]] y [[analytics.js]] | Publico |
| `contacto.html` | Pagina legal/informacion publica con SEO propio; enlazada desde footer; usa [[site-footer.js]], [[cursor.js]] y [[analytics.js]] | Publico |
| `privacidad.html` | Pagina legal/informacion publica con SEO propio; enlazada desde footer; usa [[site-footer.js]], [[cursor.js]] y [[analytics.js]] | Publico |
| `terminos.html` | Pagina legal/informacion publica con SEO propio; enlazada desde footer; usa [[site-footer.js]], [[cursor.js]] y [[analytics.js]] | Publico |
| `404.html` | Pagina de error de marca; [[Cloudflare Pages]] la sirve en rutas inexistentes y carpetas bloqueadas | Publico |
| `index.html` | Redirect inmediato a `Laurean.html` | Publico |
| `js/analytics.js` | GA4 + Meta Pixel con IDs placeholder y helper `window.track()`; incluido en todas las publicas | Publico |
| `_headers` | Headers de seguridad + CSP para [[Cloudflare Pages]]; reemplaza lo que hacia `vercel.json` | Deploy |
| `_redirects` | Bloquea `Docs/`, `supabase/`, `scripts/` y `.claude/` en el hosting | Deploy |
| `robots.txt` | Allow publico, Disallow `admin/`, `pos/`, `login/`, `revision/` y `arquitectura/`; apunta al sitemap | Publico |
| `scripts/gen-sitemap.js` | Genera `sitemap.xml` en build: estaticas + productos de [[modelo-datos-supabase|Supabase]]; encadenado en el build command de [[Cloudflare Pages]] | Build |
| `vercel.json` | Eliminado: deploy migrado a [[Cloudflare Pages]]; ver [[deploy-dominio]] | Eliminado |

## Laurean.html — Tienda publica

- Carga el catalogo desde Supabase (`products`, `categories`); si falla, usa `data/products.js` como fallback estatico.
- Carrito gestionado en localStorage.
- Checkout: recoge nombre, telefono, direccion, codigo de referido, metodo de pago.
- Al confirmar, llama `createOrder()` en `js/auth.js` (dual-write localStorage + Supabase).
- Calcula tarifa de envio via [[forza-integration]] (Forza Delivery).
- Acepta codigos de descuento (`validateDiscountCode`) y codigos de referido de vendedoras.
- Vitrina "Catalogo disponible": seccion al hacer scroll que revela una seleccion de productos validados (estilo Dior), con enlace "Ver todo el catalogo" → `catalogo.html`.

## catalogo.html — Catalogo publico completo

- Lee `window.LAUREAN_DATA.products` via [[modelo-datos-supabase|catalog-loader]] (solo `active=true`, escucha `laurean:catalog-ready`).
- Agrupa por criterios **customer-facing** (Novedades / categoria). **No** agrupa por `week_number` ni `entry_month`: el indicador de periodo es control interno de Laurean y nunca se expone al publico.
- **Regla de precio**: solo muestra precio si `show_price` y `price_gtq > 0` (via `getProductPrice` segun rol/sesion). Nunca expone costo/proveedor/precios crudos.
- CTAs por toggle: "Comprar" (con precio) / "Contactar a Laurean" (sin precio, sensacion de asesoria) / "Ver precio vendedor" (sin sesion → `vendedoras.html`; con sesion → precio por rol).
- Cada tarjeta abre `producto.html?id=` (no enlaza a WhatsApp).

## coleccion.html — Pagina de coleccion ambientada

- Parametrizada por `?cat=hombre|mujer|kids|accesorios|ofertas`. Una sola plantilla; el ambiente (paleta) cambia via atributo `data-col` (cada coleccion tiene color propio dentro del marco grafico Laurean).
- Lee `window.LAUREAN_DATA.products` via catalog-loader (escucha `laurean:catalog-ready`, fallback `data/products.js`); filtra por `parent === catId`.
- Tarjetas con placeholder de marca (`.brand-img` + `js/brand-img.js`); cada una abre `producto.html?id=`. CTA segun `show_price` (igual que catalogo).
- Logos → `Laurean.html#inicio`. Enlazada desde la seccion "Colecciones" de `Laurean.html` (`coleccion.html?cat=<id>`).

## producto.html — Detalle de producto (estilo Dior)

- Lee el producto por `?id=` desde el mismo loader; estado vacio "Producto no encontrado" si no existe.
- Layout 2 columnas en desktop: galeria que scrollea a la izquierda, panel de detalles `position: sticky` a la derecha (queda fijo). En movil, apilado.
- Precio segun `show_price`/rol o CTA "Contactar a Laurean". Guia de tallas (size chart) desde `products.size_chart` o tabla referencial.
- "Comprar" hace handoff del carrito via `localStorage['laurean_pending_cart']` y redirige a `Laurean.html` (que lo fusiona con `mergePendingCart()`).
- "Ver precio vendedor": sin sesion → `vendedoras.html`; con sesion → precio por rol.

## lookbook.html — Lookbook editorial

- Pagina publica aislada; no modifica la navegacion principal. El boton de entrada desde `Laurean.html` queda para otro paso.
- Layout desktop: carril horizontal con `scroll-snap` por slide, navegación por rueda, flechas, drag y swipe. En movil (`max-width: 768px`) cae a vertical apilado.
- Transicion firma: cada slide entra por IntersectionObserver con cross-fade, leve desplazamiento/escala de foto y texto con retardo.
- Logo fijo arriba al centro: usa `images/brand/logo-oscuro.svg` sobre slides oscuros y `images/brand/logo-navbar.svg` sobre slides claros. CTA persistente → `Laurean.html`.
- Render dirigido por config: intenta leer `site_settings` key `lookbook` con `window.LAUREAN_DB`; si no existe, usa el set editorial por defecto en `js/lookbook.js`.
- Assets propios: `images/lookbook/` contiene copias web-safe de fotos, mockups y logos desde los originales de marca. Todas las fotos usan `.brand-img` + `.brand-img-photo` y `js/brand-img.js`.
- Cierre: Women / Men / Kids enlazan a `laurean-women.html`, `laurean-men.html`, `laurean-kids.html`; hover/focus cambia variables CSS de ambiente segun paleta de [[marca-laurean]].

## admin.html — Panel de administracion

Panel de una sola pagina con multiples vistas/tabs. Ver lista completa en [[orden-dashboards]].

- Gated por `requireAuth(['admin','superuser'])`.
- Sincroniza usuarios desde Supabase con `syncUsersFromSupabase()`.
- Dual-write: operaciones de CRUD escriben en localStorage Y en Supabase (fire-and-forget).
- Gestiona bodegas, productos, categorias, proveedores, comisiones, cotizaciones, envios.
- **Contenido del sitio** (vista Configuracion): edita el marquee del hero y las redes sociales del footer sin tocar codigo; persiste en `site_settings` (Supabase) + `laurean_site_settings` (localStorage).
- **Comision por vendedor**: campo `%` individual en el modal de usuario (override del global; vacio = global). Se aplica en `createCommission`.
- **Inventario por periodo**: curaduria coloreada por **mes** (default) o **semana** (toggle del admin, `inventory_period_mode`); indicador interno, nunca publico.
- **Reportes de estadisticas**: HTML imprimible con marca (`printStatsReport`) ademas del CSV; cotizacion imprimible branded y centrada (`printCot`).
- **Finanzas (utilidad)**: cada producto tiene `cost_price` (interno, nunca publico); se snapshotea a `order.items[].cost_price` en la venta. Estadisticas muestra **"Liquidez por articulo"** (venta − costo) en pantalla, en el imprimible y en el CSV (`_computeStats` → `profitByProduct/liquidezTotal/costoTotal`).
- **Inventario — ingreso multiple**: `inv-modal` (tipo ingreso) acepta varias lineas (producto + costo unitario + tallas `S:3, M:5`), checkbox "Pagado al proveedor". El movimiento guarda `unitCost/totalCost/sizes/paid/createdBy`.
- **Proveedores — historial + orden de compra**: `verComprasProv` abre modal con detalle (fecha, producto, tallas, costo, quien ingreso, pagado) + boton **"Orden de compra"** (`printPurchaseOrder`, HTML con marca). Reorden por stock bajo: widget en Inventario (`renderLowStockWidget`) + **"Orden de compra sugerida"** agrupada por proveedor (`printReorderSuggestion`).
- **Vendedores — niveles + deposito**: badge de nivel por ventas acumuladas (`getSellerLevel`, tiers en `settings.seller_tiers`); datos de deposito (DPI/banco/cuenta) autoservicio del vendedor (`saveOwnProfile` + RLS `own_profile_update`).
- **Variantes de producto** (modal producto): editor de variantes (color/swatch + foto enlazada de la galeria + stock por talla) + campo Galeria. Persisten en `products.variants` (jsonb) y `products.gallery`.
- **Envios (Forza)**: el checkout captura Departamento + Municipio. Fuente: lista local `js/gt-territorios.js` (o Forza si responde, que aporta HeaderCode). Guarda `customer_department` + `customer_city` (nombre) y `customer_township_code` (solo si vino de Forza). "Generar guia" (`envCreateGuideFromOrder`) los pre-llena.
- **Tarjetas de subcategoria** (`Laurean.html` `prod-grid-card`): clicables → `producto.html?id=` (`goProducto`), con "Agregar al carrito" y boton "Contactar a Laurean · mayoreo" (`contactMayoreo` → WhatsApp del sitio).
- **Tamaño del marquee**: configurable en Configuracion → Contenido del sitio (`marquee_size`: small/medium/large); se aplica acotado para no salir de la banda (`.marquee-band[data-size]`).
- **Calendario de ingresos** (Inventario → pestaña Calendario): vista mensual de movimientos de ingreso por dia; clic en un dia muestra el detalle (producto, tallas, costo, proveedor, pago) (`renderInventarioCalendar`/`calShowDay`).
- **Kardex de producto** (boton "Kardex" en el listado de productos): ledger cronologico con saldo corrido (entrada/salida/saldo) + imprimible con marca (`openKardex`/`buildKardexRows`/`printKardex`).
- **Reporterias con boton "Generar reporte"**: Estadisticas (utilidad/ventas), Pedidos (CSV), Proveedores (orden de compra), **Comisiones** (`printCommissionsReport`/`exportCommissionsCSV`), **Inventario → Stock** (`printStockReport`/`exportStockCSV`), Kardex. Helpers compartidos: `openPrintWindow` (HTML branded) y `downloadCSV`.
- **Editar producto + variantes con tallas fijas**: boton "Editar" en el listado (Mayoreo); el editor de variantes usa casillas fijas XS–XL por cantidad (no texto) y la foto enlazada se numera por la galeria (igual que `producto.html`). El stock total del producto = suma de tallas de variantes.
- **Analitica del sitio**: vista `analytics` en `admin.html`, solo lectura, consulta `analytics_page_visits` por `site_key` y muestra totales, visitas por pagina y barras de 7/30 dias. Ver [[modelo-datos-supabase]] y [[orden-dashboards]].

## pos.html — Punto de venta

- Gating triple: rol en `['vendedor','admin','superuser','bodega']` + `can_login_pos !== false` + `active !== false`.
- Vistas: venta (carrito POS), historial de ventas del dia, cierre de caja.
- El vendedor selecciona su bodega activa (`setActiveBodega`); los precios se ajustan por bodega.
- Ordenes creadas con `origin: 'pos'`.

## login.html

- Formulario de email + contrasena.
- Llama `loginSupabase(email, password)` de `js/auth.js`.
- Tras login exitoso, redirige segun rol: admin/superuser → `admin.html`, vendedor/bodega → `pos.html`, otros → `Laurean.html`.

## vendedoras.html

- Landing estatica de reclutamiento.
- Formulario que llama `createVendorApplication(data)` → localStorage `laurean_vendor_apps`.
- Las solicitudes pendientes aparecen en la vista "Solicitudes" del admin.

## Relaciones entre paginas

```
index.html
  └─ redirect → Laurean.html

login.html
  ├─ admin/superuser → admin.html
  ├─ vendedor/bodega → pos.html
  └─ otros           → Laurean.html

vendedoras.html → (solicitud guardada) → admin.html vista Solicitudes
Laurean.html    → (checkout)           → orders (localStorage + Supabase)
pos.html        → (venta)              → orders con origin='pos'

Laurean.html (vitrina) ─┐
catalogo.html ──────────┤
coleccion.html?cat= ────┴─ tarjeta → producto.html?id=
Laurean.html (Colecciones) → coleccion.html?cat=<id>
producto.html → "Comprar" → localStorage handoff → Laurean.html (mergePendingCart)
catalogo/producto → "Ver precio vendedor" (sin sesion) → vendedoras.html

admin.html (Mayoreo) → "Publicar al catalogo" (precio publico validado) → products → catalogo.html
```
