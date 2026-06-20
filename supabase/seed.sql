-- ============================================================
-- LAUREAN SHOP — Seeds iniciales
-- Ejecutar UNA SOLA VEZ después de schema.sql.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Usuarios seed (crear en Auth primero, luego perfil)
-- ────────────────────────────────────────────────────────────
-- NOTA: la creación real del usuario en auth.users debe hacerse desde:
--   Supabase Dashboard → Authentication → Add user (manual)
--   o via supabase.auth.admin.createUser() en una Edge Function
-- Luego correr este seed con el UUID que Supabase asignó.
--
-- USUARIOS INICIALES SUGERIDOS:
--   super@aaprojects.com  / SuperAA2026!  → rol 'superuser'
--   admin@laurean.gt      / Admin2026!    → rol 'admin'
--
-- Una vez creados en Auth, ejecutar este UPSERT con sus UUIDs:

insert into public.profiles (id, email, name, role, active)
values
  ('8ab8c92e-b7d7-48fe-a126-a9e29101df4c', 'ninesubset@gmail.com', 'AA Projects', 'superuser', true)
on conflict (id) do update set
  email = excluded.email, name = excluded.name, role = excluded.role, active = excluded.active;

-- ────────────────────────────────────────────────────────────
-- Categorías base
-- ────────────────────────────────────────────────────────────
insert into public.categories (id, name, image_url, starting_price_gtq, starting_price_usd, display_order, active)
values
  ('mujer',   'Mujer',         'images/laurean_category_ella.jpg',  749, 97,  1, true),
  ('hombre',  'Hombre',        'images/laurean_category_el.jpg',    799, 104, 2, true),
  ('kids',    'Laurean Kids',  'images/laurean_category_ninos.jpg', 549, 71,  3, true),
  ('ofertas', 'Ofertas',       'images/laurean_category_ella.jpg',  199, 26,  4, true)
on conflict (id) do update set
  name = excluded.name,
  image_url = excluded.image_url,
  starting_price_gtq = excluded.starting_price_gtq,
  starting_price_usd = excluded.starting_price_usd,
  display_order = excluded.display_order,
  active = excluded.active;

-- ────────────────────────────────────────────────────────────
-- Subcategorías base
-- ────────────────────────────────────────────────────────────
insert into public.subcategories (id, parent_id, name, display_order) values
  ('novedades',    'mujer',   'Novedades',         1),
  ('blusas',       'mujer',   'Blusas',            2),
  ('conjuntos',    'mujer',   'Conjuntos',         3),
  ('vestidos',     'mujer',   'Vestidos',          4),
  ('tshirt',       'hombre',  'T-Shirt',           1),
  ('boxer',        'hombre',  'Boxer',             2),
  ('nina-pijamas', 'kids',    'Niña · Pijamas',    1),
  ('nina-licra',   'kids',    'Niña · Licra',      2),
  ('nino-pijamas', 'kids',    'Niño · Pijamas',    3),
  ('flash',        'ofertas', 'Ofertas Flash',     1),
  ('promociones',  'ofertas', 'Promociones',       2)
on conflict (id) do update set
  parent_id = excluded.parent_id,
  name = excluded.name,
  display_order = excluded.display_order;

-- ────────────────────────────────────────────────────────────
-- Bodegas iniciales (ajustar township_code según tu operación)
-- ────────────────────────────────────────────────────────────
insert into public.bodegas (id, name, address, city, township_code, active) values
  ('bodega-central', 'Bodega Central', 'Zona 10, Ciudad de Guatemala', 'Guatemala', '0101', true)
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════
-- Listo. Para verificar:
--   select * from public.categories order by display_order;
--   select * from public.subcategories order by parent_id, display_order;
-- ════════════════════════════════════════════════════════════
