-- ════════════════════════════════════════════════════════════════════════════
-- La venta anota en el kardex lo que REALMENTE se movio
--
-- APLICADO como migracion `venta_kardex_con_lo_realmente_movido`.
-- Reemplaza los disparadores `descontar_variant_stock` y `pedido_traza_venta`
-- de supabase/venta-deja-rastro.sql por uno solo.
--
-- EL PROBLEMA. Eran dos disparadores AFTER INSERT independientes: uno bajaba
-- las existencias y el otro escribia el kardex, sin saber cuanto se habia
-- bajado. Deducia el saldo anterior como «final + cantidad», que solo es cierto
-- si se descontaron exactamente esas unidades. Dos casos en que no:
--
--   · La variante no existe en esa bodega. El update no encuentra fila y no
--     descuenta nada, pero el kardex igual anotaba una salida — y el pedido
--     quedaba marcado como descontado. Una venta inventada en el historial.
--   · Se vende mas de lo que hay. greatest(0, stock - qty) deja el saldo en 0,
--     pero el kardex anotaba la cantidad pedida y un saldo anterior que nunca
--     existio.
--
-- La pantalla del POS impide las dos cosas (deshabilita el boton si no hay
-- existencia en la bodega activa), pero ese guardarrail vive en el navegador y
-- depende del cache local: dos cajas vendiendo la ultima unidad a la vez lo
-- saltan.
--
-- LA SOLUCION. Descontar y anotar pasan a ser UNA operacion, con la fila
-- bloqueada (`select ... for update`), asi que el kardex escribe lo que de
-- verdad se movio o no escribe nada. Cuando algo no cuadra, en vez de una
-- linea falsa queda un aviso en el registro de actividad (action = 'alerta'),
-- que el panel pinta en rojo con el problema en texto.
--
-- COMPROBADO (en transaccion, con rollback):
--   A. venta normal 5 → 3, kardex «2 u. · 5 → 3»
--   B. variante que la bodega no tiene → ninguna linea de kardex, queda aviso
--   C. se piden 10 y hay 3 → stock 0, kardex «3 u. · 3 → 0», queda aviso
--   D. cancelar devuelve a la MISMA bodega
--   E. cancelar la venta fantasma no inventa una devolucion
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.tg_venta_descuenta_y_registra()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  it       jsonb;
  v_qty    int;
  v_usar   text;
  v_prev   int;
  v_nuevo  int;
  v_movido int;
begin
  for it in select * from jsonb_array_elements(coalesce(new.items, '[]'::jsonb))
  loop
    v_qty := coalesce((it->>'qty')::int, 0);
    continue when v_qty <= 0 or coalesce(it->>'id', '') = '';

    v_usar := public.bodega_de_linea_pedido(new, it);

    -- Bloquear la fila: si dos cajas venden la ultima unidad a la vez, la
    -- segunda espera y ve el saldo ya bajado, en vez de calcular sobre uno viejo.
    select stock into v_prev
      from public.variant_stock
     where product_id = it->>'id' and bodega_id = v_usar
       and color = coalesce(it->>'color', '') and size = coalesce(it->>'size', '')
     for update;

    if not found then
      perform public.anotar_actividad(
        'alerta', 'inventario', it->>'id', coalesce(it->>'name', it->>'id'),
        jsonb_strip_nulls(jsonb_build_object(
          'problema', 'Se vendio una combinacion que esa bodega no tiene: no se desconto nada',
          'color',    nullif(coalesce(it->>'color',''), ''),
          'talla',    nullif(coalesce(it->>'size',''), ''),
          'cantidad', v_qty,
          'bodega',   (select b.name from public.bodegas b where b.id = v_usar),
          'nota',     'Pedido ' || coalesce(new.order_number, left(new.id::text, 8)))),
        new.customer_name);
      continue;
    end if;

    v_nuevo  := greatest(0, v_prev - v_qty);
    v_movido := v_prev - v_nuevo;

    update public.variant_stock
       set stock = v_nuevo, updated_at = now()
     where product_id = it->>'id' and bodega_id = v_usar
       and color = coalesce(it->>'color', '') and size = coalesce(it->>'size', '');

    if v_movido < v_qty then
      perform public.anotar_actividad(
        'alerta', 'inventario', it->>'id', coalesce(it->>'name', it->>'id'),
        jsonb_build_object(
          'problema', 'Se vendieron mas unidades de las que habia',
          'pedidas',  v_qty,
          'habia',    v_prev,
          'bodega',   (select b.name from public.bodegas b where b.id = v_usar),
          'nota',     'Pedido ' || coalesce(new.order_number, left(new.id::text, 8))),
        new.customer_name);
    end if;

    continue when v_movido <= 0;

    insert into public.inventory_movements
      (id, product_id, product_name, type, from_bodega, to_bodega, quantity,
       previous_stock, new_stock, color, size, motivo, notes, created_by_name, created_at)
    values
      (gen_random_uuid(), it->>'id', coalesce(it->>'name', it->>'id'), 'salida',
       v_usar, null, v_movido, v_prev, v_nuevo,
       nullif(coalesce(it->>'color', ''), ''), nullif(coalesce(it->>'size', ''), ''),
       'venta', 'Pedido ' || coalesce(new.order_number, left(new.id::text, 8)),
       coalesce(new.customer_name, 'Tienda'), now());
  end loop;
  return null;
exception when others then
  -- Una venta nunca se cae por esto. Si salta, deja de descontarse stock: esa
  -- es la señal de que algo se rompio aqui.
  raise warning 'tg_venta_descuenta_y_registra(%): %', new.id, sqlerrm;
  return null;
end $$;

drop trigger if exists descontar_variant_stock on public.orders;
drop trigger if exists pedido_traza_venta      on public.orders;

create trigger venta_descuenta_y_registra
  after insert on public.orders
  for each row execute function public.tg_venta_descuenta_y_registra();

-- ── La devolucion tampoco anota lo que no ocurrio ──────────────────────────
-- Se sigue usando al cancelar, reactivar y borrar. Si la variante no existe en
-- esa bodega, aplicar_stock_pedido() no devuelve nada; el kardex no debe decir
-- lo contrario.
create or replace function public.registrar_movimiento_pedido(
  p_order public.orders, p_tipo text, p_motivo text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  it jsonb; v_qty int; v_usar text; v_final int; v_prev int;
begin
  for it in select * from jsonb_array_elements(coalesce(p_order.items, '[]'::jsonb))
  loop
    v_qty := coalesce((it->>'qty')::int, 0);
    continue when v_qty <= 0 or coalesce(it->>'id', '') = '';
    v_usar := public.bodega_de_linea_pedido(p_order, it);

    select stock into v_final from public.variant_stock
     where product_id = it->>'id' and bodega_id = v_usar
       and color = coalesce(it->>'color', '') and size = coalesce(it->>'size', '');
    continue when not found;   -- no habia de donde mover: no hay nada que anotar

    v_prev := case when p_tipo = 'salida' then v_final + v_qty else v_final - v_qty end;

    insert into public.inventory_movements
      (id, product_id, product_name, type, from_bodega, to_bodega, quantity,
       previous_stock, new_stock, color, size, motivo, notes, created_by_name, created_at)
    values
      (gen_random_uuid(), it->>'id', coalesce(it->>'name', it->>'id'), p_tipo,
       case when p_tipo = 'salida'  then v_usar end,
       case when p_tipo = 'ingreso' then v_usar end,
       v_qty, v_prev, v_final,
       nullif(coalesce(it->>'color', ''), ''), nullif(coalesce(it->>'size', ''), ''),
       p_motivo,
       'Pedido ' || coalesce(p_order.order_number, left(p_order.id::text, 8)),
       coalesce(p_order.customer_name, 'Tienda'),
       now());
  end loop;
exception when others then
  raise warning 'registrar_movimiento_pedido(%): %', p_order.id, sqlerrm;
end $$;
