// ============================================================
// LAUREAN — Genera js/config.js a partir de variables de entorno.
// Se ejecuta en el build de Vercel (buildCommand en vercel.json).
//
// Variables requeridas (Vercel → Project → Settings → Environment Variables):
//   SUPABASE_URL    → https://<proyecto>.supabase.co
//   SUPABASE_ANON   → anon/public key (es pública por diseño; la protege el RLS)
//
// La anon key NO es secreta: se entrega al navegador. Los secretos reales
// (service_role, Forza) viven solo en los secrets de las Edge Functions.
// ============================================================

const fs = require('fs');
const path = require('path');

const URL  = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON;

if (!URL || !ANON) {
  console.error('[gen-config] Faltan SUPABASE_URL y/o SUPABASE_ANON en el entorno.');
  console.error('[gen-config] Configúralas en Vercel → Settings → Environment Variables.');
  process.exit(1);
}

const out = `// AUTO-GENERADO en build (scripts/gen-config.js). No editar a mano.
window.LAUREAN_CONFIG = {
  SUPABASE_URL:  ${JSON.stringify(URL)},
  SUPABASE_ANON: ${JSON.stringify(ANON)},
};
`;

const dest = path.join(__dirname, '..', 'js', 'config.js');
fs.writeFileSync(dest, out);
console.log('[gen-config] js/config.js generado para', URL);
