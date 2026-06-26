/* ============================================================
   LAUREAN — Footer compartido (fuente única para todas las páginas)
   Uso: colocar <footer id="site-footer"></footer> donde va el footer
   y cargar este script (después de js/auth.js para leer los canales).
   - Footer unificado, compacto, logo +20%, firma "Laurean by Seong Woo".
   - Canales (redes/contacto) dinámicos desde site_settings.social_links.
   ============================================================ */
(function () {
  // ── Iconos de canales (fuente única; el admin los usa para el selector) ──────
  var CHANNEL_ICONS = {
    instagram: '<svg viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2Zm0 1.8c-3.14 0-3.5 0-4.74.07-.9.04-1.38.19-1.7.31-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.12.32-.27.8-.31 1.7C3.43 8.5 3.42 8.86 3.42 12s0 3.5.07 4.74c.04.9.19 1.38.31 1.7.17.43.37.74.69 1.06.32.32.63.52 1.06.69.32.12.8.27 1.7.31 1.24.07 1.6.07 4.74.07s3.5 0 4.74-.07c.9-.04 1.38-.19 1.7-.31.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.12-.32.27-.8.31-1.7.07-1.24.07-1.6.07-4.74s0-3.5-.07-4.74c-.04-.9-.19-1.38-.31-1.7a2.85 2.85 0 0 0-.69-1.06 2.85 2.85 0 0 0-1.06-.69c-.32-.12-.8-.27-1.7-.31C15.5 4 15.14 4 12 4Zm0 3.06A4.94 4.94 0 1 1 7.06 12 4.94 4.94 0 0 1 12 7.06Zm0 8.14A3.2 3.2 0 1 0 8.8 12 3.2 3.2 0 0 0 12 15.2Zm6.3-8.34a1.15 1.15 0 1 1-1.15-1.15 1.15 1.15 0 0 1 1.15 1.15Z"/></svg>',
    facebook:  '<svg viewBox="0 0 24 24"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z"/></svg>',
    tiktok:    '<svg viewBox="0 0 24 24"><path d="M16.5 3c.3 2.06 1.46 3.3 3.5 3.46v2.34c-1.18.12-2.21-.27-3.41-.99v4.4c0 5.6-6.1 7.34-8.55 3.33-1.57-2.58-.6-7.1 4.45-7.28v2.46c-.39.06-.8.16-1.18.3-1.13.38-1.77 1.1-1.59 2.36.34 2.41 4.77 3.13 4.4-1.59V3h2.43Z"/></svg>',
    whatsapp:  '<svg viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2Zm0 18.13c-1.52 0-3.01-.41-4.31-1.18l-.31-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.35c0-4.54 3.7-8.23 8.24-8.23 4.54 0 8.23 3.69 8.23 8.23 0 4.54-3.69 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42l-.48-.01c-.16 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z"/></svg>',
    x:         '<svg viewBox="0 0 24 24"><path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.96 6.82H1.69l7.73-8.84L1.25 2.25h6.82l4.71 6.23 5.46-6.23Zm-1.16 17.52h1.83L7.01 4.13H5.05l12.03 15.64Z"/></svg>',
    youtube:   '<svg viewBox="0 0 24 24"><path d="M23.5 6.5a3 3 0 0 0-2.11-2.13C19.5 3.86 12 3.86 12 3.86s-7.5 0-9.39.51A3 3 0 0 0 .5 6.5 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.5 3 3 0 0 0 2.11 2.13c1.89.51 9.39.51 9.39.51s7.5 0 9.39-.51A3 3 0 0 0 23.5 17.5 31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.5ZM9.6 15.57V8.43L15.82 12 9.6 15.57Z"/></svg>',
    email:     '<svg viewBox="0 0 24 24"><path d="M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm17 3.24-7.4 5.18a1 1 0 0 1-1.2 0L4 7.24V18h16V7.24ZM4.51 6 12 11.24 19.49 6H4.51Z"/></svg>',
    telefono:  '<svg viewBox="0 0 24 24"><path d="M6.62 10.79a15.5 15.5 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.4 11.4 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .57 3.57 1 1 0 0 1-.25 1.02l-2.2 2.2Z"/></svg>',
    ubicacion: '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5Z"/></svg>'
  };
  window.CHANNEL_ICONS = CHANNEL_ICONS;

  var YEAR = new Date().getFullYear();
  var DEFAULT_WHATSAPP = '50236672415';
  var FAB_BLOCKED_PATHS = ['admin', 'pos', 'login', 'revision-cliente', 'arquitectura-laurean'];

  function css() {
    return ''
      + 'footer#site-footer{background:var(--carbon);color:rgba(255,255,255,.7);padding:60px 52px 30px;display:block;}'
      + '#site-footer .footer-top{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1.7fr 1fr 1fr 1fr;gap:42px;padding-bottom:40px;border-bottom:1px solid rgba(255,255,255,.1);}'
      + '#site-footer .footer-logo img{height:53px;width:auto;display:block;}'
      + '#site-footer .footer-logo a{display:inline-block;line-height:0;transition:opacity .2s var(--ease);}#site-footer .footer-logo a:hover{opacity:.7;}'
      + '#site-footer .footer-tagline{margin-top:10px;font-size:13px;max-width:290px;line-height:1.6;}'
      + '#site-footer .footer-signature{margin-top:14px;font-family:var(--fd);font-style:italic;font-size:17px;color:var(--dorado);line-height:1.1;}'
      + '#site-footer .footer-signature small{display:block;font-family:var(--fb);font-style:normal;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-top:3px;}'
      + '#site-footer .footer-social{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px;}'
      + '#site-footer .footer-social a{width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;border:1px solid rgba(255,255,255,.18);color:rgba(255,255,255,.75);transition:color .2s var(--ease),border-color .2s var(--ease),transform .2s var(--ease);}'
      + '#site-footer .footer-social a:hover{color:#fff;border-color:rgba(255,255,255,.5);transform:translateY(-2px);}'
      + '#site-footer .footer-social svg{width:17px;height:17px;fill:currentColor;}'
      + '#site-footer .footer-col-title{color:#fff;font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:14px;}'
      + '#site-footer .footer-links{list-style:none;display:flex;flex-direction:column;gap:9px;}'
      + '#site-footer .footer-links a{font-size:13.5px;color:rgba(255,255,255,.7);transition:color .2s var(--ease);}#site-footer .footer-links a:hover{color:rgba(255,255,255,.95);}'
      + '#site-footer .footer-bottom{max-width:1280px;margin:22px auto 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;}'
      + '#site-footer .footer-copy{font-size:12px;color:rgba(255,255,255,.5);}#site-footer .footer-copy a{color:inherit;text-decoration:underline;opacity:.7;}'
      + '#site-footer .footer-legal{display:inline-flex;align-items:center;gap:10px;}'
      + '#site-footer .pay-badges{display:flex;align-items:center;gap:10px;}'
      + '#site-footer .pay-badge{font-size:10px;letter-spacing:.08em;color:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.2);padding:4px 9px;border-radius:5px;}'
      + '#laurean-wa-fab{position:fixed;right:24px;bottom:24px;z-index:9000;width:52px;height:52px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:transparent;border:1.5px solid var(--vino,#8F3833);color:var(--vino,#8F3833);box-shadow:0 6px 18px rgba(83,31,35,.16);transition:background-color .25s var(--ease),color .25s var(--ease),transform .18s var(--ease),box-shadow .25s var(--ease);}'
      + '#laurean-wa-fab svg{width:24px;height:24px;display:block;fill:currentColor;transition:fill .25s var(--ease);}'
      + '#laurean-wa-fab:hover{background:var(--vino,#8F3833);color:#fff;transform:translateY(-2px);box-shadow:0 10px 26px rgba(83,31,35,.28);}'
      + '#laurean-wa-fab:active{transform:scale(.9);}'
      + '@media(max-width:720px){footer#site-footer{padding:46px 20px 24px;}#site-footer .footer-top{grid-template-columns:1fr 1fr;gap:26px;}#site-footer .footer-bottom{flex-direction:column;align-items:flex-start;}#laurean-wa-fab{width:50px;height:50px;right:16px;bottom:16px;}#laurean-wa-fab svg{width:25px;height:25px;}}';
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function channelsHTML() {
    var settings = (typeof getSiteSettings === 'function') ? getSiteSettings() : {};
    var wa = (settings.whatsapp || '').replace(/[^0-9]/g, '');
    var links = Array.isArray(settings.social_links) ? settings.social_links : [];
    return links.filter(function (s) {
      if (!s || s.visible === false) return false;
      if (s.type === 'whatsapp') return !!(s.url || wa);
      return !!s.url;
	    }).map(function (s) {
	      var url = s.url || '';
	      if (s.type === 'whatsapp' && !url && wa) url = 'https://wa.me/' + wa;
	      else if (s.type === 'email' && url && !/^mailto:/i.test(url)) url = 'mailto:' + url;
	      else if (s.type === 'telefono' && url && !/^tel:/i.test(url)) url = 'tel:' + url.replace(/\s+/g, '');
	      url = (typeof safeUrl === 'function') ? safeUrl(url) : url;
	      if (!url) return '';
	      var icon = CHANNEL_ICONS[s.icon] || CHANNEL_ICONS[s.type] || CHANNEL_ICONS.email;
	      return '<a href="' + esc(url) + '" target="_blank" rel="noopener" aria-label="' + esc(s.label || s.type) + '" title="' + esc(s.label || s.type) + '">' + icon + '</a>';
	    }).join('');
  }

  function footerHTML() {
    return ''
      + '<div class="footer-top">'
      + '  <div>'
      + '    <div class="footer-logo"><a href="Laurean.html#inicio" aria-label="Laurean — Inicio"><img src="images/brand/logo-oscuro.svg" alt="Laurean" /></a></div>'
      + '    <p class="footer-tagline">El arte de vestir bien. Elegancia simple y práctica, hecha en Guatemala desde 2019.</p>'
      + '    <p class="footer-signature">Laurean<small>by Seong Woo</small></p>'
      + '    <div class="footer-social" id="footer-social"></div>'
      + '  </div>'
      + '  <div>'
      + '    <p class="footer-col-title">Tienda</p>'
      + '    <ul class="footer-links">'
      + '      <li><a href="laurean-women.html">Laurean Women</a></li>'
      + '      <li><a href="laurean-men.html">Laurean Men</a></li>'
      + '      <li><a href="laurean-kids.html">Laurean Kids</a></li>'
      + '      <li><a href="coleccion.html?cat=accesorios">Accesorios</a></li>'
      + '      <li><a href="catalogo.html">Catálogo</a></li>'
      + '    </ul>'
      + '  </div>'
      + '  <div>'
      + '    <p class="footer-col-title">Ayuda</p>'
      + '    <ul class="footer-links">'
      + '      <li><a href="nosotros.html">Nosotros</a></li>'
      + '      <li><a href="envios.html">Envíos</a></li>'
      + '      <li><a href="cambios-devoluciones.html">Cambios y devoluciones</a></li>'
      + '      <li><a href="faq.html">Preguntas frecuentes</a></li>'
      + '      <li><a href="contacto.html">Contacto</a></li>'
      + '      <li><a href="https://wa.me/50236672415" target="_blank" rel="noopener">WhatsApp</a></li>'
      + '    </ul>'
      + '  </div>'
      + '  <div>'
      + '    <p class="footer-col-title">Empresa</p>'
      + '    <ul class="footer-links">'
      + '      <li><a href="vendedoras.html">Programa de vendedores</a></li>'
      + '      <li><a href="login.html">Acceso staff</a></li>'
      + '    </ul>'
      + '  </div>'
      + '</div>'
      + '<div class="footer-bottom">'
      + '  <span class="footer-copy">© Laurean ' + YEAR + ' · Guatemala · Desarrollado por <a href="#">AA Projects</a></span>'
      + '  <span class="footer-copy footer-legal"><a href="privacidad.html">Privacidad</a><a href="terminos.html">Términos</a></span>'
      + '  <div class="pay-badges"><span class="pay-badge">VISA</span><span class="pay-badge">Mastercard</span><span class="pay-badge">QR</span></div>'
      + '</div>';
  }

  function renderChannels() {
    var wrap = document.getElementById('footer-social');
    if (wrap) wrap.innerHTML = channelsHTML();
  }
  window.renderFooterChannels = renderChannels;

  function whatsappNumber() {
    var settings = (typeof getSiteSettings === 'function') ? getSiteSettings() : {};
    var number = (settings.whatsapp || '').replace(/[^0-9]/g, '');
    return number || DEFAULT_WHATSAPP;
  }

  function shouldShowWhatsappFab() {
    var path = String(location.pathname || '').toLowerCase();
    return !FAB_BLOCKED_PATHS.some(function (blocked) {
      return path.indexOf(blocked) !== -1;
    });
  }

  function renderWhatsappFab() {
    if (!shouldShowWhatsappFab()) return;
    var href = 'https://wa.me/' + whatsappNumber();
    var fab = document.getElementById('laurean-wa-fab');
    if (!fab) {
      fab = document.createElement('a');
      fab.id = 'laurean-wa-fab';
      fab.target = '_blank';
      fab.rel = 'noopener';
      fab.setAttribute('aria-label', 'Escríbenos por WhatsApp');
      fab.innerHTML = CHANNEL_ICONS.whatsapp;
      document.body.appendChild(fab);
    }
    if (!fab.dataset.trackWhatsappClick) {
      fab.addEventListener('click', function () {
        if (window.track) window.track('whatsapp_click', { location: 'fab' });
      });
      fab.dataset.trackWhatsappClick = 'true';
    }
    fab.href = href;
  }

  function mount() {
    var host = document.getElementById('site-footer');
    if (!host) return;
    if (!document.getElementById('laurean-footer-css')) {
      var st = document.createElement('style');
      st.id = 'laurean-footer-css';
      st.textContent = css();
      document.head.appendChild(st);
    }
    host.innerHTML = footerHTML();
    renderChannels();
    renderWhatsappFab();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  // Re-render channels cuando los settings llegan de Supabase
  document.addEventListener('laurean:site-settings-ready', renderChannels);
  document.addEventListener('laurean:site-settings-changed', renderChannels);
  document.addEventListener('laurean:site-settings-ready', renderWhatsappFab);
  document.addEventListener('laurean:site-settings-changed', renderWhatsappFab);
})();
