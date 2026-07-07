// ============================================================
// LAUREAN — Service Worker
// Cache-first para imágenes, CSS y fuentes (Google Fonts), con
// expiración aproximada de 7 días vía versión de caché + limpieza.
// No cachea HTML ni llamadas a Supabase (siempre red).
// ============================================================

const VERSION    = 'laurean-v3';
const ASSET_CACHE = `${VERSION}-assets`;
const MAX_AGE_MS  = 7 * 24 * 60 * 60 * 1000; // 7 días

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isCacheableAsset(url) {
  // Imágenes y CSS propios
  if (url.origin === self.location.origin) {
    return /\.(?:png|jpe?g|webp|gif|svg|css|woff2?)$/i.test(url.pathname);
  }
  // Fuentes de Google
  return url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com';
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch { return; }

  // Nunca interceptar Supabase ni APIs
  if (url.hostname.endsWith('.supabase.co') || url.pathname.startsWith('/functions/')) return;
  if (!isCacheableAsset(url)) return;

  event.respondWith(
    caches.open(ASSET_CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) {
        const dateHdr = cached.headers.get('sw-cached-at');
        const fresh = dateHdr && (Date.now() - Number(dateHdr) < MAX_AGE_MS);
        if (fresh) return cached;
      }
      try {
        const resp = await fetch(req);
        if (resp && (resp.ok || resp.type === 'opaque')) {
          // Guardar con timestamp para expiración
          const headers = new Headers(resp.headers);
          headers.set('sw-cached-at', String(Date.now()));
          const body = await resp.clone().blob();
          cache.put(req, new Response(body, { status: resp.status, statusText: resp.statusText, headers }));
        }
        return resp;
      } catch (e) {
        if (cached) return cached; // offline: servir lo viejo si existe
        throw e;
      }
    })
  );
});
