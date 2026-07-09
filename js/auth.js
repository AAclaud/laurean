// ============================================================
// LAUREAN — Auth & Data Store
// Capa híbrida: Supabase Auth + localStorage como caché/compat.
// ============================================================

// ─── Helpers de seguridad ────────────────────────────────────
// Escapa caracteres peligrosos antes de inyectar en innerHTML.
// Uso: `<td>${escapeHtml(producto.name)}</td>`
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}
// Escape para usar dentro de un atributo como `onclick="fn('${escapeAttr(id)}')"`.
// Sólo necesario cuando NO podemos usar event listeners y debemos serializar al HTML.
function escapeAttr(value) {
  return escapeHtml(value).replace(/\\/g, '\\\\');
}
// Escapa un valor para incrustarlo como STRING JS dentro de un atributo HTML
// (doble contexto, ej: onclick="fn('${jsAttr(x)}')"). Primero escapa a nivel
// JS (\\ y ') y luego a nivel HTML, para que ni el atributo ni el literal JS
// puedan romperse/inyectarse. Preferir event listeners cuando sea posible.
function jsAttr(value) {
  const s = String(value === null || value === undefined ? '' : value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
  return escapeHtml(s);
}
function safeUrl(value, opts = {}) {
  const raw = String(value === null || value === undefined ? '' : value).trim();
  if (!raw) return '';
  const allowDataImage = opts.allowDataImage === true;
  const allowRelative  = opts.allowRelative === true;
  if (allowDataImage && /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,/i.test(raw)) return raw;
  try {
    const url = new URL(raw, window.location.origin);
    const isRelative = !/^[a-z][a-z0-9+.-]*:/i.test(raw);
    if (isRelative && !allowRelative) return '';
    if (['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) return raw;
  } catch (e) { /* invalid URL */ }
  return '';
}
window.escapeHtml = escapeHtml;
window.escapeAttr = escapeAttr;
window.jsAttr = jsAttr;
window.safeUrl = safeUrl;

const KEYS = {
  USERS:          'laurean_users',
  SESSION:        'laurean_session',
  ORDERS:         'laurean_orders',
  COMMISSIONS:    'laurean_commissions',
  PRICES:         'laurean_prices',
  SETTINGS:       'laurean_settings',
  COMBOS:         'laurean_combos',
  COMBO_HISTORY:  'laurean_combo_history',
  INVENTORY:      'laurean_inventory',
  INV_MOVEMENTS:  'laurean_inventory_movements',
  CUSTOMERS:      'laurean_customers',
  DISCOUNT_CODES: 'laurean_discount_codes',
  PRICE_HISTORY:  'laurean_price_history',
  SITE_SETTINGS:  'laurean_site_settings',
};

// Contenido del sitio editable desde el dashboard (marquee, redes, WhatsApp).
// Lectura pública; el admin lo edita en "Contenido del sitio".
const DEFAULT_SITE_SETTINGS = {
  marquee: ['Pagos seguros', 'Visa', 'Mastercard', 'Pago QR', 'Precios en Q'],
  whatsapp: '50236672415',
  social_links: [
    { type: 'instagram', url: '', label: 'Instagram', visible: false },
    { type: 'facebook',  url: '', label: 'Facebook',  visible: false },
    { type: 'tiktok',    url: '', label: 'TikTok',    visible: false },
    { type: 'whatsapp',  url: '', label: 'WhatsApp',  visible: true  },
  ],
  payment_config: {
    enabled: false,
    transfer: { bank: '', account: '', name: '' },
    payment_link: '',
    qr_url: '',
    instructions: '',
  },
};

const DEFAULT_SETTINGS = {
  seller_discount:    0.15,   // vendedor paga 15% menos que precio público
  bodega_discount:    0.30,   // bodega paga 30% menos que precio público
  referral_discount:  0.05,   // cliente con código referido obtiene 5% off
  commission_rate:    0.05,   // comisión base del vendedor sobre venta referida (fallback)
  // Niveles de vendedor por ventas acumuladas (umbral en Q) → % de comisión por nivel.
  // Editable por el admin. El nivel del vendedor se deriva de sus ventas referidas históricas.
  seller_tiers: [
    { level: 'Bronce',  min: 0,     rate: 0.05 },
    { level: 'Plata',   min: 10000, rate: 0.07 },
    { level: 'Oro',     min: 30000, rate: 0.09 },
    { level: 'Platino', min: 75000, rate: 0.12 },
  ],
  // SEC: sin PIN por defecto. El admin debe configurarlo en Ajustes;
  // mientras esté vacío, los descuentos manuales quedan deshabilitados.
  discount_pin:       '',
  // Modo del indicador de período en Inventario Maestro (control interno, nunca
  // visible al cliente). 'month' = agrupar/colorear por mes (default); 'week' =
  // por semana ISO. El admin lo conmuta desde el dashboard.
  inventory_period_mode: 'month',
};

// SEC: SEED_USERS eliminados. La fuente de verdad de usuarios es
// ahora Supabase Auth (auth.users) + tabla `profiles` con role/metadata.
// Crear nuevos admins desde el Dashboard de Supabase (Authentication →
// Add user) y luego insertar el perfil en `public.profiles` (ver seed.sql).
//
// La función `login(email, password)` legacy abajo queda inerte: siempre
// devuelve "no encontrado", lo que fuerza al frontend a usar Supabase Auth.
const SEED_USERS = [];

// ─── Inicialización ────────────────────────────────────────────────────────────
function initStore() {
  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(SEED_USERS));
  } else {
    // Migrar usuarios existentes agregando campos nuevos si faltan
    const users = JSON.parse(localStorage.getItem(KEYS.USERS));
    let changed = false;
    users.forEach(u => {
      if (u.bodegaIds   === undefined) { u.bodegaIds   = [];                          changed = true; }
      if (u.canLoginPOS === undefined) { u.canLoginPOS = u.role !== 'agente_pedidos'; changed = true; }
    });
    if (changed) localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  }

  if (!localStorage.getItem(KEYS.SETTINGS)) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  } else {
    const existing = JSON.parse(localStorage.getItem(KEYS.SETTINGS));
    const merged   = { ...DEFAULT_SETTINGS, ...existing };
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(merged));
  }

  if (!localStorage.getItem(KEYS.ORDERS)) {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify([]));
  } else {
    // Migrar órdenes existentes: agregar history, origin si faltan
    const orders = JSON.parse(localStorage.getItem(KEYS.ORDERS));
    let changed = false;
    orders.forEach(o => {
      if (!o.history)  { o.history  = []; changed = true; }
      if (!o.origin)   { o.origin   = 'store'; changed = true; }
      if (o.bodegaId   === undefined) { o.bodegaId   = null; changed = true; }
      if (o.bodegaName === undefined) { o.bodegaName = null; changed = true; }
    });
    if (changed) localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  }

  if (!localStorage.getItem(KEYS.COMMISSIONS)) {
    localStorage.setItem(KEYS.COMMISSIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.PRICES)) {
    localStorage.setItem(KEYS.PRICES, JSON.stringify({}));
  }

  ['laurean_vendor_apps','laurean_custom_products','laurean_custom_categories',
   'laurean_proveedores','laurean_bodegas','laurean_cotizaciones',
   KEYS.COMBOS, KEYS.COMBO_HISTORY, KEYS.INV_MOVEMENTS,
   KEYS.CUSTOMERS, KEYS.DISCOUNT_CODES, KEYS.PRICE_HISTORY].forEach(k => {
    if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify([]));
  });

  if (!localStorage.getItem(KEYS.INVENTORY)) {
    localStorage.setItem(KEYS.INVENTORY, JSON.stringify({}));
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function genId(prefix = 'u') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function genSellerCode(name) {
  const part = name.replace(/\s+/g, '').slice(0, 5).toUpperCase();
  const num  = Math.floor(10 + Math.random() * 90);
  return `LAU-${part}${num}`;
}

// ─── Usuarios ──────────────────────────────────────────────────────────────────
function getUsers()        { return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]'); }
function saveUsers(users)  { localStorage.setItem(KEYS.USERS, JSON.stringify(users)); }

function getUserById(id)    { return getUsers().find(u => u.id === id) || null; }
function getUserByEmail(e)  { return getUsers().find(u => u.email.toLowerCase() === e.toLowerCase()) || null; }
function getUserByCode(c)   {
  if (!c) return null;
  return getUsers().find(u => u.code && u.code.toUpperCase() === c.toUpperCase()) || null;
}

const _defaultCanLoginPOS = {
  vendedor: true, bodega: true, admin: true, superuser: true, agente_pedidos: false,
};

function createUser({ name, email, password, role, phone = '', notes = '', bodegaIds = [], canLoginPOS }) {
  const users = getUsers();
  if (getUserByEmail(email)) return { ok: false, error: 'El correo ya está registrado.' };

  const session    = getSession();
  const needsCode  = role === 'vendedor' || role === 'bodega';
  const prefix     = role === 'vendedor' ? 'vnd' : role === 'bodega' ? 'bdg' : role === 'agente_pedidos' ? 'agp' : 'adm';
  const posAccess  = canLoginPOS !== undefined ? canLoginPOS : (_defaultCanLoginPOS[role] ?? false);

  const user = {
    id: genId(prefix),
    name, email,
    password: btoa(password),
    role,
    code:  needsCode ? genSellerCode(name) : null,
    phone, notes,
    bodegaIds:   bodegaIds || [],
    canLoginPOS: posAccess,
    active: true,
    createdAt: new Date().toISOString(),
    createdBy: session ? session.userId : null,
  };
  users.push(user);
  saveUsers(users);
  return { ok: true, user };
}

function updateUser(id, fields) {
  const users = getUsers();
  const idx   = users.findIndex(u => u.id === id);
  if (idx === -1) return { ok: false, error: 'Usuario no encontrado.' };

  if (fields.password) fields.password = btoa(fields.password);
  users[idx] = { ...users[idx], ...fields };
  saveUsers(users);
  return { ok: true, user: users[idx] };
}

function deleteUser(id) {
  const users = getUsers().filter(u => u.id !== id);
  saveUsers(users);
}

function toggleUserActive(id) {
  const user = getUserById(id);
  if (!user) return;
  updateUser(id, { active: !user.active });
}

// Guarda/actualiza un usuario en el caché local con un id específico (UUID de
// Supabase), para que la UI siga funcionando tras crear vía edge function.
function cacheUserLocal(user) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx !== -1) users[idx] = { ...users[idx], ...user };
  else users.push(user);
  saveUsers(users);
  return user;
}

// Llama a la edge function `create-user` (gestión de usuarios con service_role).
// Acciones: create | update | deactivate | reset_password | delete.
async function callUserFn(payload) {
  const sb = window.LAUREAN_DB;
  if (!sb) return { ok: false, error: 'supabase_not_ready' };
  const { data: s } = await sb.auth.getSession();
  const token = s?.session?.access_token;
  if (!token) return { ok: false, error: 'not_authenticated' };
  const url = `${window.LAUREAN_CONFIG.SUPABASE_URL}/functions/v1/create-user`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'apikey': window.LAUREAN_CONFIG.SUPABASE_ANON,
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) return { ok: false, error: data?.detail || data?.error || ('http_' + resp.status), data };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
window.cacheUserLocal = cacheUserLocal;
window.callUserFn = callUserFn;

// Trae los perfiles de Supabase al caché local (fuente de verdad cuando está
// conectado). Devuelve true si sincronizó.
async function syncUsersFromSupabase() {
  const sb = window.LAUREAN_DB;
  if (!sb) return false;
  const { data, error } = await sb
    .from('profiles')
    .select('id,email,name,role,phone,code,active,can_login_pos,bodega_ids,created_at');
  if (error || !data) { console.warn('[supabase] sync profiles:', error?.message); return false; }
  // MERGE (no sobrescribir): la nube refresca/añade perfiles, pero conservamos los
  // usuarios locales que aún no están en `profiles` (recién creados sin sync) y los
  // campos solo-locales (password, gift, birthday, datos de depósito, etc.).
  const byId = {};
  getUsers().forEach(u => { if (u && u.id) byId[u.id] = u; });
  data.forEach(p => {
    const prev = byId[p.id] || {};
    byId[p.id] = {
      ...prev,
      id: p.id, name: p.name || p.email, email: p.email, role: p.role,
      phone: p.phone || '', code: p.code || null,
      bodegaIds: p.bodega_ids || [], canLoginPOS: p.can_login_pos !== false,
      active: p.active !== false, createdAt: p.created_at || prev.createdAt,
    };
  });
  saveUsers(Object.values(byId));
  return true;
}
window.syncUsersFromSupabase = syncUsersFromSupabase;

// ─── Sesión ────────────────────────────────────────────────────────────────────
function login(email, password) {
  // SEC: login local deshabilitado. Toda autenticación pasa por Supabase Auth
  // vía `loginSupabase()`. Esta función se mantiene solo como stub para no romper
  // referencias antiguas; siempre falla.
  return { ok: false, error: 'Login local deshabilitado. Usa Supabase Auth.' };
  // — código legacy preservado abajo solo como referencia (inalcanzable) —
  /*
  const user = getUserByEmail(email);
  if (!user)        return { ok: false, error: 'Usuario no encontrado.' };
  if (!user.active) return { ok: false, error: 'Cuenta desactivada. Contacta al administrador.' };
  if (user.password !== btoa(password)) return { ok: false, error: 'Contraseña incorrecta.' };

  const session = {
    userId:      user.id,
    role:        user.role,
    name:        user.name,
    email:       user.email,
    code:        user.code,
    bodegaIds:   user.bodegaIds   || [],
    canLoginPOS: user.canLoginPOS !== undefined ? user.canLoginPOS : (_defaultCanLoginPOS[user.role] ?? true),
  };
  localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
  return { ok: true, session };
  */
}

// Cierra sesión de forma confiable: espera el signOut de Supabase antes de
// resolver, para que el caller pueda redirigir SIN dejar el token vivo.
// No borra datos de negocio en localStorage (catálogo/pedidos) para evitar
// pérdida de datos no sincronizados; solo limpia el estado de sesión.
async function logout() {
  if (window.LAUREAN_DB) {
    try { await window.LAUREAN_DB.auth.signOut(); }
    catch (e) { console.warn('[auth] signOut falló:', e?.message || e); }
  }
  localStorage.removeItem(KEYS.SESSION);
  try {
    sessionStorage.removeItem('laurean_last_seen_orders');
  } catch (e) { /* noop */ }
}

// Login contra Supabase Auth (devuelve la misma shape que `login()` viejo).
// Si Supabase no está conectado o falla, devuelve { ok: false, error: ... }
// para que el caller pueda hacer fallback al login local.
async function loginSupabase(email, password) {
  if (!window.LAUREAN_DB) return { ok: false, error: 'supabase_not_ready' };
  const sb = window.LAUREAN_DB;
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data?.user) return { ok: false, error: error?.message || 'Credenciales inválidas.' };

  // Leer perfil con role y metadata
  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select('id,email,name,role,code,active,can_login_pos,bodega_ids')
    .eq('id', data.user.id)
    .single();
  if (pErr || !profile) {
    await sb.auth.signOut();
    return { ok: false, error: 'No tienes perfil registrado en la base de datos. Contacta al administrador.' };
  }
  if (!profile.active) {
    await sb.auth.signOut();
    return { ok: false, error: 'Cuenta desactivada. Contacta al administrador.' };
  }

  const session = {
    userId:      profile.id,
    role:        profile.role,
    name:        profile.name || profile.email,
    email:       profile.email,
    code:        profile.code || null,
    bodegaIds:   profile.bodega_ids || [],
    canLoginPOS: profile.can_login_pos !== false,
    supabase:    true,
    expiresAt:   data.session?.expires_at || null,  // unix segundos del access token
  };
  localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
  return { ok: true, session };
}

// Lee la sesión local. Si el access token ya expiró (y no fue refrescado por
// onAuthStateChange mientras la pestaña estaba abierta), la limpia y devuelve
// null para forzar re-login en vez de mostrar una pantalla rota.
function getSession() {
  const raw = localStorage.getItem(KEYS.SESSION);
  if (!raw) return null;
  let session;
  try { session = JSON.parse(raw); } catch { localStorage.removeItem(KEYS.SESSION); return null; }
  if (session && session.expiresAt && (Date.now() / 1000) > session.expiresAt) {
    localStorage.removeItem(KEYS.SESSION);
    if (window.LAUREAN_DB) { try { window.LAUREAN_DB.auth.signOut(); } catch (e) { /* noop */ } }
    return null;
  }
  return session;
}

// Actualiza expiresAt de la sesión local (llamado al refrescarse el token).
function syncSessionExpiry(expiresAt) {
  const raw = localStorage.getItem(KEYS.SESSION);
  if (!raw) return;
  try {
    const s = JSON.parse(raw);
    s.expiresAt = expiresAt || null;
    localStorage.setItem(KEYS.SESSION, JSON.stringify(s));
  } catch (e) { /* noop */ }
}
window.syncSessionExpiry = syncSessionExpiry;

// Redirige al login si la sesión no cumple los roles requeridos.
function requireAuth(allowedRoles = []) {
  const session = getSession();
  if (!session) { window.location.href = 'login.html'; return null; }
  if (allowedRoles.length && !allowedRoles.includes(session.role)) {
    window.location.href = 'login.html'; return null;
  }
  return session;
}

// ─── Bodega activa en POS ─────────────────────────────────────────────────────
function setActiveBodega(bodegaId) {
  const s = getSession();
  if (!s) return;
  s.activeBodegaId = bodegaId || null;
  localStorage.setItem(KEYS.SESSION, JSON.stringify(s));
}

function getActiveBodega() {
  const s = getSession();
  return s ? (s.activeBodegaId || null) : null;
}

// ─── Notificaciones (sessionStorage — se resetea al cerrar pestaña) ───────────
function getLastSeenOrderCount() {
  return parseInt(sessionStorage.getItem('laurean_last_seen_orders') || '-1', 10);
}
function setLastSeenOrderCount(n) {
  sessionStorage.setItem('laurean_last_seen_orders', String(n));
}
function getNewOrderCount() {
  const total = getOrders().length;
  const seen  = getLastSeenOrderCount();
  return seen < 0 ? 0 : Math.max(0, total - seen);
}

// ─── Configuración ─────────────────────────────────────────────────────────────
function getSettings()     { return JSON.parse(localStorage.getItem(KEYS.SETTINGS) || JSON.stringify(DEFAULT_SETTINGS)); }
function saveSettings(s)   { localStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...DEFAULT_SETTINGS, ...s })); }

// ─── Contenido del sitio (marquee, redes, WhatsApp) ──────────────────────────────
// Patrón local-first: lee/escribe localStorage y, si Supabase está disponible,
// hace dual-write fire-and-forget a la tabla `site_settings` (key/value jsonb).
function getSiteSettings() {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(KEYS.SITE_SETTINGS) || '{}'); } catch (e) { stored = {}; }
  return { ...DEFAULT_SITE_SETTINGS, ...stored };
}

function saveSiteSettings(patch) {
  const merged = { ...getSiteSettings(), ...patch };
  localStorage.setItem(KEYS.SITE_SETTINGS, JSON.stringify(merged));
  // Dual-write a Supabase (una fila por clave) — fire-and-forget.
  if (window.LAUREAN_DB) {
    Object.keys(patch || {}).forEach(key => {
      window.LAUREAN_DB.from('site_settings')
        .upsert({ key, value: patch[key], updated_at: new Date().toISOString() })
        .then(() => {}, () => {});
    });
  }
  document.dispatchEvent(new CustomEvent('laurean:site-settings-changed', { detail: merged }));
  return merged;
}

// Pull fresco de Supabase → localStorage. Emite `laurean:site-settings-ready`.
async function hydrateSiteSettings() {
  if (!window.LAUREAN_DB) { document.dispatchEvent(new CustomEvent('laurean:site-settings-ready', { detail: getSiteSettings() })); return; }
  try {
    const { data, error } = await window.LAUREAN_DB.from('site_settings').select('key,value');
    if (!error && Array.isArray(data) && data.length) {
      const obj = {};
      data.forEach(row => { obj[row.key] = row.value; });
      const merged = { ...getSiteSettings(), ...obj };
      localStorage.setItem(KEYS.SITE_SETTINGS, JSON.stringify(merged));
    }
  } catch (e) { /* fallback al local */ }
  document.dispatchEvent(new CustomEvent('laurean:site-settings-ready', { detail: getSiteSettings() }));
}

window.getSiteSettings     = getSiteSettings;
window.saveSiteSettings    = saveSiteSettings;
window.hydrateSiteSettings = hydrateSiteSettings;

// ─── Precios ───────────────────────────────────────────────────────────────────
function getPriceOverrides()    { return JSON.parse(localStorage.getItem(KEYS.PRICES) || '{}'); }
function savePriceOverride(id, data) {
  const overrides = getPriceOverrides();
  overrides[id] = { ...overrides[id], ...data };
  localStorage.setItem(KEYS.PRICES, JSON.stringify(overrides));
}

// Retorna { gtq, usd } según el rol del usuario.
// bodegaId opcional: si se provee, busca precio específico de esa bodega.
function getProductPrice(productId, baseGtq, baseUsd, role, bodegaId = null) {
  const overrides = getPriceOverrides();
  const settings  = getSettings();
  const ov        = overrides[productId];

  if (role === 'bodega') {
    if (bodegaId && ov && ov.bodega_prices && ov.bodega_prices[bodegaId]) {
      const bp = ov.bodega_prices[bodegaId];
      return { gtq: bp.gtq, usd: bp.usd };
    }
    if (ov && ov.bodega_gtq != null) return { gtq: ov.bodega_gtq, usd: ov.bodega_usd };
    return {
      gtq: Math.round(baseGtq * (1 - settings.bodega_discount)),
      usd: Math.round(baseUsd * (1 - settings.bodega_discount)),
    };
  }

  const isSeller = role === 'vendedor' || role === 'admin' || role === 'superuser';
  if (isSeller) {
    if (ov && ov.seller_gtq != null) return { gtq: ov.seller_gtq, usd: ov.seller_usd };
    return {
      gtq: Math.round(baseGtq * (1 - settings.seller_discount)),
      usd: Math.round(baseUsd * (1 - settings.seller_discount)),
    };
  }

  if (ov && ov.public_gtq != null) return { gtq: ov.public_gtq, usd: ov.public_usd };
  return { gtq: baseGtq, usd: baseUsd };
}

// Retorna todos los precios disponibles para un producto (snapshot para combo builder).
function getAllPricesForProduct(productId, baseGtq, baseUsd) {
  const overrides = getPriceOverrides();
  const settings  = getSettings();
  const ov        = overrides[productId] || {};
  const bodegas   = getBodegas();

  const laurean_gtq = ov.public_gtq != null ? ov.public_gtq : baseGtq;
  const laurean_usd = ov.public_usd != null ? ov.public_usd : baseUsd;

  const result = {
    laurean_gtq,
    laurean_usd,
    seller_gtq: ov.seller_gtq != null ? ov.seller_gtq : Math.round(laurean_gtq * (1 - settings.seller_discount)),
    seller_usd: ov.seller_usd != null ? ov.seller_usd : Math.round(laurean_usd * (1 - settings.seller_discount)),
    bodega_gtq: ov.bodega_gtq != null ? ov.bodega_gtq : Math.round(laurean_gtq * (1 - settings.bodega_discount)),
    bodega_usd: ov.bodega_usd != null ? ov.bodega_usd : Math.round(laurean_usd * (1 - settings.bodega_discount)),
    bodega_prices: {},
  };

  bodegas.forEach(b => {
    if (ov.bodega_prices && ov.bodega_prices[b.id]) {
      result.bodega_prices[b.id] = { ...ov.bodega_prices[b.id], name: b.name };
    } else {
      result.bodega_prices[b.id] = {
        gtq: Math.round(laurean_gtq * (1 - settings.bodega_discount)),
        usd: Math.round(laurean_usd * (1 - settings.bodega_discount)),
        name: b.name,
      };
    }
  });

  return result;
}

function getBodegaPrice(productId, bodegaId) {
  const ov = getPriceOverrides()[productId];
  if (ov && ov.bodega_prices && ov.bodega_prices[bodegaId]) return ov.bodega_prices[bodegaId];
  return null;
}

function saveBodegaPrice(productId, bodegaId, gtq, usd) {
  const overrides = getPriceOverrides();
  if (!overrides[productId]) overrides[productId] = {};
  if (!overrides[productId].bodega_prices) overrides[productId].bodega_prices = {};
  overrides[productId].bodega_prices[bodegaId] = { gtq: Number(gtq), usd: Number(usd) };
  localStorage.setItem(KEYS.PRICES, JSON.stringify(overrides));
}

// Precios sugeridos según descuentos configurados.
function suggestedSellerPrice(publicGtq, publicUsd) {
  const s = getSettings();
  return {
    gtq: Math.round(publicGtq * (1 - s.seller_discount)),
    usd: Math.round(publicUsd * (1 - s.seller_discount)),
  };
}
function suggestedBodegaPrice(publicGtq, publicUsd) {
  const s = getSettings();
  return {
    gtq: Math.round(publicGtq * (1 - s.bodega_discount)),
    usd: Math.round(publicUsd * (1 - s.bodega_discount)),
  };
}

// Verifica el PIN de descuento manual. Si no hay PIN configurado, los
// descuentos manuales quedan deshabilitados (no se acepta ningún valor).
function verifyDiscountPin(pin) {
  const configured = String(getSettings().discount_pin || '');
  if (!configured) return false;
  return String(pin) === configured;
}

// ─── Historial de precios ──────────────────────────────────────────────────────
function getPriceHistory(productId) {
  const all = JSON.parse(localStorage.getItem(KEYS.PRICE_HISTORY) || '[]');
  return productId ? all.filter(h => h.productId === productId) : all;
}

function recordPriceChange(productId, productName, field, previousValue, newValue) {
  if (previousValue === newValue) return;
  const session = getSession();
  const history = JSON.parse(localStorage.getItem(KEYS.PRICE_HISTORY) || '[]');
  history.unshift({
    id:            genId('ph'),
    productId,
    productName:   productName || productId,
    field,
    previousValue: Number(previousValue),
    newValue:      Number(newValue),
    changedAt:     new Date().toISOString(),
    changedBy:     session ? session.userId : null,
    changedByName: session ? session.name   : null,
  });
  localStorage.setItem(KEYS.PRICE_HISTORY, JSON.stringify(history));
}

// ─── Órdenes ───────────────────────────────────────────────────────────────────
function getOrders()          { return JSON.parse(localStorage.getItem(KEYS.ORDERS) || '[]'); }
function saveOrders(orders)   { localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders)); }

async function syncOrdersFromSupabase() {
  const sb = window.LAUREAN_DB;
  if (!sb) return false;
  const { data, error } = await sb.from('orders')
    .select('id,order_number,customer_name,customer_phone,customer_email,customer_address,customer_township_code,customer_department,customer_city,subtotal_gtq,discount_gtq,shipping_gtq,total_gtq,items,notes,status,payment_method,payment_status,origin,channel,shipping_method,referral_code,bodega_id,forza_guide_number,forza_tracking_status,created_at')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error || !data) { console.warn('[supabase] sync orders:', error && error.message); return false; }
  const local = getOrders();
  const byRemote = {};
  local.forEach(o => { if (o.supabase_id) byRemote[o.supabase_id] = o; });
  data.forEach(r => {
    const prev = byRemote[r.id] || {};
    const mapped = {
      ...prev,
      id:            prev.id || ('ord_sb_' + r.id.slice(0, 8)),
      supabase_id:   r.id,
      order_number:  r.order_number,
      customerName:  r.customer_name,
      customerPhone: r.customer_phone,
      customerEmail: r.customer_email,
      address:       r.customer_address,
      customerDepartment:     r.customer_department,
      customerCity:           r.customer_city,
      customer_township_code: r.customer_township_code,
      subtotal_gtq:  r.subtotal_gtq,
      discount_gtq:  r.discount_gtq,
      shipping_gtq:  r.shipping_gtq,
      total_gtq:     r.total_gtq,
      items:         Array.isArray(r.items) ? r.items : (prev.items || []),
      notes:         r.notes,
      status:        r.status,
      pay_method:    r.payment_method,
      payment_status:r.payment_status,
      origin:        r.origin,
      channel:       r.channel,
      shipping_method: r.shipping_method,
      referral_code: r.referral_code,
      bodegaId:      r.bodega_id,
      forza_guide_number:   r.forza_guide_number,
      forza_tracking_status:r.forza_tracking_status,
      createdAt:     r.created_at,
    };
    byRemote[r.id] = mapped;
  });
  const localOnly = local.filter(o => !o.supabase_id);
  const merged = [...localOnly, ...Object.values(byRemote)];
  saveOrders(merged);
  document.dispatchEvent(new CustomEvent('laurean:orders-synced'));
  return true;
}
window.syncOrdersFromSupabase = syncOrdersFromSupabase;

// ─── Productos admin desde Supabase ───────────────────────────────────────────
async function syncProductsFromSupabase() {
  const sb = window.LAUREAN_DB;
  if (!sb) return false;
  const { data, error } = await sb.from('products')
    .select('id,name,image_url,description,price_gtq,price_usd,parent_id,subcat_id,stock,is_new_arrival,active,show_price,gallery,variants,source_cod')
    .order('name')
    .limit(2000);
  if (error || !data) { console.warn('[supabase] sync products:', error && error.message); return false; }
  localStorage.setItem('laurean_admin_products', JSON.stringify(data));
  document.dispatchEvent(new CustomEvent('laurean:admin-products-synced'));
  return true;
}

function getAdminProducts() {
  return JSON.parse(localStorage.getItem('laurean_admin_products') || '[]');
}

window.syncProductsFromSupabase = syncProductsFromSupabase;
window.getAdminProducts = getAdminProducts;

async function syncStockFromSupabase() {
  const sb = window.LAUREAN_DB;
  if (!sb) return false;
  const { data, error } = await sb.from('inventory_stock').select('cod,bodega_id,stock,updated_at').limit(5000);
  if (error || !data) { console.warn('[supabase] sync stock:', error && error.message); return false; }
  const prods = (typeof getAdminProducts === 'function') ? getAdminProducts() : [];
  const byCod = {};
  prods.forEach(p => { if (p.source_cod) byCod[String(p.source_cod)] = p.id; });
  const inv = {};
  data.forEach(r => {
    const pid = byCod[String(r.cod)] || ('inv-' + r.cod);
    if (!inv[pid]) inv[pid] = {};
    inv[pid][r.bodega_id] = { stock: r.stock || 0, updatedAt: r.updated_at };
  });
  localStorage.setItem(KEYS.INVENTORY, JSON.stringify(inv));
  document.dispatchEvent(new CustomEvent('laurean:stock-synced'));
  return true;
}

window.syncStockFromSupabase = syncStockFromSupabase;

function createOrder(data) {
  const session = getSession();
  const orders  = getOrders();
  const order   = {
    id:           genId('ord'),
    origin:       data.origin     || 'store',
    bodegaId:     data.bodegaId   || null,
    bodegaName:   data.bodegaName || null,
    history:      [],
    ...data,
    status:    (data.origin === 'pos' || data.channel === 'pos') ? 'completado' : (data.status || 'pendiente'),
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  saveOrders(orders);

  if (data.referral_code) {
    createCommission(order.id, data.referral_code, data.total_gtq);
  }

  // Auto-crear o actualizar registro de cliente
  upsertCustomerFromOrder(order);

  // Dual-write a Supabase orders (fire-and-forget) si está conectado.
  // Mapea campos locales a snake_case del schema.
  // Excepción: en pago con TARJETA la orden la crea la Edge Function
  // `qpaypro-proxy` del lado servidor (service_role + revalidación de precio),
  // así que aquí se omite para no duplicarla.
  if (window.LAUREAN_DB && data.pay_method !== 'card' && data.payment_method !== 'card') {
    const items = (data.items || []).map(it => ({
      id: it.id, name: it.name, qty: it.qty,
      price_gtq: it.price_gtq, image: it.image,
      cost_price: it.cost_price ?? 0,
    }));
    const payload = {
      customer_name:          data.customerName || data.userName || 'Cliente',
      customer_phone:         data.customerPhone || data.userPhone || null,
      customer_email:         data.customerEmail || data.userEmail || null,
      customer_address:       data.address || data.customerAddress || null,
      customer_township_code: data.customer_township_code || null,
      customer_department:    data.customerDepartment || null,
      customer_city:          data.customerCity || null,
      subtotal_gtq:           data.subtotal_gtq || 0,
      discount_gtq:           (data.discount_gtq || 0) + (data.manual_discount_gtq || 0) + (data.discountCode_gtq || 0) + (data.referral_discount_gtq || 0),
      shipping_gtq:           data.shipping_gtq || 0,
      total_gtq:              data.total_gtq || 0,
      items:                  items,
      notes:                  data.notes || null,
      status:                 (data.origin === 'pos' || data.channel === 'pos') ? 'completado' : 'pendiente',
      payment_method:         data.pay_method || data.payment_method || null,
      payment_status:         (data.origin === 'pos' || data.channel === 'pos') ? 'pagado' : 'pendiente',
      origin:                 data.origin || 'store',
      channel:                data.channel || (data.origin === 'pos' ? 'pos' : 'web'),
      shipping_method:        data.shipping_method || null,
      referral_code:          data.referral_code || null,
      created_by:             session ? session.userId : null,
      bodega_id:              data.bodegaId || null,
    };
    window.LAUREAN_DB.from('orders').insert(payload).select('id,order_number').single()
      .then(({ data: row, error }) => {
        if (error) { console.warn('[supabase] order insert failed:', error.message); return; }
        // Guardar el order_number / supabase_id en la versión local para enlazar luego
        const all = getOrders();
        const idx = all.findIndex(o => o.id === order.id);
        if (idx !== -1 && row) {
          all[idx].supabase_id   = row.id;
          all[idx].order_number  = row.order_number;
          saveOrders(all);
        }
      });
  }

  return order;
}

function updateOrderStatus(id, status) {
  const session = getSession();
  const orders  = getOrders();
  const idx     = orders.findIndex(o => o.id === id);
  if (idx === -1) return;
  const oldStatus = orders[idx].status;
  orders[idx].status = status;
  if (!orders[idx].history) orders[idx].history = [];
  orders[idx].history.push({
    at:   new Date().toISOString(),
    by:   session ? session.userId : null,
    name: session ? session.name   : null,
    from: oldStatus,
    to:   status,
  });
  saveOrders(orders);

  // Dual-write a Supabase si está conectado y el pedido tiene supabase_id
  if (window.LAUREAN_DB && orders[idx].supabase_id) {
    window.LAUREAN_DB.from('orders').update({ status }).eq('id', orders[idx].supabase_id)
      .then(({ error }) => { if (error) console.warn('[supabase] order status update:', error.message); });
  }
}

function getOrdersByUser(userId) {
  return getOrders().filter(o => o.userId === userId);
}

// ─── Comisiones ────────────────────────────────────────────────────────────────
function getCommissions()            { return JSON.parse(localStorage.getItem(KEYS.COMMISSIONS) || '[]'); }
function saveCommissions(commissions){ localStorage.setItem(KEYS.COMMISSIONS, JSON.stringify(commissions)); }

function createCommission(orderId, vendorCode, orderTotal) {
  const vendor = getUserByCode(vendorCode);
  if (!vendor) return null;

  const settings     = getSettings();
  const commissions  = getCommissions();
  // Tasa: 1) override individual del vendedor; 2) tasa de su NIVEL por ventas acumuladas;
  //       3) comisión base global.
  let rate;
  if (vendor.commissionRate != null && !isNaN(vendor.commissionRate)) {
    rate = vendor.commissionRate;
  } else {
    const lvl = (typeof getSellerLevel === 'function') ? getSellerLevel(vendor.id) : null;
    rate = lvl ? lvl.rate : settings.commission_rate;
  }
  const commission   = {
    id:               genId('com'),
    orderId,
    vendorId:         vendor.id,
    vendorName:       vendor.name,
    vendorCode:       vendorCode.toUpperCase(),
    orderTotal,
    commissionRate:   rate,
    commissionAmount: Math.round(orderTotal * rate),
    status:           'pendiente',
    createdAt:        new Date().toISOString(),
  };
  commissions.push(commission);
  saveCommissions(commissions);
  return commission;
}

function markCommissionPaid(id) {
  const commissions = getCommissions();
  const idx         = commissions.findIndex(c => c.id === id);
  if (idx !== -1) { commissions[idx].status = 'pagado'; saveCommissions(commissions); }
}

function getCommissionsByVendor(vendorId) {
  return getCommissions().filter(c => c.vendorId === vendorId);
}

// Nivel del vendedor (Bronce/Plata/Oro/Platino) por ventas referidas acumuladas.
function getSellerLevel(vendorId) {
  const tiers = (getSettings().seller_tiers || []).slice().sort((a, b) => (a.min || 0) - (b.min || 0));
  if (!tiers.length) return null;
  const accumulated = getCommissionsByVendor(vendorId).reduce((s, c) => s + (c.orderTotal || 0), 0);
  let idx = 0;
  for (let i = 0; i < tiers.length; i++) { if (accumulated >= (tiers[i].min || 0)) idx = i; }
  const current = tiers[idx];
  const next = tiers[idx + 1] || null;
  return {
    level: current.level, rate: current.rate, accumulated,
    next: next ? { level: next.level, min: next.min, remaining: Math.max(0, (next.min || 0) - accumulated) } : null,
  };
}
window.getSellerLevel = getSellerLevel;

// Guardado del propio perfil por el vendedor (datos de depósito): local + nube (RLS own row).
async function saveOwnProfile(fields) {
  const session = getSession();
  if (!session) return { ok: false, error: 'no_session' };
  updateUser(session.userId, fields);            // local-first
  if (window.LAUREAN_DB) {
    try {
      const { error } = await window.LAUREAN_DB.from('profiles').update(fields).eq('id', session.userId);
      if (error) return { ok: true, cloud: false, error: error.message };
    } catch (e) { return { ok: true, cloud: false, error: String(e) }; }
  }
  return { ok: true, cloud: true };
}
window.saveOwnProfile = saveOwnProfile;

// ─── Clientes ─────────────────────────────────────────────────────────────────
function getCustomers()        { return JSON.parse(localStorage.getItem(KEYS.CUSTOMERS) || '[]'); }
function saveCustomers(list)   { localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(list)); }

function findCustomerByPhone(phone) {
  if (!phone) return null;
  const clean = String(phone).replace(/\D/g, '');
  return getCustomers().find(c => String(c.phone).replace(/\D/g, '') === clean) || null;
}

function saveCustomer(customer) {
  const list    = getCustomers();
  const session = getSession();
  if (customer.id) {
    const idx = list.findIndex(c => c.id === customer.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...customer };
    } else {
      list.push(customer);
    }
  } else {
    customer.id        = genId('cust');
    customer.createdAt = new Date().toISOString();
    customer.createdBy = session ? session.userId : 'system';
    customer.orderCount    = customer.orderCount    || 0;
    customer.totalSpent_gtq= customer.totalSpent_gtq|| 0;
    customer.firstOrderAt  = customer.firstOrderAt  || null;
    customer.lastOrderAt   = customer.lastOrderAt   || null;
    list.push(customer);
  }
  saveCustomers(list);
  return customer;
}

function deleteCustomer(id) {
  saveCustomers(getCustomers().filter(c => c.id !== id));
}

function upsertCustomerFromOrder(order) {
  if (!order.customerPhone) return;
  const existing = findCustomerByPhone(order.customerPhone);
  const now = order.createdAt || new Date().toISOString();
  if (existing) {
    existing.orderCount     = (existing.orderCount || 0) + 1;
    existing.totalSpent_gtq = (existing.totalSpent_gtq || 0) + (order.total_gtq || 0);
    existing.lastOrderAt    = now;
    if (order.address) existing.address = order.address;
    saveCustomer(existing);
  } else {
    saveCustomer({
      name:           order.customerName  || '',
      phone:          order.customerPhone || '',
      email:          null,
      address:        order.address       || null,
      notes:          '',
      orderCount:     1,
      totalSpent_gtq: order.total_gtq || 0,
      firstOrderAt:   now,
      lastOrderAt:    now,
      createdBy:      'system',
    });
  }
}

// ─── Códigos de descuento ─────────────────────────────────────────────────────
function getDiscountCodes()        { return JSON.parse(localStorage.getItem(KEYS.DISCOUNT_CODES) || '[]'); }
function saveDiscountCodes(list)   { localStorage.setItem(KEYS.DISCOUNT_CODES, JSON.stringify(list)); }

function saveDiscountCode(code) {
  const list    = getDiscountCodes();
  const session = getSession();
  if (code.id) {
    const idx = list.findIndex(c => c.id === code.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...code };
    } else {
      list.push(code);
    }
  } else {
    code.id        = genId('dsc');
    code.code      = String(code.code || '').toUpperCase().trim();
    code.usedCount = 0;
    code.active    = code.active !== undefined ? code.active : true;
    code.createdAt = new Date().toISOString();
    code.createdBy = session ? session.userId : null;
    list.push(code);
  }
  saveDiscountCodes(list);
  return code;
}

function deleteDiscountCode(id) {
  saveDiscountCodes(getDiscountCodes().filter(c => c.id !== id));
}

function validateDiscountCode(codeStr) {
  if (!codeStr) return { ok: false, error: 'Ingresa un código.' };
  const upper = String(codeStr).toUpperCase().trim();
  const code  = getDiscountCodes().find(c => c.code === upper);
  if (!code)          return { ok: false, error: 'Código no válido.' };
  if (!code.active)   return { ok: false, error: 'Código inactivo.' };
  const now = new Date().toISOString();
  if (code.validFrom  && now < code.validFrom)  return { ok: false, error: 'Código no vigente aún.' };
  if (code.validUntil && now > code.validUntil) return { ok: false, error: 'Código expirado.' };
  if (code.usageLimit && code.usedCount >= code.usageLimit) return { ok: false, error: 'Código sin usos disponibles.' };
  return { ok: true, code };
}

function applyDiscountCode(codeStr, totalGtq) {
  const result = validateDiscountCode(codeStr);
  if (!result.ok) return { ok: false, error: result.error, discountGtq: 0, newTotal: totalGtq };
  const c = result.code;
  let discountGtq = 0;
  if (c.type === 'pct')   discountGtq = Math.round(totalGtq * c.value / 100);
  if (c.type === 'fixed') discountGtq = Math.min(c.value, totalGtq);
  return { ok: true, code: c, discountGtq, newTotal: Math.max(0, totalGtq - discountGtq) };
}

function incrementCodeUsage(id) {
  const list = getDiscountCodes();
  const idx  = list.findIndex(c => c.id === id);
  if (idx !== -1) { list[idx].usedCount = (list[idx].usedCount || 0) + 1; saveDiscountCodes(list); }
}

// ─── Stock bajo ────────────────────────────────────────────────────────────────
function getLowStockItems() {
  const inv      = getInventory();
  const products = getCustomProducts();
  const bodegas  = getBodegas();
  const result   = [];
  Object.entries(inv).forEach(([productId, bodegaMap]) => {
    const product = products.find(p => p.id === productId);
    const threshold = (product && product.lowStockThreshold != null) ? product.lowStockThreshold : 5;
    Object.entries(bodegaMap).forEach(([bodegaId, data]) => {
      if ((data.stock || 0) < threshold) {
        const bodega = bodegas.find(b => b.id === bodegaId);
        result.push({
          productId,
          productName: product ? product.name : productId,
          bodegaId,
          bodegaName:  bodega ? bodega.name : bodegaId,
          stock:       data.stock || 0,
          threshold,
        });
      }
    });
  });
  return result;
}

function hasLowStock() {
  return getLowStockItems().length > 0;
}

// ─── Utilidades de formato ─────────────────────────────────────────────────────
function fmtQ(n)    { return 'Q' + Number(n).toLocaleString('es-GT'); }
function fmtDate(d) {
  return new Date(d).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
}
function roleLabel(r) {
  return {
    superuser:       'Superusuario',
    admin:           'Administrador',
    vendedor:        'Vendedor',
    bodega:          'Bodega',
    agente_pedidos:  'Agente de pedidos',
  }[r] || r;
}
function statusLabel(s) {
  return {
    pendiente: 'Pendiente', procesando: 'Procesando',
    enviado: 'Enviado', completado: 'Completado', cancelado: 'Cancelado',
  }[s] || s;
}
function statusColor(s) {
  return {
    pendiente: '#C9A227', procesando: '#5FB0C9',
    enviado: '#3F77B5', completado: '#4E9A57', cancelado: '#C24A41',
  }[s] || '#9B8E7F';
}

// ─── Solicitudes de vendedoras ────────────────────────────────────────────────
function getVendorApplications() {
  return JSON.parse(localStorage.getItem('laurean_vendor_apps') || '[]');
}

async function syncVendorAppsFromSupabase() {
  const sb = window.LAUREAN_DB;
  if (!sb) return false;
  const { data, error } = await sb.from('vendor_applications')
    .select('id,name,email,phone,city,message,status,approved_at,created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error || !data) { console.warn('[supabase] sync vendor apps:', error && error.message); return false; }

  const local = getVendorApplications();
  const byId = {};
  local.forEach(app => { if (app.id) byId[app.id] = app; });

  const remoteIds = new Set();
  const remoteApps = data.map(r => {
    remoteIds.add(r.id);
    const prev = byId[r.id] || {};
    return {
      id:         r.id,
      name:       r.name    || prev.name    || '',
      email:      r.email   || prev.email   || '',
      phone:      r.phone   || prev.phone   || '',
      city:       r.city    || prev.city    || '',
      message:    r.message || prev.message || '',
      status:     r.status  || prev.status  || 'pendiente',
      approvedAt: r.approved_at,
      createdAt:  r.created_at || prev.createdAt || new Date().toISOString(),
    };
  });
  const localOnly = local.filter(app => !remoteIds.has(app.id));
  localStorage.setItem('laurean_vendor_apps', JSON.stringify([...remoteApps, ...localOnly]));
  return true;
}
window.syncVendorAppsFromSupabase = syncVendorAppsFromSupabase;

function createVendorApplication(data) {
  const apps = getVendorApplications();
  const app = {
    id:        genId('app'),
    name:      data.name    || '',
    email:     data.email   || '',
    phone:     data.phone   || '',
    city:      data.city    || '',
    message:   data.message || '',
    status:    'pendiente',
    createdAt: new Date().toISOString(),
  };
  apps.push(app);
  localStorage.setItem('laurean_vendor_apps', JSON.stringify(apps));
  if (window.LAUREAN_DB) {
    window.LAUREAN_DB.from('vendor_applications').insert({
      id: app.id,
      name: app.name,
      email: app.email || null,
      phone: app.phone || null,
      city: app.city || null,
      message: app.message || null,
      status: 'pendiente',
      created_at: app.createdAt,
    }).then(({ error }) => { if (error) console.warn('[supabase] vendor app insert:', error.message); });
  }
  return app;
}

function updateVendorApplication(id, updates) {
  const apps = getVendorApplications();
  const idx  = apps.findIndex(a => a.id === id);
  if (idx === -1) return { ok: false, error: 'Solicitud no encontrada.' };
  apps[idx] = { ...apps[idx], ...updates };
  localStorage.setItem('laurean_vendor_apps', JSON.stringify(apps));
  if (window.LAUREAN_DB && Object.prototype.hasOwnProperty.call(updates, 'status')) {
    window.LAUREAN_DB.from('vendor_applications')
      .update({ status: updates.status, approved_at: updates.approvedAt || null })
      .eq('id', id)
      .then(({ error }) => { if (error) console.warn('[supabase] vendor app update:', error.message); });
  }
  return { ok: true, app: apps[idx] };
}

// ─── Categorías personalizadas ────────────────────────────────────────────────
function getCustomCategories() {
  return JSON.parse(localStorage.getItem('laurean_custom_categories') || '[]');
}

function saveCustomCategory(category) {
  const cats = getCustomCategories();
  if (category.id) {
    const idx = cats.findIndex(c => c.id === category.id);
    if (idx !== -1) { cats[idx] = { ...cats[idx], ...category }; }
    else            { cats.push(category); }
  } else {
    category.id        = genId('cat');
    category.createdAt = new Date().toISOString();
    cats.push(category);
  }
  localStorage.setItem('laurean_custom_categories', JSON.stringify(cats));
  // Dual-write a Supabase (fire-and-forget) si está conectado
  if (window.LAUREAN_DB) {
    window.LAUREAN_DB.from('categories').upsert({
      id: category.id,
      name: category.name,
      image_url: category.image || null,
      starting_price_gtq: category.starting_price_gtq || 0,
      starting_price_usd: category.starting_price_usd || 0,
      active: true,
    }).then(({ error }) => { if (error) console.warn('[supabase] upsert category:', error.message); });
  }
  return category;
}

function deleteCustomCategory(id) {
  const cats = getCustomCategories().filter(c => c.id !== id);
  localStorage.setItem('laurean_custom_categories', JSON.stringify(cats));
  if (window.LAUREAN_DB) {
    window.LAUREAN_DB.from('categories').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('[supabase] delete category:', error.message); });
  }
}

// ─── Productos personalizados ──────────────────────────────────────────────────
function getCustomProducts() {
  return JSON.parse(localStorage.getItem('laurean_custom_products') || '[]');
}

function saveCustomProduct(product) {
  const products = getCustomProducts();
  if (product.id) {
    const idx = products.findIndex(p => p.id === product.id);
    if (idx !== -1) { products[idx] = { ...products[idx], ...product }; }
    else            { products.push(product); }
  } else {
    product.id        = genId('prd');
    product.createdAt = new Date().toISOString();
    products.push(product);
  }
  localStorage.setItem('laurean_custom_products', JSON.stringify(products));
  // Dual-write a Supabase (fire-and-forget) si está conectado
  if (window.LAUREAN_DB) {
    const parentId = product.category || product.parent || product.category_parent || null;
    const subcatId = product.subcat || product.subcat_id || null;
    window.LAUREAN_LAST_PRODUCT_WRITE = window.LAUREAN_DB.from('products').upsert({
      id: product.id,
      name: product.name,
      image_url: product.image || product.image_url || null,
      description: product.description || null,
      price_gtq: product.price_gtq || 0,
      price_usd: product.price_usd || 0,
      parent_id: parentId || null,
      subcat_id: subcatId || null,
      stock: product.stock ?? 0,
      is_new_arrival: !!product.is_new_arrival,
      gallery: Array.isArray(product.gallery) ? product.gallery : [],
      variants: Array.isArray(product.variants) ? product.variants : [],
      active: product.active !== false,
    }).then(({ error }) => { if (error) console.warn('[supabase] upsert product:', error.message); });
  }
  return product;
}

function deleteCustomProduct(id) {
  const products = getCustomProducts().filter(p => p.id !== id);
  localStorage.setItem('laurean_custom_products', JSON.stringify(products));
  if (window.LAUREAN_DB) {
    window.LAUREAN_LAST_PRODUCT_WRITE = window.LAUREAN_DB.from('products').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('[supabase] delete product:', error.message); });
  }
}

// ─── Proveedores ───────────────────────────────────────────────────────────────
function getProveedores() {
  return JSON.parse(localStorage.getItem('laurean_proveedores') || '[]');
}

function saveProveedor(proveedor) {
  const list = getProveedores();
  if (proveedor.id) {
    const idx = list.findIndex(p => p.id === proveedor.id);
    if (idx !== -1) { list[idx] = { ...list[idx], ...proveedor }; }
    else            { list.push(proveedor); }
  } else {
    proveedor.id        = genId('prv');
    proveedor.createdAt = new Date().toISOString();
    list.push(proveedor);
  }
  localStorage.setItem('laurean_proveedores', JSON.stringify(list));
  return proveedor;
}

function deleteProveedor(id) {
  const list = getProveedores().filter(p => p.id !== id);
  localStorage.setItem('laurean_proveedores', JSON.stringify(list));
}

// ─── Bodegas ───────────────────────────────────────────────────────────────────
function getBodegas() {
  return JSON.parse(localStorage.getItem('laurean_bodegas') || '[]');
}

function ensureDefaultBodegas() {
  const list = getBodegas();
  const defaults = [
    { id: 'bdg_central', name: 'Bodega Central', protected: true, notes: 'Bodega principal · reparte el inventario' },
    { id: 'bdg_website', name: 'Website',        protected: true, notes: 'Inventario publicado en la tienda' },
  ];
  let changed = false;
  defaults.forEach(d => {
    const ex = list.find(b => b.id === d.id);
    if (!ex) { list.push({ ...d, createdAt: new Date().toISOString() }); changed = true; }
    else if (!ex.protected) { ex.protected = true; changed = true; }
  });
  if (changed) localStorage.setItem('laurean_bodegas', JSON.stringify(list));
  return list;
}

function saveBodega(bodega) {
  const list = getBodegas();
  if (bodega.id) {
    const idx = list.findIndex(b => b.id === bodega.id);
    if (idx !== -1) { list[idx] = { ...list[idx], ...bodega }; }
    else            { list.push(bodega); }
  } else {
    bodega.id        = genId('bdg');
    bodega.createdAt = new Date().toISOString();
    list.push(bodega);
  }
  localStorage.setItem('laurean_bodegas', JSON.stringify(list));
  return bodega;
}

function deleteBodega(id) {
  const target = getBodegas().find(b => b.id === id);
  if (target && target.protected) return;
  const list = getBodegas().filter(b => b.id !== id);
  localStorage.setItem('laurean_bodegas', JSON.stringify(list));
}

// ─── Cotizaciones ──────────────────────────────────────────────────────────────
function getCotizaciones() {
  return JSON.parse(localStorage.getItem('laurean_cotizaciones') || '[]');
}

function saveCotizacion(cotizacion) {
  const list = getCotizaciones();
  if (cotizacion.id) {
    const idx = list.findIndex(c => c.id === cotizacion.id);
    if (idx !== -1) { list[idx] = { ...list[idx], ...cotizacion }; }
    else            { list.push(cotizacion); }
  } else {
    cotizacion.id        = genId('cot');
    cotizacion.status    = cotizacion.status || 'borrador';
    cotizacion.createdAt = new Date().toISOString();
    list.push(cotizacion);
  }
  localStorage.setItem('laurean_cotizaciones', JSON.stringify(list));
  return cotizacion;
}

function deleteCotizacion(id) {
  const list = getCotizaciones().filter(c => c.id !== id);
  localStorage.setItem('laurean_cotizaciones', JSON.stringify(list));
}

// ─── Combos ────────────────────────────────────────────────────────────────────
function getCombos() {
  return JSON.parse(localStorage.getItem(KEYS.COMBOS) || '[]');
}

function saveCombo(combo) {
  const list    = getCombos();
  const session = getSession();
  const now     = new Date().toISOString();
  let action    = 'modified';

  if (combo.id) {
    const idx = list.findIndex(c => c.id === combo.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...combo };
    } else {
      list.push(combo);
    }
  } else {
    combo.id        = genId('cmb');
    combo.createdAt = now;
    combo.createdBy = session ? session.userId : null;
    combo.active    = combo.active !== undefined ? combo.active : false;
    combo.activatedAt   = null;
    combo.deactivatedAt = null;
    list.push(combo);
    action = 'created';
  }

  localStorage.setItem(KEYS.COMBOS, JSON.stringify(list));
  _addComboHistoryEntry(combo.id || list[list.length - 1].id, action);
  return list.find(c => c.id === combo.id) || list[list.length - 1];
}

function deleteCombo(id) {
  const list = getCombos().filter(c => c.id !== id);
  localStorage.setItem(KEYS.COMBOS, JSON.stringify(list));
}

function toggleComboActive(id) {
  const list = getCombos();
  const idx  = list.findIndex(c => c.id === id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  list[idx].active = !list[idx].active;
  if (list[idx].active) {
    list[idx].activatedAt   = now;
    list[idx].deactivatedAt = null;
  } else {
    list[idx].deactivatedAt = now;
  }
  localStorage.setItem(KEYS.COMBOS, JSON.stringify(list));
  _addComboHistoryEntry(id, list[idx].active ? 'activated' : 'deactivated');
  return list[idx];
}

function reactivateComboFromHistory(historyId) {
  const hist = getComboHistory().find(h => h.id === historyId);
  if (!hist || !hist.snapshot) return null;
  const restored = { ...hist.snapshot, active: true, activatedAt: new Date().toISOString(), deactivatedAt: null };
  delete restored.id;
  return saveCombo(restored);
}

// ─── Historial de Combos ───────────────────────────────────────────────────────
function getComboHistory() {
  return JSON.parse(localStorage.getItem(KEYS.COMBO_HISTORY) || '[]');
}

function getComboHistoryByCombo(comboId) {
  return getComboHistory().filter(h => h.comboId === comboId);
}

function _addComboHistoryEntry(comboId, action) {
  const list    = getComboHistory();
  const combo   = getCombos().find(c => c.id === comboId);
  const session = getSession();
  const entry   = {
    id:        genId('chist'),
    comboId,
    comboName: combo ? combo.name : '',
    action,
    timestamp: new Date().toISOString(),
    userId:    session ? session.userId : null,
    snapshot:  combo ? { ...combo } : null,
  };
  list.unshift(entry);
  localStorage.setItem(KEYS.COMBO_HISTORY, JSON.stringify(list));
  return entry;
}

// ─── Inventario ────────────────────────────────────────────────────────────────
function getInventory() {
  return JSON.parse(localStorage.getItem(KEYS.INVENTORY) || '{}');
}

function getStockForProduct(productId) {
  return getInventory()[productId] || {};
}

function getStockForBodega(bodegaId) {
  const inv    = getInventory();
  const result = {};
  Object.entries(inv).forEach(([productId, bodegas]) => {
    if (bodegas[bodegaId]) result[productId] = bodegas[bodegaId];
  });
  return result;
}

function getStockValue(productId, bodegaId) {
  const inv = getInventory();
  return (inv[productId] && inv[productId][bodegaId]) ? inv[productId][bodegaId].stock : 0;
}

// delta: positivo = entrada, negativo = salida
function updateStock(productId, bodegaId, delta, type, meta = {}) {
  const session  = getSession();
  const inv      = getInventory();
  if (!inv[productId]) inv[productId] = {};
  if (!inv[productId][bodegaId]) inv[productId][bodegaId] = { stock: 0 };

  const previousStock = inv[productId][bodegaId].stock;
  const newStock      = Math.max(0, previousStock + delta);
  inv[productId][bodegaId].stock     = newStock;
  inv[productId][bodegaId].updatedAt = new Date().toISOString();
  localStorage.setItem(KEYS.INVENTORY, JSON.stringify(inv));

  const movements = getInventoryMovements();
  const bodega    = getBodegas().find(b => b.id === bodegaId);
  const fromBodega = meta.fromBodega || null;
  const toBodega   = meta.toBodega   || null;
  const fromBodegaName = meta.fromBodegaName || (fromBodega ? (getBodegas().find(b => b.id === fromBodega)?.name || fromBodega) : null);
  const toBodegaName   = meta.toBodegaName   || (toBodega   ? (getBodegas().find(b => b.id === toBodega)?.name   || toBodega)   : null);
  movements.unshift({
    id:            genId('mov'),
    type,
    productId,
    productName:   meta.productName || productId,
    bodegaId,
    bodegaName:    bodega ? bodega.name : bodegaId,
    fromBodega,
    fromBodegaName,
    toBodega,
    toBodegaName,
    quantity:      delta,
    previousStock,
    newStock,
    proveedorId:   meta.proveedorId   || null,
    proveedorName: meta.proveedorName || null,
    motivo:        meta.motivo        || null,
    notes:         meta.notes         || '',
    unitCost:      meta.unitCost != null ? meta.unitCost : null,
    totalCost:     meta.unitCost != null ? meta.unitCost * Math.abs(delta) : null,
    sizes:         Array.isArray(meta.sizes) ? meta.sizes : null,
    paid:          meta.paid === true,
    createdAt:     new Date().toISOString(),
    createdBy:     session ? session.userId : null,
    createdByName: session ? (session.userName || session.name || null) : null,
  });
  localStorage.setItem(KEYS.INV_MOVEMENTS, JSON.stringify(movements));

  if (window.LAUREAN_DB) {
    const prods = (typeof getAdminProducts === 'function') ? getAdminProducts() : [];
    const p = prods.find(x => x.id === productId);
    const cod = p && p.source_cod ? String(p.source_cod) : null;
    if (cod) {
      const movementType = type === 'ajuste'
        ? 'ajuste'
        : (type === 'transferencia' || type === 'traslado') ? 'transferencia' : (delta >= 0 ? 'ingreso' : 'salida');
      window.LAUREAN_DB.from('inventory_stock')
        .upsert({ cod, bodega_id: bodegaId, stock: newStock, updated_at: new Date().toISOString() }, { onConflict: 'cod,bodega_id' })
        .then(({ error }) => { if (error) console.warn('[supabase] stock upsert:', error.message); });
      window.LAUREAN_DB.from('inventory_movements').insert({
        cod,
        product_id: productId,
        product_name: meta.productName || productId,
        type: movementType,
        from_bodega: (meta && meta.fromBodega) || (delta < 0 ? bodegaId : null),
        to_bodega:   (meta && meta.toBodega)   || (delta >= 0 ? bodegaId : null),
        quantity: Math.abs(delta),
        previous_stock: previousStock,
        new_stock: newStock,
        motivo: (meta && meta.motivo) || type,
        notes: (meta && meta.notes) || null,
        created_by_name: session ? (session.name || session.email || session.userName || null) : null,
      }).then(({ error }) => { if (error) console.warn('[supabase] movement insert:', error.message); });
    }
  }
  return newStock;
}

function ajustarStock(productId, bodegaId, newStock, notes = '') {
  const current = getStockValue(productId, bodegaId);
  const delta   = newStock - current;
  return updateStock(productId, bodegaId, delta, 'ajuste', { notes });
}

function getInventoryMovements(filters = {}) {
  let list = JSON.parse(localStorage.getItem(KEYS.INV_MOVEMENTS) || '[]');
  if (Array.isArray(filters.productIds) && filters.productIds.length) {
    const productIds = filters.productIds.map(id => String(id)).filter(Boolean);
    list = list.filter(m => productIds.includes(String(m.productId)));
  } else if (filters.productId) {
    list = list.filter(m => m.productId   === filters.productId);
  }
  if (filters.bodegaId)   list = list.filter(m => m.bodegaId    === filters.bodegaId);
  if (filters.type)       list = list.filter(m => m.type        === filters.type);
  if (filters.proveedorId)list = list.filter(m => m.proveedorId === filters.proveedorId);
  if (filters.from)       list = list.filter(m => m.createdAt   >= filters.from);
  if (filters.to)         list = list.filter(m => m.createdAt   <= filters.to);
  return list;
}

// Arrancar siempre que se cargue este script
initStore();

// ─── Service Worker (caché de imágenes/CSS/fuentes por 7 días) ────────────────
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) =>
      console.warn('[sw] registro falló:', e?.message || e)
    );
  });
}
