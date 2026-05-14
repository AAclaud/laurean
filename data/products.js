// ============================================================
// LAUREAN — Catálogo de Productos  v2
//
// Estructura de un producto:
//   id            → identificador único (sin espacios ni tildes)
//   name          → nombre visible
//   image         → ruta relativa (ej: "images/archivo.jpg")
//   price_gtq     → precio público en Quetzales
//   price_usd     → precio público en dólares
//   parent        → id de parentCategory ("mujer","hombre","kids","ofertas","accesorios")
//   subcat        → id de subcategory (ej: "blusas", "tshirt")
//   is_new_arrival → true para mostrar badge "NEW"
//   flash_end     → ISO string de fin de oferta flash (solo subcategoría "flash")
// ============================================================

window.LAUREAN_DATA = {

  // ─── CATEGORÍAS PADRE (nav principal) ──────────────────────────────────────
  parentCategories: [
    {
      id:    'mujer',
      name:  'Mujer',
      image: 'images/laurean_category_ella.jpg',
      subcats: ['novedades','blusas','conjuntos','vestidos'],
      starting_price_gtq: 749,
      starting_price_usd: 97,
    },
    {
      id:    'hombre',
      name:  'Hombre',
      image: 'images/laurean_category_el.jpg',
      subcats: ['tshirt','boxer'],
      starting_price_gtq: 799,
      starting_price_usd: 104,
    },
    {
      id:    'kids',
      name:  'Laurean Kids',
      image: 'images/laurean_category_ninos.jpg',
      subcats: ['nina-pijamas','nina-licra','nino-pijamas'],
      starting_price_gtq: 549,
      starting_price_usd: 71,
    },
    {
      id:    'ofertas',
      name:  'Ofertas',
      image: 'images/laurean_category_ella.jpg',
      subcats: ['flash','promociones'],
      starting_price_gtq: 199,
      starting_price_usd: 26,
    },
  ],

  // ─── SUB-CATEGORÍAS ─────────────────────────────────────────────────────────
  subcategories: [
    // Mujer
    { id: 'novedades',   name: 'Novedades',    parent: 'mujer'   },
    { id: 'blusas',      name: 'Blusas',       parent: 'mujer'   },
    { id: 'conjuntos',   name: 'Conjuntos',    parent: 'mujer'   },
    { id: 'vestidos',    name: 'Vestidos',      parent: 'mujer'   },
    // Hombre
    { id: 'tshirt',      name: 'T-Shirt',      parent: 'hombre'  },
    { id: 'boxer',       name: 'Boxer',        parent: 'hombre'  },
    // Kids
    { id: 'nina-pijamas', name: 'Niña · Pijamas', parent: 'kids' },
    { id: 'nina-licra',   name: 'Niña · Licra',   parent: 'kids' },
    { id: 'nino-pijamas', name: 'Niño · Pijamas',  parent: 'kids' },
    // Ofertas
    { id: 'flash',       name: 'Ofertas Flash', parent: 'ofertas' },
    { id: 'promociones', name: 'Promociones',   parent: 'ofertas' },
  ],

  // ─── PRODUCTOS ──────────────────────────────────────────────────────────────
  products: [
    // ── Mujer ──
    {
      id: 'sweater-mujer-01',
      name: 'Sweater Mujer',
      image: 'images/laurean_mujer_sweater.jpg',
      price_gtq: 749,
      price_usd: 97,
      parent: 'mujer',
      subcat: 'novedades',
      is_new_arrival: true,
    },
    {
      id: 'blusa-floral-01',
      name: 'Blusa Floral',
      image: 'images/laurean_mujer_sweater.jpg',
      price_gtq: 399,
      price_usd: 52,
      parent: 'mujer',
      subcat: 'blusas',
      is_new_arrival: false,
    },
    {
      id: 'conjunto-mujer-01',
      name: 'Conjunto Casual',
      image: 'images/laurean_mujer_sweater.jpg',
      price_gtq: 899,
      price_usd: 117,
      parent: 'mujer',
      subcat: 'conjuntos',
      is_new_arrival: false,
    },
    {
      id: 'vestido-01',
      name: 'Vestido Verano',
      image: 'images/laurean_mujer_sweater.jpg',
      price_gtq: 649,
      price_usd: 84,
      parent: 'mujer',
      subcat: 'vestidos',
      is_new_arrival: true,
    },

    // ── Hombre ──
    {
      id: 'sweater-hombre-01',
      name: 'Sweater Hombre',
      image: 'images/laurean_hombre_sweater.jpg',
      price_gtq: 799,
      price_usd: 104,
      parent: 'hombre',
      subcat: 'tshirt',
      is_new_arrival: false,
    },
    {
      id: 'tshirt-hombre-01',
      name: 'T-Shirt Clásico',
      image: 'images/laurean_hombre_sweater.jpg',
      price_gtq: 299,
      price_usd: 39,
      parent: 'hombre',
      subcat: 'tshirt',
      is_new_arrival: true,
    },
    {
      id: 'boxer-hombre-01',
      name: 'Boxer Premium',
      image: 'images/laurean_hombre_sweater.jpg',
      price_gtq: 199,
      price_usd: 26,
      parent: 'hombre',
      subcat: 'boxer',
      is_new_arrival: false,
    },

    // ── Laurean Kids ──
    {
      id: 'pijama-nina-01',
      name: 'Pijama Niña',
      image: 'images/laurean_nina_sweater.jpg',
      price_gtq: 349,
      price_usd: 45,
      parent: 'kids',
      subcat: 'nina-pijamas',
      is_new_arrival: false,
    },
    {
      id: 'licra-nina-01',
      name: 'Licra Niña',
      image: 'images/laurean_nina_sweater.jpg',
      price_gtq: 249,
      price_usd: 32,
      parent: 'kids',
      subcat: 'nina-licra',
      is_new_arrival: true,
    },
    {
      id: 'pijama-nino-01',
      name: 'Pijama Niño',
      image: 'images/laurean_nina_sweater.jpg',
      price_gtq: 349,
      price_usd: 45,
      parent: 'kids',
      subcat: 'nino-pijamas',
      is_new_arrival: false,
    },

    // ── Ofertas ──
    {
      id: 'sweater-nina-01',
      name: 'Sweater Niña (Oferta)',
      image: 'images/laurean_nina_sweater.jpg',
      price_gtq: 399,
      price_usd: 52,
      parent: 'ofertas',
      subcat: 'flash',
      is_new_arrival: false,
      flash_end: '2026-06-30T23:59:00.000Z',
    },
    {
      id: 'promo-conjunto-01',
      name: 'Conjunto Promo',
      image: 'images/laurean_mujer_sweater.jpg',
      price_gtq: 699,
      price_usd: 91,
      parent: 'ofertas',
      subcat: 'promociones',
      is_new_arrival: false,
    },
  ],

  // ─── ACCESORIOS Y CALZADO (sección independiente) ──────────────────────────
  accessories: [
    {
      id: 'tote-bag-01',
      name: 'Tote Bag',
      image: 'images/accessories/tote-bag.jpg',
      price_gtq: 299,
      price_usd: 39,
      category: 'accesorios',
    },
    {
      id: 'bangles-01',
      name: 'Bangles',
      image: 'images/accessories/bangles.jpg',
      price_gtq: 199,
      price_usd: 26,
      category: 'accesorios',
    },
    {
      id: 'cinturon-01',
      name: 'Cinturón',
      image: 'images/accessories/cinturon.jpg',
      price_gtq: 349,
      price_usd: 45,
      category: 'accesorios',
    },
    {
      id: 'sandalia-01',
      name: 'Sandalia',
      image: 'images/accessories/sandalia.jpg',
      price_gtq: 549,
      price_usd: 71,
      category: 'calzado',
    },
  ],

  // ─── LEGACY: mantenido para compatibilidad con código previo ────────────────
  // admin.html getAllProducts() y renderProducts() en Laurean.html lo usaban.
  // Migrar a products[] cuando se actualicen esas funciones.
  categories: [
    { id: 'mujer',  name: 'Mujer',         image: 'images/laurean_category_ella.jpg',  starting_price_gtq: 749,  starting_price_usd: 97  },
    { id: 'hombre', name: 'Hombre',        image: 'images/laurean_category_el.jpg',    starting_price_gtq: 799,  starting_price_usd: 104 },
    { id: 'kids',   name: 'Laurean Kids',  image: 'images/laurean_category_ninos.jpg', starting_price_gtq: 549,  starting_price_usd: 71  },
    { id: 'ofertas',name: 'Ofertas',       image: 'images/laurean_category_ella.jpg',  starting_price_gtq: 199,  starting_price_usd: 26  },
  ],
  sweaters: [], // migrado a products[]

};
