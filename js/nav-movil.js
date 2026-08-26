// ============================================================
// LAUREAN — Barra de navegación en teléfono
//
// El logo va centrado y fuera del flujo (`position:absolute; left:50%`), asi
// que la fila de botones se acomoda como si el logo no existiera y termina
// pasandole por encima. Medido a 375px: 66px de solape en la portada (los
// botones van a la derecha) y 70px en la ficha de producto, donde al no haber
// hamburguesa el `space-between` manda la fila al borde izquierdo.
//
// Con el logo centrado, a la derecha solo hay 118px libres y tres botones se
// comen 136: no caben, y en pantallas de 360px —muy comunes en Android— falla
// incluso encogiendo logo y botones. Asi que de 768px hacia abajo quedan a la
// derecha los dos que el comprador usa —la lupa y el carrito con su contador—
// y el resto pasa a un panel cuyo boton «⋯» va a la IZQUIERDA, junto a la
// hamburguesa. La barra queda ademas simetrica: 88px por lado. Al volver a
// escritorio todo regresa a su fila y a su orden original.
//
// No hace falta configurarlo: se carga y se aplica solo. Para dejar otro boton
// siempre visible a la derecha, marcarlo con `data-nav-fijo`.
// ============================================================

(function () {
  'use strict';

  var LIMITE = 768;   // el mismo ancho en que la barra ya esconde los enlaces

  var acciones = null;
  var orden    = null;    // hijos de .nav-actions en su orden original
  var boton    = null;
  var panel    = null;
  var grupoIzq = null;   // caja del boton «⋯» a la izquierda de la barra
  var plegado  = false;

  // Se quedan a la vista la lupa y el carrito. El carrito porque si se esconde,
  // quien lleva dos prendas deja de ver el contador y ese numero es medio
  // recordatorio de compra; la lupa porque buscar es lo primero que hace quien
  // llega sin saber que quiere. Ambos van marcados con `data-nav-fijo`.
  function esFijo(el) {
    if (el.nodeType !== 1) return false;
    if (el.hasAttribute('data-nav-fijo')) return true;
    var propio = el.getAttribute('aria-label') || '';
    if (/carrito/i.test(propio)) return true;
    var dentro = el.querySelector && el.querySelector('[aria-label*="arrito" i]');
    return !!dentro;
  }

  function css() {
    if (document.getElementById('laurean-nav-movil-css')) return;
    var st = document.createElement('style');
    st.id = 'laurean-nav-movil-css';
    st.textContent = [
      '.nav-actions{position:relative;}',
      '.nav-mas svg{fill:var(--carbon,#192729);stroke:none;width:20px;height:20px;}',
      '.nav-mas[aria-expanded="true"]{background:rgba(25,39,41,0.07);}',

      '.nav-izq{position:relative;display:flex;align-items:center;margin-left:8px;margin-right:auto;}',
      '.nav-mas-panel{position:absolute;top:calc(100% + 12px);left:0;z-index:120;',
        'min-width:210px;background:var(--crema,#F1ECE8);border:1px solid var(--piedra,#E8E3DC);',
        'border-radius:14px;box-shadow:0 18px 44px rgba(25,39,41,0.16);padding:7px;',
        'display:flex;flex-direction:column;gap:2px;}',
      '.nav-mas-panel[hidden]{display:none;}',

      // La etiqueta sale del aria-label que cada boton ya traia, asi no hay que
      // envolver nada: un boton que se esconda se lleva su fila con el.
      '.nav-mas-panel .nav-btn,.nav-mas-panel .nav-user-btn{width:100%;height:46px;',
        'border-radius:10px;justify-content:flex-start;gap:12px;padding:0 12px;}',
      '.nav-mas-panel .nav-btn::after,.nav-mas-panel .nav-user-btn::after{',
        'content:attr(aria-label);font-family:var(--fb),sans-serif;font-size:13.5px;',
        'font-weight:400;letter-spacing:0.01em;text-transform:none;color:var(--carbon,#192729);',
        'white-space:nowrap;}',
      '.nav-mas-panel .nav-btn:hover,.nav-mas-panel .nav-user-btn:hover{background:rgba(25,39,41,0.06);}',
      '.nav-mas-panel .nav-user-wrap{width:100%;}',
      // El desplegable de la cuenta conserva su forma de abrirse; solo se le
      // ajusta la caja para que no se salga del panel.
      '.nav-mas-panel .user-dropdown{left:0;right:0;min-width:0;}',
      '.nav-mas-panel .fav-badge{left:26px;right:auto;}',
    ].join('');
    document.head.appendChild(st);
  }

  function plegar() {
    if (plegado || !acciones) return;
    var mover = orden.filter(function (el) { return !esFijo(el); });
    if (!mover.length) return;          // nada que esconder

    panel = document.createElement('div');
    panel.className = 'nav-mas-panel';
    panel.hidden = true;
    mover.forEach(function (el) { panel.appendChild(el); });

    boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'nav-btn nav-mas';
    boton.setAttribute('aria-label', 'Más opciones');
    boton.setAttribute('aria-expanded', 'false');
    boton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">'
      + '<circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>';
    boton.addEventListener('click', function (e) {
      e.stopPropagation();
      if (panel.hidden) abrir(); else cerrar();
    });

    // El boton va a la izquierda, junto a la hamburguesa: a la derecha del
    // logo centrado no caben tres iconos, y los dos que se quedan son los que
    // se usan. `margin-right:auto` empuja el resto a su sitio pese al
    // `space-between` de la barra.
    var nav = acciones.parentNode;
    grupoIzq = document.createElement('div');
    grupoIzq.className = 'nav-izq';
    grupoIzq.appendChild(boton);
    grupoIzq.appendChild(panel);
    var ham = nav.querySelector(':scope > .nav-menu-btn');
    if (ham) ham.insertAdjacentElement('afterend', grupoIzq);
    else nav.insertBefore(grupoIzq, nav.firstChild);
    // Tocar cualquier opcion cierra el panel: todas navegan o abren algo.
    panel.addEventListener('click', function (e) {
      if (e.target.closest('.nav-btn,.nav-user-btn')) setTimeout(cerrar, 0);
    });
    plegado = true;
  }

  function desplegar() {
    if (!plegado) return;
    cerrar();
    if (boton) boton.remove();
    if (panel) panel.remove();
    if (grupoIzq) grupoIzq.remove();
    boton = panel = grupoIzq = null;
    orden.forEach(function (el) { acciones.appendChild(el); });
    plegado = false;
  }

  function abrir() {
    if (!panel) return;
    panel.hidden = false;
    boton.setAttribute('aria-expanded', 'true');
    encuadrar();
  }

  // El panel cuelga de la derecha del boton, que es lo natural cuando la fila
  // va pegada al borde derecho. Pero en las paginas sin hamburguesa la fila cae
  // al borde IZQUIERDO —un solo hijo con space-between se va a flex-start— y
  // ahi el panel se salia de la pantalla (medido: left -102px). Se mide una vez
  // abierto y se corre lo justo para que quepa.
  function encuadrar() {
    var margen = 12;
    panel.style.left = '';
    panel.style.right = '';
    panel.style.transform = '';
    var r = panel.getBoundingClientRect();
    var ancho = window.innerWidth || document.documentElement.clientWidth;
    if (r.left < margen) {
      panel.style.left  = '0';
      panel.style.right = 'auto';
      r = panel.getBoundingClientRect();
    }
    if (r.right > ancho - margen) {
      panel.style.transform = 'translateX(' + Math.round(ancho - margen - r.right) + 'px)';
    }
  }
  function cerrar() { if (!panel) return; panel.hidden = true;  boton.setAttribute('aria-expanded', 'false'); }

  function aplicar() {
    var ancho = window.innerWidth || document.documentElement.clientWidth;
    if (ancho <= LIMITE) plegar(); else desplegar();
  }

  function arrancar() {
    acciones = document.querySelector('.nav-actions');
    if (!acciones) return;
    orden = Array.prototype.slice.call(acciones.children);
    if (orden.length < 2) return;   // con un solo boton no hay nada que resolver
    css();
    aplicar();

    var t = null;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(aplicar, 150);
    });
    // Mismo cuidado que en el resto del sitio: comparar tambien el mousedown
    // para que arrastrar una seleccion hacia afuera no cierre el panel.
    var bajadaEn = null;
    document.addEventListener('mousedown', function (e) { bajadaEn = e.target; }, true);
    document.addEventListener('click', function (e) {
      if (!plegado || !panel || panel.hidden) return;
      if (grupoIzq && (grupoIzq.contains(e.target) || grupoIzq.contains(bajadaEn))) return;
      cerrar();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
