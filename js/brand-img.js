// ============================================================
// LAUREAN — brand-img loader
//
// Cablea el fade-in de las fotos con clase `.brand-img-photo`
// (dentro de un contenedor `.brand-img`). Funciona con imágenes
// presentes en el HTML y con imágenes insertadas dinámicamente.
//
// Estados:
//   - mientras carga / sin src / si falla → se ve el logo tenue
//     del contenedor `.brand-img` (CSS en css/brand.css).
//   - al cargar bien → `.is-loaded` (fade-in y cubre el logo).
//   - si falla → `.is-error` (se oculta para dejar ver el logo).
// ============================================================

(function () {
  function settle(img) {
    if (!img || !img.classList || !img.classList.contains('brand-img-photo')) return;
    // Sin src útil → dejar el placeholder de marca.
    const src = img.getAttribute('src');
    if (!src) { img.classList.add('is-error'); return; }
    if (img.complete) {
      if (img.naturalWidth > 0) img.classList.add('is-loaded');
      else img.classList.add('is-error');
    }
  }

  // Captura: load/error burbujean mal, pero sí se propagan en fase de captura.
  document.addEventListener('load', function (e) {
    const t = e.target;
    if (t && t.classList && t.classList.contains('brand-img-photo')) {
      t.classList.remove('is-error');
      t.classList.add('is-loaded');
    }
  }, true);

  document.addEventListener('error', function (e) {
    const t = e.target;
    if (t && t.classList && t.classList.contains('brand-img-photo')) {
      t.classList.remove('is-loaded');
      t.classList.add('is-error');
    }
  }, true);

  // Imágenes ya en caché al cargar / re-escaneo manual.
  function scan(root) {
    (root || document).querySelectorAll('.brand-img-photo').forEach(settle);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { scan(); });
  } else {
    scan();
  }

  // Para volver a evaluar tras render dinámico (catálogo, combos, etc.).
  window.LAUREAN_BRAND_IMG_SCAN = scan;
})();
