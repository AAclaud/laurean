// ============================================================
// LAUREAN — Configuración
// COPIA este archivo como `js/config.js` y pega tus claves reales.
// `js/config.js` está en .gitignore — no se subirá al repositorio.
// ============================================================

window.LAUREAN_CONFIG = {
  // ── Supabase (Settings → API en tu proyecto Supabase) ─────
  SUPABASE_URL:  'https://xxxxxxxxxxx.supabase.co',
  SUPABASE_ANON: 'eyJhbGciOi...PEGAR_ANON_KEY_AQUI',

  // ── Forza Delivery (lo gestiona la Edge Function, frontend solo necesita la URL del proxy) ─
  // No expongas SecretKey aquí; vive como env var en Supabase Edge Functions.
};
