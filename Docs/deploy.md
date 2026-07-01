# Deploy — Laurean Shop

Sitio estático (HTML/CSS/JS) + Supabase como backend. El único "build" es
generar `js/config.js` desde variables de entorno.

## 1. Pre-requisitos

- Proyecto Supabase configurado (ver `README.md` → Setup Supabase).
- Edge Functions deployadas: `forza-proxy`, `forza-webhook`, `create-user`.
- Secrets de Supabase seteados (Forza + `FRONTEND_ORIGIN` para producción).

> `js/config.js` está en `.gitignore` y se **genera en cada deploy** con
> `scripts/gen-config.js` a partir de `SUPABASE_URL` y `SUPABASE_ANON`
> (la anon key es pública por diseño; los secretos reales viven en Supabase).

## 2. Opción RECOMENDADA — Cloudflare Pages + GoDaddy

Cloudflare Pages es **gratis y permite uso comercial**, con CDN global y ancho de
banda ilimitado. Los headers de seguridad + CSP van en `_headers`, el bloqueo de
carpetas internas (`Docs/`, `supabase/`, `scripts/`, `.claude/`) en `_redirects`, y
el 404 de marca en `404.html` — todo ya en el repo.

1. **Subir el repo a GitHub.**
2. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** → elige el repo.
3. **Build settings**:
   - Framework preset: **None**
   - Build command: `node scripts/gen-config.js && node scripts/gen-sitemap.js`
   - Build output directory: `/` (raíz del repo)
4. **Environment variables** (Settings → Variables):
   - `SUPABASE_URL` = `https://<tu-proyecto>.supabase.co`
   - `SUPABASE_ANON` = tu anon/public key (Supabase → Settings → API)
   - `NODE_VERSION` = `18` (o superior; `gen-sitemap.js` usa `fetch` nativo)
5. **Deploy**. Cloudflare sirve URLs limpias nativamente (`/catalogo` en vez de
   `/catalogo.html`) y la raíz `/` sirve `index.html`, que redirige a `Laurean.html`.
   Los `_headers` / `_redirects` / `404.html` se aplican solos.

### Dominio GoDaddy → Cloudflare (nameservers, recomendado)
1. En Cloudflare: **Add a site** → escribe tu dominio → plan **Free**.
2. Cloudflare te da **2 nameservers** (`xxx.ns.cloudflare.com`).
3. En **GoDaddy → tu dominio → Nameservers → Change** → pon esos 2. (Propaga en
   minutos a ~24 h.)
4. En **Pages → Custom domains** → agrega tu dominio y `www` → Cloudflare crea los
   registros DNS solo. Raíz y `www` abren Laurean con **HTTPS automático**.

> Si prefieres NO mover nameservers: en Pages te dan un target `*.pages.dev`; agrega
> un **CNAME** `www` → ese target en GoDaddy. El dominio raíz (apex) da problemas por
> CNAME en GoDaddy, por eso se recomienda el cambio de nameservers.

6. **Restringir CORS** (tras fijar el dominio): en Supabase
   `supabase secrets set FRONTEND_ORIGIN=https://<tu-dominio>` y re-deploya las
   edge functions. En producción QPayPro rechaza POSTs si este secret no coincide
   con el origen del sitio.

## 3a. Alternativa — Vercel

El repo ya **no** trae `vercel.json` (se migró a Cloudflare). Vercel funciona, pero
su plan **Hobby es solo no-comercial** → para una tienda que lucra necesitas
**Vercel Pro (~$20/mes)**. Si lo usas: Framework *Other*, build command
`node scripts/gen-config.js && node scripts/gen-sitemap.js`, output `.`, las mismas
env vars, y portar los headers/CSP de `_headers` a un `vercel.json`. DNS en GoDaddy:
**A** `@` → `76.76.21.21`, **CNAME** `www` → `cname.vercel-dns.com`.

## 3b. Alternativa — Netlify

1. **Add new site → Import from Git** (o arrastrar la carpeta en *Deploys*).
2. Build command vacío, **Publish directory**: `.`
3. `netlify.toml` opcional para redirigir la raíz:

```toml
[[redirects]]
  from = "/"
  to = "/Laurean.html"
  status = 302
```

### DNS (Netlify)
- **Domain settings → Add custom domain**.
- Apuntar **CNAME** `www` → `<sitio>.netlify.app`, o usar los nameservers de Netlify.

## 4. Service Worker

`sw.js` se registra solo (vía `js/auth.js`) y cachea imágenes/CSS/fuentes por 7
días. Requiere **HTTPS** (Cloudflare/Netlify lo dan). Al publicar una versión
nueva de assets, subir el `VERSION` en `sw.js` para invalidar el caché viejo.

## 5. Checklist post-deploy

- [ ] `Laurean.html` carga catálogo (Supabase o fallback estático).
- [ ] Login funciona contra Supabase Auth.
- [ ] `admin.html` crea usuario → aparece en Supabase Auth + `profiles`.
- [ ] Cotizar tarifa Forza responde (Edge Functions deployadas + secrets).
- [ ] Imágenes se sirven por HTTPS y el Service Worker cachea (DevTools → Application).
