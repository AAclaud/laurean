(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var style = document.createElement('style');
    style.textContent = `
      #manual-fab {
        position: fixed; right: 24px; bottom: 24px; width: 52px; height: 52px;
        display: flex; align-items: center; justify-content: center; border: 0;
        border-radius: 50%; background: var(--carbon); color: #fff;
        font: 600 24px/1 var(--fd); box-shadow: 0 6px 20px rgba(25,39,41,.24);
        cursor: pointer; z-index: 150; transition: transform .18s ease, filter .18s ease;
      }
      #manual-fab:hover { transform: scale(1.06); filter: brightness(1.12); }
      #manual-fab:focus-visible, .manual-close:focus-visible {
        outline: 2px solid var(--warm-mid); outline-offset: 3px;
      }
      #manual-overlay {
        position: fixed; inset: 0; display: none; align-items: center; justify-content: center;
        padding: 20px; background: rgba(26,25,22,.5); z-index: 210;
      }
      .manual-card {
        position: relative; width: 100%; max-width: 640px; max-height: 88vh;
        overflow-y: auto; box-sizing: border-box; padding: 32px; border-radius: 4px;
        background: var(--crema); color: var(--carbon); font-family: var(--fb);
        box-shadow: 0 18px 50px rgba(25,39,41,.28);
      }
      .manual-header { display: flex; align-items: center; gap: 10px; padding-right: 40px; }
      .manual-header svg { width: 24px; height: 24px; flex: 0 0 auto; }
      .manual-title { margin: 0; font: 600 26px/1.1 var(--fd); color: var(--carbon); }
      .manual-close {
        position: absolute; top: 20px; right: 20px; width: 34px; height: 34px;
        border: 0; background: transparent; color: var(--carbon); font-size: 25px;
        line-height: 1; cursor: pointer; border-radius: 50%;
      }
      .manual-close:hover { background: var(--piedra); }
      .manual-module { margin: 20px 0 24px; padding-bottom: 18px; border-bottom: 1px solid var(--piedra); }
      .manual-module strong { display: block; margin-bottom: 3px; font-size: 16px; }
      .manual-subtitle { color: var(--warm-mid); font-size: 14px; }
      .manual-body h4 {
        margin: 24px 0 8px; color: var(--carbon); font: 700 13px/1.3 var(--fb);
        letter-spacing: .08em; text-transform: uppercase;
      }
      .manual-body p, .manual-body li { font-size: 14px; line-height: 1.6; }
      .manual-body p { margin: 0 0 14px; }
      .manual-body ul, .manual-body ol { margin: 8px 0 18px; padding-left: 22px; }
      .manual-body li + li { margin-top: 6px; }
      .manual-kv { margin: 8px 0 18px; }
      .manual-kv-row { padding: 9px 0; border-bottom: 1px solid var(--piedra); font-size: 14px; line-height: 1.5; }
      .manual-note {
        margin: 16px 0; padding: 13px 15px; border-left: 3px solid var(--warm-mid);
        background: rgba(143,56,51,.06); font-size: 14px; line-height: 1.6;
      }
      .manual-roles { margin: 18px 0; }
      .manual-roles-title { display: block; margin-bottom: 9px; font-size: 13px; }
      .manual-chips { display: flex; flex-wrap: wrap; gap: 7px; }
      .manual-chip {
        display: inline-block; padding: 5px 10px; border-radius: 999px;
        background: var(--piedra); color: var(--carbon); font-size: 12px;
      }
      @media (max-width: 640px) {
        #manual-fab { right: 16px; bottom: 16px; width: 46px; height: 46px; font-size: 22px; }
        #manual-overlay { padding: 12px; }
        .manual-card { padding: 26px 20px; max-height: 92vh; }
        .manual-close { top: 14px; right: 12px; }
      }
    `;
    document.head.appendChild(style);

    var fab = document.createElement('button');
    fab.id = 'manual-fab';
    fab.type = 'button';
    fab.title = 'Manual de este módulo';
    fab.setAttribute('aria-label', 'Abrir manual de este módulo');
    fab.textContent = '?';

    var overlay = document.createElement('div');
    overlay.id = 'manual-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'manual-dialog-title');
    overlay.innerHTML = `
      <div class="manual-card">
        <button class="manual-close" type="button" aria-label="Cerrar manual">&times;</button>
        <div class="manual-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11a2 2 0 0 1 2 2v15a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 20.5z"/>
            <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H15a2 2 0 0 0-2 2v15a2 2 0 0 1 2-2h2.5a2.5 2.5 0 0 1 2.5 2.5z"/>
          </svg>
          <h3 class="manual-title" id="manual-dialog-title">Manual de uso</h3>
        </div>
        <div class="manual-module"></div>
        <div class="manual-body"></div>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(overlay);

    var moduleInfo = overlay.querySelector('.manual-module');
    var body = overlay.querySelector('.manual-body');
    var closeButton = overlay.querySelector('.manual-close');

    function escapeHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function renderBlock(block) {
      if (!block || !block.type) return '';
      if (block.type === 'p') return '<p>' + escapeHtml(block.text) + '</p>';
      if (block.type === 'h') return '<h4>' + escapeHtml(block.text) + '</h4>';
      if (block.type === 'list' || block.type === 'steps') {
        var tag = block.type === 'list' ? 'ul' : 'ol';
        var items = Array.isArray(block.items) ? block.items : [];
        return '<' + tag + '>' + items.map(function (item) {
          return '<li>' + escapeHtml(item) + '</li>';
        }).join('') + '</' + tag + '>';
      }
      if (block.type === 'kv') {
        var pairs = Array.isArray(block.items) ? block.items : [];
        return '<div class="manual-kv">' + pairs.map(function (pair) {
          pair = Array.isArray(pair) ? pair : [];
          return '<div class="manual-kv-row"><strong>' + escapeHtml(pair[0]) + '</strong> — ' + escapeHtml(pair[1]) + '</div>';
        }).join('') + '</div>';
      }
      if (block.type === 'note') return '<div class="manual-note">' + escapeHtml(block.text) + '</div>';
      if (block.type === 'roles') {
        var roles = Array.isArray(block.items) ? block.items : [];
        return '<div class="manual-roles"><strong class="manual-roles-title">Quién lo usa</strong><div class="manual-chips">' +
          roles.map(function (role) { return '<span class="manual-chip">' + escapeHtml(role) + '</span>'; }).join('') +
          '</div></div>';
      }
      return '';
    }

    function openManual() {
      var v = document.querySelector('.view.active');
      var key = v ? v.id.replace('view-', '') : null;
      if (!key) {
        var activeLink = document.querySelector('.sb-link.active');
        key = activeLink ? activeLink.getAttribute('data-view') : null;
      }
      var man = (window.LAUREAN_MANUAL_VIEWS || {})[key];

      if (!man) {
        moduleInfo.innerHTML = '<strong>Esta sección</strong><span class="manual-subtitle">Guía contextual</span>';
        body.innerHTML = '<p>Aún no hay manual para esta sección. Usa el menú de la izquierda para navegar; cada módulo tiene su propia guía.</p>';
      } else {
        moduleInfo.innerHTML = '<strong>' + escapeHtml(man.label) + '</strong><span class="manual-subtitle">' + escapeHtml(man.subtitle) + '</span>';
        var blocks = Array.isArray(man.blocks) ? man.blocks : [];
        body.innerHTML = blocks.map(renderBlock).join('');
      }

      overlay.style.display = 'flex';
      closeButton.focus();
    }

    function closeManual() {
      overlay.style.display = 'none';
      fab.focus();
    }

    fab.addEventListener('click', openManual);
    closeButton.addEventListener('click', closeManual);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeManual();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && overlay.style.display === 'flex') closeManual();
    });
  });
})();
