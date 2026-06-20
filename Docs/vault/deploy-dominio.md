---
title: Deploy y dominio — Laurean Shop
tags: [laurean, deploy, vercel, godaddy, dns]
project: laurean
---

# Deploy y dominio

Documentacion completa: `Docs/deploy.md`

Ver tambien: [[forza-integration]] | [[qpaypro]]

## Stack de deploy

| Capa | Tecnologia |
|------|-----------|
| Hosting | Vercel (sitio estatico) |
| Dominio | GoDaddy |
| Backend | Supabase (Auth, Postgres, Storage, Edge Functions) |
| Build | `node scripts/gen-config.js` → genera `js/config.js` |

## Build en Vercel

El unico paso de build es generar `js/config.js` (que esta en `.gitignore`):

```bash
node scripts/gen-config.js
```

Este script lee las variables de entorno `SUPABASE_URL` y `SUPABASE_ANON` y
produce `js/config.js` con `window.LAUREAN_CONFIG = { SUPABASE_URL, SUPABASE_ANON }`.

La anon key de Supabase es **publica por diseno** (la protegen las politicas RLS).
Los secrets reales (service_role, Forza, QPayPro) viven **solo** en Supabase Secrets.

## Variables de entorno en Vercel

Configurar en: Project → Settings → Environment Variables

| Variable | Valor |
|----------|-------|
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_ANON` | Anon/public key (Supabase → Settings → API) |

## DNS — GoDaddy

| Tipo | Nombre | Valor |
|------|--------|-------|
| A | `@` (raiz) | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

Propagacion: minutos a ~1 hora. Vercel emite HTTPS automatico via Let's Encrypt.

## Routing

Configurado en `vercel.json`:
- `/` → redirige a `/Laurean.html`.
- URLs limpias para todas las paginas `.html`.
- Headers de seguridad: CSP, X-Frame-Options, etc.

`.vercelignore` excluye del deploy: `Docs/`, `supabase/`, `.claude/`.

## CORS entre frontend y Edge Functions

Tras fijar el dominio definitivo:

```bash
supabase secrets set FRONTEND_ORIGIN=https://<tu-dominio> --project-ref <ref>
supabase functions deploy forza-proxy --project-ref <ref>
# Re-deploy de todas las edge functions para que tomen el nuevo secret
```

La variable `FRONTEND_ORIGIN` es usada por `_shared/cors.ts` para restringir
el header `Access-Control-Allow-Origin`. También protege los POST públicos de
`qpaypro-proxy`: en producción debe coincidir con el dominio del sitio.

## Service Worker

`sw.js` cachea imagenes, CSS y fuentes por 7 dias.
- Se registra automaticamente desde `js/auth.js` si `location.protocol !== 'file:'`.
- Requiere HTTPS (Vercel lo provee).
- Para invalidar la cache al publicar assets nuevos: incrementar `VERSION` en `sw.js`.

## Edge Functions — deploy

```bash
supabase functions deploy forza-proxy --project-ref <ref>
supabase functions deploy create-user  --project-ref <ref>
# Futura:
supabase functions deploy qpaypro-proxy --project-ref <ref>
```

## Checklist post-deploy

- [ ] `Laurean.html` carga catalogo (Supabase o fallback estatico).
- [ ] Login funciona contra Supabase Auth.
- [ ] `admin.html` puede crear usuario → aparece en Supabase Auth + `profiles`.
- [ ] Cotizar tarifa Forza responde (edge functions + secrets).
- [ ] HTTPS activo; Service Worker cachea (DevTools → Application).
- [ ] DNS propagado; dominio custom resuelve correctamente.

## Alternativas de hosting (no usadas actualmente)

- **Cloudflare Pages**: build command vacio, output `/`.
- **Netlify**: build vacio, publish directory `.`, `netlify.toml` para redirect raiz.
