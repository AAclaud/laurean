// ============================================================
// LAUREAN — Visit tracker
//
// Registra una visita por pagina y sesion contra la Edge Function
// publica log-visit. No bloquea la carga ni rompe paginas sin config.
// ============================================================

(function () {
  try {
    const cfg = window.LAUREAN_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON) return;

    const pagePath = window.location.pathname || '/';
    const siteKey = window.LAUREAN_SITE_KEY || 'laurean';
    const sidKey = 'laurean_sid';
    const visitedKey = 'laurean_visited';

    let sessionId = sessionStorage.getItem(sidKey);
    if (!sessionId) {
      sessionId = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'sid_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      sessionStorage.setItem(sidKey, sessionId);
    }

    let visited = [];
    try {
      const raw = sessionStorage.getItem(visitedKey);
      visited = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(visited)) visited = [];
    } catch (err) {
      visited = [];
    }

    if (visited.includes(pagePath)) return;
    visited.push(pagePath);
    sessionStorage.setItem(visitedKey, JSON.stringify(visited));

    fetch(cfg.SUPABASE_URL + '/functions/v1/log-visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.SUPABASE_ANON,
      },
      body: JSON.stringify({
        site_key: siteKey,
        page_path: pagePath,
        session_id: sessionId,
        referer: document.referrer || null,
      }),
    }).catch(function () {});
  } catch (err) {}
})();
