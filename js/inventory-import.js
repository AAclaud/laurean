/**
 * inventory-import.js — Mayoreo (Inventario Maestro)
 * Todas las funciones se exponen en window.* para ser llamadas desde admin.html.
 * Sin dependencias externas; usa window.LAUREAN_DB (Supabase) o localStorage como fallback.
 */

(function () {
  'use strict';

  // ─── Estado del módulo ───────────────────────────────────────────────────────
  const LS_KEY = 'laurean_inventory_master';
  const LS_LEGEND_KEY = 'laurean_inventory_week_legend';
  const LS_MONTH_LEGEND_KEY = 'laurean_inventory_month_legend';

  // Nombres cortos de mes en español para etiquetas por defecto.
  const MONTH_NAMES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                       'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  let _items = [];          // cache local de inventory_items
  let _legend = {};         // leyenda del período activo { num: { color, label } }
  let _stockCache = {};     // { cod: { bodega_id: stock } }
  let _filterText = '';
  let _filterPeriod = '';   // valor del filtro de período (semana o mes)
  // Modo de período activo (control interno): 'month' (default) | 'week'.
  let _periodMode = 'month';

  // ─── Helpers de período conmutable (mes/semana) ──────────────────────────────
  // Eligen tabla/columna/LS-key/etiquetas según _periodMode.

  function _isMonth() { return _periodMode === 'month'; }

  // Tabla Supabase de la leyenda según modo.
  function _legendTable() {
    return _isMonth() ? 'inventory_month_legend' : 'inventory_week_legend';
  }
  // Columna PK de la leyenda según modo.
  function _legendCol() {
    return _isMonth() ? 'month_number' : 'week_number';
  }
  // Clave de localStorage de la leyenda según modo.
  function _legendLSKey() {
    return _isMonth() ? LS_MONTH_LEGEND_KEY : LS_LEGEND_KEY;
  }
  // Valor del período de un item según modo (mes o semana).
  function _periodValue(item) {
    return _isMonth() ? item.entry_month : item.week_number;
  }
  // Etiqueta por defecto de un valor de período (sin leyenda).
  function _periodDefaultLabel(num) {
    if (num == null) return _isMonth() ? 'Sin mes' : 'Sin semana';
    if (_isMonth()) return MONTH_NAMES[num] || ('Mes ' + num);
    return 'Sem. ' + num;
  }
  // Palabra del período (para encabezados/títulos).
  function _periodWord(cap) {
    const w = _isMonth() ? 'mes' : 'semana';
    return cap ? (w.charAt(0).toUpperCase() + w.slice(1)) : w;
  }

  // ─── Helpers de número (formato guatemalteco/español) ────────────────────────

  /**
   * Parsea un entero guatemalteco donde . es separador de miles.
   * "3.692" → 3692, "10.000" → 10000, "1" → 1, "" → null
   */
  function parseGtInt(raw) {
    if (!raw && raw !== 0) return null;
    const s = String(raw).trim();
    if (!s) return null;
    const digits = s.replace(/[^0-9]/g, '');
    if (!digits) return null;
    return parseInt(digits, 10);
  }

  /**
   * Parsea un precio español (. = miles, , = decimal).
   * Prefijo Q y espacios eliminados.
   * "Q5,00" → 5, "Q2.290,00" → 2290, "Q4,02" → 4.02
   */
  function parseEsPrice(raw) {
    if (!raw && raw !== 0) return null;
    let s = String(raw).trim().replace(/^Q/i, '').trim();
    if (!s) return null;
    s = s.replace(/\./g, '').replace(',', '.');
    const v = parseFloat(s);
    return isNaN(v) ? null : v;
  }

  /**
   * Parsea un precio US (. = decimal, , = miles).
   * Prefijo Q eliminado.
   * "Q15.00" → 15, "Q19.00" → 19, "Q48" → 48
   */
  function parseUsPrice(raw) {
    if (!raw && raw !== 0) return null;
    let s = String(raw).trim().replace(/^Q/i, '').trim();
    if (!s) return null;
    s = s.replace(/,/g, '');
    const v = parseFloat(s);
    return isNaN(v) ? null : v;
  }

  /**
   * Parsea la celda de precio de venta.
   * Si contiene " a " o " A " es un rango → parsear partes con parseUsPrice.
   * Si no, parsear como precio ES → min = max.
   * Retorna { min, max } (null si vacío).
   */
  function parseSalePrice(raw) {
    if (!raw && raw !== 0) return { min: null, max: null };
    const s = String(raw).trim();
    if (!s) return { min: null, max: null };

    // Detectar rango: "Q15.00 a Q19.00" o "Q48 A Q52"
    const rangeMatch = s.match(/^(.+?)\s+[aA]\s+(.+)$/);
    if (rangeMatch) {
      const minV = parseUsPrice(rangeMatch[1]);
      const maxV = parseUsPrice(rangeMatch[2]);
      return { min: minV, max: maxV };
    }

    // Precio único → ES decimal
    const v = parseEsPrice(s);
    return { min: v, max: v };
  }

  /**
   * Devuelve el número de semana ISO-8601 (1–53) de una fecha "yyyy-mm-dd".
   * La semana ISO empieza el lunes; la semana 1 es la que contiene el primer jueves del año.
   * Retorna null si la fecha es inválida o null.
   */
  function isoWeekNumber(isoDateStr) {
    if (!isoDateStr) return null;
    const d = new Date(isoDateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    // Ajustar al jueves de la semana actual (semana ISO se ancla en jueves)
    const day = d.getUTCDay() || 7; // 1=lun … 7=dom
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  }

  /**
   * Devuelve el número de mes (1–12) de una fecha "yyyy-mm-dd".
   * Retorna null si la fecha es inválida o null.
   */
  function monthNumber(isoDateStr) {
    if (!isoDateStr) return null;
    const m = String(isoDateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const mo = parseInt(m[2], 10);
    return (mo >= 1 && mo <= 12) ? mo : null;
  }

  /**
   * Convierte dd/mm/yyyy → yyyy-mm-dd (ISO).
   * Retorna null si no parseable.
   */
  function parseDate(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // ─── Parser CSV con soporte de comillas dobles ────────────────────────────────

  /**
   * Parsea una línea CSV respetando campos entre comillas dobles.
   * Las comillas dobles internas se escapan con "".
   */
  function parseCSVLine(line) {
    const fields = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuote = false;
          }
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          inQuote = true;
        } else if (ch === ',') {
          fields.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
    }
    fields.push(cur);
    return fields;
  }

  /**
   * Parsea el CSV completo y retorna array de objetos listos para inventory_items.
   * Omite filas con COD vacío.
   */
  function parseInventoryCSV(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (lines.length < 2) return [];

    // La cabecera tiene espacios al final en algunos campos — normalizar
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine).map(h => h.trim());

    // Mapeo de índices
    const idx = {};
    headers.forEach((h, i) => { idx[h] = i; });

    // Buscar columnas por contenido parcial (robustez ante variaciones)
    function colIdx(partial) {
      const found = headers.findIndex(h => h.toLowerCase().includes(partial.toLowerCase()));
      return found >= 0 ? found : -1;
    }

    const COL_COD         = colIdx('COD') >= 0 ? colIdx('COD') : 0;
    const COL_FECHA       = colIdx('Fecha');
    const COL_PROVEEDOR   = colIdx('Proveedor');
    const COL_MARCA       = colIdx('Marca');
    const COL_DESC        = colIdx('cripci');    // Descripción
    const COL_ESTILOS     = colIdx('Estilos');
    const COL_CONTEO      = colIdx('CONTEO');
    const COL_COSTO       = colIdx('Costo');
    const COL_VENTA       = colIdx('Venta');
    const COL_OBS         = colIdx('Observac');

    const items = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = parseCSVLine(line);

      const cod = (cols[COL_COD] || '').trim();
      if (!cod) continue;

      const rawFecha     = COL_FECHA >= 0     ? (cols[COL_FECHA] || '').trim()    : '';
      const rawProveedor = COL_PROVEEDOR >= 0 ? (cols[COL_PROVEEDOR] || '').trim(): '';
      const rawMarca     = COL_MARCA >= 0     ? (cols[COL_MARCA] || '').trim()    : '';
      const rawDesc      = COL_DESC >= 0      ? (cols[COL_DESC] || '').trim()     : '';
      const rawEstilos   = COL_ESTILOS >= 0   ? (cols[COL_ESTILOS] || '').trim() : '';
      const rawConteo    = COL_CONTEO >= 0    ? (cols[COL_CONTEO] || '').trim()  : '';
      const rawCosto     = COL_COSTO >= 0     ? (cols[COL_COSTO] || '').trim()   : '';
      const rawVenta     = COL_VENTA >= 0     ? (cols[COL_VENTA] || '').trim()   : '';
      const rawObs       = COL_OBS >= 0       ? (cols[COL_OBS] || '').trim()     : '';

      const sale = parseSalePrice(rawVenta);
      // entry_month (default interno) y week_number (opción) se auto-derivan de entry_date (ISO)
      const entryISO = parseDate(rawFecha);

      items.push({
        cod,
        entry_date:      entryISO,
        supplier:        rawProveedor || null,
        brand:           rawMarca || null,
        description:     rawDesc || null,
        styles_existing: parseGtInt(rawEstilos),
        stock_count:     parseGtInt(rawConteo) || 0,
        cost_price:      parseEsPrice(rawCosto),
        sale_price_min:  sale.min,
        sale_price_max:  sale.max,
        observation:     rawObs || null,
        entry_month:     monthNumber(entryISO),
        week_number:     isoWeekNumber(entryISO),
        active:          true,
      });
    }
    return items;
  }

  // ─── Acceso a datos ──────────────────────────────────────────────────────────

  function hasSupabase() {
    return !!(window.LAUREAN_DB);
  }

  async function loadItems() {
    if (hasSupabase()) {
      const { data, error } = await window.LAUREAN_DB
        .from('inventory_items')
        .select('*')
        .order('cod');
      if (error) { console.error('inventory_items load:', error); return []; }
      return data || [];
    } else {
      return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    }
  }

  async function loadLegend() {
    const col = _legendCol();
    if (hasSupabase()) {
      const { data, error } = await window.LAUREAN_DB
        .from(_legendTable())
        .select('*')
        .order(col);
      if (error) { console.error('legend load:', error); return {}; }
      const map = {};
      (data || []).forEach(r => { map[r[col]] = { color: r.color, label: r.label }; });
      return map;
    } else {
      return JSON.parse(localStorage.getItem(_legendLSKey()) || '{}');
    }
  }

  async function loadStock(cods) {
    if (!hasSupabase() || !cods.length) return {};
    const { data, error } = await window.LAUREAN_DB
      .from('inventory_stock')
      .select('cod,bodega_id,stock')
      .in('cod', cods);
    if (error) { console.error('inventory_stock load:', error); return {}; }
    const map = {};
    (data || []).forEach(r => {
      if (!map[r.cod]) map[r.cod] = {};
      map[r.cod][r.bodega_id] = r.stock;
    });
    return map;
  }

  async function upsertItems(items) {
    if (hasSupabase()) {
      const { error } = await window.LAUREAN_DB
        .from('inventory_items')
        .upsert(items, { onConflict: 'cod' });
      return error;
    } else {
      // localStorage fallback: merge por cod
      const existing = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      const map = {};
      existing.forEach(i => { map[i.cod] = i; });
      items.forEach(i => { map[i.cod] = Object.assign(map[i.cod] || {}, i); });
      localStorage.setItem(LS_KEY, JSON.stringify(Object.values(map)));
      return null;
    }
  }

  async function updateItem(cod, fields) {
    if (hasSupabase()) {
      const { error } = await window.LAUREAN_DB
        .from('inventory_items')
        .update(fields)
        .eq('cod', cod);
      return error;
    } else {
      const existing = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      const idx = existing.findIndex(i => i.cod === cod);
      if (idx >= 0) existing[idx] = Object.assign(existing[idx], fields);
      localStorage.setItem(LS_KEY, JSON.stringify(existing));
      return null;
    }
  }

  async function upsertStock(rows) {
    // rows: [{ cod, bodega_id, stock }]
    if (!hasSupabase()) {
      alert('El stock por bodega requiere Supabase. Por favor configure js/config.js.');
      return;
    }
    const { error } = await window.LAUREAN_DB
      .from('inventory_stock')
      .upsert(rows, { onConflict: 'cod,bodega_id' });
    if (error) alert('Error guardando stock: ' + error.message);
  }

  async function saveLegendEntry(num, color, label) {
    const n = parseInt(num, 10);
    const col = _legendCol();
    if (hasSupabase()) {
      const row = { color, label };
      row[col] = n;
      const { error } = await window.LAUREAN_DB
        .from(_legendTable())
        .upsert(row, { onConflict: col });
      if (error) { alert('Error guardando leyenda: ' + error.message); return; }
    } else {
      const map = JSON.parse(localStorage.getItem(_legendLSKey()) || '{}');
      map[n] = { color, label };
      localStorage.setItem(_legendLSKey(), JSON.stringify(map));
    }
    _legend[n] = { color, label };
  }

  async function deleteLegendEntry(num) {
    const n = parseInt(num, 10);
    if (hasSupabase()) {
      const { error } = await window.LAUREAN_DB
        .from(_legendTable())
        .delete()
        .eq(_legendCol(), n);
      if (error) { alert('Error eliminando leyenda: ' + error.message); return; }
    } else {
      const map = JSON.parse(localStorage.getItem(_legendLSKey()) || '{}');
      delete map[n];
      localStorage.setItem(_legendLSKey(), JSON.stringify(map));
    }
    delete _legend[n];
  }

  // ─── Render principal ────────────────────────────────────────────────────────

  window.renderMayoreo = async function () {
    const container = document.getElementById('inv-panel-mayoreo');
    if (!container) return;

    // Leer modo de período activo (control interno) desde settings.
    _periodMode = (typeof getSettings === 'function' && getSettings().inventory_period_mode) || 'month';
    if (_periodMode !== 'week') _periodMode = 'month';

    // Reflejar el modo activo en la UI (toggle + textos dinámicos).
    _syncPeriodModeUI();

    // Mostrar spinner
    const tbody = document.getElementById('mayoreo-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--warm-mid)">Cargando...</td></tr>';

    [_items, _legend] = await Promise.all([loadItems(), loadLegend()]);

    // Cargar stock solo si Supabase disponible
    if (hasSupabase() && _items.length) {
      _stockCache = await loadStock(_items.map(i => i.cod));
    }

    _renderTable();
    _renderLegendEditor();
    _populatePeriodFilter();
  };

  // Actualiza los textos/estados de la UI según el modo de período activo.
  function _syncPeriodModeUI() {
    const word    = _periodWord();        // 'mes' | 'semana'
    const wordCap = _periodWord(true);    // 'Mes' | 'Semana'

    // Botones del toggle (estado activo).
    ['month', 'week'].forEach(m => {
      const btn = document.getElementById('mayoreo-period-' + m);
      if (!btn) return;
      const active = (_periodMode === m);
      btn.classList.toggle('btn-dark', active);
      btn.classList.toggle('btn-light', !active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    // Encabezado de columna de la tabla.
    const th = document.getElementById('mayoreo-th-period');
    if (th) th.textContent = wordCap;

    // Título de la sección de leyenda.
    const legendTitle = document.getElementById('mayoreo-legend-title');
    if (legendTitle) legendTitle.textContent = 'Leyenda de ' + (_isMonth() ? 'meses' : 'semanas');

    // Placeholder del input "agregar entrada de leyenda".
    const newNum = document.getElementById('legend-new-week');
    if (newNum) {
      newNum.placeholder = 'N° de ' + word;
      newNum.max = _isMonth() ? '12' : '53';
    }
    const newLabel = document.getElementById('legend-new-label');
    if (newLabel) newLabel.placeholder = 'Etiqueta (ej. ' + _periodDefaultLabel(1) + ')';

    // Título del modal de asignación.
    const wmTitle = document.getElementById('mayoreo-week-modal-title');
    if (wmTitle) wmTitle.textContent = 'Asignar ' + wordCap;
    const wmLabel = document.getElementById('wm-period-label');
    if (wmLabel) wmLabel.textContent = 'Número de ' + word;
    const wmNum = document.getElementById('wm-week-number');
    if (wmNum) { wmNum.max = _isMonth() ? '12' : '53'; }
  }

  function _getFilteredItems() {
    let list = _items;
    if (_filterText) {
      const q = _filterText.toLowerCase();
      list = list.filter(i =>
        (i.cod || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.brand || '').toLowerCase().includes(q) ||
        (i.supplier || '').toLowerCase().includes(q)
      );
    }
    if (_filterPeriod !== '') {
      const pv = _filterPeriod === 'none' ? null : parseInt(_filterPeriod, 10);
      list = list.filter(i => {
        const v = _periodValue(i);
        if (pv === null) return v == null;
        return v === pv;
      });
    }
    return list;
  }

  // Badge del período activo (mes o semana). En modo semana usa el color
  // por-item (week_color); en ambos modos cae a la leyenda y luego a gris.
  function _periodBadge(item) {
    const num = _periodValue(item);
    const perItemColor = _isMonth() ? (item.period_color || null) : (item.week_color || null);
    const color = perItemColor || (_legend[num] && _legend[num].color) || null;
    if (num == null && !color) {
      return '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;background:#e8e3dc;color:#9b8e7f;">—</span>';
    }
    const bg = color || '#9b8e7f';
    const lbl = (_legend[num] && _legend[num].label)
      ? escapeHtml(_legend[num].label)
      : escapeHtml(_periodDefaultLabel(num != null ? num : null));
    return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:${escapeAttr(bg)};color:#fff;">${lbl}</span>`;
  }

  function _fmtPrice(v) {
    if (v == null) return '—';
    return 'Q' + Number(v).toFixed(2);
  }

  function _stockSumForCod(cod) {
    if (!_stockCache[cod]) return null;
    return Object.values(_stockCache[cod]).reduce((a, b) => a + (b || 0), 0);
  }

  function _renderTable() {
    const tbody = document.getElementById('mayoreo-tbody');
    if (!tbody) return;

    // Encabezado dinámico de curaduría por período (mes/semana).
    const hdr = document.getElementById('mayoreo-week-heading');
    if (hdr) {
      if (_filterPeriod === '' ) hdr.textContent = 'Todos los productos';
      else if (_filterPeriod === 'none') hdr.textContent = 'Productos sin ' + _periodWord();
      else {
        const lbl = (_legend[_filterPeriod] && _legend[_filterPeriod].label)
          || _periodDefaultLabel(parseInt(_filterPeriod, 10));
        hdr.textContent = 'Productos – ' + lbl;
      }
    }

    const list = _getFilteredItems();
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><p>Sin resultados</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(item => {
      const stockSum = _stockSumForCod(item.cod);
      const stockDisplay = stockSum !== null
        ? `<span style="font-size:11px;color:var(--warm-mid);display:block;">(bodegas: ${stockSum})</span>`
        : '';
      const saleLbl = (item.sale_price_min != null && item.sale_price_max != null && item.sale_price_min !== item.sale_price_max)
        ? `${_fmtPrice(item.sale_price_min)} – ${_fmtPrice(item.sale_price_max)}`
        : _fmtPrice(item.sale_price_min != null ? item.sale_price_min : item.sale_price_max);

      // Estado de catálogo: publicado y visible ("En catálogo") vs publicado pero oculto.
      let publishedBadge = '';
      if (item.product_id) {
        publishedBadge = item.show_in_catalog !== false
          ? `<span style="font-size:10px;color:#388E3C;display:block;margin-top:2px;">En catálogo</span>`
          : `<span style="font-size:10px;color:#9b8e7f;display:block;margin-top:2px;">Oculto</span>`;
      }

      return `<tr>
        <td style="font-family:monospace;font-size:12px;white-space:nowrap;">${escapeHtml(item.cod)}${publishedBadge}</td>
        <td style="max-width:220px;">${escapeHtml(item.description || '—')}</td>
        <td class="td-muted">${escapeHtml(item.supplier || '—')}</td>
        <td class="td-muted">${escapeHtml(item.brand || '—')}</td>
        <td style="text-align:right;font-weight:600;">${item.stock_count != null ? item.stock_count : '—'}${stockDisplay}</td>
        <td class="td-muted" style="text-align:right;">${_fmtPrice(item.cost_price)}</td>
        <td class="td-muted" style="text-align:right;white-space:nowrap;">${saleLbl}</td>
        <td style="text-align:center;">${_periodBadge(item)}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-light" style="padding:5px 10px;font-size:10px;" onclick="openWeekModal(${escapeAttr(JSON.stringify(item.cod))})">${escapeHtml(_periodWord(true))}</button>
          <button class="btn btn-light" style="padding:5px 10px;font-size:10px;margin-left:4px;" onclick="openBodegasModal(${escapeAttr(JSON.stringify(item.cod))})">Bodegas</button>
          <button class="btn btn-dark" style="padding:5px 10px;font-size:10px;margin-left:4px;" onclick="publishItem(${escapeAttr(JSON.stringify(item.cod))})">Publicar</button>
        </td>
      </tr>`;
    }).join('');
  }

  function _populatePeriodFilter() {
    const sel = document.getElementById('mayoreo-filter-week');
    if (!sel) return;
    const vals = [...new Set(_items.map(i => _periodValue(i)).filter(v => v != null))].sort((a, b) => a - b);
    const allLbl  = _isMonth() ? 'Todos los meses' : 'Todas las semanas';
    const noneLbl = 'Sin ' + _periodWord();
    sel.innerHTML = `<option value="">${allLbl}</option><option value="none">${noneLbl}</option>` +
      vals.map(v => {
        const lbl = (_legend[v] && _legend[v].label) ? escapeHtml(_legend[v].label) : escapeHtml(_periodDefaultLabel(v));
        return `<option value="${v}">${lbl}</option>`;
      }).join('');
    // Conservar selección actual si sigue disponible.
    sel.value = _filterPeriod;
  }

  // ─── Importar CSV ────────────────────────────────────────────────────────────

  window.importInventoryCSV = async function () {
    const fileInput = document.getElementById('mayoreo-csv-input');
    if (!fileInput || !fileInput.files.length) {
      alert('Seleccione un archivo CSV primero.');
      return;
    }
    const file = fileInput.files[0];
    const text = await file.text();
    const items = parseInventoryCSV(text);

    if (!items.length) {
      alert('No se encontraron filas válidas en el CSV.');
      return;
    }

    if (!confirm(`Se importarán ${items.length} artículos. Los existentes se actualizarán (upsert por COD). ¿Continuar?`)) {
      return;
    }

    const btn = document.getElementById('mayoreo-import-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Importando...'; }

    const error = await upsertItems(items);

    if (btn) { btn.disabled = false; btn.textContent = 'Importar CSV'; }

    if (error) {
      alert('Error al importar: ' + error.message);
      return;
    }

    if (!hasSupabase()) {
      alert(`${items.length} artículos guardados localmente (Supabase no configurado). Configure js/config.js para sincronizar con la base de datos.`);
    } else {
      alert(`${items.length} artículos importados correctamente.`);
    }

    fileInput.value = '';
    await window.renderMayoreo();
  };

  // ─── Filtros ─────────────────────────────────────────────────────────────────

  window.mayoreoFilterText = function (val) {
    _filterText = (val || '').trim();
    _renderTable();
  };

  window.mayoreoFilterWeek = function (val) {
    _filterPeriod = val || '';
    _renderTable();
  };

  // Conmuta el modo de período (control interno). Persiste el setting y
  // re-renderiza el módulo completo bajo el nuevo modo.
  window.setInventoryPeriodMode = async function (mode) {
    const m = (mode === 'week') ? 'week' : 'month';
    if (typeof saveSettings === 'function') {
      saveSettings({ inventory_period_mode: m });
    }
    _filterPeriod = ''; // el filtro previo no aplica al otro período
    await window.renderMayoreo();
  };

  // ─── Modal: Semana ───────────────────────────────────────────────────────────

  window.openWeekModal = function (cod) {
    const item = _items.find(i => i.cod === cod);
    if (!item) return;

    const modal = document.getElementById('mayoreo-week-modal');
    const title = document.getElementById('mayoreo-week-modal-title');
    if (!modal || !title) return;

    title.textContent = 'Asignar ' + _periodWord(true) + ' — ' + cod;
    const lbl = document.getElementById('wm-period-label');
    if (lbl) lbl.textContent = 'Número de ' + _periodWord();
    const numInput = document.getElementById('wm-week-number');
    numInput.max = _isMonth() ? '12' : '53';
    document.getElementById('wm-cod').value = cod;

    const val = _periodValue(item) || '';
    numInput.value = val;

    // Si hay leyenda para ese valor, sugerir su color; si no, usar el del item.
    const legendColor = (val && _legend[val]) ? _legend[val].color : null;
    const perItemColor = _isMonth() ? item.period_color : item.week_color;
    document.getElementById('wm-week-color').value = perItemColor || legendColor || '#9b8e7f';

    modal.style.display = 'flex';
  };

  window.closeWeekModal = function () {
    const modal = document.getElementById('mayoreo-week-modal');
    if (modal) modal.style.display = 'none';
  };

  window.saveWeekModal = async function () {
    const cod      = document.getElementById('wm-cod').value;
    const rawNum   = document.getElementById('wm-week-number').value;
    const color    = document.getElementById('wm-week-color').value;
    const num      = rawNum ? parseInt(rawNum, 10) : null;

    // En modo mes se persiste entry_month (no hay columna de color por-item en
    // mes: el color vive en la leyenda; se guarda period_color sólo en cache).
    // En modo semana se persiste week_number + week_color.
    const fields = _isMonth()
      ? { entry_month: num }
      : { week_number: num, week_color: color || null };

    const error = await updateItem(cod, fields);
    if (error) { alert('Error guardando ' + _periodWord() + ': ' + error.message); return; }

    // Actualizar cache local
    const item = _items.find(i => i.cod === cod);
    if (item) {
      if (_isMonth()) { item.entry_month = num; item.period_color = color || null; }
      else            { item.week_number = num; item.week_color = color || null; }
    }

    closeWeekModal();
    _renderTable();
  };

  // ─── Modal: Bodegas ──────────────────────────────────────────────────────────

  window.openBodegasModal = async function (cod) {
    const item = _items.find(i => i.cod === cod);
    if (!item) return;

    if (!hasSupabase()) {
      alert('La distribución por bodega requiere Supabase. Configure js/config.js.');
      return;
    }

    const modal = document.getElementById('mayoreo-bodegas-modal');
    if (!modal) return;

    document.getElementById('bm-cod').value = cod;
    document.getElementById('bm-modal-title').textContent = 'Bodegas — ' + escapeHtml(item.description || cod);

    const bodegas = typeof getBodegas === 'function' ? getBodegas() : [];
    const stockRow = _stockCache[cod] || {};

    const tbody = document.getElementById('bm-tbody');
    if (!tbody) return;

    tbody.innerHTML = bodegas.length
      ? bodegas.map(b => `<tr>
          <td>${escapeHtml(b.name)}</td>
          <td><input type="number" min="0" class="form-input" style="width:100px;padding:6px 8px;" id="bm-stock-${escapeAttr(b.id)}" value="${stockRow[b.id] != null ? stockRow[b.id] : 0}" /></td>
        </tr>`).join('')
      : '<tr><td colspan="2" class="td-muted" style="text-align:center;padding:20px;">No hay bodegas registradas</td></tr>';

    // Total distribuido
    const total = Object.values(stockRow).reduce((a, b) => a + (b || 0), 0);
    const totalEl = document.getElementById('bm-total');
    if (totalEl) totalEl.textContent = 'Total distribuido: ' + total + ' uds.';

    modal.style.display = 'flex';
  };

  window.closeBodegasModal = function () {
    const modal = document.getElementById('mayoreo-bodegas-modal');
    if (modal) modal.style.display = 'none';
  };

  window.saveBodegasModal = async function () {
    const cod = document.getElementById('bm-cod').value;
    const bodegas = typeof getBodegas === 'function' ? getBodegas() : [];
    if (!bodegas.length) { closeBodegasModal(); return; }

    const rows = bodegas.map(b => ({
      cod,
      bodega_id: b.id,
      stock: parseInt(document.getElementById('bm-stock-' + b.id)?.value || '0', 10) || 0,
    }));

    await upsertStock(rows);

    // Actualizar cache local
    if (!_stockCache[cod]) _stockCache[cod] = {};
    rows.forEach(r => { _stockCache[cod][r.bodega_id] = r.stock; });

    const total = rows.reduce((a, r) => a + r.stock, 0);
    const totalEl = document.getElementById('bm-total');
    if (totalEl) totalEl.textContent = 'Total distribuido: ' + total + ' uds.';

    closeBodegasModal();
    _renderTable();
  };

  // ─── Publicar al catálogo (con validación de precio público) ─────────────────
  // El precio crudo de mayoreo (sale_price/cost) NUNCA viaja a products: sólo el
  // public_price_gtq que el admin valida en el modal. Sin precio válido → el
  // producto se publica sin precio (CTA "Contactar a Laurean").

  let _pubCats = [];      // [{id,name}]
  let _pubSubcats = [];   // [{id,parent_id,name}]
  let _pubCatsLoaded = false;

  async function _ensureCats() {
    if (_pubCatsLoaded || !hasSupabase()) return;
    const [c, s] = await Promise.all([
      window.LAUREAN_DB.from('categories').select('id,name').order('name'),
      window.LAUREAN_DB.from('subcategories').select('id,parent_id,name').order('name'),
    ]);
    _pubCats    = (c && c.data) || [];
    _pubSubcats = (s && s.data) || [];
    _pubCatsLoaded = true;
  }

  function _fillParentSelect(selectedParent) {
    const sel = document.getElementById('pub-cat-parent');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Sin categoría —</option>' +
      _pubCats.map(c => `<option value="${escapeAttr(c.id)}"${c.id === selectedParent ? ' selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
  }

  window._pubFillSubcats = function (selectedSubcat) {
    const parentSel = document.getElementById('pub-cat-parent');
    const subSel = document.getElementById('pub-cat-subcat');
    if (!parentSel || !subSel) return;
    const parent = parentSel.value;
    const subs = _pubSubcats.filter(s => s.parent_id === parent);
    subSel.innerHTML = '<option value="">— Sin subcategoría —</option>' +
      subs.map(s => `<option value="${escapeAttr(s.id)}"${s.id === selectedSubcat ? ' selected' : ''}>${escapeHtml(s.name)}</option>`).join('');
  };

  window.publishItem = async function (cod) {
    if (!hasSupabase()) {
      alert('Publicar al catálogo requiere Supabase. Configure js/config.js.');
      return;
    }
    const item = _items.find(i => i.cod === cod);
    if (!item) return;

    await _ensureCats();

    const modal = document.getElementById('mayoreo-publish-modal');
    const title = document.getElementById('pub-modal-title');
    if (!modal) return;
    if (title) title.textContent = 'Publicar al catálogo — ' + cod;
    document.getElementById('pub-cod').value = cod;

    // Referencia de mayoreo (solo lectura): rango de venta + semana auto.
    const ref = document.getElementById('pub-ref-info');
    if (ref) {
      const saleRef = (item.sale_price_min != null && item.sale_price_max != null && item.sale_price_min !== item.sale_price_max)
        ? `${_fmtPrice(item.sale_price_min)} – ${_fmtPrice(item.sale_price_max)}`
        : _fmtPrice(item.sale_price_min != null ? item.sale_price_min : item.sale_price_max);
      ref.innerHTML = `<strong>${escapeHtml(item.description || cod)}</strong><br>` +
        `Precio mayoreo (ref.): ${saleRef} · Semana: ${item.week_number != null ? item.week_number : '—'} · Stock: ${item.stock_count != null ? item.stock_count : '—'}`;
    }

    // Prefill con valores de curaduría ya guardados (o defaults).
    document.getElementById('pub-public-price').value = item.public_price_gtq != null ? item.public_price_gtq : '';
    document.getElementById('pub-gallery').value = Array.isArray(item.gallery) ? item.gallery.join(', ') : '';
    document.getElementById('pub-show-in-catalog').checked = item.show_in_catalog !== false;
    document.getElementById('pub-show-price').checked = item.show_price !== false;

    _fillParentSelect(item.cat_parent_id || '');
    window._pubFillSubcats(item.cat_subcat_id || '');

    modal.style.display = 'flex';
  };

  window.closePublishModal = function () {
    const modal = document.getElementById('mayoreo-publish-modal');
    if (modal) modal.style.display = 'none';
  };

  window.savePublishModal = async function () {
    const cod = document.getElementById('pub-cod').value;
    const item = _items.find(i => i.cod === cod);
    if (!item) { closePublishModal(); return; }

    const priceRaw = document.getElementById('pub-public-price').value.trim();
    const publicPrice = priceRaw === '' ? null : parseFloat(priceRaw);
    const galleryArr = document.getElementById('pub-gallery').value
      .split(',').map(s => s.trim()).filter(Boolean);
    const showInCatalog = document.getElementById('pub-show-in-catalog').checked;
    const showPriceChk  = document.getElementById('pub-show-price').checked;
    const catParent = document.getElementById('pub-cat-parent').value || null;
    const catSubcat = document.getElementById('pub-cat-subcat').value || null;

    // Si no hay precio válido, se fuerza show_price=false (sin precio público).
    const hasValidPrice = showPriceChk && publicPrice != null && !isNaN(publicPrice);

    // 1) Guardar curaduría de vuelta en inventory_items.
    const errInv = await updateItem(cod, {
      public_price_gtq: publicPrice,
      show_in_catalog:  showInCatalog,
      show_price:       showPriceChk,
      cat_parent_id:    catParent,
      cat_subcat_id:    catSubcat,
      gallery:          galleryArr,
      product_id:       'inv-' + cod,
    });
    if (errInv) { alert('Error guardando curaduría: ' + errInv.message); return; }

    // 2) UPSERT a products. Nunca cost_price/supplier/sale_price.
    const productRow = {
      id:          'inv-' + cod,
      name:        item.description || cod,
      description: item.observation || null,
      price_gtq:   hasValidPrice ? publicPrice : 0,
      show_price:  hasValidPrice,
      week_number: item.week_number != null ? item.week_number : null,
      gallery:     galleryArr,
      image_url:   galleryArr[0] || item.photo_url || null,
      parent_id:   catParent,
      subcat_id:   catSubcat,
      stock:       item.stock_count || 0,
      active:      showInCatalog,
      source_cod:  cod,
    };
    const { error: pErr } = await window.LAUREAN_DB
      .from('products')
      .upsert(productRow, { onConflict: 'id' });
    if (pErr) { alert('Error publicando producto: ' + pErr.message); return; }

    // 3) Actualizar cache local.
    Object.assign(item, {
      public_price_gtq: publicPrice,
      show_in_catalog:  showInCatalog,
      show_price:       showPriceChk,
      cat_parent_id:    catParent,
      cat_subcat_id:    catSubcat,
      gallery:          galleryArr,
      product_id:       'inv-' + cod,
    });

    closePublishModal();
    _renderTable();
    alert(hasValidPrice
      ? 'Publicado en catálogo con precio al público.'
      : 'Guardado: el producto aparecerá sin precio (Contactar a Laurean).');
  };

  // ─── Editor de leyenda ───────────────────────────────────────────────────────

  function _renderLegendEditor() {
    const container = document.getElementById('mayoreo-legend-body');
    if (!container) return;

    const entries = Object.entries(_legend)
      .sort((a, b) => Number(a[0]) - Number(b[0]));

    if (!entries.length) {
      container.innerHTML = '<div style="color:var(--warm-mid);font-size:13px;padding:8px 0;">Sin entradas. Agregue un ' + escapeHtml(_periodWord()) + ' abajo.</div>';
      return;
    }

    container.innerHTML = entries.map(([num, { color, label }]) => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;" id="legend-row-${num}">
        <span style="font-size:12px;font-weight:600;width:60px;">${escapeHtml(_periodDefaultLabel(parseInt(num, 10)))}</span>
        <input type="color" value="${escapeAttr(color || '#9b8e7f')}" style="width:36px;height:32px;border:1px solid var(--piedra);padding:2px;cursor:pointer;" onchange="updateLegendColor(${num}, this.value)" />
        <input type="text" class="form-input" style="flex:1;padding:6px 10px;font-size:13px;" placeholder="Etiqueta (ej. ${escapeAttr(_periodDefaultLabel(parseInt(num, 10)))})" value="${escapeAttr(label || '')}" onchange="updateLegendLabel(${num}, this.value)" />
        <button class="btn btn-danger" style="padding:5px 10px;font-size:10px;" onclick="deleteLegendRow(${num})">Eliminar</button>
      </div>`).join('');
  }

  window.updateLegendColor = async function (wn, color) {
    const entry = _legend[wn] || {};
    await saveLegendEntry(wn, color, entry.label || '');
    _renderTable(); // actualizar badges
  };

  window.updateLegendLabel = async function (wn, label) {
    const entry = _legend[wn] || {};
    await saveLegendEntry(wn, entry.color || '#9b8e7f', label);
    _renderTable();
    _populatePeriodFilter();
  };

  window.deleteLegendRow = async function (num) {
    if (!confirm('¿Eliminar entrada de leyenda ' + _periodWord() + ' ' + num + '?')) return;
    await deleteLegendEntry(num);
    _renderLegendEditor();
    _populatePeriodFilter();
    _renderTable();
  };

  window.addLegendRow = async function () {
    const wnInput = document.getElementById('legend-new-week');
    const colorInput = document.getElementById('legend-new-color');
    const labelInput = document.getElementById('legend-new-label');

    const wn = parseInt(wnInput?.value || '', 10);
    const color = colorInput?.value || '#9b8e7f';
    const label = labelInput?.value?.trim() || '';

    const maxVal = _isMonth() ? 12 : 53;
    if (!wn || isNaN(wn) || wn < 1 || wn > maxVal) {
      alert('Ingrese un número de ' + _periodWord() + ' válido (1–' + maxVal + ').');
      return;
    }

    await saveLegendEntry(wn, color, label);

    if (wnInput) wnInput.value = '';
    if (labelInput) labelInput.value = '';

    _renderLegendEditor();
    _populatePeriodFilter();
    _renderTable();
  };

})();
