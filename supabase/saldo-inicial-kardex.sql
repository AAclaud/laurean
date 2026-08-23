-- ════════════════════════════════════════════════════════════════════════════
-- Saldo inicial: que el kardex cuadre con las existencias
--
-- APLICADO. La migracion `saldo_inicial_no_va_al_registro` mas el insert de
-- abajo (ejecutado una vez, 1.840 asientos).
--
-- EL PROBLEMA. El kardex arrancaba el 30/07/2026. De 121 productos con
-- existencias, solo 19 tenian algun movimiento: 1.588 filas de variant_stock
-- con stock que ningun movimiento explicaba. La carga inicial del inventario se
-- escribio directo sobre las existencias sin pasar por mover_inventario(), asi
-- que no dejo rastro. Entrar al kardex de un producto y ver solo los ajustes de
-- hoy no era un fallo de lectura: la historia anterior no existia.
--
-- LA SOLUCION. Un asiento de apertura por variante, fechado antes del primer
-- movimiento real (29/07), que declara con cuanto arranco. No toca ni una
-- unidad de variant_stock — solo escribe el renglon que faltaba. A partir de
-- ahi: saldo inicial + movimientos = existencias, en las 1.874 variantes.
--
-- LO QUE COSTO ACERTAR: un traslado viejo dejaba DOS movimientos, con medio
-- milisegundo de diferencia y el MISMO from/to — uno describia el saldo del
-- origen (986 → 916) y otro el del destino (0 → 70). Contarlos a los dos daba
-- el doble de lo movido y 31 saldos iniciales NEGATIVOS, que es imposible. Se
-- distinguen por el signo del delta propio de la fila (new_stock -
-- previous_stock contra ±quantity), y asi cada lado cuenta una sola vez.
-- El mismo doble registro hacia que el kardex mostrara cada traslado dos veces;
-- eso se colapsa en la vista con colapsarTrasladosDobles() en admin.html.
--
-- `quantity` NO sirve para deducir el signo: los ajustes viejos lo traian con
-- signo y hay un ajuste de +1347 cuyo delta real fue -1347.
--
-- REVERSIBLE: delete from inventory_movements where motivo = 'saldo inicial';
-- ════════════════════════════════════════════════════════════════════════════

-- ── El asiento de apertura no es actividad de nadie ─────────────────────────
-- Sin esta excepcion, declarar la apertura de 1.874 variantes metia 1.874
-- entradas iguales en el registro de actividad y sepultaba todo lo demas.
create or replace function public.tg_log_movimiento_inventario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_accion text;
  v_motivo text := coalesce(new.motivo, '');
  v_desde  text;
  v_hacia  text;
begin
  if v_motivo = 'saldo inicial' then return null; end if;

  select b.name into v_desde from public.bodegas b where b.id = new.from_bodega;
  select b.name into v_hacia from public.bodegas b where b.id = new.to_bodega;

  v_accion := case
    when v_motivo = 'venta'                                  then 'venta'
    when v_motivo in ('pedido cancelado','pedido eliminado')  then 'devolucion'
    else coalesce(nullif(new.type, ''), 'ajuste')
  end;

  perform public.anotar_actividad(
    v_accion, 'inventario', new.product_id, new.product_name,
    jsonb_strip_nulls(jsonb_build_object(
      'color',    nullif(coalesce(new.color, ''), ''),
      'talla',    nullif(coalesce(new.size,  ''), ''),
      'cantidad', new.quantity,
      'antes',    new.previous_stock,
      'despues',  new.new_stock,
      'bodega',   coalesce(v_hacia, v_desde, new.to_bodega, new.from_bodega),
      'desde',    coalesce(v_desde, new.from_bodega),
      'hacia',    coalesce(v_hacia, new.to_bodega),
      'motivo',   nullif(v_motivo, ''),
      'nota',     nullif(coalesce(new.notes, ''), '')
    )),
    new.created_by_name
  );
  return null;
end $$;

-- ── El asiento (ejecutado una vez; el `not exists` lo hace repetible) ───────
with deltas as (
  select m.product_id, b.bodega_id, coalesce(m.color,'') as color, coalesce(m.size,'') as size, b.delta
    from public.inventory_movements m
    cross join lateral (
      select * from (values
        (case when m.type = 'transferencia' and (m.new_stock - m.previous_stock) = -abs(m.quantity)
              then m.from_bodega
              when m.type = 'salida' then coalesce(m.from_bodega, m.to_bodega) end,
         case when m.type in ('transferencia','salida') then -abs(m.quantity) end),
        (case when m.type = 'transferencia' and (m.new_stock - m.previous_stock) = abs(m.quantity)
              then m.to_bodega
              when m.type in ('ingreso','ajuste') then coalesce(m.to_bodega, m.from_bodega) end,
         case when m.type = 'transferencia' then  abs(m.quantity)
              when m.type = 'ingreso'       then  abs(m.quantity)
              when m.type = 'ajuste'        then (m.new_stock - m.previous_stock) end)
      ) as t(bodega_id, delta)
    ) b
   where b.bodega_id is not null and coalesce(b.delta,0) <> 0
     and coalesce(m.motivo,'') <> 'saldo inicial'
),
explicado as (select product_id, bodega_id, color, size, sum(delta) as movido
                from deltas group by 1,2,3,4),
apertura as (
  select vs.product_id, vs.bodega_id, vs.color, vs.size,
         vs.stock - coalesce(e.movido, 0) as inicial, p.name as nombre
    from public.variant_stock vs
    left join explicado e on e.product_id=vs.product_id and e.bodega_id=vs.bodega_id
                         and e.color=vs.color and e.size=vs.size
    left join public.products p on p.id = vs.product_id
   where vs.stock - coalesce(e.movido, 0) <> 0
)
insert into public.inventory_movements
  (id, product_id, product_name, type, from_bodega, to_bodega, quantity,
   previous_stock, new_stock, color, size, motivo, notes, created_by_name, created_at)
select gen_random_uuid(), a.product_id, coalesce(a.nombre, a.product_id), 'ingreso',
       null, a.bodega_id, a.inicial, 0, a.inicial,
       nullif(a.color,''), nullif(a.size,''), 'saldo inicial',
       'Existencias con las que arranco el registro. La carga inicial del inventario no dejo movimiento.',
       'Carga inicial', timestamptz '2026-07-29 00:00:00+00'
  from apertura a
 where not exists (select 1 from public.inventory_movements m2
                    where m2.motivo = 'saldo inicial'
                      and m2.product_id = a.product_id
                      and coalesce(m2.color,'') = a.color
                      and coalesce(m2.size,'')  = a.size
                      and m2.to_bodega = a.bodega_id);

-- ── Comprobacion (dio 1874 de 1874, stock intacto en 319.787) ───────────────
-- Repetir el CTE `deltas` sin excluir 'saldo inicial' y comparar su suma contra
-- variant_stock.stock: tienen que coincidir en todas las variantes.
