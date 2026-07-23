/* Cursor tipo Mac ahora es 100% CSS (css/cursor.css): flecha blanca con borde negro,
   visible en cualquier fondo, sin el aro que seguía el mouse. Este archivo queda como
   no-op para no romper las <script src="js/cursor.js"> ya repartidas en las páginas.
   Además limpia el punto/aro que hubiera quedado de una versión anterior en caché. */
(function () {
  try {
    document.querySelectorAll('.cursor-dot, .cursor-ring').forEach(function (el) { el.remove(); });
  } catch (e) { /* noop */ }
})();
