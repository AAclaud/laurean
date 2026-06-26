# Plan — Laurean Shop: SEO / GEO / CRO / Performance / Analítica / A11y

> Plan de ejecución para Codex. Análisis realizado sobre el código real (`Laurean.html` + `js/` +
> `supabase/`). No incluye cambios aún: es la hoja de ruta a implementar.

## Context

`Laurean Shop` es una tienda estática (HTML/CSS/JS vanilla) con backend Supabase (Auth, Postgres,
Storage, Edge Functions), deploy en Vercel. El **motor de compra y la seguridad son sólidos**
(RLS, Edge Functions QPayPro/Forza con revalidación de precio server-side y HMAC), pero la **capa
de descubrimiento es casi inexistente**:

- `<head>` sin `meta description`, `canonical`, Open Graph, Twitter Cards ni JSON-LD.
- No hay `robots.txt` ni `sitemap.xml`. El catálogo se pinta por JS (`renderProducts()`), así que
  los productos no están en el HTML que leen crawlers/IA.
- `images/` pesa **586 MB**; archivos de 10–35 MB, sin WebP. `.vercelignore` **no** excluye los
  449 MB de `images/LAUREAN_CARPETAFINAL-2/` → se publican.
- **Cero analítica** (sin GA4/Pixel/dataLayer); solo `js/visit-tracker.js`.
- Sin páginas legales públicas (`envios.html` redirige al panel admin); labels de formulario sin
  asociar; sin botón WhatsApp flotante.

**Objetivo:** que la página esté lista para vender, posicionar en Google, ser citada por IA y
convertir — **sin romper la estética editorial/premium** y sin frameworks grandes.

**Decisiones tomadas:**
- Dominio canónico: **`https://laureans.com`** (GoDaddy).
- Imágenes pesadas → **Supabase Storage** (reusar infra ya existente).
- Analítica → **GA4 + Meta Pixel** (helper único, IDs placeholder).
- Alcance → **todas las páginas públicas**.

**Restricciones:** no alterar el look editorial, no convertir en plantilla genérica, HTML/CSS/JS
limpio, separar frontend de backend, no eliminar funciones sin justificar.

---

## Infra ya existente que SE REUSA (no recrear)

- **Supabase Storage ya cableado**: `js/supabase-client.js` (l.37–53) sube al bucket público
  `product-images` con `.upload()` + `getPublicUrl()`. Los productos en vivo ya cargan `image_url`
  remoto vía `js/catalog-loader.js` (Supabase → `LAUREAN_DATA`, fallback `data/products.js`).
- **Lookbook ya soporta remoto**: `js/lookbook.js` usa `images/lookbook/*` solo como
  `DEFAULT_LOOKBOOK`; ya lee `site_settings.lookbook.slides[].image` desde Supabase. Apuntar esas
  slides a URLs de Storage hace el lookbook liviano sin tocar el repo.
- **Build hook ya existe**: `vercel.json` → `buildCommand: "node scripts/gen-config.js"`. Encadenar
  ahí nuevos pasos de build (SEO/sitemap).
- **CSP ya definida** en `vercel.json` `headers` — cualquier dominio nuevo (GA4, Pixel, Storage)
  debe agregarse a `script-src`/`connect-src`/`img-src`.
- Públicas: `Laurean.html`, `catalogo.html`, `nosotros.html`, `producto.html`, `coleccion.html`,
  `laurean-women.html`, `laurean-men.html`, `laurean-kids.html`, `lookbook.html`, `vendedoras.html`.
  **No públicas** (Disallow): `admin.html`, `pos.html`, `login.html`, `revision-cliente.html`,
  `arquitectura-laurean.html`.

---

## Fase 0 — Base de configuración

1. Dominio único: `https://laureans.com` (sin barra final) en todas las URLs absolutas.
2. En `vercel.json`, ampliar la CSP:
   - `script-src`: `+ https://www.googletagmanager.com https://connect.facebook.net`
   - `connect-src`: `+ https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.facebook.com`
   - `img-src`: ya cubre `https:` (incluye `*.supabase.co`).
3. Build encadenado: `buildCommand: "node scripts/gen-config.js && node scripts/gen-sitemap.js"`
   (y `gen-seo.js` en Fase 5).

---

## Fase 1 — SEO on-page + datos estructurados (todas las públicas)

> Los meta tags van en el HTML servido (no inyectados por JS). Insertar **después** de `<title>`
> (l.6 en `Laurean.html`) y **antes** del `preconnect`.

### 1a. Meta + OG + Twitter por página (patrón; replicar valores en cada una)

```html
<meta name="description" content="Laurean es una marca de moda guatemalteca: ropa para mujer, hombre y niños con estética premium y precios desde Q149. Compra con tarjeta, transferencia, QR o contra entrega y envío a toda Guatemala." />
<link rel="canonical" href="https://laureans.com/" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta name="theme-color" content="#191A18" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="LAUREAN" />
<meta property="og:title" content="LAUREAN — Moda para toda la familia | Guatemala" />
<meta property="og:description" content="Ropa premium para mujer, hombre y niños. Envío a toda Guatemala. Desde Q149." />
<meta property="og:url" content="https://laureans.com/" />
<meta property="og:locale" content="es_GT" />
<meta property="og:image" content="https://laureans.com/images/laurean_home_hero.jpg" />
<meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="LAUREAN — Moda para toda la familia | Guatemala" />
<meta name="twitter:description" content="Ropa premium para mujer, hombre y niños. Envío a toda Guatemala." />
<meta name="twitter:image" content="https://laureans.com/images/laurean_home_hero.jpg" />
```

| Página | `<title>` | description (resumen) |
|---|---|---|
| `Laurean.html` | LAUREAN — Moda para toda la familia \| Guatemala | marca GT, mujer/hombre/niños, desde Q149 |
| `catalogo.html` | Catálogo de ropa para toda la familia \| LAUREAN | catálogo completo, precios en Q |
| `nosotros.html` | Sobre Laurean — Moda guatemalteca desde 2019 | historia, propuesta, valores |
| `laurean-women.html` | Laurean Women — Ropa para mujer \| Guatemala | colección mujer |
| `laurean-men.html` | Laurean Men — Ropa para hombre \| Guatemala | colección hombre |
| `laurean-kids.html` | Laurean Kids — Ropa para niños \| Guatemala | colección niños |
| `lookbook.html` | Lookbook Laurean — Campaña y colecciones | editorial de marca |
| `vendedoras.html` | Vende Laurean — Programa de mayoreo sin inversión | reventa, comisiones |
| `coleccion.html` | dinámico por `?cat=` (JS) | dinámico |
| `producto.html` | dinámico `{producto} — LAUREAN` (JS, Fase 5) | dinámico |

`producto.html` hoy **no tiene `<title>`** → agregar uno base aunque luego se sobreescriba por JS.

### 1b. JSON-LD (en `<head>`)
- `Laurean.html`: **Organization** (`ClothingStore`), **WebSite**, **FAQPage**.
- `producto.html`: **Product** + **Offer** (desde el producto cargado; ver Fase 5).
- Opcional: **BreadcrumbList** en categorías/producto.

```html
<script type="application/ld+json">
{ "@context":"https://schema.org","@type":"ClothingStore","name":"Laurean",
  "url":"https://laureans.com/","logo":"https://laureans.com/images/brand/logo-navbar.svg",
  "image":"https://laureans.com/images/laurean_home_hero.jpg",
  "description":"Marca de moda guatemalteca con ropa para mujer, hombre y niños.",
  "foundingDate":"2019","areaServed":{"@type":"Country","name":"Guatemala"},
  "currenciesAccepted":"GTQ","paymentAccepted":"Tarjeta, Transferencia, QR, Contra entrega",
  "contactPoint":{"@type":"ContactPoint","telephone":"+502-3667-2415","contactType":"customer service","areaServed":"GT","availableLanguage":"Spanish"},
  "sameAs":["https://instagram.com/__","https://facebook.com/__","https://tiktok.com/@__"] }
</script>
<script type="application/ld+json">
{ "@context":"https://schema.org","@type":"WebSite","name":"Laurean","url":"https://laureans.com/","inLanguage":"es-GT" }
</script>
```
FAQPage: 5 preguntas (qué es / envíos / pagos / cómo comprar-WhatsApp / mayoreo).
`sameAs`: faltan los handles reales de Instagram/Facebook/TikTok.

### 1c. `robots.txt` y `sitemap.xml`
- `robots.txt` (raíz): `Allow: /`, `Disallow` admin/pos/login/revision-cliente/arquitectura,
  `Sitemap: https://laureans.com/sitemap.xml`.
- `sitemap.xml`: generado por `scripts/gen-sitemap.js` (encadenado en build): públicas estáticas +
  URLs de producto/categoría desde Supabase. Si Supabase no responde en build, solo estáticas.

**Archivos Fase 1:** 10 páginas públicas (`<head>`), nuevo `robots.txt`, nuevo
`scripts/gen-sitemap.js`, `vercel.json` (buildCommand).

---

## Fase 2 — Imágenes a Supabase Storage + performance

1. **Bucket de marca**: crear bucket público `site-images` (o reusar `product-images` con prefijo
   `brand/`). Subir versiones **optimizadas (WebP, < 200 KB, @1x/@2x)** de editoriales, lookbook,
   campaña y mockups que use la tienda. Reusar el patrón de `supabase-client.js`.
2. **Lookbook liviano**: setear `site_settings.lookbook.slides[].image` (y `.logo`) a URLs públicas
   de Storage. `js/lookbook.js` ya las consume; el `DEFAULT_LOOKBOOK` local queda como último fallback.
3. **Home**: reemplazar `src` locales pesados por URLs de Storage en `Laurean.html` (editorial
   l.2610, lookbook mockups l.2638/2642/2646, full-bleed l.2703). **Excepción LCP**: el **hero**
   (`laurean_hero_familia.jpg`, l.2514) se mantiene optimizado (WebP) y se **preload**ea.
4. **`.vercelignore`**: agregar
   ```
   images/LAUREAN_CARPETAFINAL-2/
   images/lookbook/
   ```
   (todo lo migrado). Mantener en repo solo `images/brand/`, hero optimizado y críticas above-the-fold.
5. **Performance**: `<link rel="preload" as="image">` para el hero; `srcset`/`sizes`; registrar
   `sw.js` (existe pero **no se registra** en `Laurean.html`) o eliminarlo; fuentes con `swap` (OK).
6. **Originales de marca**: mover `images/LAUREAN_CARPETAFINAL-2/` fuera del repo desplegable (no
   borrar sin confirmación).

**Archivos Fase 2:** `Laurean.html`, `js/lookbook.js` (si se ajusta fallback), `data/products.js`
(rutas fallback → opcional WebP), `.vercelignore`, `sw.js`, `site_settings` en Supabase (dato).

---

## Fase 3 — Confianza / CRO (frontend)

1. **Páginas legales públicas** nuevas (con estética de la tienda y `site-footer.js`): `envios.html`
   (real, hoy redirige a admin), `cambios-devoluciones.html`, `privacidad.html`, `terminos.html`,
   `contacto.html`, `faq.html`. Cada una con su `<head>` SEO (Fase 1).
2. **Footer** (`js/site-footer.js`, l.93): "Envíos" apunta a la página pública nueva; agregar
   privacidad/términos/devoluciones.
3. **WhatsApp flotante (FAB)** persistente (`wa.me/50236672415`) en públicas, con `aria-label`,
   respetando estética.
4. **Copy de conversión** (sin romper editorial): hero subtítulo (l.2519) con keyword +
   "envío de dos tallas" + cobertura GT; segundo CTA "Pedir por WhatsApp" (l.2520); subir "Envío de
   dos tallas" (hoy en `trust-bar` l.2724); cifra en banda vendedoras (l.2751); next-step en éxito
   de checkout (l.2904).
5. **Bloque "Sobre Laurean" + FAQ visibles** (texto plano indexable) cerca de `#nosotros` (l.2608)
   y sección FAQ (cliente + mayoreo) que respalde el JSON-LD FAQPage.

**Archivos Fase 3:** 6 páginas nuevas, `js/site-footer.js`, `Laurean.html`.

---

## Fase 4 — Analítica GA4 + Meta Pixel

1. **Snippets** GA4 (`G-XXXXXXXXXX`) + Meta Pixel (`PIXEL_ID`) en `<head>` de públicas, con IDs
   placeholder centralizados (en `js/config.js` o `js/analytics.js`).
2. **Helper único** `js/analytics.js`:
   ```js
   window.track = function (event, params = {}) {
     window.dataLayer = window.dataLayer || [];
     window.dataLayer.push({ event, ...params });
     if (window.gtag) gtag('event', event, params);
     if (window.fbq) { const m={view_item:'ViewContent',add_to_cart:'AddToCart',begin_checkout:'InitiateCheckout',purchase:'Purchase'}; if(m[event]) fbq('track', m[event], params); }
   };
   ```
3. **Eventos** en los puntos identificados: `view_item`, `add_to_cart`/`remove_from_cart`
   (`js/store-actions.js`), `open_cart` (`openCart`, l.2492), `begin_checkout`,
   `select_payment_method` (radios l.2871), `purchase` (`confirmOrder`→`co-success` l.2902),
   `payment_cancelled`, `whatsapp_click` (FAB+footer), `mayoreo_click` (l.2754), `seller_signup`,
   `referral_used` (`cart-referral` l.2401), `share_product` (`shareCurrentPage` l.3113),
   `favorite_add` (`fav-badge` l.2490).

**Archivos Fase 4:** nuevo `js/analytics.js`, `<head>` públicas, `js/store-actions.js`,
`Laurean.html`, `js/site-footer.js`.

---

## Fase 5 — Accesibilidad + indexabilidad profunda

1. **Accesibilidad**: asociar `<label for>`↔`id` en checkout (l.2829–2856); `required` +
   `aria-invalid` + errores accesibles; skip-link "Saltar al contenido" antes del `<nav>`;
   `:focus-visible` (revisar que `cursor.js` no lo oculte); focus-trap + `Esc` en drawers
   (`cart-drawer`, `mobile-menu`) y modales (`checkout-overlay`, `qpp-overlay`); contraste de
   `--warm-mid` (objetivo WCAG AA).
2. **Indexabilidad profunda** (catálogo solo-JS): `scripts/gen-seo.js` (Node, encadenado en build)
   lee Supabase y **prerenderiza** title/description/canonical/OG + JSON-LD `Product`/`ItemList`
   en `producto.html`/`coleccion.html` (patrón de `scripts/gen-config.js`, sin frameworks).
   Fallback inmediato: inyectar esos meta+JSON-LD por JS al cargar el producto.

**Archivos Fase 5:** `Laurean.html`, checkout, `js/cursor.js`, nuevo `scripts/gen-seo.js`,
`producto.html`/`coleccion.html`, `vercel.json`.

---

## Backend (separado — solo cuando se active)

- **QPayPro**: validar `x_api_secret` server-side antes de marcar pagado (ya contemplado en
  `supabase/functions/qpaypro-proxy/index.ts`). `*.qpaypro.com` ya está en CSP.
- **Confirmación de pedido**: campo email opcional en checkout (l.2829+) + Edge Function de correo.

---

## Verificación

1. **SEO/meta**: `view-source` de cada página con description/canonical/OG/Twitter; `/robots.txt` y
   `/sitemap.xml` tras deploy.
2. **Datos estructurados**: validator.schema.org + Rich Results Test (Organization, WebSite,
   FAQPage, Product) sin errores.
3. **Imágenes/perf**: `du -sh` del deploy debe caer de ~586 MB a pocos MB; `LAUREAN_CARPETAFINAL-2/`
   y `lookbook/` no publicadas; lookbook cargando desde `*.supabase.co`. Lighthouse móvil LCP < 2.5 s.
4. **Analítica**: DevTools muestra `dataLayer.push` y requests a `google-analytics.com` /
   `facebook.com/tr` en add_to_cart, begin_checkout, purchase, whatsapp_click; GA4 DebugView +
   Meta Pixel Helper.
5. **CRO/legales**: footer enlaza a páginas legales reales (no admin); FAB WhatsApp abre chat con
   `50236672415`.
6. **A11y**: teclado (Tab/Esc), foco visible, labels en lector de pantalla; axe DevTools sin
   críticos.
7. **No regresión**: carrito, favoritos, checkout (transfer/COD/QR), referidos y vendedoras OK;
   build de Vercel pasa.

## Orden sugerido
Fase 1 → 2 → 4 → 3 → 5 (backend al final). Cada fase = un PR/commit verificable.

## Pendientes que requieren input
- Handles reales de Instagram/Facebook/TikTok (`sameAs` y footer).
- IDs reales de GA4 (`G-…`) y Meta Pixel (mientras tanto, placeholders).
- OK para mover/archivar `images/LAUREAN_CARPETAFINAL-2/` fuera del repo.
