-- ════════════════════════════════════════════════════════════════════════════
-- CUADRE v4: las clases que la auditoria del 22/08 encontro a mano
--
-- APLICADO como migracion `cuadre_v4_clases_de_catalogo`.
--
-- v3 ya cubria las diferencias de cantidad y de desglose. La auditoria completa
-- de los 121 articulos encontro tres cosas mas que la vista no miraba, y la
-- idea es no volver a necesitar una auditoria manual para verlas:
--
--   · talla por edad fuera de Kids  → asi llego un «24m» a Oversize Sophia, que
--     es de mujer. Nadie lo tecleo: la rejilla ofrecia las dieciseis tallas para
--     cualquier categoria, y ahi estaba para hacer clic. Comprobado contra los
--     datos: los 19 productos de Kids usan tallas por edad y ninguno de los 69
--     de adulto, salvo ese error.
--   · nombre repetido              → habia dos productos «Hoodie», uno de hombre
--     (Q299) y otro de mujer (Q295). Son distintos, pero en la lista y en la
--     tienda no habia forma de saber cual era cual.
--   · precio sin producto          → filas de price_overrides apuntando a
--     productos borrados. Habia 3.
--
-- Las dos nuevas van al FINAL de la cadena de estados: son calidad de catalogo,
-- no diferencias de existencias, asi que no deben tapar un descuadre real.
-- ════════════════════════════════════════════════════════════════════════════

drop function if exists public.resumen_cuadre();
drop view     if exists public.cuadre_inventario;

create view public.cuadre_inventario as
with declaradas as (
  select p.id                                              as product_id,
         coalesce(v->>'label', '')                         as color,
         coalesce(s.value->>'size', s.value #>> '{}', '')   as size
    from public.products p
    cross join lateral jsonb_array_elements(coalesce(p.variants::jsonb, '[]'::jsonb)) v
    left  join lateral jsonb_array_elements(coalesce(v->'sizes', '[]'::jsonb)) s on true
),
sueltas as (
  -- Una fila sobrante en cero es residuo, no un descuadre: se sigue listando en
  -- el detalle, pero no es lo que marca el estado.
  select vs.product_id,
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
  select d.product_id,
         count(*)                                          as combinaciones,
         string_agg(d.color || ' / ' || d.size, ', ' order by d.color, d.size) as detalle
    from declaradas d
   where d.color <> '' and d.size <> ''
     and not exists (select 1 from public.variant_stock vs
                      where vs.product_id = d.product_id
                        and vs.color = d.color and vs.size = d.size)
   group by d.product_id
),
tallas as (
  select distinct vs.product_id,
         translate(lower(regexp_replace(vs.size, '\s', '', 'g')), 'áéíóúüñ', 'aeiouun') as clave,
         vs.size as escrita
    from public.variant_stock vs
   where coalesce(vs.size, '') <> ''
),
duplicadas as (
  select product_id, string_agg(formas, ', ') as detalle
    from (select product_id, clave, string_agg(escrita, ' / ' order by escrita) as formas
            from tallas group by product_id, clave having count(*) > 1) t
   group by product_id
),
edad_fuera as (
  select vs.product_id,
         string_agg(distinct vs.size, ', ' order by vs.size) as detalle
    from public.variant_stock vs
    join public.products p on p.id = vs.product_id
   where coalesce(p.parent_id, '') <> 'kids'
     and vs.size ~ '^\d{1,2}\s*[maMA]$'
   group by vs.product_id
),
homonimos as (
  select p.id as product_id,
         string_agg(o.id, ', ' order by o.id) as detalle
    from public.products p
    join public.products o on o.id <> p.id and lower(btrim(o.name)) = lower(btrim(p.name))
   group by p.id
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
         dp.detalle                                                               as tallas_duplicadas,
         ef.detalle                                                               as tallas_fuera_de_categoria,
         hm.detalle                                                               as mismo_nombre_que
    from public.products p
    left join sueltas    sl on sl.product_id = p.id
    left join faltantes  ft on ft.product_id = p.id
    left join duplicadas dp on dp.product_id = p.id
    left join edad_fuera ef on ef.product_id = p.id
    left join homonimos  hm on hm.product_id = p.id
)
select id                       as product_id,
       name                     as producto,
       source_cod               as cod,
       catalogo, detalle, total_bodegas,
       detalle - catalogo       as dif_catalogo,
       sueltas_unidades, sueltas_detalle,
       faltantes_filas          as faltantes_combinaciones,
       faltantes_detalle,
       tallas_duplicadas,
       tallas_fuera_de_categoria,
       mismo_nombre_que,
       case
         when sueltas_filas > 0                              then 'combinacion no declarada'
         when faltantes_filas > 0                            then 'combinacion sin existencias'
         when tallas_duplicadas is not null                  then 'talla escrita de dos formas'
         when detalle = 0 and catalogo > 0                   then 'sin reparto'
         when source_cod is not null and detalle <> total_bodegas
                                                             then 'detalle vs bodegas'
         when detalle <> catalogo                            then 'detalle vs catalogo'
         when tallas_fuera_de_categoria is not null          then 'talla que no es de su categoria'
         when mismo_nombre_que is not null                   then 'otro producto se llama igual'
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
    'talla_fuera_cat',  count(*) filter (where estado = 'talla que no es de su categoria'),
    'nombre_repetido',  count(*) filter (where estado = 'otro producto se llama igual'),
    'precios_huerfanos',(select count(*) from public.price_overrides po
                          where not exists (select 1 from public.products p where p.id = po.product_id)),
    'unidades_sueltas', coalesce(sum(sueltas_unidades), 0),
    'unidades_detalle', coalesce(sum(detalle), 0),
    'unidades_catalogo',coalesce(sum(catalogo), 0)
  ) from public.cuadre_inventario;
$$;

revoke all     on function public.resumen_cuadre() from public, anon;
grant  execute on function public.resumen_cuadre() to authenticated;
