// ============================================================
// LAUREAN — Edge Function: forza-webhook
//
// Recibe eventos de tracking de Forza Delivery y actualiza los
// pedidos en la base de datos.
//
// Forza envía un POST con el evento y el header "LauValue" (HMAC del
// body con el mismo SecretKey). Validamos firma para evitar spoofing.
//
// URL del webhook (registrar con Forza):
//   https://<proyecto>.supabase.co/functions/v1/forza-webhook
//
// Estructura esperada del body (según docs Forza):
//   {
//     GuideSerie:   "FD",
//     GuideNumber:  "123456",
//     EventCode:    "DLV",
//     EventName:    "Entregado",
//     Description:  "Entregado al destinatario",
//     OccurredAt:   "2026-05-25T15:30:00",
//     Latitude:     14.6,
//     Longitude:    -90.5
//   }
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, json } from '../_shared/cors.ts';

const SECRET_KEY    = Deno.env.get('FORZA_SECRET_KEY')                 ?? '';
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')                     ?? '';
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')        ?? '';

async function hmacB64(body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  const bytes = new Uint8Array(sig);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')    return json({ error: 'method_not_allowed' }, 405);

  const raw = await req.text();
  const sigHeader = req.headers.get('LauValue') || req.headers.get('Lauvalue') || '';
  const expected = await hmacB64(raw);
  if (!timingSafeEqual(sigHeader, expected)) {
    return json({ error: 'invalid_signature' }, 401);
  }

  let evt: Record<string, any>;
  try { evt = JSON.parse(raw); }
  catch { return json({ error: 'invalid_json' }, 400); }

  const serie  = evt.GuideSerie  || evt.serie  || 'FD';
  const number = String(evt.GuideNumber || evt.number || '');
  if (!number) return json({ error: 'missing_guide_number' }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Buscar pedido por número de guía
  const { data: order, error: findErr } = await supabase
    .from('orders')
    .select('id')
    .eq('forza_guide_number', number)
    .maybeSingle();
  if (findErr || !order) {
    // El evento llegó pero no encontramos el pedido. Lo aceptamos pero no actualizamos nada.
    return json({ ok: true, warning: 'order_not_found', guide_number: number });
  }

  const eventCode = String(evt.EventCode || evt.event_code || '');
  const eventName = String(evt.EventName || evt.event_name || '');
  const desc      = String(evt.Description || evt.description || '');
  const occurred  = evt.OccurredAt || evt.occurred_at || new Date().toISOString();

  // Insertar evento de tracking
  const { error: insErr } = await supabase.from('order_tracking_events').insert({
    order_id:    order.id,
    event_code:  eventCode,
    event_name:  eventName,
    description: desc,
    latitude:    evt.Latitude  ?? null,
    longitude:   evt.Longitude ?? null,
    raw_payload: evt,
    occurred_at: occurred,
  });
  if (insErr) { console.error('[forza-webhook] insert_failed:', insErr.message); return json({ error: 'insert_failed' }, 500); }

  // Actualizar pedido con estado más reciente
  const newStatus = mapForzaStatus(eventCode, eventName);
  const upd: Record<string, unknown> = {
    forza_tracking_status: eventName,
    forza_last_event_at:   occurred,
  };
  if (newStatus) upd.status = newStatus;
  await supabase.from('orders').update(upd).eq('id', order.id);

  return json({ ok: true, order_id: order.id });
});

function mapForzaStatus(code: string, name: string): string | null {
  const c = (code || '').toUpperCase();
  const n = (name || '').toLowerCase();
  if (c === 'DLV' || n.includes('entregad'))    return 'entregado';
  if (c === 'CNL' || n.includes('cancelad'))    return 'cancelado';
  if (c === 'OFD' || n.includes('en ruta'))     return 'enviado';
  if (c === 'PUP' || n.includes('recolect'))    return 'en_preparacion';
  if (n.includes('devuel'))                     return 'devuelto';
  return null;
}
