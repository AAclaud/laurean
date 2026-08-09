/* Ayudas contextuales del dashboard
 * ---------------------------------------------------------------------------
 * Dos piezas, ambas alimentadas por `js/admin-hints-content.js`:
 *
 *   1. Insignia «i» junto a la etiqueta de un campo. Al pasar el cursor (o al
 *      tocarla, o con el teclado) explica qué se escribe ahí, a dónde va ese
 *      dato y qué ojo hay que tener.
 *   2. Aviso de sección: una franja bajo el título que dice para qué sirve la
 *      pantalla y con qué otra parte del sistema se conecta.
 *
 * La idea es que alguien que se sienta por primera vez entienda lo que está
 * haciendo sin inducción previa. El manual completo (botón «?») sigue siendo
 * la guía larga; esto es la explicación corta, en el punto exacto.
 *
 * El contenido vive aparte a propósito: se revisa y se corrige sin tocar el
 * dashboard, y el mismo widget sirve para otros paneles.
 */
(function () {
  'use strict';

  var MARCA = 'data-hint-listo';   // evita duplicar insignias al re-renderizar

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function estilos() {
    var css = document.createElement('style');
    css.textContent = `
      .hint-i {
        display: inline-flex; align-items: center; justify-content: center;
        width: 15px; height: 15px; margin-left: 6px; padding: 0;
        border: 1px solid var(--warm-mid); border-radius: 50%;
        background: transparent; color: var(--warm-mid);
        font: 600 10px/1 var(--fb); cursor: help; vertical-align: middle;
        opacity: .65; transition: opacity .15s ease, background .15s ease, color .15s ease;
      }
      .hint-i:hover, .hint-i[aria-expanded="true"] {
        opacity: 1; background: var(--warm-mid); color: #fff;
      }
      .hint-i:focus-visible { outline: 2px solid var(--warm-mid); outline-offset: 2px; opacity: 1; }

      #hint-pop {
        position: fixed; z-index: 400; display: none; width: 290px; max-width: calc(100vw - 24px);
        padding: 13px 15px; border-radius: 6px; border: 1px solid var(--piedra);
        background: var(--crema); color: var(--carbon);
        font: 400 12.5px/1.55 var(--fb); box-shadow: 0 10px 30px rgba(25,39,41,.2);
      }
      #hint-pop strong.hint-pop-titulo {
        display: block; margin-bottom: 5px; font-size: 12.5px; color: var(--carbon);
      }
      #hint-pop p { margin: 0 0 8px; }
      #hint-pop p:last-child { margin-bottom: 0; }
      .hint-flujo {
        display: block; margin-top: 9px; padding-top: 8px;
        border-top: 1px solid var(--piedra); font-size: 11.5px; color: var(--warm-mid);
      }
      .hint-ojo {
        display: block; margin-top: 8px; padding: 7px 9px; border-radius: 4px;
        background: rgba(143,56,51,.08); font-size: 11.5px; color: var(--carbon);
      }

      .hint-banner {
        display: flex; gap: 11px; align-items: flex-start;
        margin: 0 0 20px; padding: 12px 15px; border-radius: 6px;
        border: 1px solid var(--piedra); border-left: 3px solid var(--warm-mid);
        background: var(--crema); font: 400 13px/1.6 var(--fb); color: var(--carbon);
      }
      .hint-banner svg { flex: 0 0 auto; width: 17px; height: 17px; margin-top: 2px; color: var(--warm-mid); }
      .hint-banner p { margin: 0; }
      .hint-banner .hint-flujo { margin-top: 7px; padding-top: 7px; }
      .hint-banner--aviso { border-left-color: #B8860B; background: rgba(231,189,105,.14); }
      .hint-banner--aviso svg { color: #8a6510; }

      @media (max-width: 640px) {
        #hint-pop { width: calc(100vw - 24px); }
        .hint-banner { font-size: 12.5px; padding: 11px 13px; }
      }
      @media print { .hint-i, #hint-pop, .hint-banner { display: none !important; } }
    `;
    document.head.appendChild(css);
  }

  // ── Globo de ayuda (uno solo, reposicionado) ──────────────────────────────
  var pop, activo = null, fijado = false;

  function crearPop() {
    pop = document.createElement('div');
    pop.id = 'hint-pop';
    pop.setAttribute('role', 'tooltip');
    document.body.appendChild(pop);
  }

  function contenidoHtml(h) {
    var html = '';
    if (h.titulo) html += '<strong class="hint-pop-titulo">' + escapeHtml(h.titulo) + '</strong>';
    if (h.texto)  html += '<p>' + escapeHtml(h.texto) + '</p>';
    if (h.ojo)    html += '<span class="hint-ojo">' + escapeHtml(h.ojo) + '</span>';
    if (h.destino) html += '<span class="hint-flujo">Se refleja en: ' + escapeHtml(h.destino) + '</span>';
    return html;
  }

  function abrir(btn, h) {
    pop.innerHTML = contenidoHtml(h);
    pop.style.display = 'block';
    // Medir ya renderizado para poder voltearlo si no cabe.
    var r = btn.getBoundingClientRect();
    var p = pop.getBoundingClientRect();
    var izq = Math.min(Math.max(8, r.left - 8), window.innerWidth - p.width - 8);
    var arr = r.bottom + 8;
    if (arr + p.height > window.innerHeight - 8) arr = Math.max(8, r.top - p.height - 8);
    pop.style.left = izq + 'px';
    pop.style.top  = arr + 'px';
    if (activo && activo !== btn) activo.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-expanded', 'true');
    activo = btn;
  }

  function cerrar() {
    if (!pop) return;
    pop.style.display = 'none';
    if (activo) activo.setAttribute('aria-expanded', 'false');
    activo = null;
    fijado = false;
  }

  function nuevaInsignia(h) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hint-i';
    btn.textContent = 'i';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Qué se escribe aquí: ' + (h.titulo || ''));
    btn.title = '';   // el globo sustituye al tooltip nativo

    btn.addEventListener('mouseenter', function () { if (!fijado) abrir(btn, h); });
    btn.addEventListener('mouseleave', function () { if (!fijado) cerrar(); });
    btn.addEventListener('focus',      function () { abrir(btn, h); });
    btn.addEventListener('blur',       function () { if (!fijado) cerrar(); });
    btn.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (fijado && activo === btn) { cerrar(); return; }
      fijado = true; abrir(btn, h);
    });
    return btn;
  }

  // ── Colocación ────────────────────────────────────────────────────────────
  // La insignia va en la etiqueta del campo; si no hay etiqueta, junto al campo.
  function anclaDe(el) {
    var grupo = el.closest('.form-group') || el.parentElement;
    var label = grupo ? grupo.querySelector('.form-label, label') : null;
    return label || el.parentElement;
  }

  function ponerCampos(campos) {
    Object.keys(campos).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var ancla = anclaDe(el);
      if (!ancla || ancla.hasAttribute(MARCA)) return;
      ancla.setAttribute(MARCA, id);
      ancla.appendChild(nuevaInsignia(campos[id]));
    });
  }

  var ICONO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.6v.6"/></svg>';

  function ponerSecciones(secciones) {
    (secciones || []).forEach(function (s, i) {
      var ancla = document.querySelector(s.ancla);
      if (!ancla || ancla.hasAttribute(MARCA)) return;
      ancla.setAttribute(MARCA, 'sec-' + i);
      var caja = document.createElement('div');
      caja.className = 'hint-banner' + (s.tono === 'aviso' ? ' hint-banner--aviso' : '');
      caja.innerHTML = ICONO + '<div><p>' + escapeHtml(s.texto) + '</p>' +
        (s.destino ? '<span class="hint-flujo">Se conecta con: ' + escapeHtml(s.destino) + '</span>' : '') +
        '</div>';
      ancla.insertAdjacentElement('afterend', caja);
    });
  }

  function aplicar() {
    var datos = window.LAUREAN_HINTS || {};
    ponerCampos(datos.campos || {});
    ponerSecciones(datos.secciones || []);
  }

  document.addEventListener('DOMContentLoaded', function () {
    estilos();
    crearPop();
    aplicar();

    // El dashboard re-renderiza tablas y arma líneas de formulario sobre la
    // marcha; se vuelve a pasar sin duplicar nada (la marca lo impide).
    var pendiente = null;
    new MutationObserver(function () {
      clearTimeout(pendiente);
      pendiente = setTimeout(aplicar, 300);
    }).observe(document.body, { childList: true, subtree: true });

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });
    document.addEventListener('click', function (e) {
      if (fijado && !e.target.closest('#hint-pop') && !e.target.closest('.hint-i')) cerrar();
    });
    // El globo se posiciona respecto a la ventana, así que al desplazarse se
    // despegaría de su campo. Se cierra siempre, aunque esté fijado con clic.
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
  });

  window.LAUREAN_HINTS_APLICAR = aplicar;
})();
