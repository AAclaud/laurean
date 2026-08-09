-- ════════════════════════════════════════════════════════════════════════════
-- MOVIMIENTOS DE INVENTARIO POR VARIANTE — motor único y atómico
--
-- Problema que resuelve: el inventario vivía en DOS lugares que se movían por
-- separado — `inventory_stock` (total por COD y bodega, lo que muestra el
-- admin) y `variant_stock` (color × talla, lo que vende el POS y la tienda).
-- Un traslado tocaba a veces uno, a veces el otro, y nunca los dos a la vez:
--   · productos sin color/talla → solo se movía el total, el POS no veía nada
--   · productos sin `source_cod` → no se escribía nada en la base
--   · los ingresos nunca alimentaban `variant_stock`
--   · las escrituras eran valores absolutos calculados en el navegador, así
--     que dos equipos trabajando a la vez se pisaban el uno al otro
--
-- A partir de aquí:
--   1. `variant_stock` es la ÚNICA fuente de verdad de existencias.
--   2. `inventory_stock` se recalcula solo, con un trigger, como la suma de
--      las variantes. Nunca más pueden desfasarse.
--   3. Todo movimiento pasa por `mover_inventario()`: valida, aplica deltas
--      (no valores absolutos), deja traza y devuelve error real si falla.
--
-- Ejecutar en el SQL editor de Supabase. Es idempotente.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Tabla de existencias por variante ────────────────────────────────────
-- (ya existe en producción; se documenta aquí para que el esquema sea completo)
create table if not exists public.variant_stock (
  product_id text not null references public.products(id) on delete cascade,
  bodega_id  text not null references public.bodegas(id)  on delete cascade,
  color      text not null default '',
  size       text not null default '',
  stock      int  not null default 0,
  updated_at timestamptz default now(),
  primary key (product_id, bodega_id, color, size)
);
create index if not exists idx_variant_stock_product on public.variant_stock(product_id);
create index if not exists idx_variant_stock_bodega  on public.variant_stock(bodega_id);

alter table public.variant_stock enable row level security;
do $$ begin
  drop policy if exists "variant_stock_read_public" on public.variant_stock;
  drop policy if exists "variant_stock_write_staff" on public.variant_stock;
  -- la tienda pública necesita leer para saber qué tallas ofrecer
  create policy "variant_stock_read_public" on public.variant_stock for select using (true);
  create policy "variant_stock_write_staff" on public.variant_stock for all
    using (public.is_admin() or public."current_role"() = 'bodega')
    with check (public.is_admin() or public."current_role"() = 'bodega');
end $$;

drop trigger if exists set_updated_at on public.variant_stock;
create trigger set_updated_at before update on public.variant_stock
  for each row execute function public.tg_set_updated_at();

-- Detalle del movimiento para el kardex: qué variante y, en los ingresos, a qué
-- costo entró y si ya se le pagó al proveedor (antes solo vivía en el navegador).
alter table public.inventory_movements add column if not exists color     text;
alter table public.inventory_movements add column if not exists size      text;
alter table public.inventory_movements add column if not exists unit_cost numeric;
alter table public.inventory_movements add column if not exists paid      boolean default false;

-- ── 2. El total por bodega se DERIVA de las variantes ───────────────────────
create or replace function public.refrescar_stock_agregado(p_product_id text, p_bodega_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cod   text;
  v_total int;
begin
  select source_cod into v_cod from public.products where id = p_product_id;
  -- Los productos creados a mano en el admin no tienen COD; su total vive solo
  -- en variant_stock y el frontend lo suma desde ahí.
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
  -- Que un problema al reflejar el total nunca tumbe un movimiento válido.
  raise warning 'refrescar_stock_agregado(%, %): %', p_product_id, p_bodega_id, sqlerrm;
end $$;

create or replace function public.tg_variant_stock_agregado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refrescar_stock_agregado(old.product_id, old.bodega_id);
    return old;
  end if;
  perform public.refrescar_stock_agregado(new.product_id, new.bodega_id);
  if tg_op = 'UPDATE' and (old.product_id, old.bodega_id) is distinct from (new.product_id, new.bodega_id) then
    perform public.refrescar_stock_agregado(old.product_id, old.bodega_id);
  end if;
  return new;
end $$;

-- ── 3. Motor de movimientos: atómico, por deltas, con permisos propios ──────
-- p_lineas: [{ "color": "Negro", "size": "M", "qty": 10 }, …]
--   ingreso  → suma qty en p_destino
--   salida   → resta qty de p_origen (valida disponibilidad)
--   traslado → resta de p_origen y suma en p_destino (valida disponibilidad)
--   ajuste   → deja la variante EN qty (conteo físico) en p_destino
create or replace function public.mover_inventario(
  p_tipo         text,
  p_product_id   text,
  p_product_name text,
  p_origen       text,
  p_destino      text,
  p_lineas       jsonb,
  p_motivo       text    default null,
  p_notas        text    default null,
  p_proveedor    text    default null,
  p_costo_unit   numeric default null,
  p_pagado       boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ln        jsonb;
  v_color   text;
  v_size    text;
  v_qty     int;
  v_antes   int;
  v_despues int;
  v_cod     text;
  v_nombre  text;
  v_quien   text;
  v_movido  int := 0;
  v_detalle jsonb := '[]'::jsonb;
begin
  if not (public.is_admin() or public."current_role"() = 'bodega') then
    raise exception 'No tienes permiso para mover inventario.';
  end if;
  if p_tipo not in ('ingreso', 'salida', 'ajuste', 'traslado') then
    raise exception 'Tipo de movimiento inválido: %', p_tipo;
  end if;
  if jsonb_typeof(p_lineas) <> 'array' or jsonb_array_length(p_lineas) = 0 then
    raise exception 'No indicaste qué tallas y colores mover.';
  end if;

  if p_tipo = 'traslado' then
    if p_origen is null or p_destino is null then
      raise exception 'Un traslado necesita bodega origen y bodega destino.';
    end if;
    if p_origen = p_destino then
      raise exception 'La bodega destino debe ser distinta de la bodega origen.';
    end if;
  elsif p_tipo in ('ingreso', 'ajuste') then
    if p_destino is null then raise exception 'Falta la bodega.'; end if;
  else
    if p_origen is null then raise exception 'Falta la bodega.'; end if;
  end if;

  select source_cod, name into v_cod, v_nombre
    from public.products where id = p_product_id;
  v_nombre := coalesce(nullif(p_product_name, ''), v_nombre, p_product_id);

  select coalesce(nullif(name, ''), email) into v_quien
    from public.profiles where id = auth.uid();

  for ln in select * from jsonb_array_elements(p_lineas)
  loop
    v_color := coalesce(ln->>'color', '');
    v_size  := coalesce(ln->>'size',  '');
    v_qty   := coalesce((ln->>'qty')::int, 0);

    if p_tipo = 'ajuste' then
      if v_qty < 0 then raise exception 'El conteo no puede ser negativo.'; end if;
    elsif v_qty <= 0 then
      continue;   -- líneas en blanco de la cuadrícula
    end if;

    -- ── salida del origen (salida y traslado) ──
    if p_tipo in ('salida', 'traslado') then
      select stock into v_antes
        from public.variant_stock
       where product_id = p_product_id and bodega_id = p_origen
         and color = v_color and size = v_size
       for update;

      if v_antes is null or v_antes < v_qty then
        raise exception 'No hay suficiente "%" (%) en la bodega origen: hay %, pediste %.',
          v_nombre,
          coalesce(nullif(concat_ws(' · ', nullif(v_color, ''), nullif(v_size, '')), ''), 'talla única'),
          coalesce(v_antes, 0), v_qty;
      end if;

      update public.variant_stock
         set stock = stock - v_qty, updated_at = now()
       where product_id = p_product_id and bodega_id = p_origen
         and color = v_color and size = v_size
      returning stock into v_despues;

      insert into public.inventory_movements
        (cod, product_id, product_name, type, from_bodega, to_bodega, quantity,
         previous_stock, new_stock, color, size, motivo, notes, created_by, created_by_name)
      values
        (v_cod, p_product_id, v_nombre,
         case when p_tipo = 'traslado' then 'transferencia' else 'salida' end,
         p_origen, case when p_tipo = 'traslado' then p_destino else null end, v_qty,
         v_antes, v_despues, nullif(v_color,''), nullif(v_size,''),
         coalesce(p_motivo, p_tipo), p_notas, auth.uid(), v_quien);
    end if;

    -- ── entrada al destino (ingreso, traslado y ajuste) ──
    if p_tipo in ('ingreso', 'traslado', 'ajuste') then
      select stock into v_antes
        from public.variant_stock
       where product_id = p_product_id and bodega_id = p_destino
         and color = v_color and size = v_size
       for update;
      v_antes := coalesce(v_antes, 0);

      insert into public.variant_stock (product_id, bodega_id, color, size, stock)
           values (p_product_id, p_destino, v_color, v_size, v_qty)
      on conflict (product_id, bodega_id, color, size)
      do update set stock = case when p_tipo = 'ajuste'
                                 then excluded.stock                          -- conteo físico
                                 else public.variant_stock.stock + excluded.stock
                            end,
                    updated_at = now()
      returning stock into v_despues;

      -- En un traslado la salida ya dejó su traza; no se duplica el movimiento.
      if p_tipo <> 'traslado' then
        insert into public.inventory_movements
          (cod, product_id, product_name, type, from_bodega, to_bodega, quantity,
           previous_stock, new_stock, color, size, motivo, notes, unit_cost, paid,
           created_by, created_by_name)
        values
          (v_cod, p_product_id, v_nombre,
           case when p_tipo = 'ajuste' then 'ajuste' else 'ingreso' end,
           null, p_destino,
           case when p_tipo = 'ajuste' then v_despues - v_antes else v_qty end,
           v_antes, v_despues, nullif(v_color,''), nullif(v_size,''),
           coalesce(p_motivo, p_tipo),
           nullif(concat_ws(' · ', nullif(p_notas, ''), nullif(p_proveedor, '')), ''),
           p_costo_unit, coalesce(p_pagado, false),
           auth.uid(), v_quien);
      end if;
    end if;

    v_movido  := v_movido + 1;
    v_detalle := v_detalle || jsonb_build_object(
      'color', v_color, 'size', v_size, 'qty', v_qty, 'nuevo', v_despues);
  end loop;

  if v_movido = 0 then
    raise exception 'No indicaste cantidades que mover.';
  end if;

  if p_origen  is not null then perform public.refrescar_stock_agregado(p_product_id, p_origen);  end if;
  if p_destino is not null then perform public.refrescar_stock_agregado(p_product_id, p_destino); end if;

  return jsonb_build_object('ok', true, 'lineas', v_movido, 'detalle', v_detalle);
end $$;

revoke all     on function public.mover_inventario(text,text,text,text,text,jsonb,text,text,text,numeric,boolean) from public, anon;
grant  execute on function public.mover_inventario(text,text,text,text,text,jsonb,text,text,text,numeric,boolean) to authenticated;

-- ── 4. Reparación de datos: cuadrar las variantes con el total contado ──────
-- Se corre ANTES de instalar el trigger, para que el total no se recalcule a
-- medio camino. Regla: donde hay total contado (`inventory_stock`), ese manda
-- y las variantes se reparten para sumarlo. Donde no lo hay (productos sin
-- COD), las variantes ya son la verdad y no se tocan.
do $$
declare
  r      record;
  ln     record;
  v_base int;
  v_i    int;
  v_dif  int;
begin
  for r in
    select p.id as product_id,
           s.bodega_id,
           s.stock as total,
           (select coalesce(sum(v.stock), 0) from public.variant_stock v
             where v.product_id = p.id and v.bodega_id = s.bodega_id) as actual,
           (select count(*) from public.variant_stock v
             where v.product_id = p.id and v.bodega_id = s.bodega_id) as filas
      from public.inventory_stock s
      join public.products p on p.source_cod = s.cod
     where s.stock > 0
  loop
    if r.actual = r.total then continue; end if;

    -- La bodega no tenía ninguna variante de este producto (traslado que solo
    -- movió el total): se crea la fila genérica con todo lo que hay ahí.
    if r.filas = 0 then
      insert into public.variant_stock (product_id, bodega_id, color, size, stock)
           values (r.product_id, r.bodega_id, '', '', r.total)
      on conflict (product_id, bodega_id, color, size) do update set stock = excluded.stock;
      continue;
    end if;

    if r.actual = 0 then
      -- Colores sin tallas: nunca se les repartió nada. Reparto en partes iguales.
      v_base := r.total / r.filas;
      v_i    := 0;
      for ln in select color, size from public.variant_stock
                 where product_id = r.product_id and bodega_id = r.bodega_id
                 order by color, size
      loop
        v_i := v_i + 1;
        update public.variant_stock
           set stock = v_base + case when v_i <= (r.total % r.filas) then 1 else 0 end
         where product_id = r.product_id and bodega_id = r.bodega_id
           and color = ln.color and size = ln.size;
      end loop;
    else
      -- Desfase por movimientos que solo tocaron un lado: escalar proporcional.
      update public.variant_stock
         set stock = floor(stock::numeric * r.total / r.actual)::int
       where product_id = r.product_id and bodega_id = r.bodega_id;

      select r.total - coalesce(sum(stock), 0) into v_dif
        from public.variant_stock
       where product_id = r.product_id and bodega_id = r.bodega_id;

      if v_dif <> 0 then
        update public.variant_stock
           set stock = greatest(0, stock + v_dif)
         where (product_id, bodega_id, color, size) = (
           select v.product_id, v.bodega_id, v.color, v.size
             from public.variant_stock v
            where v.product_id = r.product_id and v.bodega_id = r.bodega_id
            order by v.stock desc, v.color, v.size
            limit 1);
      end if;
    end if;
  end loop;
end $$;

-- ── 4b. Realtime: que un traslado llegue al instante a los demás equipos ────
-- Sin esto el cambio solo se veía en el otro equipo al refrescar la pestaña o
-- al pasar el intervalo de resguardo (60s).
do $$ begin
  begin alter publication supabase_realtime add table public.variant_stock;
  exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.inventory_movements;
  exception when duplicate_object then null; end;
end $$;

-- ── 5. Ya cuadrados: el trigger mantiene el total derivado para siempre ─────
drop trigger if exists agregado_desde_variantes on public.variant_stock;
create trigger agregado_desde_variantes
  after insert or update or delete on public.variant_stock
  for each row execute function public.tg_variant_stock_agregado();

-- Y una pasada final para que ningún total quede huérfano.
do $$
declare r record;
begin
  for r in select distinct product_id, bodega_id from public.variant_stock
  loop
    perform public.refrescar_stock_agregado(r.product_id, r.bodega_id);
  end loop;
end $$;
