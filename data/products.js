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

// ─── Feature flags globales ─────────────────────────────────
// SHOW_USD: muestra precios en USD junto al GTQ. Apagado mientras no haya venta internacional.
// La data USD se mantiene en localStorage/DB para reactivar sin migración.
window.LAUREAN_FLAGS = {
  SHOW_USD: false,
};

// Propaga flags al DOM para que el CSS pueda reaccionar con `html[data-show-usd="false"] .usd-only`
(function applyFlags(){
  var el = document.documentElement;
  el.dataset.showUsd = window.LAUREAN_FLAGS.SHOW_USD ? 'true' : 'false';
})();

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
  products: [],

  // ─── ACCESORIOS Y CALZADO (sección independiente) ──────────────────────────
  accessories: [],

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
