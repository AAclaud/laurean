// ============================================================
// LAUREAN — Paginador de catálogo
//
// Parte las grillas largas en páginas y deja que el visitante elija la
// rejilla (columnas × filas). La preferencia se guarda en su navegador y
// vale para todas las páginas de catálogo: si eligió 4×10 en Women, la
// colección y el catálogo lo respetan.
//
// Uso típico (una grilla con su control al lado del título):
//
//   var pag = LaureanPaginador.montar({
//     grid:      '#grid-b',       // contenedor de las tarjetas
//     items:     productos,       // ya filtrados y ordenados
//     render:    buildCard,       // item → html de una tarjeta
//     controlEn: '#slot-control', // dónde va el botón «Ver: 24 ▾»
//     ancla:     '#row-b',        // a dónde sube el scroll al cambiar de página
//     param:     'p'              // número de página en la URL
//   });
//   pag.actualizar(nuevosProductos);   // cuando llega data fresca de Supabase
//
// Con varias grillas en la misma página (catalogo.html), el control se monta
// una sola vez con `montarControl` y todas las grillas obedecen: cambiar la
// rejilla emite `laurean:rejilla-cambio` y cada instancia se repinta.
// ============================================================

(function () {
  'use strict';

  var CLAVE = 'laurean_rejilla_v1';

  // Las columnas van primero porque son lo que el visitante ve cambiar:
  // 3×8 y 4×6 muestran los mismos 24 artículos con tarjetas de distinto tamaño.
  var REJILLAS = [
    { id: '3x8',   cols: 3, filas: 8,  etiqueta: '3 × 8'  },
    { id: '4x6',   cols: 4, filas: 6,  etiqueta: '4 × 6'  },
    { id: '4x10',  cols: 4, filas: 10, etiqueta: '4 × 10' },
    { id: '5x8',   cols: 5, filas: 8,  etiqueta: '5 × 8'  },
    { id: 'todos', cols: 0, filas: 0,  etiqueta: 'Todos'  },
  ];
  // 4×6 deja la grilla igual a como se ve hoy en escritorio; lo único que
  // cambia al estrenar el paginador es que deja de ser una lista infinita.
  var POR_DEFECTO = '4x6';

  // Debajo de esto no vale la pena ningún control: la grilla ya es corta.
  var MINIMO_PARA_CONTROL = 12;

  var _vivos    = [];     // instancias montadas
  var _controles = [];    // controles montados
  var _globalOk = false;  // listeners de documento instalados una sola vez

  // ── Preferencia ──────────────────────────────────────────────────────────
  function porId(id) {
    for (var i = 0; i < REJILLAS.length; i++) if (REJILLAS[i].id === id) return REJILLAS[i];
    return null;
  }
  function rejillaActual() {
    var guardada = null;
    try { guardada = localStorage.getItem(CLAVE); } catch (e) {}
    return porId(guardada) || porId(POR_DEFECTO);
  }
  function guardarRejilla(id) {
    try { localStorage.setItem(CLAVE, id); } catch (e) {}
    document.dispatchEvent(new CustomEvent('laurean:rejilla-cambio', { detail: { id: id } }));
  }
  function porPagina(r) {
    return r.id === 'todos' ? Infinity : r.cols * r.filas;
  }

  // ── Columnas efectivas ───────────────────────────────────────────────────
  // Las columnas del preset son una intención de escritorio. En pantallas
  // angostas no se pueden cumplir sin dejar tarjetas ilegibles (5 columnas en
  // un teléfono son 65px), así que ahí manda el auto-fill que ya tiene cada
  // página y el preset solo aporta cuántos artículos van por página.
  function columnasEfectivas(cols) {
    if (!cols) return 0;
    var w = window.innerWidth || document.documentElement.clientWidth;
    if (w < 1024) return 0;               // que decida la hoja de estilo de la página
    if (w < 1360) return Math.min(cols, 4);
    return cols;
  }

  // ── Estilos ──────────────────────────────────────────────────────────────
  function inyectarCss() {
    if (document.getElementById('laurean-paginador-css')) return;
    var st = document.createElement('style');
    st.id = 'laurean-paginador-css';
    st.textContent = [
      // El atributo repetido sube la especificidad por encima de .lx-grid /
      // .col-grid / .cat-grid sin recurrir a !important.
      '[data-pag-cols][data-pag-cols]{grid-template-columns:repeat(var(--pag-cols),minmax(0,1fr));}',

      /* ── Control «Ver: 24 ▾» ── */
      '.pag-ctrl{position:relative;display:inline-block;font-family:var(--fb),sans-serif;}',
      '.pag-ctrl-btn{display:inline-flex;align-items:center;gap:7px;background:var(--white,#fff);',
        'border:1px solid rgba(25,39,41,0.14);border-radius:10px;padding:9px 13px;cursor:pointer;',
        'font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:rgba(25,39,41,0.62);',
        'transition:border-color .2s var(--ease,ease),color .2s var(--ease,ease);}',
      '.pag-ctrl-btn:hover{border-color:var(--acento,var(--vino,#8F3833));color:var(--acento,var(--vino,#8F3833));}',
      '.pag-ctrl-btn strong{font-weight:600;color:var(--acento,var(--vino,#8F3833));letter-spacing:0.04em;}',
      '.pag-ctrl-caret{font-size:9px;line-height:1;opacity:.55;transition:transform .2s var(--ease,ease);}',
      '.pag-ctrl.abierto .pag-ctrl-caret{transform:rotate(180deg);}',
      '.pag-ctrl.abierto .pag-ctrl-btn{border-color:var(--acento,var(--vino,#8F3833));}',

      '.pag-ctrl-menu{position:absolute;top:calc(100% + 8px);right:0;z-index:60;min-width:212px;',
        'background:var(--white,#fff);border:1px solid rgba(25,39,41,0.1);border-radius:12px;',
        'box-shadow:0 18px 44px rgba(25,39,41,0.14);padding:7px;}',
      '.pag-ctrl-menu[hidden]{display:none;}',
      '.pag-ctrl-title{font-size:10px;letter-spacing:0.16em;text-transform:uppercase;',
        'color:rgba(25,39,41,0.42);padding:8px 11px 9px;margin:0;}',
      '.pag-op{display:flex;align-items:center;gap:10px;width:100%;background:none;border:0;',
        'padding:10px 11px;border-radius:8px;cursor:pointer;text-align:left;font-size:13.5px;',
        'color:var(--carbon,#192729);transition:background .15s var(--ease,ease);}',
      '.pag-op:hover{background:rgba(25,39,41,0.05);}',
      '.pag-op-rejilla{flex:1;letter-spacing:0.02em;}',
      '.pag-op-total{font-size:11.5px;color:rgba(25,39,41,0.42);font-variant-numeric:tabular-nums;}',
      '.pag-op-check{width:13px;font-size:12px;color:var(--acento,var(--vino,#8F3833));opacity:0;}',
      '.pag-op[aria-checked="true"]{background:rgba(25,39,41,0.05);}',
      '.pag-op[aria-checked="true"] .pag-op-rejilla{font-weight:600;}',
      '.pag-op[aria-checked="true"] .pag-op-check{opacity:1;}',

      /* ── Números de página ── */
      '.pag-pie{margin-top:40px;display:flex;flex-direction:column;align-items:center;gap:14px;}',
      '.pag-pie[hidden]{display:none;}',
      '.pag-nav{display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:center;}',
      '.pag-num,.pag-paso{min-width:40px;height:40px;padding:0 11px;border-radius:10px;cursor:pointer;',
        'background:none;border:1px solid transparent;font-family:var(--fb),sans-serif;font-size:13.5px;',
        'color:rgba(25,39,41,0.62);font-variant-numeric:tabular-nums;',
        'transition:background .18s var(--ease,ease),color .18s var(--ease,ease);}',
      '.pag-num:hover,.pag-paso:not(:disabled):hover{background:rgba(25,39,41,0.06);color:var(--carbon,#192729);}',
      '.pag-num[aria-current="page"]{background:var(--acento,var(--vino,#8F3833));color:var(--white,#fff);}',
      '.pag-num[aria-current="page"]:hover{background:var(--acento-dk,var(--vino-dk,#531F23));color:var(--white,#fff);}',
      '.pag-paso{font-size:16px;line-height:1;}',
      '.pag-paso:disabled{opacity:.28;cursor:default;}',
      '.pag-hueco{padding:0 3px;color:rgba(25,39,41,0.3);user-select:none;}',
      '.pag-info{font-size:12.5px;color:rgba(25,39,41,0.48);letter-spacing:0.02em;margin:0;}',

      '@media (max-width:720px){',
        '.pag-ctrl-btn{padding:8px 11px;font-size:11.5px;}',
        '.pag-ctrl-menu{min-width:196px;}',
        '.pag-num,.pag-paso{min-width:42px;height:42px;}',
        '.pag-pie{margin-top:30px;}',
      '}',
    ].join('');
    document.head.appendChild(st);
  }

  // ── Utilidades ───────────────────────────────────────────────────────────
  function elem(x) {
    if (!x) return null;
    return typeof x === 'string' ? document.querySelector(x) : x;
  }
  function suave() {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function podar() {
    _vivos     = _vivos.filter(function (i) { return i.grid && i.grid.isConnected; });
    _controles = _controles.filter(function (c) { return c.raiz && c.raiz.isConnected; });
  }

  // ── Control ──────────────────────────────────────────────────────────────
  function montarControl(slot) {
    var host = elem(slot);
    if (!host) return null;
    inyectarCss();
    instalarGlobales();

    var raiz = document.createElement('div');
    raiz.className = 'pag-ctrl';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pag-ctrl-btn';
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');

    var menu = document.createElement('div');
    menu.className = 'pag-ctrl-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;

    var titulo = document.createElement('p');
    titulo.className = 'pag-ctrl-title';
    titulo.textContent = 'Artículos por página';
    menu.appendChild(titulo);

    REJILLAS.forEach(function (r) {
      var op = document.createElement('button');
      op.type = 'button';
      op.className = 'pag-op';
      op.setAttribute('role', 'menuitemradio');
      op.setAttribute('data-rejilla', r.id);
      var total = porPagina(r);
      op.innerHTML = '<span class="pag-op-rejilla"></span>'
        + '<span class="pag-op-total"></span>'
        + '<span class="pag-op-check" aria-hidden="true">✓</span>';
      op.querySelector('.pag-op-rejilla').textContent = r.etiqueta;
      op.querySelector('.pag-op-total').textContent   = isFinite(total) ? String(total) : '';
      op.addEventListener('click', function () {
        guardarRejilla(r.id);
        cerrar();
        btn.focus();
      });
      menu.appendChild(op);
    });

    function abrir() {
      raiz.classList.add('abierto');
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      encuadrar();
    }

    // El menú cuelga de la derecha del botón, que es lo natural cuando el
    // control va al final de una fila. Pero en pantalla angosta el control
    // puede quedar pegado al borde izquierdo y entonces el menú se salía de la
    // pantalla. Se mide una vez abierto y se corre lo justo para que quepa.
    function encuadrar() {
      var margen = 12;
      menu.style.left = '';
      menu.style.right = '';
      menu.style.transform = '';
      var r = menu.getBoundingClientRect();
      var ancho = window.innerWidth || document.documentElement.clientWidth;
      if (r.left < margen) {
        menu.style.left  = '0';
        menu.style.right = 'auto';
        r = menu.getBoundingClientRect();
      }
      if (r.right > ancho - margen) {
        menu.style.transform = 'translateX(' + Math.round(ancho - margen - r.right) + 'px)';
      }
    }
    function cerrar() {
      raiz.classList.remove('abierto');
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
    btn.addEventListener('click', function () {
      if (menu.hidden) { cerrarTodosLosMenus(); abrir(); } else { cerrar(); }
    });

    raiz.appendChild(btn);
    raiz.appendChild(menu);
    host.appendChild(raiz);

    var ctrl = { raiz: raiz, cerrar: cerrar, refrescar: refrescar };
    _controles.push(ctrl);
    refrescar();
    return ctrl;

    function refrescar() {
      var r = rejillaActual();
      var total = porPagina(r);
      btn.innerHTML = 'Ver: <strong></strong> <span class="pag-ctrl-caret" aria-hidden="true">▾</span>';
      btn.querySelector('strong').textContent = isFinite(total) ? String(total) : 'todos';
      var ops = menu.querySelectorAll('.pag-op');
      for (var i = 0; i < ops.length; i++) {
        ops[i].setAttribute('aria-checked', ops[i].getAttribute('data-rejilla') === r.id ? 'true' : 'false');
      }
    }
  }

  function cerrarTodosLosMenus() {
    podar();
    _controles.forEach(function (c) { c.cerrar(); });
  }

  // ── Instancia de grilla ──────────────────────────────────────────────────
  function montar(op) {
    var grid = elem(op.grid);
    if (!grid || typeof op.render !== 'function') return null;
    inyectarCss();
    instalarGlobales();

    var pie = document.createElement('div');
    pie.className = 'pag-pie';
    pie.hidden = true;
    var nav = document.createElement('nav');
    nav.className = 'pag-nav';
    nav.setAttribute('aria-label', 'Paginación de productos');
    var info = document.createElement('p');
    info.className = 'pag-info';
    info.setAttribute('aria-live', 'polite');
    pie.appendChild(nav);
    pie.appendChild(info);
    grid.parentNode.insertBefore(pie, grid.nextSibling);

    var inst = {
      grid:     grid,
      items:    (op.items || []).slice(),
      render:   op.render,
      ancla:    op.ancla || null,
      param:    op.param || null,
      alPintar: typeof op.alPintar === 'function' ? op.alPintar : null,
      pagina:   1,
      pie:      pie,
      nav:      nav,
      info:     info,
      control:  null,
      _html:    null,   // último HTML pintado, para no repintar de más
    };

    inst.pintar    = function (mover) { pintar(inst, mover); };
    inst.aplicar   = function () { pintar(inst, false); };
    inst.actualizar = function (items) {
      inst.items = (items || []).slice();
      var tot = totalPaginas(inst);
      if (inst.pagina > tot) inst.pagina = tot;
      pintar(inst, false);
      if (inst.control) inst.control.refrescar();
    };
    inst.leerUrl = function () {
      if (!inst.param) return;
      var n = parseInt(new URLSearchParams(location.search).get(inst.param) || '1', 10);
      inst.pagina = (isFinite(n) && n > 0) ? n : 1;
    };

    inst.leerUrl();
    _vivos.push(inst);

    if (op.controlEn) {
      var host = elem(op.controlEn);
      // Sin suficientes artículos el control sobra: dejar la grilla como estaba.
      if (host && inst.items.length > MINIMO_PARA_CONTROL) inst.control = montarControl(host);
      else if (host) inst.slotControl = host;
    }

    pintar(inst, false);
    return inst;
  }

  function totalPaginas(inst) {
    var pp = porPagina(rejillaActual());
    if (!isFinite(pp)) return 1;
    return Math.max(1, Math.ceil(inst.items.length / pp));
  }

  function pintar(inst, mover) {
    var r     = rejillaActual();
    var pp    = porPagina(r);
    var total = inst.items.length;
    var tot   = totalPaginas(inst);
    if (inst.pagina > tot) inst.pagina = tot;
    if (inst.pagina < 1)   inst.pagina = 1;

    var desde = isFinite(pp) ? (inst.pagina - 1) * pp : 0;
    var hasta = isFinite(pp) ? Math.min(desde + pp, total) : total;

    // Columnas
    var cols = columnasEfectivas(r.cols);
    if (cols > 0) {
      inst.grid.setAttribute('data-pag-cols', '');
      inst.grid.style.setProperty('--pag-cols', String(cols));
    } else {
      inst.grid.removeAttribute('data-pag-cols');
      inst.grid.style.removeProperty('--pag-cols');
    }

    // El catálogo se rehidrata varias veces al arrancar (caché, Supabase, los
    // reintentos y el refresco cada 90s) y cada rehidratación llamaba a repintar.
    // Reescribir la grilla con lo mismo no solo es trabajo perdido: al vaciarla
    // por un instante la página se encoge, el navegador recorta la posición del
    // scroll y el visitante pierde el lugar donde iba leyendo. Se arma el HTML
    // igual —es solo texto— pero solo se toca el DOM si de verdad cambió.
    var html = inst.items.slice(desde, hasta).map(inst.render).join('');
    if (html !== inst._html) {
      inst._html = html;
      inst.grid.innerHTML = html;
      if (window.LAUREAN_BRAND_IMG_SCAN) window.LAUREAN_BRAND_IMG_SCAN(inst.grid);
      if (inst.alPintar) inst.alPintar(inst.grid);
    }

    pintarPie(inst, tot, desde, hasta, total);

    if (mover) subirAlAncla(inst);
  }

  function pintarPie(inst, tot, desde, hasta, total) {
    if (tot <= 1) { inst.pie.hidden = true; inst.nav.innerHTML = ''; return; }
    inst.pie.hidden = false;
    inst.nav.innerHTML = '';

    function paso(txt, destino, etiqueta) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pag-paso';
      b.textContent = txt;
      b.setAttribute('aria-label', etiqueta);
      b.disabled = destino < 1 || destino > tot;
      if (!b.disabled) b.addEventListener('click', function () { ir(inst, destino); });
      inst.nav.appendChild(b);
    }
    function numero(n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pag-num';
      b.textContent = String(n);
      b.setAttribute('aria-label', 'Página ' + n + ' de ' + tot);
      if (n === inst.pagina) b.setAttribute('aria-current', 'page');
      b.addEventListener('click', function () { ir(inst, n); });
      inst.nav.appendChild(b);
    }
    function hueco() {
      var s = document.createElement('span');
      s.className = 'pag-hueco';
      s.textContent = '…';
      s.setAttribute('aria-hidden', 'true');
      inst.nav.appendChild(s);
    }

    paso('‹', inst.pagina - 1, 'Página anterior');
    // Siempre la primera, la última y la vecindad de la actual; el resto se
    // resume con puntos suspensivos para que la fila no crezca sin control.
    var vistas = {};
    [1, tot, inst.pagina - 1, inst.pagina, inst.pagina + 1].forEach(function (n) {
      if (n >= 1 && n <= tot) vistas[n] = true;
    });
    if (tot <= 7) for (var i = 1; i <= tot; i++) vistas[i] = true;
    var lista = Object.keys(vistas).map(Number).sort(function (a, b) { return a - b; });
    var prev = 0;
    lista.forEach(function (n) {
      if (prev && n - prev > 1) hueco();
      numero(n);
      prev = n;
    });
    paso('›', inst.pagina + 1, 'Página siguiente');

    inst.info.textContent = 'Mostrando ' + (desde + 1) + '–' + hasta + ' de ' + total
      + ' · Página ' + inst.pagina + ' de ' + tot;
  }

  function ir(inst, n) {
    inst.pagina = n;
    if (inst.param) {
      var u = new URL(location.href);
      if (n === 1) u.searchParams.delete(inst.param);
      else u.searchParams.set(inst.param, String(n));
      history.pushState({ pag: n }, '', u);
    }
    pintar(inst, true);
  }

  function subirAlAncla(inst) {
    var ref = inst.ancla ? elem(inst.ancla) : inst.grid;
    if (!ref) return;
    // 100px de aire para no quedar debajo de la barra fija.
    var y = ref.getBoundingClientRect().top + window.pageYOffset - 100;
    window.scrollTo({ top: Math.max(0, y), behavior: suave() ? 'smooth' : 'auto' });
  }

  // ── Listeners compartidos ────────────────────────────────────────────────
  function instalarGlobales() {
    if (_globalOk) return;
    _globalOk = true;

    // Cerrar el menú al hacer clic fuera. Se compara también el mousedown para
    // que arrastrar una selección de texto hacia afuera no lo cierre.
    var bajadaEn = null;
    document.addEventListener('mousedown', function (e) { bajadaEn = e.target; }, true);
    document.addEventListener('click', function (e) {
      podar();
      _controles.forEach(function (c) {
        if (!c.raiz.contains(e.target) && !c.raiz.contains(bajadaEn)) c.cerrar();
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') cerrarTodosLosMenus();
    });

    document.addEventListener('laurean:rejilla-cambio', function () {
      podar();
      _controles.forEach(function (c) { c.refrescar(); });
      _vivos.forEach(function (i) { i.pagina = 1; i.aplicar(); });
    });

    // Al cambiar el ancho puede variar cuántas columnas caben de verdad.
    var t = null;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        podar();
        _vivos.forEach(function (i) { i.aplicar(); });
      }, 180);
    });

    window.addEventListener('popstate', function () {
      podar();
      _vivos.forEach(function (i) {
        if (!i.param) return;
        i.leerUrl();
        i.aplicar();
      });
    });
  }

  window.LaureanPaginador = {
    montar:        montar,
    montarControl: montarControl,
    podar:         podar,
    rejillaActual: rejillaActual,
    REJILLAS:      REJILLAS,
    MINIMO:        MINIMO_PARA_CONTROL,
  };
})();
