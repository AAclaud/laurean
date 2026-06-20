---
title: INDEX — Laurean Shop Knowledge Vault
tags: [laurean, index]
project: laurean
---

# Laurean Shop — Mapa del vault

Vault de conocimiento del proyecto Laurean Shop. Cada nota es atómica y
referenciable desde agentes externos o futuros contextos de IA.

## Notas del vault

| Nota | Descripcion |
|------|-------------|
| [[marca-laurean]] | Identidad oficial: historia, valores, tagline, conceptos y paletas por submarca (fuente del copy) |
| [[estructura-paginas]] | Qué hace cada `.html` y cómo se relacionan entre si |
| [[auth-roles]] | Roles del sistema, gating de acceso, sesion en localStorage |
| [[modelo-datos-supabase]] | Tablas de Postgres, columnas clave y politicas RLS |
| [[forza-integration]] | Patron de Edge Function proxy firmada para Forza Delivery (reutilizable) |
| [[qpaypro]] | Integración QPayPro (PLANIFICADA): endpoints, plan de implementación |
| [[inventario-bodegas]] | Modelo de inventario por bodega, semanas/colores, fuente de datos |
| [[orden-dashboards]] | Vistas del panel admin.html y su propósito |
| [[deploy-dominio]] | Deploy en Vercel + dominio GoDaddy, build, DNS, variables de entorno |
| [[convencion-documentacion]] | Regla de documentación viva: cómo mantener este vault y el manual actualizado |

## Descripcion del proyecto

Tienda de ropa guatemalteca (Laurean). Sitio estatico (HTML/CSS/JS puro, sin
framework) con Supabase como backend completo (Auth, Postgres, Storage, Edge
Functions) y deploy en Vercel con dominio GoDaddy.

## Archivos clave del proyecto

```
/
├── Laurean.html          # Tienda publica
├── admin.html            # Panel administracion
├── pos.html              # Punto de venta
├── login.html            # Autenticacion Supabase
├── vendedoras.html       # Landing reclutamiento
├── index.html            # Redirect → Laurean.html
├── js/
│   ├── auth.js           # Auth, sesion, CRUD local + dual-write Supabase
│   ├── supabase-client.js# Init del cliente Supabase
│   ├── visit-tracker.js  # Contador publico de visitas
│   ├── cursor.js         # Cursor de marca compartido
│   ├── forza-client.js   # Wrapper semantico del proxy Forza
│   └── config.js         # Generado en build (NO en git)
├── css/
│   ├── brand.css         # Tokens de marca
│   └── cursor.css        # Estilos del cursor de marca
├── supabase/
│   ├── schema.sql        # DDL completo + RLS
│   └── functions/
│       ├── _shared/cors.ts
│       ├── forza-proxy/  # Edge Function firmada
│       └── log-visit/    # Edge Function publica de analitica
├── data/products.js      # Catalogo estatico de fallback
├── images/brand/         # Logos por uso (favicon, loader, navbar, oscuro)
└── Docs/
    ├── manual-laurean.html
    ├── deploy.md
    └── vault/            # Este vault
```
