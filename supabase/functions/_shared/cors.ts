// CORS headers compartidos por todas las Edge Functions de Laurean.
// Define el dominio permitido vía secret `FRONTEND_ORIGIN`
// (ej. https://tienda.tudominio.com). Si no está definido, usa '*'
// (útil en desarrollo). En producción SIEMPRE setearlo:
//   supabase secrets set FRONTEND_ORIGIN=https://tu-dominio
const ALLOW_ORIGIN = (typeof Deno !== 'undefined' && Deno.env.get('FRONTEND_ORIGIN')) || '*';

export const corsHeaders = {
  'Access-Control-Allow-Origin':  ALLOW_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age':       '86400',
  'Vary':                         'Origin',
};

export function json(body: unknown, status = 200, extra: Record<string,string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
  });
}
