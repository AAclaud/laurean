/* El sitio usa el cursor estándar del navegador.
   Este archivo queda como no-op para conservar las referencias existentes y
   limpiar cualquier punto/aro personalizado de una versión anterior en caché. */
(function () {
  try {
    document.querySelectorAll('.cursor-dot, .cursor-ring').forEach(function (el) { el.remove(); });
  } catch (e) { /* noop */ }
})();
