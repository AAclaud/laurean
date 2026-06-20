---
title: Auth y roles — Laurean Shop
tags: [laurean, auth, roles, supabase]
project: laurean
---

# Auth y roles

Ver tambien: [[modelo-datos-supabase]] | [[estructura-paginas]]

## Fuente de verdad

- Autenticacion real: **Supabase Auth** (`auth.users`).
- Metadatos de rol: tabla `public.profiles` (ver [[modelo-datos-supabase]]).
- Cache local: `localStorage` clave `laurean_session` (forma rapida de leer el rol sin llamada a Supabase).
- Login local legacy (`login()`) esta deshabilitado; toda autenticacion pasa por `loginSupabase()`.

## Roles disponibles

Definidos en `supabase/schema.sql` como CHECK constraint en `profiles.role`:

| Rol | Label UI | Acceso por defecto |
|-----|----------|--------------------|
| `superuser` | Superusuario | Todo: admin + POS |
| `admin` | Administrador | Todo: admin + POS |
| `vendedor` | Vendedor | POS (si `can_login_pos`) |
| `bodega` | Bodega | POS (si `can_login_pos`) |
| `agente_pedidos` | Agente de pedidos | NO puede acceder al POS por defecto |

## Estructura de la sesion en localStorage

Clave: `laurean_session`

```json
{
  "userId":      "<uuid de Supabase Auth>",
  "role":        "vendedor",
  "name":        "Nombre del usuario",
  "email":       "usuario@ejemplo.com",
  "code":        "LAU-NOMBRE12",
  "bodegaIds":   ["bdg_xxx"],
  "canLoginPOS": true,
  "supabase":    true,
  "expiresAt":   1234567890
}
```

- `expiresAt`: unix seconds del access token JWT. `getSession()` lo valida y borra la sesion si expiro.
- `bodegaIds`: bodegas asignadas al usuario (solo rol `bodega`).
- `code`: codigo de referido (solo rol `vendedor`/`bodega`), formato `LAU-XXXXX##`.

## Funciones clave en js/auth.js

| Funcion | Descripcion |
|---------|-------------|
| `loginSupabase(email, password)` | Autentica contra Supabase Auth, lee `profiles`, escribe sesion local |
| `getSession()` | Lee localStorage; devuelve `null` si expiro o no existe |
| `requireAuth(allowedRoles)` | Redirige a `login.html` si el rol no esta en la lista; devuelve la sesion o null |
| `logout()` | Llama `supabase.auth.signOut()` y limpia la clave de sesion |
| `syncSessionExpiry(expiresAt)` | Actualiza `expiresAt` cuando Supabase refresca el token |
| `syncUsersFromSupabase()` | Trae perfiles desde `profiles` al cache local (llamado al iniciar admin.html) |
| `callUserFn(payload)` | Llama la Edge Function `create-user` (acciones: create/update/deactivate/reset_password/delete) |
| `createOrder(data)` | Crea orden en localStorage + dual-write a Supabase orders (fire-and-forget) |

## Gating por pagina

### admin.html
```js
requireAuth(['admin', 'superuser'])
```

### pos.html (triple gate)
```js
const session = requireAuth(['vendedor','admin','superuser','bodega']);
if (session.canLoginPOS === false) → redirige
if (session.active === false)      → redirige
```

### Laurean.html
Sin `requireAuth`: publica. El carrito y checkout funcionan sin login.
Las ordenes creadas en tienda usan `auth.uid()` si hay sesion activa en Supabase,
o la Edge Function dedicada (pendiente de implementar) para clientes anonimos.

## Politicas RLS relacionadas

- `profiles`: cada usuario ve el suyo; admin/superuser ve todos.
- `orders`: admin ve todo; vendedor ve solo los que creo; cualquier rol autorizado puede insertar.
- `bodegas`: lectura requiere estar autenticado; escritura solo admin.

## Gestion de usuarios (Edge Function create-user)

Los admins crean usuarios desde `admin.html` via `callUserFn()`. Esta llama la
Edge Function `create-user` que usa `service_role` para:
- Crear el usuario en `auth.users`.
- Insertar el perfil en `public.profiles`.
- Retornar el UUID para sincronizar el cache local con `cacheUserLocal()`.

Nunca exponer el service_role al frontend.
