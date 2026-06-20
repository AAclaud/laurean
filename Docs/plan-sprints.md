# Laurean Shop — Plan de Sprints

> Plan de ejecución consolidado tras auditoría de seguridad + arquitectura + funcionalidad.
> Fecha: 2026-05-26. Versión 1.

---

## Resumen del estado actual

- **Marca aplicada** ✅ (Fase anterior): paleta vino, logos sin fondo, USD apagado, uploader de imágenes.
- **Supabase conectado** ✅: schema + seed corridos, perfil superuser creado, cliente JS funcional.
- **Forza integrado parcialmente** ⚠️: cliente JS y edge functions escritas, pero NO deployadas; pantalla `envios.html` cubre solo 5/13 endpoints; se siente como app aparte del admin.
- **Login dual** ⚠️: soporta Supabase Auth pero mantiene fallback a localStorage (bypass de seguridad).

---

## SPRINT A — Seguridad mínima (1–2 horas)

Sin estos fixes la app no debe ir a producción.

### A1. Eliminar XSS en tablas dinámicas
- Crear helper `escapeHtml(str)` en `js/auth.js` o `js/utils.js`.
- Reemplazar en:
  - `envios.html:564-575` (tabla "Mis guías" — customer_name, order_number, status)
  - `admin.html:1989, 1997` (tabla pedidos — customerName, referral_code)
  - `pos.html:1252` (tabla historial — customerName)
- Patrón nuevo: usar `textContent` en celdas, o template tag `safeHTML\`<td>${name}</td>\``.

### A2. Eliminar credenciales seed con `btoa()`
- Borrar `SEED_USERS` y `SEED_VENDEDORAS` de `js/auth.js:33-58` (los que tienen `btoa('SuperAA2026!')`).
- Mantener `ensureSeedUsers()` pero que no inserte nada (la fuente es Supabase Auth ahora).
- Si algún flujo viejo dependía de ese seed, hacer fallback que muestre mensaje "Crea usuarios desde Supabase Auth".

### A3. Quitar fallback de login a localStorage
- En `login.html:handleLogin()` eliminar la rama `if (!result || ...) result = login(email, password)`.
- Si Supabase está caído: mostrar mensaje claro "Sistema temporalmente fuera de servicio" en vez de bypass.
- Mantener `login()` legacy disponible solo para tests internos.

### A4. Apretar RLS de `orders`
- En `supabase/schema.sql:241` cambiar:
  ```sql
  create policy "auth_insert" on public.orders for insert with check (
    auth.uid() is not null
    and public.current_role() in ('admin','superuser','bodega','vendedor')
  );
  ```
- Si la tienda pública debe crear pedidos sin login (compra anónima), separar en endpoint vía edge function que valide reCAPTCHA o rate-limit.

**Done cuando**: tests manuales: nombre con `<script>alert(1)</script>` en producto/cliente no ejecuta nada; login sin Supabase muestra error y no entra; usuario vendedor no puede crear pedidos con role bodega vía POST.

---

## SPRINT B — Conectar flujo real + Forza integrado al admin (4–5 horas)

Lo que hace al producto realmente usable end-to-end.

### B1. Mover `envios.html` a vista dentro de `admin.html`
**Problema**: Hoy `envios.html` es página separada con sidebar propio. Al entrar se siente "salir" del admin y rompe el contexto (pedidos están en admin, envíos en otra pantalla). Hacer match operativo entre un pedido y su guía Forza es complicado.

**Solución**: Convertir `envios.html` en una **vista del admin**:
- Agregar al sidebar de `admin.html` → sección "Operaciones" → botón "Envíos · Forza" con `onclick="showView('envios')"`.
- Mover el contenido completo de `envios.html` como un nuevo `<div id="view-envios" class="view">…</div>` dentro de admin.html.
- Migrar CSS de `.tab`, `.panel`, `.card`, `.field`, etc. al `<style>` global del admin.
- Migrar JS de bootstrapping, tabs, Forza calls al script principal de admin (anidado bajo `views.envios = { init, ... }`).
- **Mantener** `envios.html` como redirect → `admin.html#envios` por compatibilidad con bookmarks.

**Beneficio**: el admin ve "Pedidos" y "Envíos" en el mismo sidebar, mismo logueo, mismo contexto.

### B2. Botón "Crear guía Forza" desde la fila de pedido
- En la tabla de pedidos del admin (`admin.html:1985-2005`): agregar columna o acción "Crear guía".
- Al hacer click → cambia a vista Envíos, tab "Crear guía", pre-llena el form con datos del pedido (nombre, teléfono, dirección, monto si COD).
- Al guardar → hace `UPDATE orders SET forza_guide_serie, forza_guide_number, forza_label_url` para enlazar.

### B3. Completar tab "Mis guías" con acciones reales
- Cada fila tendrá botones: **Rastrear** (ya), **Reimprimir PDF** (`Forza.reprintGuide`), **Cancelar** (`Forza.cancelGuide` con confirm).
- Indicador visual del estado: badge color (verde entregado, ámbar en ruta, rojo cancelado).
- Filtros: estado, rango de fechas, búsqueda por nombre/guía.

### B4. Tab nuevo "Express Centers" (puntos físicos)
- Llama `Forza.listExpressCenters()` → muestra tabla/mapa de puntos donde el cliente puede dejar el paquete (drop-off).
- Útil para venta presencial o para que el cliente recoja en punto.

### B5. Tab "Recolecciones" completo
- Sub-sección "Mis direcciones": tabla de direcciones registradas (`Forza.listAddresses`), form para agregar nueva (`Forza.createAddress`).
- Sub-sección "Solicitar recolección": form completo con dirección + fecha + cantidad → `Forza.createPickup`.
- Listar recolecciones agendadas con estado.

### B6. Tab "Configuración" (opcional, para COD)
- Mostrar bancos disponibles (`Forza.listBanks`) para que el admin elija el banco de depósito COD.
- Toggle "Auto-generar guía Forza al confirmar pedido".
- Selector de bodega de salida default.

### B7. Checkout → INSERT en `orders` de Supabase
- En `Laurean.html:openCheckout` y `createOrder()` del `js/auth.js`:
  - Si `window.LAUREAN_DB` existe: hacer `INSERT INTO orders` con todos los campos del checkout.
  - Mantener escritura a localStorage como caché si se quiere offline-first.
  - Devolver `order_id` real de Supabase para el confirmation screen.

### B8. Tienda lee catálogo de Supabase
- En `Laurean.html` al cargar: si Supabase está disponible, hacer `select * from categories/subcategories/products where active = true` y poblar `window.LAUREAN_DATA`.
- Fallback a `data/products.js` estático si offline.
- Cache local con TTL 5 minutos.
- Esto elimina la divergencia admin/tienda mencionada en la auditoría.

### B9. Upload de imágenes al bucket Supabase real
- Verificar que el callback `productUploader` en `admin.html` está realmente llamando `LAUREAN_SB.uploadProductImage`.
- Confirmar permisos del bucket (lectura pública, escritura admin).
- Test manual: subir foto → ver en Supabase Dashboard → Storage que aparece → ver URL pública.

### B10. Deploy de Edge Functions + secrets
- Comando (desde el proyecto):
  ```bash
  supabase login
  supabase link --project-ref cmosoypdqjmxbwvlmnga
  supabase secrets set \
    FORZA_BASE_URL=https://sandbox.apicore.forzadelivery.io:40467 \
    FORZA_COD_APP=<FORZA_COD_APP> \
    FORZA_SECRET_KEY=<FORZA_SECRET_KEY> \
    FORZA_CODE_OF_REFERENCE=<FORZA_CODE_OF_REFERENCE> \
    FORZA_ID_CLIENT=<FORZA_ID_CLIENT>
  supabase functions deploy forza-proxy
  supabase functions deploy forza-webhook
  ```
- Probar smoke test: desde la consola del admin logueado, `await Forza.listDepartments()` debe devolver array con 22 departamentos.

**Done cuando**: un pedido en Laurean.html llega a la tabla `orders` de Supabase; el admin lo ve en su lista; hace click en "Crear guía", se genera con Forza Sandbox, queda guía + PDF link; tracking funciona; cancelación funciona.

---

## SPRINT C — Calidad y operación (3–4 horas)

### C1. UI para gestionar admins/usuarios
- Vista admin "Usuarios" hoy lee `users` de localStorage. Refactorizar para leer/escribir tabla `profiles` de Supabase.
- Form de crear usuario: email + password + role + bodega_ids → llama a edge function `create-user` (nueva) que hace `auth.admin.createUser()` con service_role internamente.
- Edit, deactivate, reset password.

### C2. Extraer `css/brand.css` común
- Crear archivo con: `:root` paleta, tipografías, navbar editorial, reset, botones, badges.
- Linkar en las 6 HTML.
- Eliminar el `<style>` duplicado equivalente de cada HTML (~600 líneas en total).

### C3. JWT expiry + refresh automático
- En `js/auth.js:getSession()` agregar check de `expiresAt` y limpieza si expiró.
- Suscribirse a `supabase.auth.onAuthStateChange()` para detectar refresh/logout y actualizar localStorage.

### C4. README + deploy docs
- README con: setup Supabase, correr schema/seed, crear admin, copiar config.js, deploy edge functions, host estático recomendado.
- `Docs/deploy.md` con pasos de hosting (Cloudflare Pages / Netlify) + DNS.

### C5. Lazy loading + caché HTTP
- Agregar `loading="lazy"` y `decoding="async"` a `<img>` no-hero.
- Service Worker simple que cachee `/images/*`, fuentes y CSS por 7 días.

### C6. Logout sincrónico
- Hacer `logout()` async, await `supabase.auth.signOut()`, manejar errores sin silenciar.
- Limpiar todo el localStorage prefijado con `laurean_`.

**Done cuando**: nuevo admin se crea sin SQL; CSS de marca cambia en un solo archivo afecta todas las páginas; recarga de admin tras 60 min lleva al login (no a pantalla rota); deploy a Cloudflare Pages funciona.

---

## Orden de ejecución sugerido

```
Sprint A (Seguridad)
  ↓
Sprint B paso B1 (mover envios al admin)  ← bloqueante para B2 y B3
  ↓
Sprint B paso B7-B8 (checkout y catálogo en Supabase)
  ↓
Sprint B paso B10 (deploy edge functions)
  ↓
Sprint B paso B2-B6 (tabs Forza completos)
  ↓
Sprint C (puede ser iterativo)
```

## Estimaciones

| Sprint | Duración | Riesgo |
|---|---|---|
| A | 1–2 h | Bajo — fixes puntuales |
| B | 4–5 h | Medio — toca varios archivos; B1 es el más invasivo |
| C | 3–4 h | Bajo — refactor + docs |
| **TOTAL** | **8–11 h** | — |

## Métricas de éxito post-sprint

- [ ] Penetration test básico (XSS, SQL injection) no encuentra vulnerabilidades
- [ ] Un pedido completo (cliente compra → admin ve → genera guía → cliente rastrea) tarda < 30 segundos end-to-end
- [ ] Tiempo de carga inicial de la tienda < 2 segundos en 4G
- [ ] Admin puede operar 100% desde el dashboard sin tocar SQL ni terminal
- [ ] Catálogo agregado en navegador A aparece en navegador B sin refresh manual
