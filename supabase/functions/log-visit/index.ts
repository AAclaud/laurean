// ============================================================
// LAUREAN — Edge Function: log-visit
//
// Registra visitas publicas del sitio en analytics_page_visits.
// No requiere JWT: usa service_role del lado servidor para omitir RLS.
//
// NOTA DE DESPLIEGUE: esta funcion debe desplegarse SIN verificacion de JWT:
//   supabase functions deploy log-visit --no-verify-jwt
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

type VisitBody = {
  site_key?: unknown;
  page_path?: unknown;
  session_id?: unknown;
  referer?: unknown;
  user_agent?: unknown;
};

function nullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error('[log-visit] missing_supabase_env');
      return json({ error: 'server_not_configured' }, 500);
    }

    let body: VisitBody;
    try { body = await req.json(); }
    catch { return json({ error: 'invalid_json' }, 400); }

    const pagePath = nullableString(body.page_path);
    if (!pagePath) return json({ error: 'missing_page_path' }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { error } = await supabase.from('analytics_page_visits').insert({
      site_key: nullableString(body.site_key) || 'laurean',
      page_path: pagePath,
      session_id: nullableString(body.session_id),
      referer: nullableString(body.referer),
      user_agent: nullableString(body.user_agent) || req.headers.get('user-agent'),
    });

    if (error) {
      console.error('[log-visit] insert_failed:', error.message);
      return json({ error: 'insert_failed' }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error('[log-visit] unexpected_error:', err);
    return json({ error: 'internal_error' }, 500);
  }
});
