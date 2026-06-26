const fs = require('fs/promises');
const path = require('path');

const SITE = 'https://laureans.com';
const STATIC_ROUTES = [
  '',
  'catalogo',
  'nosotros',
  'laurean-women',
  'laurean-men',
  'laurean-kids',
  'lookbook',
  'vendedoras',
  'coleccion',
];

function routeToUrl(route) {
  return route ? `${SITE}/${route}` : `${SITE}/`;
}

function escapeLoc(url) {
  return String(url).replace(/&/g, '&amp;');
}

async function getProductUrls() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnon = process.env.SUPABASE_ANON;

  if (!supabaseUrl || !supabaseAnon) {
    return [];
  }

  try {
    const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/products?select=id&active=eq.true`;
    const response = await fetch(endpoint, {
      headers: {
        apikey: supabaseAnon,
        Authorization: `Bearer ${supabaseAnon}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase REST returned ${response.status}`);
    }

    const products = await response.json();
    if (!Array.isArray(products)) {
      return [];
    }

    return products
      .map((product) => product && product.id)
      .filter((id) => id !== undefined && id !== null && id !== '')
      .map((id) => `${SITE}/producto?id=${encodeURIComponent(String(id))}`);
  } catch (error) {
    console.warn(`No se pudieron agregar productos al sitemap: ${error.message}`);
    return [];
  }
}

function buildSitemap(urls) {
  const items = urls
    .map((url) => `  <url><loc>${escapeLoc(url)}</loc></url>`)
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    items,
    '</urlset>',
    '',
  ].join('\n');
}

async function main() {
  try {
    const urls = new Set(STATIC_ROUTES.map(routeToUrl));
    const productUrls = await getProductUrls();
    productUrls.forEach((url) => urls.add(url));

    const sitemap = buildSitemap([...urls]);
    const outputPath = path.join(__dirname, '..', 'sitemap.xml');
    await fs.writeFile(outputPath, sitemap, 'utf8');

    console.log(`Sitemap generado con ${urls.size} URLs.`);
  } catch (error) {
    console.warn(`No se pudo generar sitemap.xml: ${error.message}`);
  }
}

main();
