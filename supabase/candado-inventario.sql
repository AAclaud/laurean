-- ════════════════════════════════════════════════════════════════════════════
-- CANDADO: ninguna unidad cambia sin su movimiento
--
-- El desastre del 8 de agosto fue posible porque las existencias se podían
-- escribir desde varios lados: el navegador, un script de reparación, la
-- importación de mayoreo. Cuando hay varias puertas, tarde o temprano alguien
-- entra por una que no deja registro y los números se separan.
--
-- A partir de aquí hay UNA sola puerta: `mover_inventario()`. Todo lo demás
-- puede leer, nadie más puede escribir.
--
--   variant_stock       → solo lectura para los clientes. Cambia únicamente
--                         por `mover_inventario()` o por la venta (ambas son
--                         SECURITY DEFINER y dejan traza).
--   inventory_movements → solo lectura. Es la bitácora: nadie la edita ni la
--                         borra, ni siquiera un administrador.
--   inventory_stock     → sigue siendo escribible por admin, porque la pestaña
--                         Mayoreo la usa para repartir mercadería que todavía
--                         NO está publicada al catálogo (y por lo tanto no
--                         tiene variantes). Para lo que sí está publicado, el
--                         trigger manda y el cuadre avisa si difieren.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Existencias: solo lectura desde el cliente ───────────────────────────
do $$ begin
  drop policy if exists "variant_stock_write_staff" on public.variant_stock;
  drop policy if exists "variant_stock_read_public" on public.variant_stock;
  -- La tienda pública necesita leer para saber qué tallas ofrecer.
  create policy "variant_stock_read_public" on public.variant_stock
    for select using (true);
end $$;

revoke insert, update, delete on public.variant_stock from authenticated, anon;
grant  select                 on public.variant_stock to   authenticated, anon;

-- ── 2. Bitácora de movimientos: append-only, y solo por la función ──────────
do $$ begin
  drop policy if exists "read_auth"   on public.inventory_movements;
  drop policy if exists "write_admin" on public.inventory_movements;
  create policy "read_auth" on public.inventory_movements
    for select using (auth.uid() is not null);
end $$;

revoke insert, update, delete on public.inventory_movements from authenticated, anon;
grant  select                 on public.inventory_movements to   authenticated;

-- ── 3. Cuadre: la consulta que dice si algo se separó ───────────────────────
-- Compara las tres cifras que deberían contar lo mismo:
--   catalogo  = products.stock          (lo que dice la ficha del producto)
--   detalle   = suma de variant_stock   (lo que realmente se puede vender)
--   total     = suma de inventory_stock (el conteo por bodega)
create or replace view public.cuadre_inventario as
select p.id                                                             as product_id,
       p.name                                                           as producto,
       p.source_cod                                                     as cod,
       coalesce(p.stock, 0)                                             as catalogo,
       coalesce((select sum(v.stock) from public.variant_stock v
                  where v.product_id = p.id), 0)                        as detalle,
       coalesce((select sum(s.stock) from public.inventory_stock s
                  where s.cod = p.source_cod), 0)                       as total_bodegas,
       coalesce((select sum(v.stock) from public.variant_stock v
                  where v.product_id = p.id), 0) - coalesce(p.stock, 0) as dif_catalogo,
       case
         when coalesce((select sum(v.stock) from public.variant_stock v
                         where v.product_id = p.id), 0) = 0
              and coalesce(p.stock, 0) > 0                then 'sin reparto'
         when p.source_cod is not null
              and coalesce((select sum(v.stock) from public.variant_stock v
                             where v.product_id = p.id), 0)
                  <> coalesce((select sum(s.stock) from public.inventory_stock s
                                where s.cod = p.source_cod), 0)  then 'detalle vs bodegas'
         when coalesce((select sum(v.stock) from public.variant_stock v
                         where v.product_id = p.id), 0) <> coalesce(p.stock, 0)
                                                          then 'detalle vs catalogo'
         else 'ok'
       end                                                              as estado
  from public.products p;

alter view public.cuadre_inventario set (security_invoker = on);
grant select on public.cuadre_inventario to authenticated;

-- ── 4. Resumen de una línea, para la alerta del panel ───────────────────────
create or replace function public.resumen_cuadre()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'productos',   count(*),
    'ok',          count(*) filter (where estado = 'ok'),
    'descuadres',  count(*) filter (where estado <> 'ok'),
    'sin_reparto', count(*) filter (where estado = 'sin reparto'),
    'unidades_detalle', coalesce(sum(detalle), 0),
    'unidades_catalogo', coalesce(sum(catalogo), 0)
  ) from public.cuadre_inventario;
$$;

revoke all     on function public.resumen_cuadre() from public, anon;
grant  execute on function public.resumen_cuadre() to authenticated;
