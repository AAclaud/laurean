(function () {
  if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  function ensureCursorElement(selector, className, id) {
    var element = document.querySelector(selector);
    if (element) return element;

    element = document.createElement('div');
    element.className = className;
    element.id = id;
    element.setAttribute('aria-hidden', 'true');
    document.body.appendChild(element);
    return element;
  }

  function initCursor() {
    if (!document.body) return;

    var dot = ensureCursorElement('.cursor-dot', 'cursor-dot', 'cursor-dot');
    var ring = ensureCursorElement('.cursor-ring', 'cursor-ring', 'cursor-ring');
    var mx = -200;
    var my = -200;
    var rx = -200;
    var ry = -200;
    var hoverSel = 'a, button, [role="button"], input, select, textarea, label, .cursor-hover';

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = 'translate(calc(' + mx + 'px - 50%), calc(' + my + 'px - 50%))';
    }, { passive: true });

    (function animateRing() {
      rx += (mx - rx) * 0.11;
      ry += (my - ry) * 0.11;
      ring.style.transform = 'translate(calc(' + rx + 'px - 50%), calc(' + ry + 'px - 50%))';
      requestAnimationFrame(animateRing);
    })();

    document.addEventListener('mouseover', function (e) {
      if (e.target.closest && e.target.closest(hoverSel)) ring.classList.add('cursor-hover');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest(hoverSel)) ring.classList.remove('cursor-hover');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCursor, { once: true });
  } else {
    initCursor();
  }
})();
