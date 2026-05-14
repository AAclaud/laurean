// ============================================================
// LAUREAN — Auth & Data Store  (Fase 1 · localStorage)
// FASE 2: reemplazar con Firebase. Las funciones públicas
// mantienen la misma firma para facilitar la migración.
// ============================================================

const KEYS = {
  USERS:        'laurean_users',
  SESSION:      'laurean_session',
  ORDERS:       'laurean_orders',
  COMMISSIONS:  'laurean_commissions',
  PRICES:       'laurean_prices',
  SETTINGS:     'laurean_settings',
};

const DEFAULT_SETTINGS = {
  seller_discount:    0.15,   // vendedor paga 15% menos que precio público
  bodega_discount:    0.30,   // bodega paga 30% menos que precio público
  referral_discount:  0.05,   // cliente con código referido obtiene 5% off
  commission_rate:    0.05,   // comisión del vendedor sobre venta referida
  discount_pin:       '1234', // PIN para descuentos manuales en checkout
};

// Contraseñas en btoa() — solo ofuscación para Fase 1.
// Fase 2: Firebase Auth maneja esto de forma segura.
const SEED_USERS = [
  {
    id: 'su_001',
    name: 'AA Projects',
    email: 'super@aaprojects.com',
    password: btoa('SuperAA2026!'),
    role: 'superuser',
    code: null,
    active: true,
    phone: '',
    notes: 'Cuenta de soporte/mantenimiento',
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: null,
  },
  {
    id: 'adm_001',
    name: 'Admin Laurean',
    email: 'admin@laurean.gt',
    password: btoa('Admin2026!'),
    role: 'admin',
    code: null,
    active: true,
    phone: '',
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'su_001',
  },
];

// ─── Inicialización ────────────────────────────────────────────────────────────
function initStore() {
  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(SEED_USERS));
  }
  if (!localStorage.getItem(KEYS.SETTINGS)) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  } else {
    // Migrar settings existentes agregando campos nuevos si faltan
    const existing = JSON.parse(localStorage.getItem(KEYS.SETTINGS));
    const merged   = { ...DEFAULT_SETTINGS, ...existing };
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(merged));
  }
  if (!localStorage.getItem(KEYS.ORDERS)) {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.COMMISSIONS)) {
    localStorage.setItem(KEYS.COMMISSIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.PRICES)) {
    localStorage.setItem(KEYS.PRICES, JSON.stringify({}));
  }
  ['laurean_vendor_apps','laurean_custom_products','laurean_custom_categories',
   'laurean_proveedores','laurean_bodegas','laurean_cotizaciones'].forEach(k => {
    if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify([]));
  });
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

function createUser({ name, email, password, role, phone = '', notes = '' }) {
  const users = getUsers();
  if (getUserByEmail(email)) return { ok: false, error: 'El correo ya está registrado.' };

  const session = getSession();
  const needsCode = role === 'vendedor' || role === 'bodega';
  const prefix    = role === 'vendedor' ? 'vnd' : role === 'bodega' ? 'bdg' : 'adm';

  const user = {
    id: genId(prefix),
    name, email,
    password: btoa(password),
    role,
    code:  needsCode ? genSellerCode(name) : null,
    phone, notes,
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

// ─── Sesión ────────────────────────────────────────────────────────────────────
function login(email, password) {
  const user = getUserByEmail(email);
  if (!user)        return { ok: false, error: 'Usuario no encontrado.' };
  if (!user.active) return { ok: false, error: 'Cuenta desactivada. Contacta al administrador.' };
  if (user.password !== btoa(password)) return { ok: false, error: 'Contraseña incorrecta.' };

  const session = {
    userId: user.id,
    role:   user.role,
    name:   user.name,
    email:  user.email,
    code:   user.code,
  };
  localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
  return { ok: true, session };
}

function logout() {
  localStorage.removeItem(KEYS.SESSION);
}

function getSession() {
  const raw = localStorage.getItem(KEYS.SESSION);
  return raw ? JSON.parse(raw) : null;
}

// Redirige al login si la sesión no cumple los roles requeridos.
function requireAuth(allowedRoles = []) {
  const session = getSession();
  if (!session) { window.location.href = 'login.html'; return null; }
  if (allowedRoles.length && !allowedRoles.includes(session.role)) {
    window.location.href = 'login.html'; return null;
  }
  return session;
}

// ─── Configuración ─────────────────────────────────────────────────────────────
function getSettings()     { return JSON.parse(localStorage.getItem(KEYS.SETTINGS) || JSON.stringify(DEFAULT_SETTINGS)); }
function saveSettings(s)   { localStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...DEFAULT_SETTINGS, ...s })); }

// ─── Precios ───────────────────────────────────────────────────────────────────
function getPriceOverrides()    { return JSON.parse(localStorage.getItem(KEYS.PRICES) || '{}'); }
function savePriceOverride(id, data) {
  const overrides = getPriceOverrides();
  overrides[id] = { ...overrides[id], ...data };
  localStorage.setItem(KEYS.PRICES, JSON.stringify(overrides));
}

// Retorna { gtq, usd } según el rol del usuario.
function getProductPrice(productId, baseGtq, baseUsd, role) {
  const overrides = getPriceOverrides();
  const settings  = getSettings();
  const ov        = overrides[productId];

  if (role === 'bodega') {
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

// Verifica el PIN de descuento manual.
function verifyDiscountPin(pin) {
  return String(pin) === String(getSettings().discount_pin);
}

// ─── Órdenes ───────────────────────────────────────────────────────────────────
function getOrders()          { return JSON.parse(localStorage.getItem(KEYS.ORDERS) || '[]'); }
function saveOrders(orders)   { localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders)); }

function createOrder(data) {
  const orders = getOrders();
  const order  = { id: genId('ord'), ...data, status: 'pendiente', createdAt: new Date().toISOString() };
  orders.push(order);
  saveOrders(orders);

  if (data.referral_code) {
    createCommission(order.id, data.referral_code, data.total_gtq);
  }
  return order;
}

function updateOrderStatus(id, status) {
  const orders = getOrders();
  const idx    = orders.findIndex(o => o.id === id);
  if (idx !== -1) { orders[idx].status = status; saveOrders(orders); }
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
  const commission   = {
    id:               genId('com'),
    orderId,
    vendorId:         vendor.id,
    vendorName:       vendor.name,
    vendorCode:       vendorCode.toUpperCase(),
    orderTotal,
    commissionRate:   settings.commission_rate,
    commissionAmount: Math.round(orderTotal * settings.commission_rate),
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

// ─── Utilidades de formato ─────────────────────────────────────────────────────
function fmtQ(n)    { return 'Q' + Number(n).toLocaleString('es-GT'); }
function fmtDate(d) {
  return new Date(d).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
}
function roleLabel(r) {
  return { superuser: 'Superusuario', admin: 'Administrador', vendedor: 'Vendedor', bodega: 'Bodega' }[r] || r;
}
function statusLabel(s) {
  return {
    pendiente: 'Pendiente', procesando: 'Procesando',
    enviado: 'Enviado', completado: 'Completado', cancelado: 'Cancelado',
  }[s] || s;
}
function statusColor(s) {
  return {
    pendiente: '#9B8E7F', procesando: '#D4A017',
    enviado: '#4A90D9', completado: '#4CAF50', cancelado: '#E53935',
  }[s] || '#9B8E7F';
}

// ─── Solicitudes de vendedoras ────────────────────────────────────────────────
function getVendorApplications() {
  return JSON.parse(localStorage.getItem('laurean_vendor_apps') || '[]');
}

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
  return app;
}

function updateVendorApplication(id, updates) {
  const apps = getVendorApplications();
  const idx  = apps.findIndex(a => a.id === id);
  if (idx === -1) return { ok: false, error: 'Solicitud no encontrada.' };
  apps[idx] = { ...apps[idx], ...updates };
  localStorage.setItem('laurean_vendor_apps', JSON.stringify(apps));
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
  return category;
}

function deleteCustomCategory(id) {
  const cats = getCustomCategories().filter(c => c.id !== id);
  localStorage.setItem('laurean_custom_categories', JSON.stringify(cats));
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
  return product;
}

function deleteCustomProduct(id) {
  const products = getCustomProducts().filter(p => p.id !== id);
  localStorage.setItem('laurean_custom_products', JSON.stringify(products));
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

// Arrancar siempre que se cargue este script
initStore();
