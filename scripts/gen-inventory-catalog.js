// ============================================================
// LAUREAN — Generador de seed de inventario (mayoreo) → SQL
//
// Lee el CSV exportado del Google Sheet "INVENTARIO ACTUALIZADO SW"
// y produce `supabase/seed-inventory.sql` con UPSERT a
// public.inventory_items.  Este SQL corre en el SQL Editor de
// Supabase (server-side) y NUNCA se publica al hosting.
//
// IMPORTANTE: No editar el .sql a mano; regenerar con:
//   node scripts/gen-inventory-catalog.js
//
// Uso:  node scripts/gen-inventory-catalog.js
// ============================================================

const fs   = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'Docs',
  'INVENTARIO ACTUALIZADO SW AÑO 20256.xlsx - Hoja1.csv');
const OUT_PATH = path.join(__dirname, '..', 'supabase', 'seed-inventory.sql');

// ─── Parsers (espejo de js/inventory-import.js) ────────────────────────────
// Conteos: miles con '.' → entero.  "3.670" → 3670
function parseGtInt(raw) {
  if (raw == null) return 0;
  const digits = String(raw).replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}
// Precio ES: "Q2.290,00" → 2290 ; "Q5,00" → 5
function parseEsPrice(raw) {
  if (raw == null) return null;
  let s = String(raw).replace(/[Qq\s]/g, '').trim();
  if (!s) return null;
  s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}
// Precio US: "Q15.00" → 15 (decimal con '.', miles con ',')
function parseUsPrice(raw) {
  if (raw == null) return null;
  let s = String(raw).replace(/[Qq\s]/g, '').trim();
  if (!s) return null;
  s = s.replace(/,/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}
// Precio de venta: rango "Qx a Qy" (US) → {min,max} ; único (ES) → min=max
function parseSalePrice(raw) {
  if (raw == null) return { min: null, max: null };
  const s = String(raw).trim();
  if (!s) return { min: null, max: null };
  const m = s.match(/^(.+?)\s+[aA]\s+(.+)$/);
  if (m) {
    return { min: parseUsPrice(m[1]), max: parseUsPrice(m[2]) };
  }
  const v = parseEsPrice(s);
  return { min: v, max: v };
}

// Convierte dd/mm/yyyy → yyyy-mm-dd (ISO). Retorna null si no parseable.
function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, mo, y] = match;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// Número de semana ISO-8601 (1–53) a partir de "yyyy-mm-dd". Mismo algoritmo
// que isoWeekNumber en js/inventory-import.js.
function isoWeekNumber(isoDateStr) {
  if (!isoDateStr) return null;
  const d = new Date(isoDateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return null;
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// ─── CSV parser (maneja comillas y comas internas) ─────────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Escapa comillas simples duplicándolas (para SQL string literals)
function sqlStr(v) {
  if (v == null) return 'NULL';
  return "'" + String(v).replace(/'/g, "''") + "'";
}
function sqlNum(v) {
  if (v == null) return 'NULL';
  return String(v);
}
function sqlDate(v) {
  if (!v) return 'NULL';
  return "'" + v + "'";
}

// ─── Main ──────────────────────────────────────────────────────────────────
const raw  = fs.readFileSync(CSV_PATH, 'utf8');
const rows = parseCsv(raw).filter(r => r.some(c => c && c.trim()));
rows.shift(); // descarta encabezado

const stmts = [];
for (const r of rows) {
  const [cod, entryDateRaw, supplier, brand, _photo, description,
         _styles, conteo, _diff, costRaw, saleRaw, , , obsRaw] = r;
  const codT = (cod || '').trim();
  if (!codT) continue;

  const entryISO  = parseDate((entryDateRaw || '').trim());
  const stockCount = parseGtInt(conteo);
  const costPrice  = parseEsPrice((costRaw || '').trim());
  const sale       = parseSalePrice((saleRaw || '').trim());
  const weekNumber = isoWeekNumber(entryISO);
  const obs        = (obsRaw || '').trim() || null;
  const desc       = (description || '').trim() || null;
  const sup        = (supplier || '').trim() || null;
  const br         = (brand || '').trim() || null;

  stmts.push(
    `insert into public.inventory_items ` +
    `(cod, entry_date, supplier, brand, description, stock_count, cost_price, sale_price_min, sale_price_max, week_number, observation, active) values ` +
    `(${sqlStr(codT)}, ${sqlDate(entryISO)}, ${sqlStr(sup)}, ${sqlStr(br)}, ${sqlStr(desc)}, ` +
    `${sqlNum(stockCount)}, ${sqlNum(costPrice)}, ${sqlNum(sale.min)}, ${sqlNum(sale.max)}, ` +
    `${sqlNum(weekNumber)}, ${sqlStr(obs)}, true) ` +
    `on conflict (cod) do update set ` +
    `entry_date = excluded.entry_date, supplier = excluded.supplier, brand = excluded.brand, ` +
    `description = excluded.description, stock_count = excluded.stock_count, ` +
    `cost_price = excluded.cost_price, sale_price_min = excluded.sale_price_min, ` +
    `sale_price_max = excluded.sale_price_max, week_number = excluded.week_number, ` +
    `observation = excluded.observation;`
  );
}

const banner =
`-- ============================================================
-- LAUREAN — Seed de inventario mayoreo (GENERADO)
-- Fuente CSV: Docs/INVENTARIO ACTUALIZADO SW AÑO 20256.xlsx - Hoja1.csv
-- Regenerar:  node scripts/gen-inventory-catalog.js
-- Ejecutar en: SQL Editor de Supabase (server-side, NO publicar al hosting).
-- NO editar a mano.  Ítems: ${stmts.length}
-- ============================================================

`;

fs.writeFileSync(OUT_PATH, banner + stmts.join('\n') + '\n', 'utf8');

console.log(`OK → ${OUT_PATH}`);
console.log(`Ítems generados: ${stmts.length}`);
