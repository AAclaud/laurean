(function () {
  'use strict';

  const DEFAULT_LOOKBOOK = {
    slides: [
      {
        type: 'image',
        theme: 'dark',
        align: 'bleed',
        logo: 'images/lookbook/logo-principal.svg',
        image: 'images/lookbook/familia-hero.jpg',
        alt: 'Familia vistiendo prendas Laurean en una escena editorial',
        eyebrow: 'LAUREAN',
        title: 'El arte de vestir bien',
        kicker: 'La elegancia está en lo simple. Moda guatemalteca para toda la familia.',
        loading: 'eager'
      },
      {
        type: 'image',
        theme: 'light',
        image: 'images/lookbook/familia-editorial.jpg',
        alt: 'Familia con prendas Laurean en exterior',
        eyebrow: 'Familia',
        title: 'Moda para la vida real',
        kicker: 'Ropa para la vida real: comodidad, estética y practicidad en equilibrio.'
      },
      {
        type: 'image',
        theme: 'dark',
        reverse: true,
        image: 'images/lookbook/familia-sweaters-trio.jpg',
        alt: 'Tres personas usando sweaters Laurean',
        eyebrow: 'Cercanía',
        title: 'Vestir bien, sin esfuerzo',
        kicker: 'Una experiencia cercana, práctica y sin riesgos.'
      },
      {
        type: 'image',
        theme: 'dark',
        image: 'images/lookbook/men-city-sweatshirt.jpg',
        logo: 'images/lookbook/logo-men.svg',
        alt: 'Hombre caminando en ciudad con estilo sobrio',
        eyebrow: 'Laurean Men',
        title: 'Solidez sobria',
        kicker: 'Ropa para hombre: masculinidad elegante, moderna y auténtica.'
      },
      {
        type: 'image',
        theme: 'light',
        reverse: true,
        image: 'images/lookbook/men-phone-jacket.jpg',
        alt: 'Hombre con teléfono y chaqueta en exterior',
        eyebrow: 'Men',
        title: 'Presencia sin exceso',
        kicker: 'Líneas limpias para moverse con seguridad.'
      },
      {
        type: 'quote',
        theme: 'dark',
        quote: 'Vestirse bien como experiencia cercana, práctica y sin riesgos.',
        note: 'Promesa de marca'
      },
      {
        type: 'image',
        theme: 'light',
        image: 'images/lookbook/women-mother-work.jpg',
        logo: 'images/lookbook/logo-women.svg',
        alt: 'Mujer trabajando desde casa con niños',
        eyebrow: 'Laurean Women',
        title: 'Feminidad contemporánea',
        kicker: 'Ropa para mujer: delicada, editorial y natural.'
      },
      {
        type: 'image',
        theme: 'dark',
        reverse: true,
        image: 'images/lookbook/women-daughter-yard.jpg',
        alt: 'Mujer con su hija en un jardín',
        eyebrow: 'Women',
        title: 'Belleza que respira',
        kicker: 'Prendas elegantes, accesibles y funcionales para la vida real.'
      },
      {
        type: 'image',
        theme: 'light',
        image: 'images/lookbook/kids-flying-goggles.jpg',
        logo: 'images/lookbook/logo-kids.svg',
        alt: 'Niño jugando con gafas de aviador',
        eyebrow: 'Laurean Kids',
        title: 'Exploración espontánea',
        kicker: 'Ropa para niños: dinámica, creativa y auténtica.'
      },
      {
        type: 'image',
        theme: 'dark',
        reverse: true,
        image: 'images/lookbook/kids-bubbles.jpg',
        alt: 'Niñas jugando con burbujas',
        eyebrow: 'Kids',
        title: 'Movimiento y juego',
        kicker: 'La moda también puede sentirse ligera.'
      },
      {
        type: 'quote',
        theme: 'light',
        quote: 'Honestidad. Cercanía. Calidad. Coherencia.',
        note: 'Valores que sostienen cada entrega.'
      },
      {
        type: 'image',
        theme: 'dark',
        image: 'images/lookbook/mockup-bag.png',
        alt: 'Mockup de bolsa Laurean',
        eyebrow: 'Detalle',
        title: 'La promesa llega completa',
        kicker: 'De la selección a la entrega, cada gesto comunica confianza.'
      },
      {
        type: 'categories',
        theme: 'dark',
        eyebrow: 'Colecciones',
        title: 'Tres formas de vestir bien',
        kicker: 'Women, Men y Kids: tres colecciones con identidad propia, envío a toda Guatemala.',
        categories: [
          {
            name: 'Women',
            href: 'laurean-women.html',
            logo: 'images/lookbook/logo-women.svg',
            ambient: 'women',
            caption: 'Feminidad contemporánea'
          },
          {
            name: 'Men',
            href: 'laurean-men.html',
            logo: 'images/lookbook/logo-men.svg',
            ambient: 'men',
            caption: 'Sobriedad moderna'
          },
          {
            name: 'Kids',
            href: 'laurean-kids.html',
            logo: 'images/lookbook/logo-kids.svg',
            ambient: 'kids',
            caption: 'Juego y autenticidad'
          }
        ]
      }
    ]
  };

  const state = {
    slides: [],
    current: 0,
    track: null,
    nav: null,
    progress: null,
    counter: null,
    isMobile: false,
    wheelLock: false,
    drag: null,
    observer: null
  };

  const CATEGORY_HREFS = {
    women: 'laurean-women.html',
    men: 'laurean-men.html',
    kids: 'laurean-kids.html'
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[ch];
    });
  }

  function attr(name, value) {
    if (value == null || value === '') return '';
    return ' ' + name + '="' + escapeHtml(value) + '"';
  }

  function normalizeLookbook(value) {
    const source = Array.isArray(value) ? { slides: value } : value;
    if (!source || !Array.isArray(source.slides)) return DEFAULT_LOOKBOOK;

    const slides = source.slides
      .filter(Boolean)
      .map(function (slide) {
        const type = slide.type || (slide.categories ? 'categories' : (slide.quote ? 'quote' : 'image'));
        return Object.assign({}, slide, { type: type });
      });

    return slides.length ? { slides: slides } : DEFAULT_LOOKBOOK;
  }

  function readLocalLookbook() {
    try {
      const raw = localStorage.getItem('laurean_site_settings');
      if (!raw) return null;
      const settings = JSON.parse(raw);
      return settings && settings.lookbook ? settings.lookbook : null;
    } catch (err) {
      return null;
    }
  }

  function waitForSupabaseReady() {
    if (window.LAUREAN_DB || window.LAUREAN_SUPABASE_READY !== undefined) {
      return Promise.resolve();
    }

    return new Promise(function (resolve) {
      let settled = false;
      const timeout = window.setTimeout(done, 1400);

      function done() {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        document.removeEventListener('laurean:supabase-ready', done);
        resolve();
      }

      document.addEventListener('laurean:supabase-ready', done, { once: true });
    });
  }

  async function fetchLookbookConfig() {
    if (window.LAUREAN_LOOKBOOK) return normalizeLookbook(window.LAUREAN_LOOKBOOK);

    const local = readLocalLookbook();
    if (local) return normalizeLookbook(local);

    const db = window.LAUREAN_DB;
    if (!db || typeof db.from !== 'function') return DEFAULT_LOOKBOOK;

    try {
      const query = db.from('site_settings').select('value').eq('key', 'lookbook');
      const result = typeof query.maybeSingle === 'function'
        ? await query.maybeSingle()
        : await query.single();
      if (result && !result.error && result.data && result.data.value) {
        return normalizeLookbook(result.data.value);
      }
    } catch (err) {
      return DEFAULT_LOOKBOOK;
    }

    return DEFAULT_LOOKBOOK;
  }

  function splitTitle(title) {
    const text = String(title || '');
    const parts = text.split('|');
    if (parts.length > 1) {
      return escapeHtml(parts[0].trim()) + '<em>' + escapeHtml(parts.slice(1).join('|').trim()) + '</em>';
    }
    return escapeHtml(text);
  }

  function renderImageSlide(slide, index) {
    const theme = slide.theme === 'light' ? 'light' : 'dark';
    const align = slide.align === 'bleed' ? 'bleed' : 'split';
    const reverse = slide.reverse ? ' is-reverse' : '';
    const loading = index === 0 || slide.loading === 'eager' ? 'eager' : 'lazy';
    const logo = slide.logo ? '<img class="slide-logo" src="' + escapeHtml(slide.logo) + '" alt="" aria-hidden="true">' : '';
    const image = slide.image || '';

    return [
      '<section class="lookbook-slide" data-slide-index="' + index + '" data-theme="' + theme + '" data-align="' + align + '" aria-label="' + escapeHtml(slide.eyebrow || 'Lookbook') + '">',
      '  <div class="slide-stage' + reverse + '">',
      '    <div class="slide-media brand-img">',
      '      <img class="brand-img-photo" src="' + escapeHtml(image) + '" alt="' + escapeHtml(slide.alt || '') + '" loading="' + loading + '" decoding="async">',
      '    </div>',
      '    <div class="slide-copy">',
      logo,
      slide.eyebrow ? '      <span class="slide-eyebrow">' + escapeHtml(slide.eyebrow) + '</span>' : '',
      '      <h1 class="slide-title">' + splitTitle(slide.title || '') + '</h1>',
      slide.kicker ? '      <p class="slide-kicker">' + escapeHtml(slide.kicker) + '</p>' : '',
      '      <div class="slide-rule" aria-hidden="true"></div>',
      '    </div>',
      '  </div>',
      '</section>'
    ].join('');
  }

  function renderQuoteSlide(slide, index) {
    const theme = slide.theme === 'light' ? 'light' : 'dark';
    return [
      '<section class="lookbook-slide quote-slide" data-slide-index="' + index + '" data-theme="' + theme + '" aria-label="Cita de marca">',
      '  <div class="quote-inner">',
      '    <span class="quote-mark" aria-hidden="true">LAUREAN</span>',
      '    <blockquote class="quote-text">' + escapeHtml(slide.quote || '') + '</blockquote>',
      slide.note ? '    <p class="quote-note">' + escapeHtml(slide.note) + '</p>' : '',
      '  </div>',
      '</section>'
    ].join('');
  }

  function renderCategoriesSlide(slide, index) {
    const categories = Array.isArray(slide.categories) ? slide.categories : DEFAULT_LOOKBOOK.slides[12].categories;
    const cards = categories.map(function (cat) {
      const key = String(cat.ambient || cat.name || '').trim().toLowerCase();
      const savedHref = String(cat.href || '').trim();
      const href = savedHref && savedHref !== '#' ? savedHref : CATEGORY_HREFS[key] || '#';
      return [
        '<a class="category-card" href="' + escapeHtml(href) + '" data-ambient-target="' + escapeHtml(cat.ambient || '') + '">',
        '  <img class="category-logo" src="' + escapeHtml(cat.logo || '') + '" alt="' + escapeHtml('Laurean ' + (cat.name || '')) + '" loading="lazy" decoding="async">',
        '  <div>',
        '    <h2>' + escapeHtml(cat.name || '') + '</h2>',
        '    <span>' + escapeHtml(cat.caption || 'Ver coleccion') + '</span>',
        '  </div>',
        '</a>'
      ].join('');
    }).join('');

    return [
      '<section class="lookbook-slide category-slide" data-slide-index="' + index + '" data-theme="dark" aria-label="Colecciones Laurean">',
      '  <div class="category-heading">',
      '    <h1>' + splitTitle(slide.title || 'Tres formas de vestir bien') + '</h1>',
      '    <p>' + escapeHtml(slide.kicker || '') + '</p>',
      '  </div>',
      '  <div class="category-grid">',
      cards,
      '  </div>',
      '  <p class="category-signature">Laurean <em>by Seong Woo</em></p>',
      '</section>'
    ].join('');
  }

  function render(slides) {
    state.slides = slides;
    if (!state.track) return;

    if (!slides.length) {
      state.track.innerHTML = [
        '<section class="lookbook-empty">',
        '  <h1>Lookbook</h1>',
        '  <p>No hay slides disponibles por el momento.</p>',
        '</section>'
      ].join('');
      return;
    }

    state.track.innerHTML = slides.map(function (slide, index) {
      if (slide.type === 'quote') return renderQuoteSlide(slide, index);
      if (slide.type === 'categories') return renderCategoriesSlide(slide, index);
      return renderImageSlide(slide, index);
    }).join('');

    if (window.LAUREAN_BRAND_IMG_SCAN) window.LAUREAN_BRAND_IMG_SCAN(state.track);
    bindCategoryAmbient();
    setupObserver();
    updateActive(0);
    requestAnimationFrame(updateProgress);
  }

  function bindCategoryAmbient() {
    state.track.querySelectorAll('[data-ambient-target]').forEach(function (link) {
      const ambient = link.getAttribute('data-ambient-target');
      link.addEventListener('mouseenter', function () { document.body.dataset.ambient = ambient; });
      link.addEventListener('focus', function () { document.body.dataset.ambient = ambient; });
      link.addEventListener('mouseleave', function () { document.body.dataset.ambient = ''; });
      link.addEventListener('blur', function () { document.body.dataset.ambient = ''; });
    });
  }

  function setupObserver() {
    if (state.observer) state.observer.disconnect();

    const root = state.isMobile ? null : state.track;
    state.observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        const slide = entry.target;
        const index = Number(slide.dataset.slideIndex || 0);
        if (entry.isIntersecting && entry.intersectionRatio >= 0.52) {
          updateActive(index);
        }
        slide.classList.toggle('is-active', entry.isIntersecting && entry.intersectionRatio >= 0.52);
      });
    }, {
      root: root,
      threshold: [0, .18, .52, .78]
    });

    state.track.querySelectorAll('.lookbook-slide').forEach(function (slide) {
      state.observer.observe(slide);
    });
  }

  function updateActive(index) {
    state.current = Math.max(0, Math.min(index, state.slides.length - 1));
    const slide = state.track.querySelector('[data-slide-index="' + state.current + '"]');
    const theme = slide && slide.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    if (state.nav) state.nav.dataset.logo = theme === 'light' ? 'light' : 'dark';
    if (state.counter) {
      state.counter.textContent = String(state.current + 1).padStart(2, '0') + ' / ' + String(state.slides.length).padStart(2, '0');
    }
  }

  function updateProgress() {
    if (!state.progress) return;

    let ratio = 0;
    if (state.isMobile) {
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      ratio = maxY > 0 ? window.scrollY / maxY : 0;
    } else {
      const maxX = state.track.scrollWidth - state.track.clientWidth;
      ratio = maxX > 0 ? state.track.scrollLeft / maxX : 0;
    }

    state.progress.style.width = (Math.max(0, Math.min(1, ratio)) * 100).toFixed(2) + '%';
  }

  function scrollToSlide(index) {
    const target = Math.max(0, Math.min(index, state.slides.length - 1));
    const slide = state.track.querySelector('[data-slide-index="' + target + '"]');
    if (!slide) return;

    if (state.isMobile) {
      slide.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      state.track.scrollTo({ left: target * window.innerWidth, behavior: 'smooth' });
    }
  }

  function onWheel(event) {
    if (state.isMobile || state.wheelLock) return;
    const dominant = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (Math.abs(dominant) < 12) return;
    event.preventDefault();
    state.wheelLock = true;
    scrollToSlide(state.current + (dominant > 0 ? 1 : -1));
    window.setTimeout(function () { state.wheelLock = false; }, 820);
  }

  function onKeydown(event) {
    const nextKeys = ['ArrowRight', 'ArrowDown', 'PageDown', ' '];
    const prevKeys = ['ArrowLeft', 'ArrowUp', 'PageUp'];
    if (nextKeys.indexOf(event.key) >= 0) {
      event.preventDefault();
      scrollToSlide(state.current + 1);
    } else if (prevKeys.indexOf(event.key) >= 0) {
      event.preventDefault();
      scrollToSlide(state.current - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      scrollToSlide(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      scrollToSlide(state.slides.length - 1);
    }
  }

  function bindDrag() {
    state.track.addEventListener('pointerdown', function (event) {
      if (state.isMobile || event.button !== 0) return;
      state.drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        scrollLeft: state.track.scrollLeft,
        moved: false
      };
    });

    state.track.addEventListener('pointermove', function (event) {
      if (!state.drag || state.drag.pointerId !== event.pointerId) return;
      const delta = event.clientX - state.drag.startX;
      if (Math.abs(delta) > 6 && !state.drag.moved) {
        state.drag.moved = true;
        state.track.classList.add('is-dragging');
        try {
          state.track.setPointerCapture(event.pointerId);
        } catch (error) {
          // Pointer capture can fail if the pointer is already released.
        }
      }
      state.track.scrollLeft = state.drag.scrollLeft - delta;
    });

    function endDrag(event) {
      if (!state.drag || state.drag.pointerId !== event.pointerId) return;
      const delta = event.clientX - state.drag.startX;
      const moved = state.drag.moved;
      state.track.classList.remove('is-dragging');
      state.drag = null;
      if (moved) {
        const offset = Math.abs(delta) > window.innerWidth * .12 ? (delta < 0 ? 1 : -1) : 0;
        scrollToSlide(state.current + offset);
      }
    }

    state.track.addEventListener('pointerup', endDrag);
    state.track.addEventListener('pointercancel', endDrag);
  }

  function onResize() {
    const wasMobile = state.isMobile;
    state.isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (wasMobile !== state.isMobile && state.track && state.slides.length) {
      setupObserver();
      scrollToSlide(state.current);
    }
    updateProgress();
  }

  async function init() {
    state.track = document.getElementById('lookbook-track');
    state.nav = document.querySelector('.lookbook-nav');
    state.progress = document.getElementById('lookbook-progress-bar');
    state.counter = document.getElementById('lookbook-counter');
    state.isMobile = window.matchMedia('(max-width: 768px)').matches;

    if (!state.track) return;

    state.track.addEventListener('wheel', onWheel, { passive: false });
    state.track.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('keydown', onKeydown);
    window.addEventListener('resize', onResize);
    bindDrag();

    await waitForSupabaseReady();
    const config = await fetchLookbookConfig();
    render(normalizeLookbook(config).slides);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
