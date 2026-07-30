// Edge Function: meta-feed
// Publica el catálogo de Laurean como feed de productos para Meta (Commerce Manager).
// Una entrada por variante (producto × color × talla), agrupadas con item_group_id.
// Pública: Meta la consulta sin autenticación.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const TIENDA       = 'https://laureans.com';

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Meta exige ids sin espacios ni caracteres raros.
function slug(s: unknown): string {
  return String(s ?? '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function sb(path: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return await r.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }
  try {
    const productos = await sb(
      'products?select=id,name,description,image_url,price_gtq,active,gallery&active=eq.true&price_gtq=gt.0&limit=5000',
    );
    const stock = await sb('variant_stock?select=product_id,color,size,stock&limit=20000');

    // Sumar existencias de todas las bodegas por (producto|color|talla)
    const porVariante = new Map<string, number>();
    for (const s of stock) {
      const k = `${s.product_id}|${s.color ?? ''}|${s.size ?? ''}`;
      porVariante.set(k, (porVariante.get(k) ?? 0) + (Number(s.stock) || 0));
    }

    const items: string[] = [];
    for (const p of productos) {
      const propias = [...porVariante.entries()].filter(([k]) => k.startsWith(`${p.id}|`));
      const imagen  = p.image_url || (Array.isArray(p.gallery) ? p.gallery[0] : '') || '';
      const precio  = (Number(p.price_gtq) || 0).toFixed(2);
      const enlace  = `${TIENDA}/producto.html?id=${encodeURIComponent(p.id)}`;
      const desc    = p.description || p.name;

      // Sin variantes registradas: una sola entrada del producto.
      const filas: Array<[string, number]> = propias.length
        ? propias as Array<[string, number]>
        : [[`${p.id}||`, 0]];

      for (const [clave, unidades] of filas) {
        const partes = clave.split('|');
        const color  = partes[1] ?? '';
        const talla  = partes[2] ?? '';
        const sufijo = [slug(color), slug(talla)].filter(Boolean).join('-');
        const id     = sufijo ? `${p.id}__${sufijo}` : p.id;
        const titulo = [p.name, color, talla].filter(Boolean).join(' · ');

        items.push([
          '    <item>',
          `      <g:id>${esc(id)}</g:id>`,
          `      <g:item_group_id>${esc(p.id)}</g:item_group_id>`,
          `      <g:title>${esc(titulo)}</g:title>`,
          `      <g:description>${esc(desc)}</g:description>`,
          `      <g:link>${esc(enlace)}</g:link>`,
          `      <g:image_link>${esc(imagen)}</g:image_link>`,
          `      <g:availability>${unidades > 0 ? 'in stock' : 'out of stock'}</g:availability>`,
          '      <g:condition>new</g:condition>',
          `      <g:price>${precio} GTQ</g:price>`,
          '      <g:brand>Laurean</g:brand>',
          color ? `      <g:color>${esc(color)}</g:color>` : '',
          talla ? `      <g:size>${esc(talla)}</g:size>` : '',
          '    </item>',
        ].filter(Boolean).join('\n'));
      }
    }

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
      '  <channel>',
      '    <title>Laurean</title>',
      `    <link>${TIENDA}</link>`,
      '    <description>Catálogo de Laurean — moda para toda la familia</description>',
      items.join('\n'),
      '  </channel>',
      '</rss>',
    ].join('\n');

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=1800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response(`error: ${e instanceof Error ? e.message : String(e)}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
});
