-- ════════════════════════════════════════════════════════════════════════════
-- Una venta deja rastro, y cancelarla devuelve la mercaderia
--
-- APLICADO en dos migraciones: `bodega_compartida_pedido` y
-- `traza_pedido_id_uuid`. Este archivo es el estado final, para leerlo junto.
--
-- Dos huecos, los dos comprobados contra la base:
--
--   1. descontar_variant_stock baja las existencias al insertar el pedido pero
--      NO escribia en inventory_movements. Una venta no aparecia en el kardex ni
--      en el calendario: el stock bajaba y nadie sabia por que.
--
--   2. Ese disparador era AFTER INSERT y nada mas. Cancelar un pedido (un
--      UPDATE) o borrarlo no devolvia nada: la mercaderia quedaba descontada
--      para siempre aunque la venta no se concretara.
--
-- El estado vive en `orders.stock_descontado`: dice si las unidades de ese
-- pedido estan restadas ahora mismo. Sin ese estado no hay forma de saber si un
-- cancelar → reactivar → cancelar tiene que devolver una vez o tres.
--
-- LO QUE COSTO MAS CARO: la bodega de la que sale cada linea NO es simplemente
-- la del pedido. Estaba escrita dentro del disparador que descuenta, y al
-- escribir la devolucion la volvi a redactar distinta. Resultado: el Hoodie
-- salio de bdg_central y la devolucion buscaba en bdg_website, asi que no
-- devolvia nada — y el estado si cambiaba, o sea que quedaba mintiendo. Ahora
-- es UNA funcion que usan los dos caminos.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.orders
  add column if not exists stock_descontado boolean not null default false;

-- Los pedidos que ya existen tienen su stock restado desde que se insertaron,
-- MENOS los cancelados: el unico cancelado ya tuvo su devolucion a mano
-- (Daniel, ajuste del 21/08, 1 Hoodie Verde/S que volvio a 60). Marcarlo como
-- descontado haria que al cancelarlo otra vez se devolviera de nuevo.
update public.orders
   set stock_descontado = (coalesce(status, '') <> 'cancelado');

-- ── De que bodega sale (o a cual vuelve) cada linea ─────────────────────────
create or replace function public.bodega_de_linea_pedido(
  p_order public.orders, p_item jsonb
) returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_bodega text;
begin
  v_bodega := coalesce(nullif(p_order.bodega_id, ''), 'bdg_website');
  -- El POS descuenta SIEMPRE de la bodega donde esta la vendedora.
  if coalesce(p_order.origin, '') = 'pos' or coalesce(p_order.channel, '') = 'pos' then
    return v_bodega;
  end if;
  -- Un pedido de la tienda sale de Central si Website no lleva esa variante.
  if exists (select 1 from public.variant_stock
              where product_id = p_item->>'id'
                and bodega_id  = v_bodega
                and color = coalesce(p_item->>'color', '')
                and size  = coalesce(p_item->>'size',  ''))
  then return v_bodega;
  else return 'bdg_central';
  end if;
end $$;

-- ── Descuento al vender (mismo comportamiento de siempre) ───────────────────
create or replace function public.tg_descontar_variant_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  it jsonb; v_qty int; v_usar text;
begin
  for it in select * from jsonb_array_elements(coalesce(new.items, '[]'::jsonb))
  loop
    v_qty := coalesce((it->>'qty')::int, 0);
    if v_qty > 0 and coalesce(it->>'id', '') <> '' then
      v_usar := public.bodega_de_linea_pedido(new, it);
      update public.variant_stock
         set stock = greatest(0, stock - v_qty), updated_at = now()
       where product_id = it->>'id' and bodega_id = v_usar
         and color = coalesce(it->>'color', '') and size = coalesce(it->>'size', '');
    end if;
  end loop;
  return new;
exception when others then
  raise warning 'variant_stock: %', sqlerrm;
  return new;
end $$;

-- ── Devolver o volver a restar ──────────────────────────────────────────────
create or replace function public.aplicar_stock_pedido(
  p_order public.orders, p_signo int
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  it jsonb; v_qty int; v_usar text;
begin
  for it in select * from jsonb_array_elements(coalesce(p_order.items, '[]'::jsonb))
  loop
    v_qty := coalesce((it->>'qty')::int, 0);
    if v_qty > 0 and coalesce(it->>'id', '') <> '' then
      v_usar := public.bodega_de_linea_pedido(p_order, it);
      update public.variant_stock
         set stock = greatest(0, stock + p_signo * v_qty), updated_at = now()
       where product_id = it->>'id' and bodega_id = v_usar
         and color = coalesce(it->>'color', '') and size = coalesce(it->>'size', '');
    end if;
  end loop;
end $$;

-- ── Traza en el kardex ──────────────────────────────────────────────────────
-- El movimiento se escribe DESPUES de que el stock ya cambio, asi que lo leido
-- es el saldo final y el anterior se deduce al reves.
-- `id` es uuid: con `gen_random_uuid()::text` el insert fallaba, y el
-- `exception` de abajo lo dejaba pasar en silencio — la traza no se escribia y
-- solo se notaba contando movimientos.
create or replace function public.registrar_movimiento_pedido(
  p_order public.orders, p_tipo text, p_motivo text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  it jsonb; v_qty int; v_usar text; v_final int; v_prev int;
begin
  for it in select * from jsonb_array_elements(coalesce(p_order.items, '[]'::jsonb))
  loop
    v_qty := coalesce((it->>'qty')::int, 0);
    if v_qty <= 0 or coalesce(it->>'id', '') = '' then continue; end if;
    v_usar := public.bodega_de_linea_pedido(p_order, it);

    select stock into v_final from public.variant_stock
     where product_id = it->>'id' and bodega_id = v_usar
       and color = coalesce(it->>'color', '') and size = coalesce(it->>'size', '');
    v_final := coalesce(v_final, 0);
    v_prev  := case when p_tipo = 'salida' then v_final + v_qty else v_final - v_qty end;

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
  -- La traza nunca debe tumbar una venta. Si esto se dispara, las ventas dejan
  -- de aparecer en el kardex: esa es la señal de que algo se rompio aqui.
  raise warning 'registrar_movimiento_pedido(%): %', p_order.id, sqlerrm;
end $$;

-- ── Disparadores ────────────────────────────────────────────────────────────
create or replace function public.tg_pedido_traza_venta()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.registrar_movimiento_pedido(new, 'salida', 'venta');
  return null;
end $$;

create or replace function public.tg_pedido_marca_descontado()
returns trigger language plpgsql set search_path = public as $$
begin
  new.stock_descontado := true;
  return new;
end $$;

create or replace function public.tg_pedido_cambia_estado()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_debe boolean;
begin
  if tg_op = 'DELETE' then
    if old.stock_descontado then
      perform public.aplicar_stock_pedido(old, 1);
      perform public.registrar_movimiento_pedido(old, 'ingreso', 'pedido eliminado');
    end if;
    return old;
  end if;

  v_debe := coalesce(new.status, '') <> 'cancelado';
  if v_debe = old.stock_descontado then
    new.stock_descontado := old.stock_descontado;   -- sin cambio real
    return new;
  end if;

  if v_debe then
    perform public.aplicar_stock_pedido(new, -1);
    perform public.registrar_movimiento_pedido(new, 'salida', 'pedido reactivado');
  else
    perform public.aplicar_stock_pedido(new, 1);
    perform public.registrar_movimiento_pedido(new, 'ingreso', 'pedido cancelado');
  end if;
  new.stock_descontado := v_debe;
  return new;
end $$;

drop trigger if exists pedido_marca_descontado on public.orders;
create trigger pedido_marca_descontado
  before insert on public.orders
  for each row execute function public.tg_pedido_marca_descontado();

drop trigger if exists pedido_traza_venta on public.orders;
create trigger pedido_traza_venta
  after insert on public.orders
  for each row execute function public.tg_pedido_traza_venta();

drop trigger if exists pedido_cambia_estado on public.orders;
create trigger pedido_cambia_estado
  before update or delete on public.orders
  for each row execute function public.tg_pedido_cambia_estado();
