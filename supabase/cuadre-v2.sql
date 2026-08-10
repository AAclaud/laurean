-- ════════════════════════════════════════════════════════════════════════════
-- CUADRE v2: detectar combinaciones que el producto no vende
--
-- El unico descuadre que quedaba (Short deportivo con licra Importado) resulto
-- ser esto: el catalogo declara Negro en S y M (32 + 32 = 64), pero el
-- inventario tenia ademas Negro/L y Negro/XL con 32 cada una. 64 unidades en
-- tallas que ese producto no vende, invisibles hasta que alguien las buscara.
--
-- Esta regla lo caza sola. Es la clase de descuadre que no se ve mirando
-- totales: los totales cuadran entre si, lo que no cuadra es CONTRA lo que el
-- producto dice ofrecer.
-- ════════════════════════════════════════════════════════════════════════════

-- `create or replace view` no permite cambiar el orden ni el nombre de las
-- columnas, y esta version agrega dos. Se recrea desde cero.
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
  select vs.product_id,
         count(*)                                          as filas,
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
base as (
  select p.id, p.name, p.source_cod,
         coalesce(p.stock, 0)                                                     as catalogo,
         coalesce((select sum(v.stock) from public.variant_stock v
                    where v.product_id = p.id), 0)                                as detalle,
         coalesce((select sum(s.stock) from public.inventory_stock s
                    where s.cod = p.source_cod), 0)                               as total_bodegas,
         coalesce(sl.filas, 0)                                                    as sueltas_filas,
         coalesce(sl.unidades, 0)                                                 as sueltas_unidades,
         sl.detalle                                                               as sueltas_detalle
    from public.products p
    left join sueltas sl on sl.product_id = p.id
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
       case
         when sueltas_filas > 0                              then 'combinacion no declarada'
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
    'unidades_sueltas', coalesce(sum(sueltas_unidades), 0),
    'unidades_detalle', coalesce(sum(detalle), 0),
    'unidades_catalogo',coalesce(sum(catalogo), 0)
  ) from public.cuadre_inventario;
$$;

revoke all     on function public.resumen_cuadre() from public, anon;
grant  execute on function public.resumen_cuadre() to authenticated;
