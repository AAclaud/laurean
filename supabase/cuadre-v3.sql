-- ════════════════════════════════════════════════════════════════════════════
-- CUADRE v3: lo que la ficha promete y el inventario no tiene, y la misma
-- talla escrita de dos formas
--
-- v2 caza las combinaciones que sobran (existencias en tallas que el producto
-- no vende). Faltaban las dos de sentido contrario, las dos vistas con datos
-- reales:
--
--   a) La ficha declara Corinto/XL y Zapote/XL con 1 unidad cada una, pero en
--      el inventario solo hay "Corinto sin talla = 0" y "Zapote sin talla = 0".
--      Son 2 unidades que la tienda ofrece y la bodega no tiene. Los totales
--      no lo delatan: el catalogo dice 17 y el detalle 15, y esa diferencia de
--      2 se leia como un descuadre cualquiera sin decir donde estaba.
--
--   b) "4 A" y "4a" son la misma talla escrita distinto. Cada grafia abre su
--      propia linea, asi que la existencia queda partida en dos y aparece una
--      talla que ese producto no ofrece. Paso de verdad: un color de
--      "Oversize Baby Girl" quedo con 5 tallas mientras los otros cinco tienen
--      4, con 75 unidades colgando de la talla fantasma.
--
-- Las dos son invisibles para cualquier revision que solo compare sumas.
-- ════════════════════════════════════════════════════════════════════════════

-- `create or replace view` no permite cambiar el orden ni el nombre de las
-- columnas, y esta version agrega tres. Se recrea desde cero.
drop function if exists public.resumen_cuadre();
drop view     if exists public.cuadre_inventario;

create view public.cuadre_inventario as
with declaradas as (
  -- Combinaciones que el producto dice vender. `sizes` puede venir como texto
  -- ("M") o como objeto ({"size":"M","qty":32}); se contemplan las dos formas.
  select p.id                                              as product_id,
         coalesce(v->>'label', '')                         as color,
         coalesce(s.value->>'size', s.value #>> '{}', '')   as size
    from public.products p
    cross join lateral jsonb_array_elements(coalesce(p.variants::jsonb, '[]'::jsonb)) v
    left  join lateral jsonb_array_elements(coalesce(v->'sizes', '[]'::jsonb)) s on true
),
sueltas as (
  -- Una fila sobrante en cero es residuo, no un descuadre: se sigue listando
  -- en el detalle para poder limpiarla, pero no es lo que marca el estado.
  -- Si no se separara, un residuo vacio tapa el diagnostico util del producto.
  select vs.product_id,
         count(*)                                          as filas,
         count(*) filter (where vs.stock <> 0)             as filas_con_stock,
         sum(vs.stock)                                     as unidades,
         string_agg(coalesce(nullif(vs.color,''),'sin color') || ' / ' ||
                    coalesce(nullif(vs.size,''),'sin talla') || ' (' || vs.stock || ')',
                    ', ' order by vs.color, vs.size)       as detalle
    from public.variant_stock vs
    join public.products p on p.id = vs.product_id
   where jsonb_array_length(coalesce(p.variants::jsonb, '[]'::jsonb)) > 0
     and not exists (select 1 from declaradas d
                      where d.product_id = vs.product_id
                        and coalesce(d.color,'') = vs.color
                        and coalesce(d.size,'')  = vs.size)
   group by vs.product_id
),
faltantes as (
  -- Al reves que `sueltas`: la ficha la declara y el inventario no la tiene.
  -- Se ignoran las que quedan sin color o sin talla, porque esas ya las
  -- reporta la regla de colores sin tallas repartidas.
  select d.product_id,
         count(*)                                          as combinaciones,
         string_agg(d.color || ' / ' || d.size, ', ' order by d.color, d.size) as detalle
    from declaradas d
   where d.color <> '' and d.size <> ''
     and not exists (select 1 from public.variant_stock vs
                      where vs.product_id = d.product_id
                        and vs.color = d.color
                        and vs.size  = d.size)
   group by d.product_id
),
tallas as (
  -- Una fila por producto y talla normalizada. Sin depender de la extension
  -- `unaccent`: minusculas, sin espacios y con las vocales acentuadas del
  -- español traducidas a mano alcanza para los casos que se dan.
  select vs.product_id,
         translate(lower(regexp_replace(vs.size, '\s', '', 'g')),
                   'áéíóúüñ', 'aeiouun')                   as clave,
         vs.size                                           as escrita
    from public.variant_stock vs
   where coalesce(vs.size, '') <> ''
   group by vs.product_id, 2, vs.size
),
duplicadas as (
  select product_id,
         string_agg(formas, ', ')                          as detalle
    from (
      select product_id, clave,
             string_agg(escrita, ' / ' order by escrita)    as formas
        from tallas
       group by product_id, clave
      having count(*) > 1
    ) t
   group by product_id
),
base as (
  select p.id, p.name, p.source_cod,
         coalesce(p.stock, 0)                                                     as catalogo,
         coalesce((select sum(v.stock) from public.variant_stock v
                    where v.product_id = p.id), 0)                                as detalle,
         coalesce((select sum(s.stock) from public.inventory_stock s
                    where s.cod = p.source_cod), 0)                               as total_bodegas,
         coalesce(sl.filas_con_stock, 0)                                          as sueltas_filas,
         coalesce(sl.unidades, 0)                                                 as sueltas_unidades,
         sl.detalle                                                               as sueltas_detalle,
         coalesce(ft.combinaciones, 0)                                            as faltantes_filas,
         ft.detalle                                                               as faltantes_detalle,
         dp.detalle                                                               as tallas_duplicadas
    from public.products p
    left join sueltas    sl on sl.product_id = p.id
    left join faltantes  ft on ft.product_id = p.id
    left join duplicadas dp on dp.product_id = p.id
)
select id                       as product_id,
       name                     as producto,
       source_cod               as cod,
       catalogo,
       detalle,
       total_bodegas,
       detalle - catalogo       as dif_catalogo,
       sueltas_unidades,
       sueltas_detalle,
       faltantes_filas          as faltantes_combinaciones,
       faltantes_detalle,
       tallas_duplicadas,
       case
         when sueltas_filas > 0                              then 'combinacion no declarada'
         when faltantes_filas > 0                            then 'combinacion sin existencias'
         when tallas_duplicadas is not null                  then 'talla escrita de dos formas'
         when detalle = 0 and catalogo > 0                   then 'sin reparto'
         when source_cod is not null and detalle <> total_bodegas
                                                             then 'detalle vs bodegas'
         when detalle <> catalogo                            then 'detalle vs catalogo'
         else 'ok'
       end                      as estado
  from base;

alter view public.cuadre_inventario set (security_invoker = on);
grant select on public.cuadre_inventario to authenticated;

create function public.resumen_cuadre()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'productos',        count(*),
    'ok',               count(*) filter (where estado = 'ok'),
    'descuadres',       count(*) filter (where estado <> 'ok'),
    'sin_reparto',      count(*) filter (where estado = 'sin reparto'),
    'no_declaradas',    count(*) filter (where estado = 'combinacion no declarada'),
    'sin_existencias',  count(*) filter (where estado = 'combinacion sin existencias'),
    'tallas_repetidas', count(*) filter (where estado = 'talla escrita de dos formas'),
    'unidades_sueltas', coalesce(sum(sueltas_unidades), 0),
    'unidades_detalle', coalesce(sum(detalle), 0),
    'unidades_catalogo',coalesce(sum(catalogo), 0)
  ) from public.cuadre_inventario;
$$;

revoke all     on function public.resumen_cuadre() from public, anon;
grant  execute on function public.resumen_cuadre() to authenticated;
