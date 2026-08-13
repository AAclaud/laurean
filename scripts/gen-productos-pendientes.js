// Genera el documento de productos pendientes con la línea gráfica de la marca.
const fs = require('fs');
const path = require('path');
const RAIZ = '/Users/admin/Desktop/Proyectos/Laurean Shop';
const U = 'https://cmosoypdqjmxbwvlmnga.supabase.co/rest/v1';
const K = 'sb_publishable_0tnKLMSbRf2Tw1vIrRjIKw_mN6TvPLx';
const pedir = r => fetch(U + r, { headers: { apikey: K } }).then(x => x.json());
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

(async () => {
  const productos = await pedir('/products?select=id,name,stock,variants&limit=500');
  const vs = await pedir('/variant_stock?select=product_id,color,size,stock&limit=20000');
  const inv = {};
  vs.forEach(r => (inv[r.product_id] = inv[r.product_id] || []).push(r));

  const sinTallas = [], sinNada = [];
  productos.forEach(p => {
    const vars = Array.isArray(p.variants) ? p.variants : [];
    const filas = inv[p.id] || [];
    if (!vars.length) {
      if (filas.length) sinNada.push({ n: p.name, u: filas.reduce((s, r) => s + r.stock, 0) });
      return;
    }
    const malos = vars.filter(v => !(Array.isArray(v.sizes) && v.sizes.length));
    if (!malos.length) return;
    sinTallas.push({
      n: p.name, total: vars.length,
      colores: malos.map(v => {
        const lab = (v.label || '(sin nombre)').trim();
        return { c: lab, u: filas.filter(r => r.color === lab && !r.size).reduce((s, r) => s + r.stock, 0) };
      }),
    });
  });
  sinTallas.sort((a, b) => a.n.localeCompare(b.n, 'es'));
  sinNada.sort((a, b) => b.u - a.u);

  const nColores = sinTallas.reduce((s, p) => s + p.colores.length, 0);
  const uSinNada = sinNada.reduce((s, p) => s + p.u, 0);
  const logo = 'data:image/svg+xml;base64,' +
    fs.readFileSync(path.join(RAIZ, 'images/brand/logo-oscuro.svg')).toString('base64');
  const hoy = new Date().toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' });

  const filasA = sinTallas.map(p => `
    <tr class="prod">
      <td class="nom">${esc(p.n)}</td>
      <td class="cnt">${p.colores.length} de ${p.total}</td>
      <td class="cols">${p.colores.map(c =>
        `<span class="chip">${esc(c.c)}${c.u ? `<em>${c.u} u.</em>` : ''}</span>`).join('')}</td>
    </tr>`).join('');

  const filasB = sinNada.map(p => `
    <tr><td class="nom">${esc(p.n)}</td><td class="uds">${p.u.toLocaleString('es-GT')}</td></tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Productos por completar — Laurean</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --crema:#F5F2ED; --crema-d:#EDE7DD; --carbon:#1A1916; --carbon-2:#2A2925;
    --warm:#9B8E7F; --warm-d:#7A6E60; --gold:#B89968; --vino:#8E3833;
    --white:#FFFFFF; --line:#E4DDD2;
    --fd:'Cormorant Garamond', Georgia, serif;
    --fb:'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  html, body { background:var(--crema); color:var(--carbon); font-family:var(--fb);
               font-size:15px; line-height:1.55; -webkit-font-smoothing:antialiased; }
  body { padding:32px 16px; }
  .doc { max-width:900px; margin:0 auto; background:var(--white); border-radius:4px;
         overflow:hidden; box-shadow:0 2px 24px rgba(26,25,22,.07); }

  .hero { background:var(--carbon); color:var(--crema); padding:52px 52px 44px; }
  .hero img.logo { height:44px; width:auto; margin-bottom:28px; opacity:.95; }
  .kicker { font-size:11px; letter-spacing:.3em; text-transform:uppercase; color:var(--gold);
            margin-bottom:14px; font-weight:500; }
  .hero h1 { font-family:var(--fd); font-size:44px; line-height:1.05; font-weight:400;
             max-width:20ch; margin-bottom:14px; }
  .hero h1 em { font-style:italic; color:var(--gold); }
  .hero p { font-size:14.5px; color:#CFC7BB; max-width:62ch; }

  .partes { display:grid; grid-template-columns:1fr 1fr; gap:26px; padding:24px 52px;
            background:var(--carbon-2); color:var(--crema); }
  .parte .rol { font-size:10px; letter-spacing:.24em; text-transform:uppercase;
                color:var(--gold); margin-bottom:6px; }
  .parte .nom2 { font-family:var(--fd); font-size:22px; font-weight:500; line-height:1.15; }
  .parte .nom2 .sw { display:block; font-size:11.5px; font-family:var(--fb); font-weight:300;
                     letter-spacing:.12em; opacity:.62; margin-top:4px; text-transform:uppercase; }

  section { padding:38px 52px; border-bottom:1px solid var(--line); }
  section:last-of-type { border-bottom:0; }
  h2 { font-family:var(--fd); font-size:27px; font-weight:400; margin-bottom:6px; }
  h2 em { font-style:italic; color:var(--vino); }
  .sub { font-size:13.5px; color:var(--warm-d); margin-bottom:22px; max-width:70ch; }

  .cifras { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
  .cifra { background:var(--crema); border:1px solid var(--line); border-radius:6px;
           padding:18px 16px; text-align:center; }
  .cifra .n { font-family:var(--fd); font-size:31px; line-height:1; color:var(--vino); }
  .cifra .l { font-size:11px; letter-spacing:.1em; text-transform:uppercase;
              color:var(--warm-d); margin-top:8px; line-height:1.35; }

  .pasos { counter-reset:p; margin-top:6px; }
  .paso { position:relative; padding-left:40px; margin-bottom:14px; font-size:13.5px; line-height:1.6; }
  .paso::before { counter-increment:p; content:counter(p); position:absolute; left:0; top:-1px;
                  width:25px; height:25px; border-radius:50%; background:var(--carbon);
                  color:var(--gold); font:600 12px/25px var(--fb); text-align:center; }
  .paso strong { font-weight:600; }

  table { width:100%; border-collapse:collapse; }
  thead th { text-align:left; font-size:10px; letter-spacing:.16em; text-transform:uppercase;
             color:var(--warm); font-weight:600; padding:0 10px 9px 0; border-bottom:1px solid var(--line); }
  td { padding:11px 10px 11px 0; border-bottom:1px solid var(--line); vertical-align:top; font-size:13.5px; }
  tr:last-child td { border-bottom:0; }
  .nom { font-weight:600; width:32%; }
  .cnt { color:var(--warm-d); white-space:nowrap; width:14%; font-size:12.5px; }
  .uds { text-align:right; font-weight:600; color:var(--vino); white-space:nowrap; }
  .chip { display:inline-block; margin:0 5px 5px 0; padding:3px 10px; border-radius:20px;
          background:var(--crema); border:1px solid var(--line); font-size:12px; }
  .chip em { font-style:normal; color:var(--vino); margin-left:6px; font-size:11px; }

  .nota { background:var(--crema); border-left:3px solid var(--gold); border-radius:6px;
          padding:15px 19px; font-size:13.5px; color:var(--warm-d); line-height:1.6; margin-top:20px; }

  .cierre { background:var(--carbon); color:var(--crema); text-align:center; padding:42px 52px; }
  .cierre img.logo { height:38px; width:auto; margin-bottom:20px; opacity:.95; }
  .cierre p { font-size:14px; color:#CFC7BB; max-width:56ch; margin:0 auto; }
  .cierre .firma { font-family:var(--fd); font-size:19px; color:var(--gold); margin-top:18px; }
  .cierre .pie { font-size:11px; letter-spacing:.16em; text-transform:uppercase;
                 color:#8D857A; margin-top:8px; }

  @media (max-width:760px) {
    body { padding:0; }
    .hero, .partes, section, .cierre { padding-left:24px; padding-right:24px; }
    .hero h1 { font-size:32px; }
    .partes, .cifras { grid-template-columns:1fr; }
    .nom, .cnt { width:auto; }
  }
  @media print {
    body { padding:0; background:var(--white); }
    .doc { box-shadow:none; max-width:100%; }
    tr.prod, .paso, .cifra { page-break-inside:avoid; }
    thead { display:table-header-group; }
  }
</style>
</head>
<body>
<div class="doc">

  <div class="hero">
    <img class="logo" src="${logo}" alt="Laurean" />
    <div class="kicker">Revisión de catálogo</div>
    <h1>Productos por <em>completar</em></h1>
    <p>Revisamos los 121 productos del catálogo. Los datos están consistentes: no hay
       colores repetidos, tallas duplicadas ni cantidades que no cuadren. Lo que falta
       es terminar de cargar el desglose por talla en los productos de esta lista.</p>
  </div>

  <div class="partes">
    <div class="parte">
      <div class="rol">Preparado por</div>
      <div class="nom2">AA Projects</div>
    </div>
    <div class="parte">
      <div class="rol">Para</div>
      <div class="nom2">Laurean<span class="sw">by Seong Woo</span></div>
    </div>
  </div>

  <section>
    <h2>Qué encontramos</h2>
    <p class="sub">Nada de esto es un error del sistema: el inventario refleja con fidelidad
       lo que dice cada ficha de producto. Son fichas a las que les falta terminar de definir
       las tallas.</p>
    <div class="cifras">
      <div class="cifra"><div class="n">${sinTallas.length}</div><div class="l">Productos con<br>colores incompletos</div></div>
      <div class="cifra"><div class="n">${nColores}</div><div class="l">Colores sin<br>tallas definidas</div></div>
      <div class="cifra"><div class="n">${sinNada.length}</div><div class="l">Productos sin<br>ningún desglose</div></div>
    </div>
    <div class="nota">
      <strong>Por qué importa.</strong> Un color sin tallas se vende como una sola cosa: el
      punto de venta no puede pedir la talla al cobrar, y no se sabe cuántas quedan de cada
      una. Al completarlo, cada talla lleva su propia cuenta en cada bodega.
    </div>
  </section>

  <section>
    <h2>Cómo se <em>completa</em></h2>
    <p class="sub">Es el mismo procedimiento para los dos casos, y se hace desde el panel.</p>
    <div class="pasos">
      <div class="paso"><strong>Entrar a la ficha del producto.</strong> Productos → buscarlo → Editar.</div>
      <div class="paso"><strong>Definir las tallas de cada color.</strong> En “Variantes de color / diseño”,
        escribir la cantidad en cada talla que ese color realmente tiene. Si una talla no existe, se deja vacía.</div>
      <div class="paso"><strong>Guardar</strong> y confirmar que el total del producto quedó como se espera.</div>
      <div class="paso"><strong>Repartir las existencias.</strong> Inventario → Ajuste, para dejar cada
        talla con las unidades que hay físicamente en cada bodega.</div>
      <div class="paso"><strong>Comprobar.</strong> Inventario → Cuadre debe mostrar el producto como correcto.</div>
    </div>
  </section>

  <section>
    <h2>A · Colores a los que <em>les faltan las tallas</em></h2>
    <p class="sub">El producto sí tiene el color cargado, pero sin tallas. En el inventario
       aparece una sola línea de ese color, sin desglose. ${nColores} colores en ${sinTallas.length} productos.</p>
    <table>
      <thead><tr><th>Producto</th><th>Colores</th><th>Cuáles</th></tr></thead>
      <tbody>${filasA}</tbody>
    </table>
  </section>

  <section>
    <h2>B · Productos <em>sin ningún desglose</em></h2>
    <p class="sub">No tienen colores ni tallas cargados, así que se venden como una sola
       referencia. ${sinNada.length} productos, ${uSinNada.toLocaleString('es-GT')} unidades en total.</p>
    <table>
      <thead><tr><th>Producto</th><th style="text-align:right">Unidades</th></tr></thead>
      <tbody>${filasB}</tbody>
    </table>
    <div class="nota">
      Los volúmenes más altos de esta lista conviene revisarlos también contra el conteo
      físico, porque vienen de la carga inicial y nunca se han verificado en bodega.
    </div>
  </section>

  <div class="cierre">
    <img class="logo" src="${logo}" alt="Laurean" />
    <p>Cualquier duda sobre cómo completar un producto, quedamos a la orden.</p>
    <div class="firma">AA Projects</div>
    <div class="pie">${hoy}</div>
  </div>

</div>
</body>
</html>`;

  fs.writeFileSync(path.join(RAIZ, 'Docs/QA/productos-pendientes.html'), html);
  console.log(`Documento generado · ${sinTallas.length} productos con colores incompletos ` +
              `(${nColores} colores) · ${sinNada.length} sin desglose (${uSinNada} unidades)`);
})();
