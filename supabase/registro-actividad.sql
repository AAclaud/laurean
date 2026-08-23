-- ════════════════════════════════════════════════════════════════════════════
-- El registro de actividad se escribe desde la base, no desde el navegador
--
-- APLICADO en dos migraciones: `registro_actividad_desde_la_base` y
-- `registro_inventario_nombres_de_bodega`. Este archivo es el estado final.
--
-- activity_log se llenaba solo con llamadas a logActivity() desde admin.html.
-- Eso deja fuera todo lo que no pasa por un clic en el panel:
--   · los 92 movimientos de inventario (mover_inventario corre en el servidor)
--   · las ventas, que descuentan stock por trigger
--   · las devoluciones al cancelar un pedido
--   · cualquier accion de una vendedora: la policy de insert exige is_admin()
--   · cualquier llamada que alguien olvide agregar
--
-- Con triggers no hay nada que recordar: si la fila se escribio, quedo anotada.
-- anotar_actividad() es SECURITY DEFINER, asi que tambien registra lo que hace
-- quien no es admin, que antes se perdia por RLS.
--
-- Al pasar a triggers se QUITARON las llamadas equivalentes del frontend, que
-- si no duplicarian cada entrada: el 'estado' de pedido en js/auth.js y las
-- cuatro de usuario en admin.html.
--
-- LO QUE FALLO EN EL RELLENO HISTORICO: el join contra profiles por nombre
-- multiplicaba filas, porque hay dos perfiles llamados «AA Projects» y «AA
-- projects». Cada movimiento quedaba anotado dos veces. Se resuelve con un
-- lateral con limit 1. Y los ids de bodega se resuelven a nombre AL MOMENTO del
-- movimiento: un registro de auditoria no puede cambiar si mañana renombran una
-- bodega.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.anotar_actividad(
  p_action      text,
  p_entity_type text,
  p_entity_id   text,
  p_entity_name text,
  p_details     jsonb default null,
  p_actor_alt   text default null      -- nombre a usar si no hay sesion (ventas de tienda)
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_id    uuid := auth.uid();
  v_name  text;
  v_email text;
begin
  if v_id is not null then
    select p.name, p.email into v_name, v_email from public.profiles p where p.id = v_id;
  end if;

  insert into public.activity_log
    (id, actor_id, actor_name, actor_email, action, entity_type, entity_id, entity_name, details, created_at)
  values
    ('log_' || replace(gen_random_uuid()::text, '-', ''), v_id,
     coalesce(v_name, nullif(btrim(coalesce(p_actor_alt, '')), ''), 'Sistema'), v_email,
     p_action, p_entity_type, p_entity_id, p_entity_name, p_details, now());
exception when others then
  -- El registro nunca debe tumbar la operacion que lo genero. Si esto se
  -- dispara, deja de anotarse: esa es la señal de que algo se rompio aqui.
  raise warning 'anotar_actividad(%/%): %', p_action, p_entity_type, sqlerrm;
end $$;

revoke all on function public.anotar_actividad(text, text, text, text, jsonb, text) from public, anon, authenticated;

-- ── Inventario ─────────────────────────────────────────────────────────────
-- inventory_movements ya es la verdad completa de lo que se movio: lo escriben
-- mover_inventario() y registrar_movimiento_pedido(). Reflejarlo aqui cubre de
-- una vez los ajustes del panel, las ventas y las devoluciones.
create or replace function public.tg_log_movimiento_inventario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_accion text;
  v_motivo text := coalesce(new.motivo, '');
  v_desde  text;
  v_hacia  text;
begin
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

drop trigger if exists log_movimiento_inventario on public.inventory_movements;
create trigger log_movimiento_inventario
  after insert on public.inventory_movements
  for each row execute function public.tg_log_movimiento_inventario();

-- ── Pedidos ────────────────────────────────────────────────────────────────
create or replace function public.tg_log_pedido()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.anotar_actividad('crear', 'pedido', new.id::text,
      coalesce(new.order_number, left(new.id::text, 8)),
      jsonb_strip_nulls(jsonb_build_object(
        'cliente', nullif(coalesce(new.customer_name, ''), ''),
        'total',   new.total_gtq,
        'origen',  coalesce(nullif(new.origin, ''), nullif(new.channel, ''), 'tienda'),
        'estado',  new.status)),
      new.customer_name);
    return null;
  end if;

  if tg_op = 'DELETE' then
    perform public.anotar_actividad('eliminar', 'pedido', old.id::text,
      coalesce(old.order_number, left(old.id::text, 8)),
      jsonb_strip_nulls(jsonb_build_object(
        'cliente', nullif(coalesce(old.customer_name, ''), ''),
        'total',   old.total_gtq)));
    return null;
  end if;

  -- UPDATE: solo interesa el cambio de estado, no cada retoque de la fila.
  if coalesce(old.status, '') is distinct from coalesce(new.status, '') then
    perform public.anotar_actividad('estado', 'pedido', new.id::text,
      coalesce(new.order_number, left(new.id::text, 8)),
      jsonb_build_object('de', old.status, 'a', new.status));
  end if;
  return null;
end $$;

drop trigger if exists log_pedido on public.orders;
create trigger log_pedido
  after insert or update or delete on public.orders
  for each row execute function public.tg_log_pedido();

-- ── Usuarios ───────────────────────────────────────────────────────────────
create or replace function public.tg_log_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_campos text[] := '{}';
begin
  if tg_op = 'INSERT' then
    perform public.anotar_actividad('crear', 'usuario', new.id::text, new.name,
      jsonb_build_object('rol', new.role, 'correo', new.email));
    return null;
  end if;

  if tg_op = 'DELETE' then
    perform public.anotar_actividad('eliminar', 'usuario', old.id::text, old.name,
      jsonb_build_object('rol', old.role));
    return null;
  end if;

  -- Activar o desactivar es la accion mas consultada: va aparte.
  if coalesce(old.active, true) is distinct from coalesce(new.active, true) then
    perform public.anotar_actividad(
      case when new.active then 'activar' else 'desactivar' end,
      'usuario', new.id::text, new.name, jsonb_build_object('rol', new.role));
  end if;

  if coalesce(old.role, '')  is distinct from coalesce(new.role, '')  then v_campos := v_campos || 'rol'; end if;
  if coalesce(old.name, '')  is distinct from coalesce(new.name, '')  then v_campos := v_campos || 'nombre'; end if;
  if coalesce(old.email, '') is distinct from coalesce(new.email, '') then v_campos := v_campos || 'correo'; end if;
  if old.allowed_views is distinct from new.allowed_views             then v_campos := v_campos || 'permisos'; end if;
  if coalesce(old.readonly, false) is distinct from coalesce(new.readonly, false) then v_campos := v_campos || 'solo lectura'; end if;
  if coalesce(old.bodega_ids, '{}') is distinct from coalesce(new.bodega_ids, '{}') then v_campos := v_campos || 'bodegas'; end if;

  if array_length(v_campos, 1) > 0 then
    perform public.anotar_actividad('editar', 'usuario', new.id::text, new.name,
      jsonb_build_object('cambio', array_to_string(v_campos, ', '), 'rol', new.role));
  end if;
  return null;
end $$;

drop trigger if exists log_perfil on public.profiles;
create trigger log_perfil
  after insert or update or delete on public.profiles
  for each row execute function public.tg_log_perfil();

-- ── Cobro mensual ──────────────────────────────────────────────────────────
-- El alta de un periodo la hace asegurar_cobros() sola cada mes: eso es ruido
-- del sistema, no actividad de nadie. Solo se anota lo que alguien decide.
create or replace function public.tg_log_cobro()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.marcado_en is null and new.marcado_en is not null then
    perform public.anotar_actividad('pago', 'cobro', new.periodo, 'Cobro de ' || new.periodo,
      jsonb_strip_nulls(jsonb_build_object('referencia', new.marcado_nota, 'monto', new.monto)));
  end if;
  if old.confirmado_en is null and new.confirmado_en is not null then
    perform public.anotar_actividad('confirmar', 'cobro', new.periodo, 'Cobro de ' || new.periodo,
      jsonb_strip_nulls(jsonb_build_object('nota', new.confirmado_nota, 'monto', new.monto)));
  end if;
  if old.confirmado_en is not null and new.confirmado_en is null then
    perform public.anotar_actividad('reabrir', 'cobro', new.periodo, 'Cobro de ' || new.periodo, null);
  end if;
  if coalesce(old.monto, -1) is distinct from coalesce(new.monto, -1)
     and old.marcado_en is not distinct from new.marcado_en then
    perform public.anotar_actividad('editar', 'cobro', new.periodo, 'Cobro de ' || new.periodo,
      jsonb_build_object('monto', new.monto, 'antes', old.monto));
  end if;
  return null;
end $$;

drop trigger if exists log_cobro on public.cobros_mensuales;
create trigger log_cobro
  after update on public.cobros_mensuales
  for each row execute function public.tg_log_cobro();

-- ── Relleno historico (ya ejecutado) ───────────────────────────────────────
-- Los 92 movimientos que estaban en el kardex pero nunca llegaron al registro.
-- Conserva la fecha original. El lateral con limit 1 evita duplicar cuando dos
-- perfiles comparten nombre.
--
-- insert into public.activity_log
--   (id, actor_id, actor_name, actor_email, action, entity_type, entity_id, entity_name, details, created_at)
-- select 'log_' || replace(gen_random_uuid()::text,'-',''), a.id,
--        coalesce(a.name, nullif(btrim(coalesce(m.created_by_name,'')),''), 'Sistema'), a.email,
--        case when coalesce(m.motivo,'')='venta' then 'venta'
--             when coalesce(m.motivo,'') in ('pedido cancelado','pedido eliminado') then 'devolucion'
--             else coalesce(nullif(m.type,''),'ajuste') end,
--        'inventario', m.product_id, m.product_name,
--        jsonb_strip_nulls(jsonb_build_object(
--          'color', nullif(coalesce(m.color,''),''), 'talla', nullif(coalesce(m.size,''),''),
--          'cantidad', m.quantity, 'antes', m.previous_stock, 'despues', m.new_stock,
--          'bodega', coalesce(bh.name, bd.name, m.to_bodega, m.from_bodega),
--          'desde', coalesce(bd.name, m.from_bodega), 'hacia', coalesce(bh.name, m.to_bodega),
--          'motivo', nullif(coalesce(m.motivo,''),''), 'nota', nullif(coalesce(m.notes,''),''),
--          'historico', true)),
--        m.created_at
--   from public.inventory_movements m
--   left join public.bodegas bd on bd.id = m.from_bodega
--   left join public.bodegas bh on bh.id = m.to_bodega
--   left join lateral (select p.id, p.name, p.email from public.profiles p
--                       where lower(btrim(p.name)) = lower(btrim(coalesce(m.created_by_name,'')))
--                       order by (p.role='superuser') desc, p.created_at limit 1) a on true;
