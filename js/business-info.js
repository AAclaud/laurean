/* ============================================================
   LAUREAN — Datos legales y de contacto desde site_settings.business
   Uso: colocar data-biz="campo" en textos legales/contacto.
   ============================================================ */
(function () {
  var FALLBACKS = {
    razon_social: 'Laurean',
    nit: 'en actualización',
    correo: 'escríbenos por WhatsApp',
    telefono: '+502 4136 4466',
    direccion: 'Guatemala',
    horario: 'Atención por WhatsApp',
    plazo_cambios: '',
    plazo_reembolso: '',
    plazo_envio: '',
    fecha_revision: 'pendiente de revisión',
    redes: 'Síguenos pronto en redes'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function escAttr(s) {
    return esc(s).replace(/`/g, '&#96;');
  }

  function siteSettings() {
    return (typeof getSiteSettings === 'function') ? getSiteSettings() : {};
  }

  function valueFor(b, key) {
    var value = b && b[key];
    if (value == null) value = '';
    value = String(value).trim();
    return value || FALLBACKS[key] || '';
  }

  function renderEmail(el, b) {
    var correo = b && b.correo != null ? String(b.correo).trim() : '';
    if (!correo) {
      el.textContent = FALLBACKS.correo;
      return;
    }
    el.innerHTML = '<a href="mailto:' + escAttr(correo) + '">' + esc(correo) + '</a>';
  }

  function renderSocialLinks(el) {
    var settings = siteSettings();
    var links = Array.isArray(settings.social_links) ? settings.social_links : [];
    var html = links.filter(function (s) {
      return s && s.visible !== false && s.url;
    }).map(function (s) {
      var url = String(s.url || '').trim();
      if (typeof safeUrl === 'function') url = safeUrl(url);
      if (!url) return '';
      var label = String(s.label || s.type || 'Red social').trim();
      return '<a href="' + escAttr(url) + '" target="_blank" rel="noopener">' + esc(label) + '</a>';
    }).filter(Boolean).join(' · ');

    if (html) el.innerHTML = html;
    else el.textContent = FALLBACKS.redes;
  }

  function fillBusinessInfo() {
    var b = ((typeof getSiteSettings === 'function' ? getSiteSettings() : {}).business) || {};
    document.querySelectorAll('[data-biz]').forEach(function (el) {
      var key = el.getAttribute('data-biz');
      if (key === 'correo') {
        renderEmail(el, b);
        return;
      }
      if (key === 'redes') {
        renderSocialLinks(el);
        return;
      }
      el.textContent = valueFor(b, key);
    });
  }

  window.fillBusinessInfo = fillBusinessInfo;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fillBusinessInfo);
  else fillBusinessInfo();

  document.addEventListener('laurean:site-settings-ready', fillBusinessInfo);
  document.addEventListener('laurean:site-settings-changed', fillBusinessInfo);
})();
