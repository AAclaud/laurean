-- ════════════════════════════════════════════════════════════════════════════
-- products.stock pasa a DERIVARSE del inventario
--
-- Era la ultima cifra que se escribia a mano y no se movia con nada. Se veia
-- asi, con datos reales:
--
--   Baby Kid   ficha 10555 · inventario  6000   (-4555)  una salida registrada
--   Hoodie     ficha  1680 · inventario  1679   (-1)     una venta de la tienda
--
-- La salida y la venta si bajaron variant_stock, pero products.stock se quedo
-- donde estaba. Ese numero es el que ve la tienda y el que muestra la ficha,
-- asi que el producto seguia ofreciendo mercaderia que ya no existia.
--
-- La solucion es la misma que ya se uso para el total por bodega: que lo
-- calcule el disparador que ya existe sobre variant_stock. Asi queda al dia
-- venga de donde venga el cambio — un movimiento, una venta, un ajuste — sin
-- que nadie tenga que acordarse.
--
-- OJO al orden: el calculo va ANTES del corte por COD. Los productos creados a
-- mano en el admin no tienen COD y salian por ese `return` sin actualizarse; el
-- Hoodie es justamente uno de ellos.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.refrescar_stock_agregado(p_product_id text, p_bodega_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cod   text;
  v_total int;
  v_todas int;
begin
  -- 1. Total del producto sumando TODAS las bodegas → products.stock
  select coalesce(sum(stock), 0) into v_todas
    from public.variant_stock
   where product_id = p_product_id;

  update public.products
     set stock = v_todas
   where id = p_product_id
     and coalesce(stock, -1) is distinct from v_todas;

  -- 2. Total por bodega → inventory_stock (solo para lo que viene de mayoreo)
  select source_cod into v_cod from public.products where id = p_product_id;
  if v_cod is null then return; end if;
  if not exists (select 1 from public.inventory_items where cod = v_cod) then return; end if;

  select coalesce(sum(stock), 0) into v_total
    from public.variant_stock
   where product_id = p_product_id and bodega_id = p_bodega_id;

  insert into public.inventory_stock (cod, bodega_id, stock, updated_at)
       values (v_cod, p_bodega_id, v_total, now())
  on conflict (cod, bodega_id)
  do update set stock = excluded.stock, updated_at = now();
exception when others then
  -- Que un problema al reflejar el total nunca tumbe un movimiento valido.
  raise warning 'refrescar_stock_agregado(%, %): %', p_product_id, p_bodega_id, sqlerrm;
end $$;

-- ── Puesta al dia de lo que ya estaba desalineado ───────────────────────────
update public.products p
   set stock = coalesce((select sum(v.stock) from public.variant_stock v
                          where v.product_id = p.id), 0)
 where coalesce(p.stock, -1) is distinct from
       coalesce((select sum(v.stock) from public.variant_stock v
                  where v.product_id = p.id), 0);

-- ── Comprobacion ────────────────────────────────────────────────────────────
select count(*)                                    as productos,
       count(*) filter (where p.stock = inv.total) as cuadran,
       count(*) filter (where p.stock <> inv.total) as descuadran
  from public.products p
  cross join lateral (
    select coalesce(sum(v.stock), 0) as total
      from public.variant_stock v where v.product_id = p.id) inv;
