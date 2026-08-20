-- ════════════════════════════════════════════════════════════════════════════
-- Una venta deja rastro, y cancelarla devuelve la mercaderia
--
-- Dos huecos, los dos comprobados contra la base:
--
--   1. descontar_variant_stock baja las existencias al insertar el pedido
--      pero NO escribe en inventory_movements. Una venta no aparecia en el
--      kardex ni en el calendario: el stock bajaba y nadie sabia por que.
--
--   2. Ese disparador es AFTER INSERT y nada mas. Cancelar un pedido (un
--      UPDATE) o borrarlo no devolvia nada: la mercaderia quedaba descontada
--      para siempre aunque la venta no se concretara.
--
-- No se toca la funcion que descuenta al insertar, que ya funciona. Se le suma
-- la traza y se cubren los otros dos casos con un estado explicito en el
-- pedido: stock_descontado dice si sus unidades estan restadas ahora mismo.
-- Sin ese estado no hay forma de saber si un cancelar → reactivar → cancelar
-- tiene que devolver una vez o tres.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.orders
  add column if not exists stock_descontado boolean not null default false;

-- Los pedidos que ya existen tienen su stock restado desde que se insertaron.
update public.orders set stock_descontado = true where stock_descontado = false;

-- ── Traza de las lineas de un pedido ────────────────────────────────────────
create or replace function public.registrar_movimiento_pedido(
  p_order  public.orders,
  p_tipo   text,      -- 'salida' al vender, 'ingreso' al devolver
  p_motivo text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  it       jsonb;
  v_bodega text;
  v_qty    int;
  v_prod   text;
  v_color  text;
  v_size   text;
  v_antes  int;
begin
  v_bodega := coalesce(p_order.bodega_id, 'bdg_central');
  for it in select * from jsonb_array_elements(coalesce(p_order.items, '[]'::jsonb))
  loop
    v_prod  := it->>'id';
    v_qty   := coalesce((it->>'qty')::int, 0);
    v_color := coalesce(it->>'color', '');
    v_size  := coalesce(it->>'size', '');
    if v_prod is null or v_qty <= 0 then continue; end if;

    select stock into v_antes from public.variant_stock
     where product_id = v_prod and bodega_id = v_bodega
       and color = v_color and size = v_size;

    insert into public.inventory_movements
      (id, product_id, product_name, type, from_bodega, to_bodega, quantity,
       previous_stock, new_stock, color, size, motivo, notes,
       created_by_name, created_at)
    values
      (gen_random_uuid()::text, v_prod, coalesce(it->>'name', v_prod), p_tipo,
       case when p_tipo = 'salida'  then v_bodega end,
       case when p_tipo = 'ingreso' then v_bodega end,
       v_qty,
       coalesce(v_antes, 0),
       coalesce(v_antes, 0) + case when p_tipo = 'salida' then -v_qty else v_qty end,
       nullif(v_color, ''), nullif(v_size, ''), p_motivo,
       'Pedido ' || coalesce(p_order.order_number, left(p_order.id::text, 8)),
       coalesce(p_order.customer_name, 'Tienda'),
       coalesce(p_order.created_at, now()));
  end loop;
exception when others then
  -- La traza nunca debe tumbar una venta.
  raise warning 'registrar_movimiento_pedido(%): %', p_order.id, sqlerrm;
end $$;

-- ── Devolver o volver a restar segun cambie el estado ───────────────────────
create or replace function public.aplicar_stock_pedido(
  p_order public.orders, p_signo int
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  it jsonb; v_bodega text; v_qty int; v_prod text; v_color text; v_size text;
begin
  v_bodega := coalesce(p_order.bodega_id, 'bdg_central');
  for it in select * from jsonb_array_elements(coalesce(p_order.items, '[]'::jsonb))
  loop
    v_prod  := it->>'id';
    v_qty   := coalesce((it->>'qty')::int, 0);
    v_color := coalesce(it->>'color', '');
    v_size  := coalesce(it->>'size', '');
    if v_prod is null or v_qty <= 0 then continue; end if;
    update public.variant_stock
       set stock = greatest(0, stock + p_signo * v_qty)
     where product_id = v_prod and bodega_id = v_bodega
       and color = v_color and size = v_size;
  end loop;
end $$;

-- ── Disparadores ────────────────────────────────────────────────────────────
-- Al insertar, el descuento ya lo hace el disparador de siempre. Aqui solo la
-- traza, que era lo que faltaba.
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

-- Un pedido cancelado no tiene por que seguir reservando mercaderia.
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

select 'listo' as estado,
       (select count(*) from public.orders where stock_descontado) as con_stock_restado;
