---
title: QPayPro — integracion de pagos (PLANIFICADA)
tags: [laurean, qpaypro, pagos, edge-function, planificado]
project: laurean
---

# QPayPro — Gateway de pagos

Estado: **IMPLEMENTADO (modo Hosted Page / redirección)** — pendiente de cargar
secrets en Supabase, desplegar la función y **probar en sandbox** antes de producción.

Doc oficial: https://developers.qpaypro.com/ (colección Postman "QPayPro API").
Ver tambien: [[modelo-datos-supabase]] | [[deploy-dominio]]

## Modo elegido: Hosted Page (redirección)
El cliente paga en la página de QPayPro; **nunca** escribimos datos de tarjeta en
nuestro sitio (riesgo PCI mínimo, SAQ A). Se descartó el modo de campos en el sitio
(API directa) por responsabilidad PCI y por romperse el 3DS en iframe.

### Flujo real
1. Frontend (`Laurean.html`, pago con tarjeta) → `qpaypro-proxy` action `create`
   enviando el **payload del carrito** (`order: { customer_*, items, shipping_gtq, ... }`),
   **no** un `order_id`.
2. La función **crea la orden del lado servidor** (service_role, omite RLS, sin race
   condition) **revalidando cada precio contra la tabla `products`** (ignora el
   `price_gtq` y `discount_gtq` que manda el navegador; `qty` clamp ≥1;
   id inexistente/inactivo → `invalid_item`). Los descuentos con tarjeta quedan
   bloqueados en frontend hasta que existan cupones/PIN validados del lado servidor.
   Luego registra `payments` (`iniciado`) y
   hace `POST {HOSTED}/register_transaction_store` con `x_amount = total recalculado` +
   `x_login` + `x_api_key` → responde `{ estado:'success', data:{ token } }`.
   Devuelve `{ configured, redirect_url, payment_id, order_id, order_number }`.
   Compat: si llega un `order_id` existente, lo usa sin recalcular.
3. La función devuelve `redirect_url = {HOSTED}/store?token=<token>`; el frontend
   redirige el navegador ahí.
4. Tras pagar, QPayPro regresa por GET a `x_relay_url` (la misma función,
   `?relay=1&pid=<payment_id>`). La función **confirma server-side** con
   `POST {API}/get_transaction_detail` (x_login + x_private_key + x_api_secret +
   idTrans), actualiza `payments` y `orders.payment_status`, y hace 302 a
   `Laurean.html?pago=ok|cancel|rechazado&order=<ref>`.
5. `handlePaymentReturn()` en `Laurean.html` muestra el panel de resultado.

### Endpoints
| Uso | Sandbox | Producción |
|-----|---------|------------|
| Registrar token (hosted) | `https://sandboxpayments.qpaypro.com/checkout/register_transaction_store` | `https://payments.qpaypro.com/checkout/register_transaction_store` |
| Página de pago | `https://sandboxpayments.qpaypro.com/checkout/store?token=` | `https://payments.qpaypro.com/checkout/store?token=` |
| Confirmar (detalle) | `https://api-sandboxpayments.qpaypro.com/checkout/get_transaction_detail` | `https://api-payments.qpaypro.com/checkout/get_transaction_detail` |

### Parámetros clave del registro (register_transaction_store)
`x_login`, `x_api_key`, `x_amount` (total global), `x_currency_code`, `x_first_name`,
`x_last_name`, `x_phone`, `x_email`, `x_description`, `x_reference` (No. orden),
`x_company` ('C/F'), `x_address/x_city/x_country/x_state/x_zip`, `x_freight`, `taxes`,
`x_type` ('AUTH_ONLY'), `x_method` ('CC'), `x_invoice_num`, `custom_fields` (JSON con
`order_id`/`payment_id`), `x_visacuotas` ('no'), `products` (JSON `[[desc,sku,url,qty,price,total]]`),
`http_origin`, `origen` ('PLUGIN'), `store_type` ('hostedpage'), `x_discount`,
`x_url_success/x_url_cancel/x_url_error`, `x_relay_url`.
Respuesta OK: `{estado:'success', data:{token}}`. Error: `{status:'error', message:[...]}`.

### Confirmación (get_transaction_detail)
Body `{x_login, x_private_key, x_api_secret, idTrans, x_audit_number, x_fp_sequence}`.
Respuesta: `{result:1, response:[{status:'Aprobada|Denegada|...', amount, auditNumber, ...}]}`.
Aprobado si `result===1` y `status` ~ aprob/acredit/autoriz/éxito.

### Notas de implementación (validado en sandbox, creds públicas)
- Probado contra `https://sandboxpayments.qpaypro.com/checkout/register_transaction_store`
  con `x_login=visanetgt_qpay` / `x_api_key=88888888888` → `{estado:'success',data:{token}}`
  (HTTP 200); `…/checkout/store?token=` carga (HTML 200).
- **Campos requeridos** del registro (de la respuesta de error 400): `x_login, x_api_key,
  x_amount, x_currency_code, x_first_name, x_last_name, x_description, x_url_cancel,
  http_origin, x_company, x_address, x_city, x_state, x_zip, products, taxes, origen`.
- `get_transaction_detail` vive en `…/checkout/get_transaction_detail` (**sin** `/api_v1`;
  ese segmento es solo del modo "procesar pago" directo, que **no** usamos).
- El `qpBody` **ya no** envía `x_reference` (redundante con `x_invoice_num`) ni
  `x_fp_sequence` (pertenece solo a `get_transaction_detail`).
- **Limitación de descuentos:** no hay tabla de códigos/referidos en Supabase (viven en
  localStorage); en el cobro el `discount_gtq` se acepta con clamp `[0, subtotal]`.
  Seguimiento: mover descuentos a Supabase para revalidarlos server-side.
- **Cuenta inactiva:** activar/renovar el comercio es trámite comercial de QPayPro (no del
  panel); las creds propias de Laurean solo funcionan con el comercio activo.

### Mapeo de credenciales (CONFIRMAR en sandbox)
Panel QPayPro (Integraciones → API Keys) entrega 4 valores: **Llave Pública,
Llave Privada, API Secret, Merchant ID**. Mapeo probable:
- `x_login` ← **Merchant ID** (identificador del comercio).
- `x_api_key` ← **Llave Privada** (la doc lo llama "llave privada del comercio").
- `x_private_key` ← **Llave Privada**, `x_api_secret` ← **API Secret** (para confirmar).
Si el registro responde *"x_login / x_api_key inactive or does not exists"*, alternar
`x_login` entre Merchant ID y Llave Pública. Sandbox de prueba: `x_login=visanetgt_qpay`,
`x_api_key=88888888888`.

### Secrets de la Edge Function (Supabase → Functions → Secrets)
`QPAYPRO_LOGIN`, `QPAYPRO_API_KEY`, `QPAYPRO_PRIVATE_KEY`, `QPAYPRO_API_SECRET`,
`QPAYPRO_ENV` (`sandbox`|`live`), `FRONTEND_ORIGIN` (URL del sitio). En
producción `FRONTEND_ORIGIN` es obligatorio para aceptar POSTs de creación de pago.

### Despliegue (IMPORTANTE)
El relay es un **GET público** desde QPayPro → desplegar sin verificación de JWT:
`supabase functions deploy qpaypro-proxy --no-verify-jwt`.

### Runbook de activación
1. En el panel: Configuración → Plantillas de Pago → crear plantilla con marca Laurean;
   Integraciones → Hosted Page → asignar esa plantilla (cuotas en "No").
2. Cargar los 6 secrets en Supabase (empezar con `QPAYPRO_ENV=sandbox`).
3. `supabase functions deploy qpaypro-proxy --no-verify-jwt`.
4. Aplicar `supabase/schema.sql` (agrega `payments.checkout_token`).
5. Probar una compra con tarjeta de prueba en sandbox → verificar `payments`
   pasa a `aprobado` y `orders.payment_status='pagado'`.
6. Cambiar `QPAYPRO_ENV=live` y repetir con monto bajo real.

Referencia (modo directo, NO usado): https://github.com/opportuno-tech/pretix-qpaypro

---

## API

### Autenticacion

QPayPro usa tres campos de autenticacion en cada request:

| Campo | Descripcion |
|-------|-------------|
| `x_login` | Identificador de la cuenta comercio |
| `x_private_key` | Clave privada del comercio |
| `x_api_secret` | Secreto de API |

Estos tres valores son **secrets** y nunca deben ir al frontend. Deben vivir
como secrets de la Edge Function `qpaypro-proxy`.

### Endpoints

| Entorno | URL |
|---------|-----|
| Sandbox | `https://sandbox.qpaypro.com/payment/api_v1` |
| Produccion | `https://payments.qpaypro.com/checkout/api_v1` |

### Interpretacion de respuesta

```
Pago exitoso: result === 1 && responseCode === 100
```

Cualquier otra combinacion es rechazo o error. Documentar los `responseCode`
especificos cuando QPayPro entregue credenciales y documentacion completa.

### Device Fingerprint

QPayPro requiere fingerprint del dispositivo para prevencion de fraude.
Script de carga: `https://h.online-metrix.net` (origen que hay que permitir en CSP).

---

## Plan de implementacion

### 1. Edge Function qpaypro-proxy

Replicar el patron de [[forza-integration]]:

```
supabase/functions/qpaypro-proxy/index.ts
```

Debe:
- Gate con `verifyAdmin` (o version que permita auth de cliente segun flujo que confirme QPayPro).
- Recibir `{ action, params }` desde el frontend.
- Agregar `x_login`, `x_private_key`, `x_api_secret` desde `Deno.env`.
- Llamar al endpoint de QPayPro (sandbox en dev, prod en produccion).
- Devolver respuesta normalizada `{ ok, result, responseCode, ... }`.

Secrets requeridos:

| Variable | Descripcion |
|----------|-------------|
| `QPAYPRO_LOGIN` | x_login |
| `QPAYPRO_PRIVATE_KEY` | x_private_key |
| `QPAYPRO_API_SECRET` | x_api_secret |
| `QPAYPRO_ENV` | 'sandbox' o 'production' |

### 2. Tabla payments

```sql
create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id),
  provider      text default 'qpaypro',
  amount_gtq    numeric not null,
  result        int,
  response_code int,
  transaction_id text,
  raw_response  jsonb,
  status        text default 'pending',  -- pending, approved, rejected, error
  created_at    timestamptz default now()
);
```

### 3. Modal "ventanita" en Laurean.html

Dos opciones (decidir cuando QPayPro confirme):
- **Hosted iframe**: QPayPro provee una URL de pago; se embebe en un `<iframe>` modal.
- **Field SDK**: QPayPro provee JS para campos de tarjeta en el propio sitio (requiere mas CSP).

### 4. Panel de pagos en admin.html

Nueva vista "Pagos" en [[orden-dashboards]] que muestre:
- Lista de pagos con estado, monto, transaccion y pedido vinculado.
- Filtros por estado y fecha.
- Detalle del `raw_response` para soporte.

### 5. CSP additions

Cuando QPayPro se active, agregar a `vercel.json` → `Content-Security-Policy`:

```
https://*.qpaypro.com https://h.online-metrix.net
```

En los bloques `script-src`, `frame-src`, `connect-src` segun corresponda.

---

## Checklist de activacion

- [ ] Recibir credenciales de QPayPro (x_login, x_private_key, x_api_secret).
- [ ] Confirmar modalidad de integracion (hosted iframe vs field SDK).
- [ ] Crear Edge Function `qpaypro-proxy` siguiendo el patron de [[forza-integration]].
- [ ] Crear tabla `payments` en `supabase/schema.sql` y migrar.
- [ ] Implementar modal en `Laurean.html`.
- [ ] Agregar vista "Pagos" en `admin.html`.
- [ ] Actualizar CSP en `vercel.json`.
- [ ] Probar en sandbox → aprobar → cambiar env a production.
- [ ] Actualizar [[modelo-datos-supabase]] con la tabla `payments`.
- [ ] Actualizar [[orden-dashboards]] con la vista "Pagos".
