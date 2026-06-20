// ============================================================
// LAUREAN — Cliente Supabase
//
// Requiere que js/config.js exista con LAUREAN_CONFIG.SUPABASE_URL
// y SUPABASE_ANON definidos. Si no existen, la función devuelve null
// y el código de la app debe hacer fallback a localStorage.
//
// Uso:
//   <script src="js/config.js"></script>
//   <script type="module" src="js/supabase-client.js"></script>
//   ...
//   if (window.LAUREAN_DB) { const { data } = await window.LAUREAN_DB.from('products').select('*'); }
// ============================================================

(async function () {
  const cfg = window.LAUREAN_CONFIG || {};
  const URL  = cfg.SUPABASE_URL;
  const ANON = cfg.SUPABASE_ANON;

  if (!URL || !ANON || URL.includes('xxxxxxxx')) {
    console.warn('[supabase-client] Configuración faltante. Copia js/config.example.js → js/config.js y pega tus claves.');
    window.LAUREAN_DB = null;
    window.LAUREAN_SUPABASE_READY = false;
    document.dispatchEvent(new CustomEvent('laurean:supabase-ready', { detail: { ok: false } }));
    return;
  }

  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.45.4');
    window.LAUREAN_DB = createClient(URL, ANON, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
    window.LAUREAN_SUPABASE_READY = true;

    // Helpers públicos
    window.LAUREAN_SB = {
      // Upload de imagen al bucket product-images. Path = "products/<id>.jpg"
      async uploadProductImage(blob, idHint) {
        const path = `products/${idHint || ('p_' + Date.now())}.jpg`;
        const { data, error } = await window.LAUREAN_DB.storage
          .from('product-images')
          .upload(path, blob, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' });
        if (error) throw error;
        const { data: pub } = window.LAUREAN_DB.storage.from('product-images').getPublicUrl(data.path);
        return pub.publicUrl;
      },
      async uploadCategoryImage(blob, idHint) {
        const path = `categories/${idHint || ('c_' + Date.now())}.jpg`;
        const { data, error } = await window.LAUREAN_DB.storage
          .from('product-images')
          .upload(path, blob, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' });
        if (error) throw error;
        const { data: pub } = window.LAUREAN_DB.storage.from('product-images').getPublicUrl(data.path);
        return pub.publicUrl;
      },
    };

    // Mantener la sesión local en sync con el ciclo de vida del token.
    window.LAUREAN_DB.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        if (typeof window.syncSessionExpiry === 'function') {
          window.syncSessionExpiry(session?.expires_at || null);
        }
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('laurean_session');
      }
    });

    document.dispatchEvent(new CustomEvent('laurean:supabase-ready', { detail: { ok: true } }));
    console.info('[supabase-client] listo.');
  } catch (err) {
    console.error('[supabase-client] no se pudo inicializar:', err);
    window.LAUREAN_DB = null;
    window.LAUREAN_SUPABASE_READY = false;
    document.dispatchEvent(new CustomEvent('laurean:supabase-ready', { detail: { ok: false, error: err } }));
  }
})();
