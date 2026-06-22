(function () {
  'use strict';

  var FAVORITES_KEY = 'laurean_favorites';
  var HEART_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.7a5.4 5.4 0 0 0-7.7 0L12 5.8l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.7L12 21.1l8.8-8.7a5.4 5.4 0 0 0 0-7.7Z"/></svg>';
  var SHARE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.7"/><circle cx="6" cy="12" r="2.7"/><circle cx="18" cy="19" r="2.7"/><path d="M8.4 10.7 15.6 6.3M8.4 13.3l7.2 4.4"/></svg>';
  var COPY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>';
  var shareMenu = null;
  var closeTimer = null;

  function readFavorites() {
    try {
      var ids = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      return Array.isArray(ids) ? ids.map(String) : [];
    } catch (err) {
      return [];
    }
  }

  function saveFavorites(ids) {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
    } catch (err) {}
  }

  function storeIsFavorite(id) {
    return readFavorites().indexOf(String(id)) !== -1;
  }

  function reflectFavoriteButton(btn, active) {
    if (!btn) return;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    btn.setAttribute('aria-label', active ? 'Quitar de favoritos' : 'Agregar a favoritos');
    btn.setAttribute('title', active ? 'Quitar de favoritos' : 'Agregar a favoritos');
  }

  function updateFavoriteButtons(id) {
    var active = storeIsFavorite(id);
    document.querySelectorAll('[data-store-fav-id]').forEach(function (btn) {
      if (String(btn.getAttribute('data-store-fav-id')) === String(id)) {
        reflectFavoriteButton(btn, active);
      }
    });
  }

  function storeToggleFavorite(id, btn) {
    var sid = String(id);
    var ids = readFavorites();
    var active = ids.indexOf(sid) !== -1;
    ids = active ? ids.filter(function (item) { return item !== sid; }) : ids.concat(sid);
    saveFavorites(ids);
    reflectFavoriteButton(btn, !active);
    updateFavoriteButtons(sid);
    return !active;
  }

  function normalizeSharePayload(payload) {
    payload = payload || {};
    var rawUrl = payload.url || window.location.href.split('#')[0];
    return {
      title: payload.title || document.title || 'Laurean Shop',
      text: payload.text || 'Descubre Laurean Shop.',
      url: new URL(rawUrl, window.location.href).href,
    };
  }

  function canUseNativeShare(data) {
    try {
      return window.isSecureContext &&
        typeof navigator.share === 'function' &&
        window.self === window.top &&
        (navigator.canShare ? navigator.canShare(data) : true);
    } catch (err) {
      return false;
    }
  }

  async function storeShare(payload, evt) {
    var data = normalizeSharePayload(payload);
    var anchor = evt && (evt.currentTarget || evt.target);
    if (evt && evt.stopPropagation) evt.stopPropagation();

    if (canUseNativeShare(data)) {
      try {
        await navigator.share(data);
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    openShareMenu(data, anchor);
  }

  function ensureShareMenu() {
    if (shareMenu) return shareMenu;
    shareMenu = document.createElement('div');
    shareMenu.className = 'store-share-menu';
    shareMenu.setAttribute('role', 'menu');
    shareMenu.hidden = true;
    document.body.appendChild(shareMenu);
    return shareMenu;
  }

  function openShareMenu(data, anchor) {
    var menu = ensureShareMenu();
    var shareText = data.text + ' ' + data.url;
    var encUrl = encodeURIComponent(data.url);
    var encText = encodeURIComponent(data.text);
    var encFull = encodeURIComponent(shareText);
    menu.innerHTML =
      '<a role="menuitem" href="https://wa.me/?text=' + encFull + '" target="_blank" rel="noopener">WhatsApp</a>' +
      '<a role="menuitem" href="https://www.facebook.com/sharer/sharer.php?u=' + encUrl + '" target="_blank" rel="noopener">Facebook</a>' +
      '<a role="menuitem" href="https://twitter.com/intent/tweet?text=' + encText + '&url=' + encUrl + '" target="_blank" rel="noopener">X/Twitter</a>' +
      '<button type="button" role="menuitem" data-copy-link="true">' + COPY_ICON + '<span>Copiar enlace</span></button>';
    menu.querySelector('[data-copy-link]').addEventListener('click', function (event) {
      event.stopPropagation();
      copyToClipboard(data.url);
      closeShareMenu();
    });

    positionShareMenu(menu, anchor);
    menu.hidden = false;
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      document.addEventListener('click', handleOutsideClick, true);
      document.addEventListener('keydown', handleEscape, true);
    }, 0);
  }

  function positionShareMenu(menu, anchor) {
    var margin = 10;
    var left = window.innerWidth - 190 - margin;
    var top = 80;
    if (anchor && anchor.getBoundingClientRect) {
      var rect = anchor.getBoundingClientRect();
      left = rect.right - 190;
      top = rect.bottom + 8;
    }
    left = Math.max(margin, Math.min(left, window.innerWidth - 190 - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - 210));
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  }

  function copyToClipboard(url) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).catch(function () {
        fallbackCopy(url);
      });
      return;
    }
    fallbackCopy(url);
  }

  function fallbackCopy(url) {
    var input = document.createElement('textarea');
    input.value = url;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    try { document.execCommand('copy'); } catch (err) {}
    document.body.removeChild(input);
  }

  function closeShareMenu() {
    if (shareMenu) shareMenu.hidden = true;
    document.removeEventListener('click', handleOutsideClick, true);
    document.removeEventListener('keydown', handleEscape, true);
  }

  function handleOutsideClick(event) {
    if (shareMenu && !shareMenu.contains(event.target)) closeShareMenu();
  }

  function handleEscape(event) {
    if (event.key === 'Escape') closeShareMenu();
  }

  function injectStyles() {
    if (document.getElementById('store-actions-style')) return;
    var style = document.createElement('style');
    style.id = 'store-actions-style';
    style.textContent =
      '.store-card-actions{position:absolute;top:10px;right:10px;z-index:3;display:flex;gap:8px}' +
      '.store-icon-btn{width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.88);color:var(--acento,var(--vino,#8f3833));box-shadow:0 8px 24px rgba(25,26,24,.14);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transition:background .2s var(--ease),color .2s var(--ease),transform .2s var(--ease)}' +
      '.store-icon-btn:hover{background:#fff;transform:translateY(-1px)}' +
      '.store-icon-btn svg{width:18px;height:18px;stroke:currentColor;stroke-width:1.7;fill:none}' +
      '.store-fav-btn.active{background:var(--acento,var(--vino,#8f3833));color:#fff}' +
      '.store-fav-btn.active svg{fill:currentColor}' +
      '.store-share-menu{position:fixed;z-index:10000;width:190px;padding:8px;border:1px solid rgba(25,26,24,.12);border-radius:12px;background:#fff;box-shadow:0 18px 50px rgba(25,26,24,.18)}' +
      '.store-share-menu[hidden]{display:none}' +
      '.store-share-menu a,.store-share-menu button{width:100%;min-height:38px;padding:9px 10px;border-radius:8px;display:flex;align-items:center;gap:8px;color:var(--carbon,#191a18);font:500 12px/1.2 var(--fb,system-ui);text-align:left;background:transparent;text-decoration:none}' +
      '.store-share-menu a:hover,.store-share-menu button:hover{background:rgba(142,56,51,.08)}' +
      '.store-share-menu svg{width:15px;height:15px;stroke:currentColor;stroke-width:1.7;fill:none}';
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles, { once: true });
  } else {
    injectStyles();
  }

  window.STORE_ACTION_ICONS = { favorite: HEART_ICON, share: SHARE_ICON };
  window.storeIsFavorite = storeIsFavorite;
  window.storeToggleFavorite = storeToggleFavorite;
  window.storeShare = storeShare;
})();
