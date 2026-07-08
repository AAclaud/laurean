// ============================================================
// LAUREAN — Edge Function: forza-proxy
//
// Proxy firmado para la API de Forza Delivery Express.
// - Recibe { endpoint, params } desde el frontend.
// - Verifica JWT del usuario en Supabase con rol admin/superuser.
// - Construye el inner JSON con formato Forza (CRLF + 3-space indent,
//   sin espacio post `:`), lo serializa a Base64 como `PayLoad`, y
//   firma con HMAC-SHA256 → header `LauValue`.
// - Envía body `{CodApp, PayLoad}` a Forza.
// - Decodifica el `PayLoad` de la respuesta y devuelve JSON limpio.
//
// ENV vars (Supabase Dashboard → Functions → Secrets):
//   FORZA_BASE_URL, FORZA_COD_APP, FORZA_SECRET_KEY,
//   FORZA_CODE_OF_REFERENCE (informativa), FORZA_ID_CLIENT (informativa)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, json } from '../_shared/cors.ts';

const FORZA_BASE   = Deno.env.get('FORZA_BASE_URL')          ?? '';
const COD_APP      = Deno.env.get('FORZA_COD_APP')           ?? '';
const SECRET_KEY   = Deno.env.get('FORZA_SECRET_KEY')        ?? '';
const ID_COUNTRY   = Deno.env.get('FORZA_ID_COUNTRY')        ?? 'GT';
const ID_CLIENT    = Number(Deno.env.get('FORZA_ID_CLIENT')  ?? '0');
const CODE_OF_REF  = Deno.env.get('FORZA_CODE_OF_REFERENCE') ?? '0';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')      ?? '';
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const ALLOWED = new Set<string>([
  'GetListProvincesByHeaderCode',
  'GetListTownshipByHeaderCode',
  'GetBankName',
  'GetCatalogExpressCenter',
  'GetServiceByHeaderCodeRequest',
  'GetTrackOrderDetail',
  'SetCancelGuides',
  'GetGuideReprintRequest',
  'GetShippingRatesByHeaderCode',
  'GetRouteAndHubByAddress',
  'SetAddressByIntegration',
  'GetAddressByIntegration',
  'SetPickupServiceByIntegration',
]);

// Catálogo geográfico: datos públicos no sensibles (los usa el checkout de la tienda).
const PUBLIC_ENDPOINTS = new Set<string>([
  'GetListProvincesByHeaderCode',
  'GetListTownshipByHeaderCode',
]);

const URL_PATH: Record<string,string> = {
  GetListProvincesByHeaderCode:   'ecommerce/GetListProvincesByHeaderCode',
  GetListTownshipByHeaderCode:    'ecommerce/GetListTownshipByHeaderCode',
  GetBankName:                    'ecommerce/GetBankName',
  GetCatalogExpressCenter:        'Ecommerce/GetCatalogExpressCenter',
  GetServiceByHeaderCodeRequest:  'Ecommerce/GetServiceByHeaderCodeRequest',
  GetTrackOrderDetail:            'Ecommerce/GetTrackOrderDetail',
  SetCancelGuides:                'Ecommerce/SetCancelGuides',
  GetGuideReprintRequest:         'ecommerce/GetGuideReprintRequest',
  GetShippingRatesByHeaderCode:   'ecommerce/GetShippingRatesByHeaderCode',
  GetRouteAndHubByAddress:        'Ecommerce/GetRouteAndHubByAddress',
  SetAddressByIntegration:        'Ecommerce/SetAddressByIntegration',
  GetAddressByIntegration:        'Ecommerce/GetAddressByIntegration',
  SetPickupServiceByIntegration:  'Ecommerce/SetPickupServiceByIntegration',
};

// ─── Serializador Forza ─────────────────────────────────────
// Forza espera JSON con CRLF, indent 3 espacios, SIN espacio tras `:`.
// Ejemplo verificado contra el LauValue de la doc oficial.
function forzaStringify(value: unknown, indent = 0): string {
  const IND = '   '.repeat(indent);
  const INDN = '   '.repeat(indent + 1);
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map(v => INDN + forzaStringify(v, indent + 1));
    return '[\r\n' + items.join(',\r\n') + '\r\n' + IND + ']';
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length === 0) return '{}';
    const items = keys.map(k => INDN + JSON.stringify(k) + ':' + forzaStringify((value as any)[k], indent + 1));
    return '{\r\n' + items.join(',\r\n') + '\r\n' + IND + '}';
  }
  return 'null';
}

// HMAC-SHA256 → Base64
async function lauValue(bodyStr: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(bodyStr));
  const bytes = new Uint8Array(sig);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64encode(s: string): string {
  return btoa(unescape(encodeURIComponent(s)));
}
function b64decode(s: string): string {
  try { return decodeURIComponent(escape(atob(s))); } catch { return atob(s); }
}

// Defaults por endpoint cuando frontend no manda algunos params
function injectDefaults(endpoint: string, params: Record<string, unknown>) {
  switch (endpoint) {
    case 'GetListProvincesByHeaderCode':
      return { HeaderCode: params.HeaderCode ?? -1, IdCountry: params.IdCountry ?? ID_COUNTRY };
    case 'GetListTownshipByHeaderCode':
      // Forza usa `HeaderCode` (no HeaderCodeProvince) para filtrar municipios por provincia.
      // Acepta también el alias HeaderCodeTownShip para filtrar por township específico.
      return {
        HeaderCodeTownShip: params.HeaderCodeTownShip ?? '-1',
        HeaderCode:         params.HeaderCode ?? params.HeaderCodeProvince ?? '-1',
        IdCountry:          params.IdCountry ?? ID_COUNTRY,
      };
    case 'GetBankName':
      return {
        ValName:   '-1',
        IdCountry: ID_COUNTRY,
        ...params,
      };
    case 'GetCatalogExpressCenter':
      return {
        IdMerchant: ID_CLIENT,
        ...params,
      };
    case 'GetShippingRatesByHeaderCode':
      return {
        IdCountry: ID_COUNTRY,
        IdMerchant: ID_CLIENT,
        ...params,
      };
    case 'GetServiceByHeaderCodeRequest':
      return {
        IdCountry: ID_COUNTRY,
        IdMerchant: ID_CLIENT,
        CodeOfReference: CODE_OF_REF,
        ...params,
      };
    case 'SetCancelGuides':
      return {
        IdClient: ID_CLIENT,
        Token: COD_APP,
        ...params,
      };
    case 'GetAddressByIntegration':
      return {
        IdCountry:  ID_COUNTRY,
        IdMerchant: ID_CLIENT,
        IdClient:   ID_CLIENT,
        ...params,
      };
    case 'SetAddressByIntegration':
      // Forza exige la identidad del comercio en los endpoints "ByIntegration";
      // sin estos campos responde 412 Precondition Failed.
      return {
        IdCountry:  ID_COUNTRY,
        IdMerchant: ID_CLIENT,
        IdClient:   ID_CLIENT,
        ...params,
      };
    case 'SetPickupServiceByIntegration':
      return {
        IdCountry:  ID_COUNTRY,
        IdMerchant: ID_CLIENT,
        IdClient:   ID_CLIENT,
        ...params,
      };
    default:
      return params;
  }
}

// ─── Auth ───────────────────────────────────────────────────
async function verifyAdmin(req: Request): Promise<{ ok: boolean; error?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { ok: false, error: 'missing_token' };
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: 'invalid_token' };
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role, active')
    .eq('id', userData.user.id)
    .single();
  if (profErr || !profile) return { ok: false, error: 'no_profile' };
  if (!profile.active) return { ok: false, error: 'inactive' };
  if (!['admin', 'superuser'].includes(profile.role)) return { ok: false, error: 'forbidden_role' };
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')    return json({ error: 'method_not_allowed' }, 405);

  if (!FORZA_BASE || !COD_APP || !SECRET_KEY) {
    return json({ error: 'forza_not_configured' }, 500);
  }

  let body: { endpoint?: string; params?: Record<string, unknown> };
  try { body = await req.json(); }
  catch { return json({ error: 'invalid_json' }, 400); }
  const endpoint = body.endpoint ?? '';
  const inputParams = body.params ?? {};
  if (!ALLOWED.has(endpoint)) return json({ error: 'endpoint_not_allowed', endpoint }, 400);

  if (!PUBLIC_ENDPOINTS.has(endpoint)) {
    const auth = await verifyAdmin(req);
    if (!auth.ok) return json({ error: 'forbidden', detail: auth.error }, 403);
  }

  // Construir inner con formato Forza
  const inner = {
    Method: endpoint,
    Params: injectDefaults(endpoint, inputParams),
  };
  const innerStr     = forzaStringify(inner);
  const payloadB64   = b64encode(innerStr);
  const lauValueHdr  = await lauValue(innerStr);

  const wrapper = {
    CodApp:  COD_APP,
    PayLoad: payloadB64,
  };

  const url = `${FORZA_BASE.replace(/\/+$/,'')}/${URL_PATH[endpoint]}`;
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'LauValue':     lauValueHdr,
      },
      body: JSON.stringify(wrapper),
    });
  } catch (err) {
    console.error('[forza-proxy] forza_unreachable:', err);
    return json({ error: 'forza_unreachable' }, 502);
  }

  const respText = await upstream.text();
  let respJson: any;
  try { respJson = JSON.parse(respText); } catch { respJson = { raw: respText }; }

  // Decodificar PayLoad de respuesta si viene
  if (respJson && typeof respJson === 'object' && typeof respJson.PayLoad === 'string') {
    try {
      const decoded = b64decode(respJson.PayLoad);
      const parsed  = JSON.parse(decoded);
      // Mantener wrapper info pero exponer el inner como Response (compat con frontend)
      return json({ ok: upstream.ok, Response: parsed, _raw: { CodApp: respJson.CodApp } }, upstream.status);
    } catch (e) {
      console.error('[forza-proxy] response_decode_failed:', e, 'raw:', respText);
      return json({ ok: false, error: 'response_decode_failed' }, 502);
    }
  }
  return json(respJson, upstream.status);
});
