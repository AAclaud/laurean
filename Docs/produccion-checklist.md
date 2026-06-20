# Laurean Shop — Checklist Pre-Producción

> Lista de items que **deben atenderse antes de pasar de sandbox a operación real**.
> Actualizada: 2026-05-27.

---

## 🔐 Credenciales Forza Delivery

### Estado actual (Sandbox)
- `FORZA_BASE_URL=https://sandbox.apicore.forzadelivery.io:40467`
- `FORZA_COD_APP=<FORZA_COD_APP>`
- `FORZA_SECRET_KEY=<FORZA_SECRET_KEY>`
- `FORZA_CODE_OF_REFERENCE=<FORZA_CODE_OF_REFERENCE>`
- `FORZA_ID_CLIENT=<FORZA_ID_CLIENT>`

### Antes de prod
- [ ] Solicitar a Forza **credenciales productivas** (asesor comercial)
- [ ] Confirmar **URL productiva** del API (cambia el host)
- [ ] Actualizar los 5 secrets en Supabase:
      ```bash
      supabase secrets set \
        FORZA_BASE_URL=<URL_PROD> \
        FORZA_COD_APP=<CODAPP_PROD> \
        FORZA_SECRET_KEY=<SECRET_PROD> \
        FORZA_CODE_OF_REFERENCE=<CODE_PROD> \
        FORZA_ID_CLIENT=<ID_PROD>
      ```
- [ ] Re-deploy de las edge functions (`supabase functions deploy forza-proxy && supabase functions deploy forza-webhook`)
- [ ] Probar 1 envío real con la guía nueva antes de operar

---

## 💰 Configuración COD (Cash on Delivery)

### ⚠️ Importante
En **sandbox** los campos del COD aceptan placeholders (`"NO DISPONIBLE"`, `BankId="-1"`, etc.) y Forza los procesa sin validar contra cuenta real.

En **producción** Forza valida estos campos contra la cuenta bancaria registrada por el cliente. Si están mal:
- La guía se rechaza con 412/500
- O peor: la guía se crea pero el dinero del COD no se liquida correctamente

### Campos requeridos en producción (`COD` object)
- `BankAccountName` — nombre real de la cuenta bancaria del cliente Laurean
- `BankId` — código del banco (de `Forza.listBanks()`)
- `BankAccountType` — `MONETARIA` o `AHORRO`
- `BankAccountId` — número de cuenta
- `Identification` — DPI / NIT del titular de la cuenta

### Acción pendiente
- [ ] **Pedir a Forza la lista de bancos disponibles** (`Forza.listBanks()` en el tab Configuración del admin)
- [ ] **Crear UI en tab Configuración** del admin para guardar:
      `BankAccountName`, `BankId`, `BankAccountType`, `BankAccountId`, `Identification`
      → guardar en tabla nueva `forza_cod_config` (Supabase) con UPSERT
- [ ] **Modificar `envCreate` en `admin.html`** para leer esos valores desde Supabase
      en vez de hardcodearlos `"NO DISPONIBLE"` cuando el flag COD esté ON
- [ ] Probar 1 COD real con monto pequeño (Q10–20) para confirmar liquidación
- [ ] Documentar el ciclo de liquidación de Forza (semanal/quincenal) con el cliente

---

## 📦 Dirección de origen (from_address)

### Estado actual
El frontend toma la **primera bodega activa** de la tabla `bodegas` de Supabase.
Si no hay bodega, usa hardcoded "Laurean Shop / Zona 10".

### Antes de prod
- [ ] Crear bodegas reales en el panel admin (Operaciones → Bodegas) con:
      - `name`, `address`, `city`, `township_code` (HeaderCodeTownship correcto)
      - `phone`, `email`
- [ ] Verificar que el `HeaderCodeTownship` de la bodega coincida con los códigos de Forza
- [ ] (Opcional) Permitir elegir bodega de origen en el form de Crear guía cuando hay >1

---

## 🪪 Seguridad

### Tokens y secrets
- [ ] **Revocar el Personal Access Token** `Deploy-Forza-Functions` (sbp_135ad8...)
      en https://supabase.com/dashboard/account/tokens
      *(estuvo expuesto en el chat durante el setup; rotar)*
- [ ] **Rotar la anon publishable key** si quedó expuesta en repos públicos
- [ ] Verificar que `js/config.js` NO se haya commiteado al repo (debe estar en `.gitignore` ✓)
- [ ] Confirmar que las edge functions NO tengan logs que expongan SecretKey

### Auth y RLS
- [x] Login solo via Supabase Auth (sin fallback localStorage) — Sprint A ✓
- [x] Policy de `orders` aprieta por rol — Sprint A ✓
- [x] SEED_USERS con `btoa()` eliminado — Sprint A ✓
- [x] XSS escapado en tablas dinámicas — Sprint A ✓
- [ ] **Sprint C pendiente**: JWT expiry check + refresh automático
- [ ] **Sprint C pendiente**: UI para crear/desactivar admins (sin SQL)

---

## 🌐 Hosting y dominio

- [ ] Decidir hosting estático (Cloudflare Pages recomendado, gratis)
- [ ] Comprar dominio `.com` o `.com.gt`
- [ ] Configurar DNS apuntando al hosting
- [ ] Activar SSL (automático en CF/Netlify/Vercel)
- [ ] Actualizar **URL del webhook Forza** después del deploy:
      `https://<tu-dominio>/functions/v1/forza-webhook` o
      `https://cmosoypdqjmxbwvlmnga.supabase.co/functions/v1/forza-webhook`
- [ ] Registrar la URL del webhook con el asesor de Forza para que active notificaciones

---

## 📊 Datos iniciales en Supabase

- [ ] Subir productos reales al catálogo (admin → Catálogo → + Producto)
- [ ] Subir imágenes reales al bucket `product-images`
- [ ] Verificar que las imágenes de placeholder (las de la demo) ya no aparecen en la tienda
- [ ] Crear cuentas para vendedores reales (admin → Usuarios) cuando UI esté lista (Sprint C)
- [ ] Configurar descuentos / promociones iniciales si aplica

---

## ✅ Sprints completados

- **Sprint A** (Seguridad mínima) — XSS, seed users, login Supabase, RLS orders
- **Sprint B** (Forza + checkout + catálogo Supabase) — todos los endpoints integrados, vista envíos dentro del admin, dual-write a `orders`

## 🟡 Sprint C pendiente (calidad + ops)

- [ ] UI gestión usuarios/admins desde panel (sin SQL)
- [ ] `css/brand.css` extraído como único archivo de marca
- [ ] JWT expiry check + refresh automático
- [ ] README actualizado con setup completo
- [ ] `Docs/deploy.md` con pasos hosting + DNS
- [ ] Lazy loading de imágenes + Service Worker
- [ ] Logout sincrónico con manejo de errores

---

## 🧪 Smoke test pre-prod (correr todo en orden)

1. [ ] Login con cuenta real funciona
2. [ ] Tienda muestra productos reales (no demo)
3. [ ] Cliente puede agregar al carrito y hacer checkout
4. [ ] Pedido aparece en admin → Pedidos
5. [ ] Click "+ Guía Forza" → tab Envíos pre-rellenado correctamente
6. [ ] Cotizar tarifa devuelve precios reales
7. [ ] Crear guía Estándar → PDF descargable
8. [ ] Crear guía COD con monto real → PDF + monto correcto
9. [ ] Tracking de una guía devuelve eventos
10. [ ] Cancelar guía no-recolectada funciona
11. [ ] Webhook recibe evento de cambio de estado (probar con Forza)
12. [ ] Subir imagen de producto se guarda en bucket Supabase
