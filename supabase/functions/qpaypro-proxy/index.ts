// ============================================================
// LAUREAN — Edge Function: qpaypro-proxy
//
// Pasarela de pago QPayPro en modo "Hosted Page" (página de pago
// alojada / redirección). El cliente NUNCA escribe la tarjeta en
// nuestro sitio: se registra la transacción, QPayPro devuelve un
// `token`, y redirigimos al cliente a su página de pago. Al terminar,
// QPayPro regresa por GET a `x_relay_url` (esta misma función), donde
// CONFIRMAMOS el pago del lado servidor con `get_transaction_detail`
// (no se confía en los parámetros del navegador) y actualizamos la BD.
//
// ACTIVACIÓN DIFERIDA: mientras no existan los secrets de QPayPro,
// `create` responde { configured:false } (200) para que el checkout
// muestre el fallback ("coordinamos el pago aparte") sin romperse.
//
// Acciones (POST { action, ... }):
//   - "create": crea la orden del lado servidor a partir del carrito
//       (`order: { customer_*, items, shipping_gtq, discount_gtq, ... }`),
//       REVALIDANDO cada precio contra la tabla `products` (nunca se confía en
//       el precio del navegador), registra el intento en `payments`, pide el
//       token a QPayPro y devuelve { configured, redirect_url, payment_id,
//       order_id, order_number }. Compat: si llega `order_id` existente, lo usa.
//
// Relay (GET ?relay=1&...): QPayPro redirige aquí tras el pago.
//   Confirma con get_transaction_detail, actualiza payments+orders y
//   hace 302 a la página de gracias del sitio.
//
// Contrato oficial (Postman "QPayPro API"): register_transaction_store
// → { estado:'success', data:{ token } }; página: /checkout/store?token=
//
// ENV vars (Supabase → Functions → Secrets):
//   QPAYPRO_LOGIN        → x_login (identificador del comercio)
//   QPAYPRO_API_KEY      → x_api_key (registro hosted; "Llave privada")
//   QPAYPRO_PRIVATE_KEY  → x_private_key (confirmación de pago)
//   QPAYPRO_API_SECRET   → x_api_secret (confirmación de pago)
//   QPAYPRO_ENV          → 'sandbox' (default) | 'live'
//   FRONTEND_ORIGIN      → https://tu-dominio (para las URLs de retorno)
//   (+ SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya disponibles)
//
// NOTA DE DESPLIEGUE: el relay es un GET público desde QPayPro, así que
// esta función debe desplegarse SIN verificación de JWT:
//   supabase functions deploy qpaypro-proxy --no-verify-jwt
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, json } from '../_shared/cors.ts';

const QP_LOGIN   = Deno.env.get('QPAYPRO_LOGIN')       ?? '';
const QP_API_KEY = Deno.env.get('QPAYPRO_API_KEY')     ?? '';
const QP_PRIVATE = Deno.env.get('QPAYPRO_PRIVATE_KEY') ?? '';
const QP_SECRET  = Deno.env.get('QPAYPRO_API_SECRET')  ?? '';
const QP_ENV     = (Deno.env.get('QPAYPRO_ENV') ?? 'sandbox').toLowerCase();

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')              ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const FRONTEND_ORIGIN  = (Deno.env.get('FRONTEND_ORIGIN') ?? '').replace(/\/$/, '');

const LIVE = QP_ENV === 'live' || QP_ENV === 'production' || QP_ENV === 'prod';

// Hosted Page: registro de token + página de pago.
const HOSTED_BASE = LIVE
  ? 'https://payments.qpaypro.com/checkout'
  : 'https://sandboxpayments.qpaypro.com/checkout';
// API de consulta/confirmación (host distinto al hosted).
const API_BASE = LIVE
  ? 'https://api-payments.qpaypro.com/checkout'
  : 'https://api-sandboxpayments.qpaypro.com/checkout';

const REGISTER_URL = `${HOSTED_BASE}/register_transaction_store`;
const STORE_URL    = `${HOSTED_BASE}/store`; // ?token=
const DETAIL_URL   = `${API_BASE}/get_transaction_detail`;

// Hosted necesita x_login + x_api_key. Confirmar el pago necesita además
// x_private_key + x_api_secret.
const canRegister = () => Boolean(QP_LOGIN && QP_API_KEY);
const canConfirm  = () => Boolean(QP_LOGIN && QP_PRIVATE && QP_SECRET);

// Cliente con service_role: escribe `payments`/`orders` omitiendo RLS.
function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const siteRedirect = (qs: string) =>
  `${FRONTEND_ORIGIN || ''}/Laurean.html?${qs}`;

function redirect(url: string) {
  return new Response(null, { status: 302, headers: { ...corsHeaders, Location: url } });
}

function normalizedOrigin(value: string | null) {
  return (value || '').replace(/\/$/, '');
}

function postOriginAllowed(req: Request) {
  const origin = normalizedOrigin(req.headers.get('Origin'));
  if (!FRONTEND_ORIGIN) {
    return origin === 'http://127.0.0.1:3000' || origin === 'http://localhost:3000';
  }
  return origin === FRONTEND_ORIGIN;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);

  // ── RELAY (GET): retorno de QPayPro tras el pago ───────────────────
  if (req.method === 'GET' && (url.searchParams.has('relay') || url.searchParams.has('x_trans_id'))) {
    return handleRelay(url);
  }

  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!postOriginAllowed(req)) return json({ error: 'origin_not_allowed' }, 403);

  let body: { action?: string; order_id?: string; order?: Record<string, unknown> };
  try { body = await req.json(); }
  catch { return json({ error: 'invalid_json' }, 400); }

  if ((body.action ?? 'create') === 'create') return handleCreate(body);

  return json({ error: 'unknown_action', action: body.action }, 400);
});

// Forma mínima de la orden que necesita el registro Hosted Page.
interface OrderRow {
  id: string; order_number: string | null; total_gtq: number; shipping_gtq: number;
  customer_name: string; customer_phone: string | null; customer_email: string | null;
  customer_address: string | null; customer_city: string | null; customer_department: string | null;
  items: Array<Record<string, unknown>>;
}
const ORDER_COLS =
  'id, order_number, total_gtq, shipping_gtq, customer_name, customer_phone, customer_email, ' +
  'customer_address, customer_city, customer_department, items';

// ── Acción create: resolver/crear la orden (con re-pricing), registrar el
//     intento de pago, pedir el token y devolver redirect_url ────────────────
async function handleCreate(
  body: { order_id?: string; order?: Record<string, unknown> },
) {
  if (!SERVICE_ROLE_KEY) return json({ error: 'server_not_configured' }, 500);

  const db = admin();

  // Resolver la orden por uno de dos caminos:
  //  (a) order_id existente (compat) → se lee de BD.
  //  (b) payload del carrito → se REVALIDAN precios contra `products` y se crea
  //      la orden del lado servidor (service_role omite RLS, sin race condition).
  let order: OrderRow;

  if (body.order_id) {
    const { data, error } = await db
      .from('orders').select(ORDER_COLS).eq('id', body.order_id).maybeSingle();
    if (error || !data) return json({ error: 'order_not_found' }, 404);
    order = data as OrderRow;
  } else {
    const src = body.order ?? {};
    const rawItems = Array.isArray((src as { items?: unknown[] }).items)
      ? (src as { items: Array<Record<string, unknown>> }).items : [];
    if (rawItems.length === 0) return json({ error: 'missing_items' }, 400);

    // Revalidación de precios contra el catálogo (NUNCA se confía en el cliente).
    const ids = [...new Set(rawItems.map((it) => String(it.id ?? '')).filter(Boolean))];
    if (ids.length === 0) return json({ error: 'missing_items' }, 400);
    const { data: prods, error: prodErr } = await db
      .from('products').select('id, name, price_gtq, active').in('id', ids);
    if (prodErr) return json({ error: 'pricing_failed', detail: prodErr.message }, 500);

    const priceMap = new Map<string, { name: string; price: number }>();
    for (const p of prods ?? []) {
      if (p.active === false) continue;
      priceMap.set(String(p.id), { name: String(p.name ?? 'Producto'), price: Number(p.price_gtq ?? 0) });
    }

    const cleanItems: Array<{ id: string; name: string; qty: number; price_gtq: number }> = [];
    let subtotal = 0;
    for (const it of rawItems) {
      const id = String(it.id ?? '');
      const prod = priceMap.get(id);
      if (!prod) return json({ error: 'invalid_item', id }, 400);
      const qty = Math.max(1, Math.floor(Number(it.qty ?? 1)) || 1);
      subtotal += prod.price * qty;
      cleanItems.push({ id, name: prod.name, qty, price_gtq: prod.price });
    }

    const shipping = Math.max(0, Number((src as { shipping_gtq?: unknown }).shipping_gtq ?? 0) || 0);
    // Los descuentos del navegador no son autoritativos. Hasta tener cupones/PIN
    // server-side, tarjeta cobra subtotal revalidado + envio.
    const discount = 0;
    const total = Math.max(0, subtotal - discount) + shipping;

    const s = src as Record<string, unknown>;
    const { data: created, error: createErr } = await db.from('orders').insert({
      customer_name:       String(s.customer_name ?? 'Cliente'),
      customer_phone:      (s.customer_phone as string) ?? null,
      customer_email:      (s.customer_email as string) ?? null,
      customer_address:    (s.customer_address as string) ?? null,
      customer_city:       (s.customer_city as string) ?? null,
      customer_department: (s.customer_department as string) ?? null,
      subtotal_gtq:        subtotal,
      discount_gtq:        discount,
      shipping_gtq:        shipping,
      total_gtq:           total,
      items:               cleanItems,
      notes:               (s.notes as string) ?? null,
      status:              'pendiente',
      payment_method:      'card',
      payment_status:      'pendiente',
      referral_code:       (s.referral_code as string) ?? null,
    }).select(ORDER_COLS).single();
    if (createErr || !created) return json({ error: 'order_create_failed', detail: createErr?.message }, 500);
    order = created as OrderRow;
  }

  // Registrar el intento de pago (status 'iniciado').
  const { data: payment, error: payErr } = await db
    .from('payments')
    .insert({
      order_id:   order.id,
      provider:   'qpaypro',
      amount_gtq: order.total_gtq ?? 0,
      currency:   'GTQ',
      status:     'iniciado',
    })
    .select('id')
    .single();
  if (payErr) return json({ error: 'payment_create_failed', detail: payErr.message }, 500);

  const ref = String(order.order_number ?? order.id);

  // Sin credenciales → fallback (activación diferida).
  if (!canRegister()) {
    return json({ configured: false, payment_id: payment.id, order_id: order.id, order_number: ref });
  }

  // Armar el cuerpo del registro Hosted Page.
  const fullName = String(order.customer_name ?? '').trim();
  const sp = fullName.indexOf(' ');
  const firstName = sp > 0 ? fullName.slice(0, sp) : (fullName || 'Cliente');
  const lastName  = sp > 0 ? fullName.slice(sp + 1) : 'C/F';

  const total = Number(order.total_gtq ?? 0).toFixed(2);
  const freight = Number(order.shipping_gtq ?? 0).toFixed(2);

  // products: [[description, SKU, url_product, quantity, price, total_product]]
  const items = Array.isArray(order.items) ? order.items : [];
  const products = items.map((it: Record<string, unknown>) => [
    String(it.name ?? 'Producto'),
    String(it.id ?? ''),
    '',
    String(it.qty ?? 1),
    String(it.price_gtq ?? 0),
    String(Number(it.price_gtq ?? 0) * Number(it.qty ?? 1)),
  ]);

  const fnBase = `${SUPABASE_URL}/functions/v1/qpaypro-proxy`;

  const qpBody: Record<string, unknown> = {
    x_login:        QP_LOGIN,
    x_api_key:      QP_API_KEY,
    x_amount:       total,
    x_currency_code:'GTQ',
    x_first_name:   firstName,
    x_last_name:    lastName,
    x_phone:        String(order.customer_phone ?? ''),
    x_description:  `Pedido ${ref}`,
    x_company:      'C/F',
    x_address:      String(order.customer_address ?? 'Ciudad'),
    x_city:         String(order.customer_city ?? 'Guatemala'),
    x_country:      'Guatemala',
    x_state:        '0',
    x_zip:          '01001',
    x_freight:      freight,
    taxes:          '0.00',
    x_email:        String(order.customer_email ?? ''),
    x_type:         'AUTH_ONLY',
    x_method:       'CC',
    x_invoice_num:  ref,
    custom_fields:  JSON.stringify({ order_id: order.id, payment_id: payment.id, order_number: ref }),
    x_visacuotas:   'no',
    products:       JSON.stringify(products),
    http_origin:    FRONTEND_ORIGIN.replace(/^https?:\/\//, '') || 'laurean',
    origen:         'PLUGIN',
    store_type:     'hostedpage',
    x_discount:     '0',
    // Retornos: el navegador aterriza en el sitio; el relay confirma server-side.
    x_url_success:  siteRedirect(`pago=ok&order=${encodeURIComponent(ref)}`),
    x_url_cancel:   siteRedirect(`pago=cancel&order=${encodeURIComponent(ref)}`),
    x_url_error:    siteRedirect(`pago=error&order=${encodeURIComponent(ref)}`),
    x_relay_url:    `${fnBase}?relay=1&pid=${payment.id}`,
  };

  let token = '';
  try {
    const r = await fetch(REGISTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(qpBody),
    });
    const data = await r.json().catch(() => ({}));
    if (data?.estado === 'success' && data?.data?.token) {
      token = data.data.token;
    } else {
      await db.from('payments').update({
        status: 'error',
        response_text: JSON.stringify(data?.message ?? data ?? 'register_failed').slice(0, 500),
        raw_response: data,
      }).eq('id', payment.id);
      return json({ error: 'register_failed', detail: data?.message ?? data }, 502);
    }
  } catch (e) {
    await db.from('payments').update({ status: 'error', response_text: String(e).slice(0, 500) })
      .eq('id', payment.id);
    return json({ error: 'register_exception', detail: String(e) }, 502);
  }

  await db.from('payments').update({ checkout_token: token }).eq('id', payment.id);

  return json({
    configured:   true,
    payment_id:   payment.id,
    order_id:     order.id,
    order_number: ref,
    redirect_url: `${STORE_URL}?token=${encodeURIComponent(token)}`,
  });
}

// ── Relay: confirmar el pago del lado servidor y redirigir al sitio ──
async function handleRelay(url: URL) {
  const pid     = url.searchParams.get('pid') ?? '';
  const transId = url.searchParams.get('x_trans_id') ?? '';
  const refNum  = url.searchParams.get('x_invoice_num') ?? '';

  if (!SERVICE_ROLE_KEY) return redirect(siteRedirect('pago=error'));
  const db = admin();

  // Localizar el pago (por pid del relay; respaldo por x_trans_id ya guardado).
  let paymentId = pid;
  let orderId = '';
  if (paymentId) {
    const { data } = await db.from('payments').select('id, order_id').eq('id', paymentId).maybeSingle();
    orderId = data?.order_id ?? '';
  }

  // Confirmación AUTORITATIVA: consultar el detalle real de la transacción.
  // Nunca aprobar por parámetros del navegador: el relay es público.
  let approved = false;
  let detail: Record<string, unknown> | null = null;
  if (!canConfirm() || !transId) {
    if (paymentId) {
      await db.from('payments').update({
        status:        'error',
        qpaypro_audit: transId,
        response_code: url.searchParams.get('x_response_code') ?? '',
        response_text: !canConfirm() ? 'qpaypro_confirm_not_configured' : 'missing_transaction_id',
        raw_response:  { query: Object.fromEntries(url.searchParams) },
      }).eq('id', paymentId);
    }
    return redirect(siteRedirect(`pago=error&order=${encodeURIComponent(refNum)}`));
  }

  if (canConfirm() && transId) {
    try {
      const r = await fetch(DETAIL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x_login: QP_LOGIN, x_private_key: QP_PRIVATE, x_api_secret: QP_SECRET,
          idTrans: transId, x_audit_number: '', x_fp_sequence: ' ',
        }),
      });
      const data = await r.json().catch(() => ({}));
      const row = Array.isArray(data?.response) ? data.response[0] : data?.response ?? data;
      detail = row;
      const status = String(row?.status ?? '').toLowerCase();
      approved = data?.result === 1 && /aprob|acredit|autoriz|exito|complet|paid/.test(status);
    } catch (_) { /* se evalúa abajo */ }
  }

  if (paymentId) {
    await db.from('payments').update({
      status:        approved ? 'aprobado' : 'rechazado',
      qpaypro_audit: transId,
      response_code: url.searchParams.get('x_response_code') ?? '',
      response_text: url.searchParams.get('x_response_text') ?? '',
      raw_response:  detail ?? { query: Object.fromEntries(url.searchParams) },
    }).eq('id', paymentId);
  }
  if (orderId && approved) {
    await db.from('orders').update({ payment_status: 'pagado' }).eq('id', orderId);
  }

  const estado = approved ? 'ok' : 'rechazado';
  return redirect(siteRedirect(`pago=${estado}&order=${encodeURIComponent(refNum)}`));
}
