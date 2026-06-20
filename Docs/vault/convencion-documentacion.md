---
title: Convencion de documentacion viva — Laurean Shop
tags: [laurean, documentacion, convencion, vault]
project: laurean
---

# Convencion de documentacion viva

Ver tambien: [[INDEX]] | [[estructura-paginas]]

## La regla

Cada vez que se **crea o mueve** un archivo importante en el proyecto:

- Una pagina nueva (`*.html`)
- Una vista/tab nueva en `admin.html`
- Una Edge Function nueva en `supabase/functions/`
- Una tabla nueva en `supabase/schema.sql`

Se deben actualizar **dos lugares**:

1. La seccion "Mapa de estructura del proyecto" en `Docs/manual-laurean.html`
   (tabla: archivo → proposito → donde se usa → dependencias).
2. La nota correspondiente en este vault (`Docs/vault/`), con sus `[[wikilinks]]`.

## Por que existe esta regla

Los agentes de IA (incluyendo Claude Code) reinician sin memoria entre sesiones.
Sin documentacion actualizada, cada sesion debe re-explorar el proyecto desde cero.

Con el manual y el vault al dia, cualquier agente puede:
- Leer [[INDEX]] para orientarse en segundos.
- Leer la nota especifica para entender una parte del sistema sin revisar codigo.
- Navegar wikilinks para entender dependencias sin hacer `find` ni `grep`.

## Que actualizar y donde

| Evento | Actualizar en manual-laurean.html | Actualizar en vault |
|--------|-----------------------------------|---------------------|
| Nueva pagina `.html` | Fila en tabla de paginas | [[estructura-paginas]] |
| Nueva vista en admin | Fila en tabla de dashboards | [[orden-dashboards]] |
| Nueva Edge Function | Fila en tabla de edge functions | Nota existente o nueva |
| Nueva tabla SQL | Fila en tabla de datos | [[modelo-datos-supabase]] |
| Nuevo rol de usuario | Seccion de roles | [[auth-roles]] |
| Cambio de DNS/deploy | Seccion de infraestructura | [[deploy-dominio]] |
| Nueva integracion | Nueva seccion | Nueva nota en vault + enlace desde [[INDEX]] |

## Convencion de nombres de archivos en el vault

- Usar kebab-case: `nombre-de-nota.md`.
- El nombre del archivo es la referencia del wikilink: `[[nombre-de-nota]]`.
- Frontmatter obligatorio: `title`, `tags`, `project: laurean`.

## Convencion de logos e imagenes de marca

Los logos viven en `images/brand/` con nombres fijos por uso:

| Archivo | Uso |
|---------|-----|
| `favicon.svg` | Favicon de todas las paginas |
| `loader.svg` | Spinner de carga (fondo oscuro) |
| `logo-navbar.svg` | Logotipo sobre fondo claro |
| `logo-oscuro.svg` | Logotipo sobre fondo oscuro (footer, admin, header oscuro) |

Para reemplazar un logo: subir el archivo con el **mismo nombre**. No crear variantes.

## Referencia

Esta convencion esta definida en `CLAUDE.md` (instrucciones del proyecto para agentes):

```
Regla durable: al crear o mover una pagina/archivo importante, actualizar:
1. Docs/manual-laurean.html (tabla archivo → proposito → donde se usa → dependencias)
2. La nota equivalente en Docs/vault/ (con [[wikilinks]])
```
