# Auditoría de seguridad — Laurean Shop

Fecha: 2026-06-15 · Alcance: solo seguridad y vulnerabilidades (revisión de código, sin acceso al dashboard de Supabase). Read-only — no se modificó código de la app.

## Resumen

**Postura de seguridad: sólida.** No se encontraron vulnerabilidades críticas ni altas. El proyecto está bien arquitecturado: autenticación real (Supabase Auth), RLS en todas las tablas, secretos solo del lado servidor, escape de salida correcto y proxies server-side para pago y envíos. Las observaciones son recomendaciones menores de endurecimiento, no fallas explotables.

## Lo que está bien (verificado)

| Área | Hallazgo |
|---|---|
| **Secretos** | `js/config.js` está en `.gitignore`; el cliente solo recibe `SUPABASE_URL` + `SUPABASE_ANON` (clave anónima, pública por diseño). **Ninguna `service_role` en el cliente** — vive solo como env var en Edge Functions (`Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`). Forza `SecretKey` igual (server-side). |
| **RLS (Row Level Security)** | Habilitado en todas las tablas (`categories`, `subcategories`, `products`, `bodegas`, `profiles`, `orders`, `order_tracking_events`). Lectura pública del catálogo; **escritura solo admin** (`is_admin()`); vendedor solo ve sus pedidos; `profiles` con GRANT por columna. Sin insert público de pedidos (requiere rol autenticado). |
| **Autenticación** | Login vía Supabase Auth, **sin fallback a localStorage** para credenciales (`login.html` lo bloquea explícitamente con comentario `SEC:`). Sesión con expiración. |
| **Edge Functions** | `create-user` y `forza-proxy` validan el JWT del llamador (`auth.getUser()`); `create-user` además exige rol admin/superuser (403 si no). |
| **Webhooks** | `forza-webhook` valida **firma HMAC** y rechaza con 401 `invalid_signature`. |
| **XSS** | Renders con `innerHTML` usan `escapeHtml()` / `escapeAttr()` / `jsAttr()` según el contexto (texto, atributo, JS inline) — incluido data de cliente y productos en admin. |
| **CSP** | `vercel.json` define Content-Security-Policy con `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action` restringido. |
| **Service Worker** | `sw.js` no cachea HTML ni llamadas a Supabase (siempre red), solo assets same-origin, caché versionada. |

## Recomendaciones (hardening, prioridad baja-media)

1. **CSP `script-src 'unsafe-inline'`** — habilita scripts/handlers inline, lo que debilita la defensa contra XSS si algún render se escapara mal. La app usa muchos `onclick` inline, así que quitarlo requiere migrar a nonces/hashes (refactor). Dado el buen escape actual, es mejora a futuro, no urgente.
2. **QPayPro (pago con tarjeta) está en activación diferida.** Cuando se active, confirmar que el callback de confirmación de pago valide `x_api_secret` del lado servidor antes de marcar una orden como pagada (la estructura del `qpaypro-proxy` ya lo contempla; solo verificar al encender). Evita fraude de "pago confirmado" falso.
3. **`qpaypro-proxy` se despliega con `--no-verify-jwt`** (necesario porque el callback es público) — asegurarse de que dependa de validación de firma/secret y no de confianza ciega en el payload entrante.
4. **Checks de rol en el cliente son solo de UI.** Está correcto (RLS es el control real), pero conviene mantener la disciplina: nunca confiar en `localStorage`/role del cliente para autorizar escrituras — siempre respaldado por RLS o Edge Function (hoy se cumple).
5. **Menor:** revisar que todas las Edge Functions privilegiadas (no webhooks) tengan `verify_jwt` o chequeo manual de `getUser()` + rol (verificado en `create-user` y `forza-proxy`; revisar las demás al agregar nuevas).

## Conclusión

Laurean no requiere arreglos de seguridad inmediatos. Las recomendaciones son endurecimiento progresivo. Mantener: secretos en Edge Functions, RLS como única fuente de autorización de datos, y validación de firma en cualquier webhook nuevo.
