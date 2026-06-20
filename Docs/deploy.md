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

## 2. Opción RECOMENDADA — Vercel + GoDaddy

Ya está todo configurado en `vercel.json` (URLs limpias, headers de seguridad,
CSP) y `.vercelignore` (no publica `Docs/`, `supabase/`, `.claude/`).

1. **GitHub → Vercel**: Vercel → *Add New… → Project → Import* el repo `laurean`.
2. **Framework Preset**: *Other*. Build Command y Output ya vienen de `vercel.json`
   (`node scripts/gen-config.js`, output `.`). No cambiar nada.
3. **Environment Variables** (Project → Settings → Environment Variables), para
   *Production* (y *Preview* si quieres):
   - `SUPABASE_URL` = `https://<tu-proyecto>.supabase.co`
   - `SUPABASE_ANON` = tu anon/public key (Supabase → Settings → API)
4. **Deploy**. La home (`/`) redirige a `/Laurean.html`.
5. **Dominio GoDaddy**: Vercel → Project → Settings → *Domains* → agrega tu
   dominio. Vercel te dará registros DNS. En GoDaddy → *DNS Management*:
   - Dominio raíz (`tudominio.com`): registro **A** → `76.76.21.21`.
   - Subdominio (`www` o `tienda`): registro **CNAME** → `cname.vercel-dns.com`.
   - Espera propagación (minutos a ~1 h). Vercel emite HTTPS automático.
6. **Restringir CORS** (tras fijar el dominio): en Supabase
   `supabase secrets set FRONTEND_ORIGIN=https://<tu-dominio>` y re-deploya las
   edge functions. En producción QPayPro rechaza POSTs si este secret no coincide
   con el origen del sitio.

## 3a. Alternativa — Cloudflare Pages

1. Subir el repo a GitHub.
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Build settings:
   - **Framework preset**: None
   - **Build command**: *(vacío)*
   - **Build output directory**: `/` (raíz del repo)
4. Deploy. Cloudflare sirve los `.html` directamente.
5. **Importante**: el sitio entra por `Laurean.html`, no `index.html`.
   Crear un `index.html` que redirija, o configurar la home a `/Laurean.html`.

### DNS (Cloudflare)
- Dominio gestionado en Cloudflare → la asignación a Pages es automática
  (`tu-dominio.com` → proyecto Pages).
- Si el dominio está fuera, agregar registro **CNAME** `@`/`www` →
  `<proyecto>.pages.dev`.

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
