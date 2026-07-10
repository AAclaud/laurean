-- ============================================================
-- LAUREAN SHOP — Schema Supabase
-- Ejecutar en SQL Editor del proyecto Supabase (una sola vez).
-- ============================================================

-- Habilita extensión para uuid (suele venir, pero por si acaso)
create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- Categorías padre (mujer, hombre, kids, ofertas, accesorios)
-- ────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id                  text primary key,
  name                text not null,
  image_url           text,
  starting_price_gtq  numeric default 0,
  starting_price_usd  numeric default 0,
  display_order       int default 0,
  active              boolean default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- Subcategorías
-- ────────────────────────────────────────────────────────────
create table if not exists public.subcategories (
  id            text primary key,
  parent_id     text not null references public.categories(id) on delete cascade,
  name          text not null,
  display_order int default 0,
  created_at    timestamptz default now()
);
create index if not exists idx_subcat_parent on public.subcategories(parent_id);

-- ────────────────────────────────────────────────────────────
-- Productos
-- ────────────────────────────────────────────────────────────
create table if not exists public.products (
  id              text primary key,
  name            text not null,
  image_url       text,
  description     text,
  price_gtq       numeric not null default 0,
  price_usd       numeric default 0,
  parent_id       text references public.categories(id) on delete set null,
  subcat_id       text references public.subcategories(id) on delete set null,
  is_new_arrival  boolean default false,
  flash_end       timestamptz,
  stock           int default 0,
  active          boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  -- Fase A: validación de precio público y curación por semana
  show_price      boolean default true,          -- si la tarjeta/detalle muestra precio o CTA "Contactar a Laurean"
  week_number     int,                           -- para agrupar "Productos – Semana X"
  gallery         jsonb default '[]'::jsonb,     -- URLs de imágenes (galería)
  size_chart      jsonb,                         -- guía de tallas (medidas por talla), opcional
  source_cod      text                           -- referencia al inventory_items.cod de origen
);
create index if not exists idx_product_parent  on public.products(parent_id);
create index if not exists idx_product_subcat  on public.products(subcat_id);
create index if not exists idx_product_active  on public.products(active);

-- Columnas Fase A para instalaciones en vivo (idempotente)
alter table public.products add column if not exists show_price   boolean default true;
alter table public.products add column if not exists week_number  int;
alter table public.products add column if not exists gallery      jsonb default '[]'::jsonb;
alter table public.products add column if not exists size_chart   jsonb;
alter table public.products add column if not exists source_cod   text;
alter table public.products add column if not exists variants     jsonb default '[]'::jsonb;  -- variantes de color/diseño (label, hex, imageIndex, sizes[])
-- Índice de week_number DESPUÉS del add-column (BD que ya tenían `products` sin la columna)
create index if not exists idx_product_week    on public.products(week_number);

-- ────────────────────────────────────────────────────────────
-- Bodegas (warehouses)
-- ────────────────────────────────────────────────────────────
create table if not exists public.bodegas (
  id            text primary key,
  name          text not null,
  address       text,
  city          text,
  township_code text,                -- HeaderCodeTownship de Forza
  active        boolean default true,
  created_at    timestamptz default now()
);
-- Bodegas base (fijas): Central reparte el inventario, Website = lo publicado en la tienda.
-- IDs estables para que el inventario (inventory_stock) y el admin las referencien. El nombre
-- es editable desde el admin; estas dos no se eliminan.
insert into public.bodegas (id, name) values
  ('bdg_central', 'Bodega Central'),
  ('bdg_website', 'Website')
on conflict (id) do nothing;

-- ────────────────────────────────────────────────────────────
-- Usuarios del sistema (perfil + rol; auth real vive en auth.users)
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  name          text,
  role          text not null check (role in ('superuser','admin','vendedor','bodega','agente_pedidos')),
  phone         text,
  code          text,                 -- código de referido para vendedores
  active        boolean default true,
  can_login_pos boolean default true,
  bodega_ids    text[] default '{}',
  commission_rate numeric,               -- override de comisión por vendedor (null = usa el % global)
  created_by    uuid references auth.users(id),
  created_at    timestamptz default now()
);
create index if not exists idx_profile_role on public.profiles(role);
create index if not exists idx_profile_code on public.profiles(code);

-- Columnas para instalaciones en vivo (idempotente)
alter table public.profiles add column if not exists commission_rate numeric;
alter table public.profiles add column if not exists birthday date;        -- cumpleaños del vendedor
alter table public.profiles add column if not exists gift jsonb;           -- regalo de cumpleaños {productId,productName,note,status}
-- Datos de depósito de comisiones (los completa el propio vendedor)
alter table public.profiles add column if not exists dpi text;
alter table public.profiles add column if not exists bank_name text;
alter table public.profiles add column if not exists bank_account text;
alter table public.profiles add column if not exists bank_account_type text;
alter table public.profiles add column if not exists account_holder text;
-- Nivel de vendedor (bronce/plata/oro/platino), derivado de ventas acumuladas; cacheable
alter table public.profiles add column if not exists seller_level text;

-- RLS: el usuario puede ACTUALIZAR su propia fila de profiles (para guardar sus datos de depósito).
-- La política limita filas; los GRANT de columnas más abajo limitan QUÉ columnas puede tocar.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='own_profile_update') then
    create policy own_profile_update on public.profiles
      for update using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end $$;

-- Column-level security para autoservicio de vendedores.
-- Sin esto, own_profile_update permitiría cambiar role/active/can_login_pos/etc.
revoke update on table public.profiles from anon, authenticated;
grant update (dpi, bank_name, bank_account, bank_account_type, account_holder, birthday)
  on table public.profiles to authenticated;

-- ────────────────────────────────────────────────────────────
-- Pedidos
-- ────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id                      uuid primary key default gen_random_uuid(),
  order_number            text unique not null default ('ORD-' || to_char(now(),'YYMMDD') || '-' || substring(gen_random_uuid()::text from 1 for 6)),
  -- cliente
  customer_name           text not null,
  customer_phone          text,
  customer_email          text,
  customer_address        text,
  customer_township_code  text,        -- HeaderCodeTownship
  customer_department     text,
  customer_city           text,
  -- montos
  subtotal_gtq            numeric not null default 0,
  discount_gtq            numeric default 0,
  shipping_gtq            numeric default 0,
  total_gtq               numeric not null default 0,
  -- contenido
  items                   jsonb not null,        -- snapshot de productos (id, name, qty, price, image)
  notes                   text,
  -- estado
  status                  text default 'pendiente' check (status in (
    -- estados del frontend (admin/POS) + legado, en unión para no romper datos existentes
    'pendiente','procesando','enviado','completado','cancelado',
    'confirmado','en_preparacion','entregado','devuelto'
  )),
  payment_method          text,                  -- 'transfer','cod','card','qr','cash'
  payment_status          text default 'pendiente',
  -- forza
  forza_guide_serie       text,                  -- 'FD'
  forza_guide_number      text,
  forza_tracking_status   text,
  forza_label_url         text,                  -- PDF de etiqueta
  forza_last_event_at     timestamptz,
  -- referencia
  referral_code           text,                  -- código del vendedor que originó la venta
  created_by              uuid references auth.users(id),
  bodega_id               text references public.bodegas(id),
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);
alter table public.orders add column if not exists origin text default 'store';      -- 'store' | 'pos'
alter table public.orders add column if not exists channel text;                      -- 'web' | 'pos'
alter table public.orders add column if not exists shipping_method text;              -- 'forza' | 'cargo_expreso' | 'sobrex'
-- Alinear el constraint de status con los estados del frontend (idempotente, actualiza tablas ya creadas)
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in (
  'pendiente','procesando','enviado','completado','cancelado',
  'confirmado','en_preparacion','entregado','devuelto'
));
create index if not exists idx_order_status      on public.orders(status);
create index if not exists idx_order_created     on public.orders(created_at desc);
create index if not exists idx_order_forza_guide on public.orders(forza_guide_number);
create index if not exists idx_order_referral    on public.orders(referral_code);

-- ────────────────────────────────────────────────────────────
-- Eventos de tracking (historial de cambios de estado de la guía)
-- ────────────────────────────────────────────────────────────
create table if not exists public.order_tracking_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  event_code  text,                  -- código de evento Forza
  event_name  text,
  description text,
  latitude    numeric,
  longitude   numeric,
  raw_payload jsonb,                 -- por si necesitamos auditar
  occurred_at timestamptz not null,
  created_at  timestamptz default now()
);
create index if not exists idx_tracking_order on public.order_tracking_events(order_id, occurred_at desc);

-- ────────────────────────────────────────────────────────────
-- Trigger: updated_at automático
-- ────────────────────────────────────────────────────────────
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['categories','products','orders']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.tg_set_updated_at()', t);
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════
alter table public.categories             enable row level security;
alter table public.subcategories          enable row level security;
alter table public.products               enable row level security;
alter table public.bodegas                enable row level security;
alter table public.profiles               enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_tracking_events  enable row level security;

-- Helper: verifica si el usuario actual tiene rol admin o superuser
create or replace function public.is_admin() returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin','superuser')
      and active = true
  );
$$;

create or replace function public.current_role() returns text
language sql
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

-- ── Categorías / subcategorías / productos / bodegas: lectura pública, escritura admin
do $$ begin
  perform 1;
  -- categorías
  drop policy if exists "read_public" on public.categories;
  drop policy if exists "write_admin" on public.categories;
  create policy "read_public" on public.categories for select using (true);
  create policy "write_admin" on public.categories for all using (public.is_admin()) with check (public.is_admin());

  drop policy if exists "read_public" on public.subcategories;
  drop policy if exists "write_admin" on public.subcategories;
  create policy "read_public" on public.subcategories for select using (true);
  create policy "write_admin" on public.subcategories for all using (public.is_admin()) with check (public.is_admin());

  drop policy if exists "read_public" on public.products;
  drop policy if exists "write_admin" on public.products;
  create policy "read_public" on public.products for select using (true);
  create policy "write_admin" on public.products for all using (public.is_admin()) with check (public.is_admin());

  drop policy if exists "read_auth"  on public.bodegas;
  drop policy if exists "write_admin" on public.bodegas;
  create policy "read_auth"   on public.bodegas for select using (auth.uid() is not null);
  create policy "write_admin" on public.bodegas for all using (public.is_admin()) with check (public.is_admin());
end $$;

-- ── Profiles: cada usuario ve el suyo; admin ve todos
do $$ begin
  drop policy if exists "self_read" on public.profiles;
  drop policy if exists "admin_all" on public.profiles;
  create policy "self_read" on public.profiles for select using (id = auth.uid() or public.is_admin());
  create policy "admin_all" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
end $$;

-- ── Validación pública de código de referido (para invitados en el checkout).
-- `profiles` está protegido por RLS (nadie anónimo lo lee), así que exponemos SOLO
-- lo mínimo para validar un código de vendedora: su código normalizado y su nombre.
-- security definer para saltar RLS de forma controlada; no filtra email/teléfono/id.
create or replace function public.validate_referral_code(p_code text)
returns table(code text, name text)
language sql
security definer
set search_path = public
as $$
  select p.code, p.name
  from public.profiles p
  where upper(p.code) = upper(trim(p_code))
    and p.role = 'vendedor'
    and p.active = true
  limit 1;
$$;
revoke all on function public.validate_referral_code(text) from public;
grant execute on function public.validate_referral_code(text) to anon, authenticated;

-- ── Orders: admin todo; vendedor ve los suyos; auth crea
do $$ begin
  drop policy if exists "admin_all"      on public.orders;
  drop policy if exists "seller_own"     on public.orders;
  drop policy if exists "auth_insert"    on public.orders;
  create policy "admin_all"   on public.orders for all using (public.is_admin()) with check (public.is_admin());
  create policy "seller_own"  on public.orders for select using (created_by = auth.uid());
  -- SEC: solo roles autorizados pueden crear pedidos.
  -- Para checkout público (cliente sin login), crear edge function dedicada
  -- que valide reCAPTCHA / rate-limit y use service_role para insertar.
  create policy "auth_insert" on public.orders for insert with check (
    auth.uid() is not null
    and public.current_role() in ('admin','superuser','bodega','vendedor','agente_pedidos')
    and (public.is_admin() or created_by = auth.uid())
  );
end $$;

-- ── Tracking events: lectura admin/dueño del pedido; insert admin/edge function (service role)
do $$ begin
  drop policy if exists "admin_or_owner_read" on public.order_tracking_events;
  drop policy if exists "admin_write"         on public.order_tracking_events;
  create policy "admin_or_owner_read" on public.order_tracking_events for select using (
    public.is_admin() or exists(select 1 from public.orders o where o.id = order_id and o.created_by = auth.uid())
  );
  create policy "admin_write" on public.order_tracking_events for all using (public.is_admin()) with check (public.is_admin());
end $$;

-- ════════════════════════════════════════════════════════════
-- INVENTARIO MAYOREO (master) + DISTRIBUCIÓN POR BODEGA
-- Fuente: Google Sheet "INVENTARIO ACTUALIZADO SW AÑO 20256".
-- inventory_items = catálogo crudo de bodega (1 fila por COD).
-- inventory_stock = cuánto de cada COD hay en cada bodega.
-- ════════════════════════════════════════════════════════════
create table if not exists public.inventory_items (
  cod             text primary key,                 -- COD del sheet (ej. '722-3')
  entry_date      date,                             -- Fecha De Ingreso
  supplier        text,                             -- Proveedor
  brand           text,                             -- Marca
  description     text,                             -- Descripción
  styles_existing int,                              -- Estilos Existentes (conteo teórico)
  stock_count     int     default 0,               -- CONTEO BODEGA (físico total)
  cost_price      numeric default 0,                -- Precio de Costo
  sale_price_min  numeric,                          -- Precio De Venta (mínimo del rango)
  sale_price_max  numeric,                          -- Precio De Venta (máximo del rango; = min si no es rango)
  photo_url       text,                             -- foto del producto (bucket product-images)
  week_number     int,                              -- semana (indicador "color = semana"; opción del admin)
  week_color      text,                             -- color hex asociado a la semana
  entry_month     int,                              -- mes de ingreso 1-12 (indicador "color = mes"; default interno)
  observation     text,                             -- Observacion
  product_id      text references public.products(id) on delete set null, -- si fue publicado al catálogo
  active          boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  -- Fase A: precio público validado y control de visibilidad en catálogo
  public_price_gtq  numeric,                                                              -- precio al público validado (NO es sale_price)
  show_in_catalog   boolean default false,                                                -- "aparece o no" en catálogo
  show_price        boolean default false,                                                -- "tiene precio o no" (si false → CTA Contactar)
  cat_parent_id     text references public.categories(id) on delete set null,            -- categoría sitio
  cat_subcat_id     text references public.subcategories(id) on delete set null,         -- subcategoría sitio
  gallery           jsonb default '[]'::jsonb                                             -- URLs de imágenes (galería)
);
create index if not exists idx_inv_items_week    on public.inventory_items(week_number);
create index if not exists idx_inv_items_active  on public.inventory_items(active);
create index if not exists idx_inv_items_catalog on public.inventory_items(show_in_catalog);

-- Columnas Fase A para instalaciones en vivo (idempotente)
alter table public.inventory_items add column if not exists public_price_gtq  numeric;
alter table public.inventory_items add column if not exists show_in_catalog   boolean default false;
alter table public.inventory_items add column if not exists show_price        boolean default false;
alter table public.inventory_items add column if not exists cat_parent_id     text references public.categories(id) on delete set null;
alter table public.inventory_items add column if not exists cat_subcat_id     text references public.subcategories(id) on delete set null;
alter table public.inventory_items add column if not exists gallery           jsonb default '[]'::jsonb;
alter table public.inventory_items add column if not exists entry_month        int;
create index if not exists idx_inv_items_month on public.inventory_items(entry_month);

create table if not exists public.inventory_stock (
  cod        text not null references public.inventory_items(cod) on delete cascade,
  bodega_id  text not null references public.bodegas(id) on delete cascade,
  stock      int  default 0,
  updated_at timestamptz default now(),
  primary key (cod, bodega_id)
);

-- Movimientos de inventario (trazabilidad multi-equipo): ingresos, salidas,
-- ajustes y TRASLADOS entre bodegas (from_bodega → to_bodega).
create table if not exists public.inventory_movements (
  id             uuid primary key default gen_random_uuid(),
  cod            text references public.inventory_items(cod) on delete set null,
  product_id     text,
  product_name   text,
  type           text not null check (type in ('ingreso','salida','ajuste','transferencia')),
  from_bodega    text references public.bodegas(id) on delete set null,
  to_bodega      text references public.bodegas(id) on delete set null,
  quantity       int  not null,
  previous_stock int,
  new_stock      int,
  motivo         text,
  notes          text,
  created_by     uuid,
  created_by_name text,
  created_at     timestamptz default now()
);
create index if not exists idx_inv_mov_cod     on public.inventory_movements(cod);
create index if not exists idx_inv_mov_created on public.inventory_movements(created_at desc);
alter table public.inventory_movements enable row level security;
do $$ begin
  drop policy if exists "read_auth"  on public.inventory_movements;
  drop policy if exists "write_admin" on public.inventory_movements;
  create policy "read_auth"   on public.inventory_movements for select using (auth.uid() is not null);
  create policy "write_admin" on public.inventory_movements for all using (public.is_admin()) with check (public.is_admin());
end $$;
create index if not exists idx_inv_stock_bodega on public.inventory_stock(bodega_id);

-- Leyenda configurable semana → color (la define el superusuario; editable).
create table if not exists public.inventory_week_legend (
  week_number int primary key,
  color       text not null,                        -- hex, ej. '#A55A3A'
  label       text,                                 -- etiqueta opcional ('Semana 1', fecha, etc.)
  created_at  timestamptz default now()
);

-- Leyenda configurable mes → color (default del indicador interno; editable).
-- Convive con la leyenda semanal; cuál se usa lo decide el setting interno
-- `inventory_period_mode` ('month' default | 'week') gestionado en el dashboard.
create table if not exists public.inventory_month_legend (
  month_number int primary key,                      -- 1-12
  color        text not null,                        -- hex
  label        text,                                 -- etiqueta opcional ('Enero', etc.)
  created_at   timestamptz default now()
);

-- updated_at automático para inventario
do $$
declare t text;
begin
  foreach t in array array['inventory_items','inventory_stock']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.tg_set_updated_at()', t);
  end loop;
end $$;

-- RLS inventario: lectura admin/bodega; escritura admin.
alter table public.inventory_items        enable row level security;
alter table public.inventory_stock        enable row level security;
alter table public.inventory_week_legend  enable row level security;
alter table public.inventory_month_legend enable row level security;

do $$ begin
  drop policy if exists "read_staff"  on public.inventory_items;
  drop policy if exists "write_admin" on public.inventory_items;
  create policy "read_staff"  on public.inventory_items for select
    using (public.is_admin() or public.current_role() = 'bodega');
  create policy "write_admin" on public.inventory_items for all
    using (public.is_admin()) with check (public.is_admin());

  drop policy if exists "read_staff"  on public.inventory_stock;
  drop policy if exists "write_admin" on public.inventory_stock;
  create policy "read_staff"  on public.inventory_stock for select
    using (public.is_admin() or public.current_role() = 'bodega');
  create policy "write_admin" on public.inventory_stock for all
    using (public.is_admin()) with check (public.is_admin());

  drop policy if exists "read_auth"  on public.inventory_week_legend;
  drop policy if exists "write_admin" on public.inventory_week_legend;
  create policy "read_auth"   on public.inventory_week_legend for select
    using (auth.uid() is not null);
  create policy "write_admin" on public.inventory_week_legend for all
    using (public.is_admin()) with check (public.is_admin());

  drop policy if exists "read_auth"  on public.inventory_month_legend;
  drop policy if exists "write_admin" on public.inventory_month_legend;
  create policy "read_auth"   on public.inventory_month_legend for select
    using (auth.uid() is not null);
  create policy "write_admin" on public.inventory_month_legend for all
    using (public.is_admin()) with check (public.is_admin());
end $$;

-- ════════════════════════════════════════════════════════════
-- CONFIGURACIÓN DEL SITIO (contenido editable desde el dashboard)
-- key/value jsonb. Claves usadas:
--   'marquee'      → array de strings (anuncios del letrero del hero)
--   'social_links' → array de {type,url,label,visible}
--   'whatsapp'     → text (número de WhatsApp)
-- Lectura PÚBLICA (el sitio lo necesita sin login); escritura admin.
-- ════════════════════════════════════════════════════════════
create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz default now()
);

alter table public.site_settings enable row level security;
do $$ begin
  drop policy if exists "read_public" on public.site_settings;
  drop policy if exists "write_admin" on public.site_settings;
  create policy "read_public" on public.site_settings for select using (true);
  create policy "write_admin" on public.site_settings for all
    using (public.is_admin()) with check (public.is_admin());
end $$;

do $$ begin
  drop trigger if exists set_updated_at on public.site_settings;
  create trigger set_updated_at before update on public.site_settings
    for each row execute function public.tg_set_updated_at();
end $$;

-- ────────────────────────────────────────────────────────────
-- Solicitudes de vendedoras (formulario público de vendedoras.html)
-- Insert anónimo (es un formulario de contacto); lectura/gestión solo admin.
-- ────────────────────────────────────────────────────────────
create table if not exists public.vendor_applications (
  id          text primary key,               -- id local (app_...) para dedup multi-equipo
  name        text not null,
  email       text,
  phone       text,
  city        text,
  message     text,
  status      text default 'pendiente' check (status in ('pendiente','aprobado','rechazado')),
  approved_at timestamptz,
  created_at  timestamptz default now()
);
alter table public.vendor_applications enable row level security;
do $$ begin
  drop policy if exists "anon_insert" on public.vendor_applications;
  drop policy if exists "admin_all"   on public.vendor_applications;
  create policy "anon_insert" on public.vendor_applications for insert with check (status = 'pendiente');
  create policy "admin_all"   on public.vendor_applications for all using (public.is_admin()) with check (public.is_admin());
end $$;

-- Pedidos de la TIENDA por visitantes anónimos (transferencia/QR): insert público
-- pero SOLO con valores seguros (pendiente, sin created_by). Los de tarjeta los crea
-- qpaypro-proxy con service_role; los de POS pasan por auth_insert.
do $$ begin
  drop policy if exists "anon_insert_store" on public.orders;
  create policy "anon_insert_store" on public.orders for insert with check (
    auth.uid() is null
    and status = 'pendiente'
    and payment_status = 'pendiente'
    and origin = 'store'
    and created_by is null
  );
end $$;

create table if not exists public.analytics_page_visits (
  id uuid primary key default gen_random_uuid(),
  site_key text not null default 'laurean',
  page_path text not null,
  session_id text,
  referer text,
  user_agent text,
  created_at timestamptz default now()
);
create index if not exists idx_apv_site_time on public.analytics_page_visits (site_key, created_at desc);
create index if not exists idx_apv_path on public.analytics_page_visits (page_path);
alter table public.analytics_page_visits enable row level security;
create policy "apv_anon_insert" on public.analytics_page_visits for insert with check (true);
create policy "apv_admin_read"  on public.analytics_page_visits for select using (public.is_admin());

-- ════════════════════════════════════════════════════════════
-- PAGOS (QPayPro) — registro de transacciones de pasarela.
-- Las escrituras las hace la edge function `qpaypro-proxy` con
-- service_role (omite RLS). Lectura sólo admin.
-- ════════════════════════════════════════════════════════════
create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid references public.orders(id) on delete set null,
  provider      text default 'qpaypro',
  amount_gtq    numeric not null default 0,
  currency      text default 'GTQ',
  status        text default 'iniciado' check (status in ('iniciado','aprobado','rechazado','error')),
  response_code text,                    -- responseCode de QPayPro (100 = aprobado)
  response_text text,                    -- responseText / mensaje
  qpaypro_audit text,                    -- x_trans_id / x_audit_number / referencia
  checkout_token text,                   -- token de Hosted Page (register_transaction_store)
  raw_response  jsonb,                   -- respuesta cruda para auditoría
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table public.payments add column if not exists checkout_token text;
create index if not exists idx_payments_order  on public.payments(order_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_created on public.payments(created_at desc);

do $$ begin
  drop trigger if exists set_updated_at on public.payments;
  create trigger set_updated_at before update on public.payments
    for each row execute function public.tg_set_updated_at();
end $$;

alter table public.payments enable row level security;
do $$ begin
  drop policy if exists "admin_all" on public.payments;
  create policy "admin_all" on public.payments for all
    using (public.is_admin()) with check (public.is_admin());
end $$;

-- ════════════════════════════════════════════════════════════
-- STORAGE: bucket público para imágenes de productos / categorías
-- ════════════════════════════════════════════════════════════
-- Ejecutar también en el SQL editor:
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Permisos del bucket
do $$ begin
  drop policy if exists "Public read product-images"  on storage.objects;
  drop policy if exists "Admin write product-images" on storage.objects;

  create policy "Public read product-images"
    on storage.objects for select
    using (bucket_id = 'product-images');

  create policy "Admin write product-images"
    on storage.objects for all
    using (bucket_id = 'product-images' and public.is_admin())
    with check (bucket_id = 'product-images' and public.is_admin());
end $$;

-- ════════════════════════════════════════════════════════════
-- Códigos de descuento (antes solo localStorage). Fuente de verdad en la web:
-- el admin los gestiona (RLS admin) y el checkout los valida por RPC pública
-- (no exponemos SELECT a anon; el RPC security-definer devuelve solo lo necesario).
-- ════════════════════════════════════════════════════════════
create table if not exists public.discount_codes (
  id           text primary key,
  code         text not null,
  type         text not null default 'pct',   -- 'pct' | 'fixed'
  value        numeric not null default 0,
  active       boolean not null default true,
  valid_from   timestamptz,
  valid_until  timestamptz,
  usage_limit  int,
  used_count   int not null default 0,
  created_at   timestamptz default now(),
  created_by   uuid
);
create unique index if not exists idx_discount_code_upper on public.discount_codes (upper(code));
alter table public.discount_codes enable row level security;
do $$ begin
  drop policy if exists "admin_all" on public.discount_codes;
  create policy "admin_all" on public.discount_codes for all
    using (public.is_admin()) with check (public.is_admin());
end $$;

-- Validación pública de un código de descuento en el checkout (invitados incluidos).
create or replace function public.validate_discount_code(p_code text, p_subtotal numeric default 0)
returns table(id text, code text, type text, value numeric, discount_gtq numeric)
language sql
security definer
set search_path = public
as $$
  select d.id, d.code, d.type, d.value,
    case when d.type = 'pct'   then round(p_subtotal * d.value / 100)
         when d.type = 'fixed' then least(d.value, p_subtotal)
         else 0 end as discount_gtq
  from public.discount_codes d
  where upper(d.code) = upper(trim(p_code))
    and d.active = true
    and (d.valid_from  is null or now() >= d.valid_from)
    and (d.valid_until is null or now() <= d.valid_until)
    and (d.usage_limit is null or d.used_count < d.usage_limit)
  limit 1;
$$;
revoke all on function public.validate_discount_code(text, numeric) from public;
grant execute on function public.validate_discount_code(text, numeric) to anon, authenticated;

-- Incremento atómico del contador de usos (al confirmar un pedido con código).
create or replace function public.increment_discount_usage(p_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.discount_codes set used_count = used_count + 1 where id = p_id;
$$;
revoke all on function public.increment_discount_usage(text) from public;
grant execute on function public.increment_discount_usage(text) to anon, authenticated;

-- ════════════════════════════════════════════════════════════
-- Comisiones de vendedoras (antes solo localStorage). Se reconcilian desde los
-- pedidos con referral_code: id determinístico `com_<order_id>` para que dos
-- equipos reconciliando el mismo pedido no dupliquen. El admin las gestiona;
-- cada vendedora ve solo las suyas.
-- ════════════════════════════════════════════════════════════
create table if not exists public.commissions (
  id                text primary key,
  order_id          text not null,        -- supabase_id del pedido (uuid como texto)
  vendor_id         uuid,
  vendor_name       text,
  vendor_code       text,
  order_total       numeric not null default 0,
  commission_rate   numeric not null default 0,
  commission_amount numeric not null default 0,
  status            text not null default 'pendiente',  -- 'pendiente' | 'pagado'
  created_at        timestamptz default now()
);
create index if not exists idx_commission_order  on public.commissions(order_id);
create index if not exists idx_commission_vendor on public.commissions(vendor_id);
alter table public.commissions enable row level security;
do $$ begin
  drop policy if exists "admin_all"  on public.commissions;
  drop policy if exists "seller_own" on public.commissions;
  create policy "admin_all"  on public.commissions for all
    using (public.is_admin()) with check (public.is_admin());
  create policy "seller_own" on public.commissions for select
    using (vendor_id = auth.uid());
end $$;

-- ════════════════════════════════════════════════════════════
-- Combos (antes solo localStorage). El combo se guarda como jsonb (objeto anidado)
-- + columna `active` para filtrar. Los usan el admin y el POS (usuarios autenticados),
-- no la tienda pública: lectura para autenticados, escritura solo admin.
-- ════════════════════════════════════════════════════════════
create table if not exists public.combos (
  id         text primary key,
  data       jsonb not null,
  active     boolean not null default false,
  updated_at timestamptz default now()
);
create index if not exists idx_combo_active on public.combos(active);
alter table public.combos enable row level security;
do $$ begin
  drop policy if exists "read_auth"   on public.combos;
  drop policy if exists "write_admin" on public.combos;
  create policy "read_auth"   on public.combos for select using (auth.uid() is not null);
  create policy "write_admin" on public.combos for all
    using (public.is_admin()) with check (public.is_admin());
end $$;

-- ════════════════════════════════════════════════════════════
-- FIN. Después de correr esto, ejecutar `seed.sql` para crear
-- usuarios y categorías base.
-- ════════════════════════════════════════════════════════════
