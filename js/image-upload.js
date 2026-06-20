// ============================================================
// LAUREAN — Image Uploader Component
//
// Reemplaza un <input type="text" id="..."> por un componente de
// drag-and-drop con preview, validación, compresión client-side y
// modo URL manual de respaldo.
//
// Uso:
//   <input type="text" id="mp-image" />
//   ...
//   initImageUploader('mp-image', {
//     recommended: '1200×1500 px (4:5)',
//     maxDim: 1400,
//     quality: 0.82,
//   });
//
// FASE 1: el resultado se guarda como dataURL Base64 en el input
//         oculto (compatible con localStorage actual).
// FASE 2: opts.uploader: async (file) => urlPublica  permitirá subir
//         a Supabase Storage devolviendo URL pública.
// ============================================================

(function (global) {
  'use strict';

  const DEFAULT_OPTS = {
    recommended: '1200×1500 px',
    maxDim: 1400,
    quality: 0.82,
    maxBytes: 8 * 1024 * 1024,        // 8 MB original
    accept: 'image/jpeg,image/png,image/webp',
    uploader: null,                    // (file, dataUrl) => Promise<string|null>; null = guarda dataURL
  };

  function styleInject() {
    if (document.getElementById('laurean-img-uploader-styles')) return;
    const css = `
      .img-uploader { display: flex; gap: 16px; align-items: flex-start; }
      .img-uploader .img-preview {
        width: 120px; height: 120px;
        border: 1.5px dashed rgba(142, 56, 51, 0.25);
        border-radius: 8px;
        background: rgba(241, 236, 232, 0.5);
        background-size: cover; background-position: center;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s;
        flex-shrink: 0;
        position: relative;
        overflow: hidden;
      }
      .img-uploader .img-preview:hover,
      .img-uploader.dragover .img-preview {
        border-color: #8E3833;
        background-color: rgba(142, 56, 51, 0.06);
      }
      .img-uploader .img-preview-empty {
        font-family: 'Cormorant Garamond', Georgia, serif;
        font-size: 28px;
        font-weight: 300;
        color: rgba(142, 56, 51, 0.45);
        line-height: 1;
        pointer-events: none;
      }
      .img-uploader .img-actions { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
      .img-uploader .img-btn {
        display: inline-flex; align-items: center; gap: 7px;
        padding: 8px 14px;
        font-size: 11.5px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-family: 'DM Sans', sans-serif;
        font-weight: 500;
        border: 1px solid rgba(25, 26, 24, 0.15);
        background: white;
        color: #191A18;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.18s;
        align-self: flex-start;
      }
      .img-uploader .img-btn:hover { border-color: #8E3833; color: #8E3833; }
      .img-uploader .img-btn.primary { background: #8E3833; color: #F1ECE8; border-color: #8E3833; }
      .img-uploader .img-btn.primary:hover { background: #531F23; border-color: #531F23; color: #F1ECE8; }
      .img-uploader .img-btn.danger { border-color: rgba(198,40,40,0.35); color: #c62828; }
      .img-uploader .img-btn.danger:hover { background: rgba(198,40,40,0.06); }
      .img-uploader .img-btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 1.6; }
      .img-uploader .img-btn-row { display: flex; gap: 8px; flex-wrap: wrap; }
      .img-uploader .img-helper {
        font-size: 11.5px;
        color: rgba(25, 26, 24, 0.55);
        line-height: 1.45;
      }
      .img-uploader .img-helper strong { color: #8E3833; font-weight: 500; }
      .img-uploader .img-url-row { display: none; align-items: center; gap: 8px; margin-top: 4px; }
      .img-uploader.url-mode .img-url-row { display: flex; }
      .img-uploader .img-url-row input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid rgba(25,26,24,0.15);
        border-radius: 4px;
        font-family: 'DM Sans', sans-serif;
        font-size: 13px;
        color: #191A18;
        outline: none;
        background: white;
      }
      .img-uploader .img-url-row input:focus { border-color: #8E3833; }
      .img-uploader .img-status {
        font-size: 11.5px;
        color: rgba(25, 26, 24, 0.6);
        font-style: italic;
      }
      .img-uploader .img-status.error { color: #c62828; font-style: normal; }
      .img-uploader .img-status.success { color: #2e7d32; font-style: normal; }
      .img-uploader .img-progress {
        height: 3px;
        background: rgba(142, 56, 51, 0.12);
        border-radius: 2px;
        overflow: hidden;
        display: none;
      }
      .img-uploader .img-progress.active { display: block; }
      .img-uploader .img-progress-bar {
        height: 100%; width: 0;
        background: #8E3833;
        transition: width 0.3s;
      }
    `;
    const tag = document.createElement('style');
    tag.id = 'laurean-img-uploader-styles';
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  }

  async function compressImage(file, maxDim, quality) {
    // createImageBitmap funciona en navegadores modernos sin librerías
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch (e) {
      // fallback con HTMLImageElement
      const url = URL.createObjectURL(file);
      bitmap = await new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = url;
      });
    }
    const w0 = bitmap.width  || bitmap.naturalWidth;
    const h0 = bitmap.height || bitmap.naturalHeight;
    const scale = Math.min(1, maxDim / Math.max(w0, h0));
    const w = Math.round(w0 * scale);
    const h = Math.round(h0 * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    );
    return { blob, width: w, height: h, originalW: w0, originalH: h0 };
  }

  function fmtKB(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function initImageUploader(inputId, userOpts) {
    styleInject();
    const opts = Object.assign({}, DEFAULT_OPTS, userOpts || {});
    const input = document.getElementById(inputId);
    if (!input) {
      console.warn('[image-upload] input no encontrado:', inputId);
      return null;
    }
    if (input.dataset.uploaderInit === 'true') return null;
    input.dataset.uploaderInit = 'true';

    // Ocultar el input original y agregar el componente justo después
    input.type = 'hidden';

    const wrap = document.createElement('div');
    wrap.className = 'img-uploader';
    wrap.innerHTML = `
      <div class="img-preview" role="button" tabindex="0" aria-label="Subir imagen">
        <span class="img-preview-empty">+</span>
      </div>
      <div class="img-actions">
        <div class="img-btn-row">
          <button type="button" class="img-btn primary" data-act="pick">
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Subir foto
          </button>
          <button type="button" class="img-btn" data-act="toggle-url">
            <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            Usar URL
          </button>
          <button type="button" class="img-btn danger" data-act="remove" hidden>
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
            Quitar
          </button>
        </div>
        <div class="img-helper">
          Recomendado: <strong>${opts.recommended}</strong> · Se ajusta automáticamente a máximo ${opts.maxDim}px.
          Acepta JPG, PNG, WebP hasta ${Math.round(opts.maxBytes / (1024*1024))} MB.
        </div>
        <div class="img-url-row">
          <input type="text" placeholder="https://… o images/mi-archivo.jpg" />
          <button type="button" class="img-btn" data-act="url-apply">Aplicar</button>
        </div>
        <div class="img-progress"><div class="img-progress-bar"></div></div>
        <div class="img-status" aria-live="polite"></div>
      </div>
    `;
    input.parentNode.insertBefore(wrap, input.nextSibling);

    // File input oculto
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = opts.accept;
    fileInput.style.display = 'none';
    wrap.appendChild(fileInput);

    const preview    = wrap.querySelector('.img-preview');
    const urlInput   = wrap.querySelector('.img-url-row input');
    const statusEl   = wrap.querySelector('.img-status');
    const progressEl = wrap.querySelector('.img-progress');
    const progressBar= wrap.querySelector('.img-progress-bar');
    const btnRemove  = wrap.querySelector('[data-act="remove"]');

    function setPreview(src) {
      const empty = preview.querySelector('.img-preview-empty');
      if (src) {
        preview.style.backgroundImage = `url("${src}")`;
        if (empty) empty.style.display = 'none';
        btnRemove.hidden = false;
      } else {
        preview.style.backgroundImage = '';
        if (empty) empty.style.display = '';
        btnRemove.hidden = true;
      }
    }

    function setValue(val) {
      input.value = val || '';
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function setStatus(msg, kind) {
      statusEl.textContent = msg || '';
      statusEl.className = 'img-status' + (kind ? ' ' + kind : '');
    }

    function showProgress(active) {
      progressEl.classList.toggle('active', !!active);
      if (!active) progressBar.style.width = '0';
    }

    async function handleFile(file) {
      setStatus('');
      if (!file) return;
      if (!opts.accept.split(',').includes(file.type)) {
        setStatus('Formato no soportado. Usa JPG, PNG o WebP.', 'error');
        return;
      }
      if (file.size > opts.maxBytes) {
        setStatus(`Archivo muy grande (${fmtKB(file.size)}). Máximo ${Math.round(opts.maxBytes/(1024*1024))} MB.`, 'error');
        return;
      }
      try {
        showProgress(true);
        progressBar.style.width = '25%';
        setStatus('Comprimiendo…');
        const { blob, width, height, originalW, originalH } = await compressImage(file, opts.maxDim, opts.quality);
        progressBar.style.width = '60%';
        const dataUrl = await blobToDataURL(blob);
        progressBar.style.width = '85%';

        let finalValue = dataUrl;
        if (typeof opts.uploader === 'function') {
          setStatus('Subiendo…');
          const url = await opts.uploader(blob, dataUrl, { width, height });
          if (url) finalValue = url;
        }

        setValue(finalValue);
        setPreview(dataUrl); // siempre preview con dataUrl (instantáneo)
        progressBar.style.width = '100%';
        setStatus(`Lista — ${originalW}×${originalH} → ${width}×${height} (${fmtKB(blob.size)})`, 'success');
        setTimeout(() => showProgress(false), 500);
      } catch (err) {
        console.error(err);
        showProgress(false);
        setStatus('No se pudo procesar la imagen.', 'error');
      }
    }

    // Eventos
    preview.addEventListener('click', () => fileInput.click());
    preview.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
    });
    wrap.querySelector('[data-act="pick"]').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) handleFile(file);
      fileInput.value = ''; // permite re-seleccionar el mismo archivo
    });

    // Drag and drop
    ['dragenter','dragover'].forEach(evt =>
      preview.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); wrap.classList.add('dragover'); })
    );
    ['dragleave','drop'].forEach(evt =>
      preview.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); wrap.classList.remove('dragover'); })
    );
    preview.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleFile(file);
    });

    // Toggle URL mode
    wrap.querySelector('[data-act="toggle-url"]').addEventListener('click', () => {
      wrap.classList.toggle('url-mode');
      if (wrap.classList.contains('url-mode')) {
        urlInput.value = input.value && !input.value.startsWith('data:') ? input.value : '';
        urlInput.focus();
      }
    });
    wrap.querySelector('[data-act="url-apply"]').addEventListener('click', () => {
      const v = (urlInput.value || '').trim();
      if (!v) { setStatus('Pega una URL primero.', 'error'); return; }
      setValue(v);
      setPreview(v);
      setStatus('URL aplicada.', 'success');
      wrap.classList.remove('url-mode');
    });
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); wrap.querySelector('[data-act="url-apply"]').click(); }
    });

    // Remove
    btnRemove.addEventListener('click', () => {
      setValue('');
      setPreview('');
      setStatus('');
    });

    // API pública en el wrap para refresco externo (cuando openProductModal carga un producto existente)
    wrap.refresh = function () {
      const v = input.value || '';
      setPreview(v);
      if (v && v.startsWith('data:')) setStatus('Imagen guardada (dataURL).');
      else setStatus('');
    };

    // Inicial: si el input ya tiene valor, mostrar preview
    wrap.refresh();

    return wrap;
  }

  // Refresca el preview de un uploader específico (para llamar después de setValue programático)
  function refreshImageUploader(inputId) {
    const input = document.getElementById(inputId);
    if (!input || !input.nextSibling) return;
    const wrap = input.nextSibling;
    if (wrap && typeof wrap.refresh === 'function') wrap.refresh();
  }

  global.initImageUploader = initImageUploader;
  global.refreshImageUploader = refreshImageUploader;
})(window);
