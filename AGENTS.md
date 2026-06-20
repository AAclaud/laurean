# Laurean Shop — Instrucciones del proyecto

Tienda + admin + POS. Sitio **estático** (HTML/CSS/JS, sin framework) con **Supabase** como
backend (Auth, Postgres, Storage, Edge Functions) y deploy en **Vercel**. Idioma: español.

## Regla durable: documentación viva de la estructura
Al **crear o mover** una página/archivo importante (`*.html`, una vista/tab del dashboard, una
Edge Function en `supabase/functions/`, o una tabla nueva en `supabase/schema.sql`):

1. Actualizar la sección **"Mapa de estructura del proyecto"** en `Docs/manual-laurean.html`
   (tabla `archivo → propósito → dónde se usa → dependencias`).
2. Actualizar la nota equivalente del vault en `Docs/vault/` (con sus `[[wikilinks]]`).

El objetivo es que el manual quede siempre al día a medida que el proyecto crece, y que
cualquier agente sepa **dónde vive y para qué sirve** cada archivo sin re-explorar todo.

## Convenciones
- **Logos/marca** en `images/brand/`, nombrados por uso: `favicon.svg` (favicon de todas las
  páginas), `loader.svg` (spinner de carga, fondo oscuro), `logo-navbar.svg` (logotipo sobre
  fondo claro), `logo-oscuro.svg` (logotipo sobre fondo oscuro: footer/header oscuro/admin).
  Para reemplazar un logo, sube el archivo con **ese mismo nombre** a `images/brand/`.
- **Secrets** nunca en el frontend. La anon key de Supabase es pública (la protege RLS); los
  secretos reales (service_role, Forza, QPayPro) viven como secrets de Edge Functions.
- **Edge Functions** siguen el patrón de `supabase/functions/forza-proxy/` (gate por JWT con
  `verifyAdmin`, CORS desde `_shared/cors.ts`). Replicar ese patrón para nuevas integraciones.
- `js/config.js` se **genera en build** (`scripts/gen-config.js`) y está en `.gitignore`.

## Conocimiento del proyecto
- Manual operativo (superusuario): `Docs/manual-laurean.html`.
- Base de conocimiento enlazada (Obsidian): `Docs/vault/` — empezar por `Docs/vault/INDEX.md`.
- Deploy + dominio: `Docs/deploy.md`. Checklist pre-prod: `Docs/produccion-checklist.md`.
