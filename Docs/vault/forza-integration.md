---
title: Integracion Forza Delivery — patron Edge Function proxy
tags: [laurean, forza, shipping, edge-function, patron-reutilizable]
project: laurean
---

# Integracion Forza Delivery

Documentacion detallada: `Docs/forza-integration.html`
Edge Function: `supabase/functions/forza-proxy/index.ts`
Cliente frontend: `js/forza-client.js`

Ver tambien: [[modelo-datos-supabase]] | [[deploy-dominio]]

---

## Patron general (reutilizable en otros proyectos)

Este patron sirve para cualquier API de terceros que requiera secrets (API keys,
HMAC) que no deben exponerse al frontend. La Edge Function actua como proxy
autenticado y firmante.

### Arquitectura

```
Frontend (browser)
  │  POST /functions/v1/forza-proxy
  │  Header: Authorization: Bearer <JWT Supabase>
  │  Body: { endpoint: "GetShippingRates...", params: {...} }
  ▼
Edge Function (Deno, Supabase)
  1. Verifica JWT → consulta profiles → rol admin/superuser
  2. Construye payload con formato especifico de la API externa
  3. Firma con HMAC-SHA256 usando SECRET_KEY (solo en el servidor)
  4. Llama a la API externa
  5. Decodifica respuesta (Base64 en el caso de Forza)
  6. Devuelve JSON limpio al frontend
  ▼
API externa (Forza Delivery)
```

### Componentes del patron

| Componente | Descripcion |
|------------|-------------|
| `verifyAdmin(req)` | Funcion de gate: valida Bearer JWT contra Supabase Auth y verifica rol en `profiles` |
| `_shared/cors.ts` | Helpers `corsHeaders` y `json()` compartidos entre todas las Edge Functions |
| Lista `ALLOWED` | Whitelist de endpoints permitidos; rechaza cualquier endpoint no listado (400) |
| `injectDefaults()` | Agrega defaults por endpoint para simplificar el contrato con el frontend |
| Secrets via `Deno.env.get()` | Los secrets NUNCA llegan al frontend |

### Implementacion del gate (verifyAdmin)

```typescript
async function verifyAdmin(req: Request): Promise<{ ok: boolean; error?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return { ok: false, error: 'missing_token' };

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: 'invalid_token' };

  const { data: profile } = await supabase
    .from('profiles').select('role, active').eq('id', userData.user.id).single();
  if (!profile?.active) return { ok: false, error: 'inactive' };
  if (!['admin','superuser'].includes(profile.role)) return { ok: false, error: 'forbidden_role' };
  return { ok: true };
}
```

Replicar este patron para cada nueva Edge Function que requiera autorizacion de admin.

### CORS compartido (_shared/cors.ts)

Todas las Edge Functions importan desde `../_shared/cors.ts`:
- `corsHeaders`: responde OPTIONS con los headers necesarios.
- `json(data, status)`: helper para devolver `Response` con `Content-Type: application/json`.

---

## Especificidades de Forza Delivery

### Formato de request

Forza no acepta JSON estandar. Requiere:
- Serializacion custom con CRLF (`\r\n`), indent de 3 espacios, SIN espacio despues de `:`.
- El JSON interno se codifica en Base64 como campo `PayLoad`.
- El cuerpo externo es `{ CodApp, PayLoad }`.
- El header `LauValue` lleva la firma HMAC-SHA256 (Base64) del JSON interno (antes de encodear a B64).

### Firma HMAC-SHA256

```typescript
const key = await crypto.subtle.importKey('raw', enc.encode(SECRET_KEY), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
const sig  = await crypto.subtle.sign('HMAC', key, enc.encode(innerJsonStr));
// → Base64(sig) → header LauValue
```

### Endpoints disponibles

| Metodo semantico (forza-client.js) | Endpoint Forza | Descripcion |
|------------------------------------|----------------|-------------|
| `Forza.listDepartments()` | GetListProvincesByHeaderCode | Departamentos de Guatemala |
| `Forza.listTownships(deptCode)` | GetListTownshipByHeaderCode | Municipios de un departamento |
| `Forza.quoteRate(params)` | GetShippingRatesByHeaderCode | Cotizar tarifa de envio |
| `Forza.createGuide(params)` | GetServiceByHeaderCodeRequest | Crear guia de envio |
| `Forza.trackGuide(serie, num)` | GetTrackOrderDetail | Estado actual de una guia |
| `Forza.cancelGuide(serie, num)` | SetCancelGuides | Cancelar guia |
| `Forza.reprintGuide(serie, num)` | GetGuideReprintRequest | PDF de etiqueta |
| `Forza.routeAndHub(params)` | GetRouteAndHubByAddress | Ruta y hub por direccion |
| `Forza.createPickup(params)` | SetPickupServiceByIntegration | Programar recoleccion |

### Campo township_code

`bodegas.township_code` almacena el `HeaderCodeTownship` de Forza para la bodega de origen.
`orders.customer_township_code` almacena el municipio de destino para calcular tarifas y crear guias.

### Secrets requeridos

Setear en Supabase Dashboard → Project → Edge Functions → Secrets:

| Variable | Descripcion |
|----------|-------------|
| `FORZA_BASE_URL` | URL base de la API Forza |
| `FORZA_COD_APP` | Codigo de aplicacion Forza |
| `FORZA_SECRET_KEY` | Clave secreta para HMAC |
| `FORZA_ID_CLIENT` | ID del comercio en Forza |
| `FORZA_CODE_OF_REFERENCE` | Codigo de referencia Forza |
| `FORZA_ID_COUNTRY` | 'GT' por defecto |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Anon key de Supabase |
| `FRONTEND_ORIGIN` | Dominio del frontend para CORS (ej: `https://laurean.com`) |

### Deploy de la Edge Function

```bash
supabase functions deploy forza-proxy --project-ref <ref>
supabase secrets set FORZA_BASE_URL=... FORZA_COD_APP=... --project-ref <ref>
```

Ver [[deploy-dominio]] para el flujo completo de deploy.

## Cliente frontend (js/forza-client.js)

Patron IIFE que expone `window.Forza` con metodos semanticos. Cada metodo:
1. Obtiene el access token del cliente Supabase (`window.LAUREAN_DB`).
2. Hace POST a `/functions/v1/forza-proxy` con `Authorization: Bearer <token>`.
3. Devuelve `{ ok, data }` o `{ ok: false, error, message }`.

No requiere ningun secret en el frontend.
