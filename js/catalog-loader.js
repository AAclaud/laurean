// ============================================================
// LAUREAN — Catalog Loader (B8)
//
// Hidrata `window.LAUREAN_DATA` con datos frescos de Supabase.
// Si Supabase no está disponible o falla, deja la data estática
// (data/products.js) como fallback.
//
// Emite eventos:
//   `laurean:catalog-ready` — cuando termina (ok=true|false)
//
// Caché en localStorage con TTL 5 min para arranque rápido.
// ============================================================

(function () {
  const CACHE_KEY = 'laurean_catalog_cache_v2';
  const TTL_MS    = 5 * 60 * 1000;

  function emit(ok, source) {
    document.dispatchEvent(new CustomEvent('laurean:catalog-ready', { detail: { ok, source } }));
  }

  function applyToWindow(data) {
    if (!window.LAUREAN_DATA) window.LAUREAN_DATA = {};
    if (data.parentCategories) window.LAUREAN_DATA.parentCategories = data.parentCategories;
    if (data.subcategories)    window.LAUREAN_DATA.subcategories    = data.subcategories;
    if (data.products)         window.LAUREAN_DATA.products         = data.products;
  }

  function loadFromCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (Date.now() - obj.at > TTL_MS) return null;
      return obj.data;
    } catch { return null; }
  }

  function saveCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data })); } catch {}
  }

  let fetchFromSupabase = async function () {
    if (!window.LAUREAN_DB) return null;
    try {
      const [cats, subs] = await Promise.all([
        window.LAUREAN_DB.from('categories').select('id,name,image_url,starting_price_gtq,starting_price_usd,display_order').eq('active', true).order('display_order'),
        window.LAUREAN_DB.from('subcategories').select('id,parent_id,name,display_order').order('parent_id'),
      ]);
      // Productos: intento con todas las columnas; si el esquema es parcial (falta alguna
      // columna), reintento con las básicas para no perder los productos de Supabase.
      let prods = await window.LAUREAN_DB.from('products')
        .select('id,name,image_url,description,price_gtq,price_usd,parent_id,subcat_id,is_new_arrival,flash_end,show_price,week_number,gallery,variants')
        .eq('active', true).order('name');
      if (prods.error) {
        console.warn('[catalog] products select completo falló, reintento básico:', prods.error.message);
        prods = await window.LAUREAN_DB.from('products')
          .select('id,name,image_url,description,price_gtq,price_usd,parent_id,subcat_id,is_new_arrival')
          .eq('active', true).order('name');
      }
      if (cats.error || subs.error || prods.error) {
        console.warn('[catalog] error pulling from Supabase:', cats.error || subs.error || prods.error);
        return null;
      }
      // Mapear a la shape esperada por LAUREAN_DATA
      return {
        parentCategories: (cats.data || []).map(c => ({
          id:                 c.id,
          name:               c.name,
          image:              c.image_url || '',
          starting_price_gtq: c.starting_price_gtq,
          starting_price_usd: c.starting_price_usd,
          subcats:            (subs.data || []).filter(s => s.parent_id === c.id).map(s => s.id),
        })),
        subcategories: (subs.data || []).map(s => ({
          id: s.id, parent: s.parent_id, name: s.name,
        })),
        products: (prods.data || []).map(p => ({
          id:             p.id,
          name:           p.name,
          image:          p.image_url || '',
          description:    p.description || '',
          price_gtq:      p.price_gtq,
          price_usd:      p.price_usd,
          parent:         p.parent_id,
          subcat:         p.subcat_id,
          is_new_arrival: p.is_new_arrival,
          flash_end:      p.flash_end,
          show_price:     p.show_price,
          week_number:    p.week_number,
          gallery:        p.gallery || [],
          variants:       p.variants || [],
        })),
      };
    } catch (err) {
      console.warn('[catalog] fetch exception:', err);
      return null;
    }
  };

  async function hydrate() {
    // 1) Caché rápida para UI instantánea
    const cached = loadFromCache();
    if (cached) { applyToWindow(cached); emit(true, 'cache'); }

    // 2) Esperar Supabase (máximo 1.5s)
    if (!window.LAUREAN_SUPABASE_READY && window.LAUREAN_CONFIG) {
      await new Promise(r => {
        const t = setTimeout(r, 1500);
        document.addEventListener('laurean:supabase-ready', () => { clearTimeout(t); r(); }, { once: true });
      });
    }

    // 3) Pull fresco
    const fresh = await fetchFromSupabase();
    if (fresh) {
      applyToWindow(fresh);
      saveCache(fresh);
      emit(true, 'supabase');
    } else if (!cached) {
      emit(false, 'static');
    }
  }

  // Auto-arranque
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrate);
  } else {
    hydrate();
  }

  // Si Supabase conecta después del timeout inicial, reintentar una vez.
  let _retried = false;
  document.addEventListener('laurean:supabase-ready', () => {
    const empty = !window.LAUREAN_DATA || !(window.LAUREAN_DATA.products || []).length;
    if (_retried || !empty) return;
    _retried = true;
    hydrate();
  }, { once: true });

  // ── Refresco continuo ─────────────────────────────────────
  // 1) al recuperar foco/visibilidad (si el último pull tiene >30s)
  // 2) intervalo de resguardo (90s, solo pestaña visible)
  // 3) realtime: push instantáneo cuando cambia el catálogo en Supabase
  let _lastPull = 0;
  const _origFetch = fetchFromSupabase;
  fetchFromSupabase = async function () {
    const r = await _origFetch();
    if (r) _lastPull = Date.now();
    return r;
  };
  function rehydrateIfStale(minMs) {
    if (Date.now() - _lastPull > (minMs || 30000)) hydrate();
  }
  window.addEventListener('focus', () => rehydrateIfStale(30000));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) rehydrateIfStale(30000); });
  setInterval(() => { if (!document.hidden) rehydrateIfStale(90000); }, 90000);

  let _rt = null;
  function subscribeRealtime() {
    if (!window.LAUREAN_DB) return;
    try {
      const ch = window.LAUREAN_DB.channel('catalog-live');
      ['products', 'categories', 'subcategories'].forEach(tb =>
        ch.on('postgres_changes', { event: '*', schema: 'public', table: tb }, () => {
          clearTimeout(_rt); _rt = setTimeout(hydrate, 500);
        }));
      ch.subscribe();
    } catch (e) { /* realtime opcional */ }
  }
  if (window.LAUREAN_SUPABASE_READY) subscribeRealtime();
  else document.addEventListener('laurean:supabase-ready', (ev) => { if (ev && ev.detail && ev.detail.ok) subscribeRealtime(); }, { once: true });

  window.LAUREAN_CATALOG_HYDRATE = hydrate; // refresh manual
})();
