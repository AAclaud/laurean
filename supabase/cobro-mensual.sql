-- ════════════════════════════════════════════════════════════════════════════
-- Cobro mensual de la plataforma
--
-- APLICADO en dos migraciones: `cobro_mensual_plataforma` y
-- `cobro_mensual_genera_periodos`. Este archivo es el estado final.
--
-- El ciclo va del 25 de un mes al 5 del siguiente (la fecha de pago es el 30,
-- pero ese rango es el que tienen para efectuarlo). Un periodo se identifica por
-- el mes en que ABRE: '2026-08' abre el 2026-08-25 y vence el 2026-09-05.
--
-- Dos manos distintas tocan cada periodo:
--   · el cliente marca «pago realizado»  → marcado_en    (rol admin)
--   · el equipo verifica y lo apaga      → confirmado_en (solo superuser)
-- Mientras no este confirmado, el periodo sigue vivo. Pasado el 5 sin marcar, se
-- cuentan los dias de atraso y la pantalla aparece al iniciar sesion.
--
-- La tabla queda cerrada (RLS sin policies): todo entra por las RPC, que son las
-- que separan lo que puede hacer un admin de lo que solo puede el superusuario.
--
-- LO QUE FALLABA AL PRINCIPIO: estado_cobro() e historial_cobros() estaban
-- declaradas STABLE, y una funcion STABLE no puede escribir. asegurar_cobros()
-- nunca habria creado los periodos de septiembre en adelante: el unico ciclo que
-- habria existido es el sembrado a mano, y el sistema se habria quedado callado
-- para siempre despues del primer mes. Son VOLATILE.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.cobros_mensuales (
  periodo            text primary key,          -- 'YYYY-MM' del mes en que abre
  abre_el            date        not null,      -- dia 25 de ese mes
  vence_el           date        not null,      -- dia 5 del mes siguiente
  monto              numeric(12,2),
  moneda             text        not null default 'Q',
  marcado_en         timestamptz,
  marcado_por        uuid,
  marcado_nombre     text,
  marcado_nota       text,
  confirmado_en      timestamptz,
  confirmado_por     uuid,
  confirmado_nombre  text,
  confirmado_nota    text,
  created_at         timestamptz not null default now()
);

alter table public.cobros_mensuales enable row level security;
revoke all on public.cobros_mensuales from anon, authenticated;

-- ── Quien es quien ──────────────────────────────────────────────────────────
-- is_admin() ya existia y cubre admin + superuser. Falta distinguir al super,
-- que es el unico que puede apagar la notificacion.
create or replace function public.es_superuser()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(
    select 1 from public.profiles
     where id = auth.uid() and role = 'superuser' and active = true
  );
$$;

-- ── Fechas del ciclo ────────────────────────────────────────────────────────
-- El dia 25 marca el corte: antes del 25 el ciclo vigente sigue siendo el del
-- mes anterior, porque ese es el que todavia no ha vencido (o ya se paso).
create or replace function public.abre_del_periodo(p_periodo text)
returns date language sql immutable as $$
  select to_date(p_periodo || '-25', 'YYYY-MM-DD');
$$;

create or replace function public.vence_del_periodo(p_periodo text)
returns date language sql immutable as $$
  select (date_trunc('month', to_date(p_periodo || '-01', 'YYYY-MM-DD'))
          + interval '1 month' + interval '4 days')::date;
$$;

create or replace function public.periodo_cobro(p_fecha date default current_date)
returns text language sql immutable as $$
  select to_char(
    case when extract(day from p_fecha) >= 25
         then date_trunc('month', p_fecha)
         else date_trunc('month', p_fecha) - interval '1 month'
    end, 'YYYY-MM');
$$;

-- ── Que existan los periodos que ya abrieron ────────────────────────────────
-- Si nadie entra al panel durante meses, las filas intermedias no existirian y
-- un atraso largo se veria como si no hubiera pasado nada. El ancla es la fila
-- mas vieja de la tabla, sembrada al final de este archivo.
create or replace function public.asegurar_cobros()
returns void language plpgsql security definer set search_path = public
as $$
declare
  d       date;
  d_final date := public.abre_del_periodo(public.periodo_cobro());
begin
  select min(abre_el) into d from public.cobros_mensuales;
  if d is null then return; end if;
  while d <= d_final loop
    insert into public.cobros_mensuales (periodo, abre_el, vence_el)
    values (to_char(d, 'YYYY-MM'), d,
            (date_trunc('month', d) + interval '1 month' + interval '4 days')::date)
    on conflict (periodo) do nothing;
    d := (date_trunc('month', d) + interval '1 month' + interval '24 days')::date;
  end loop;
end $$;

-- ── Lo que ve el panel ──────────────────────────────────────────────────────
-- Devuelve el periodo abierto MAS VIEJO sin confirmar: si agosto quedo sin pagar
-- y ya abrio septiembre, el que manda es agosto con sus dias de atraso.
create or replace function public.estado_cobro()
returns jsonb language plpgsql volatile security definer set search_path = public
as $$
declare
  r        public.cobros_mensuales%rowtype;
  v_dias   int;
  v_estado text;
  v_pend   int;
begin
  if not public.is_admin() then
    return jsonb_build_object('visible', false, 'estado', 'sin_permiso');
  end if;

  perform public.asegurar_cobros();

  select count(*) into v_pend from public.cobros_mensuales
   where confirmado_en is null and abre_el <= current_date;

  select * into r from public.cobros_mensuales
   where confirmado_en is null and abre_el <= current_date
   order by abre_el limit 1;

  if r.periodo is null then
    return jsonb_build_object('visible', false, 'estado', 'al_dia',
                              'pendientes', 0, 'es_super', public.es_superuser());
  end if;

  v_dias   := current_date - r.vence_el;      -- positivo = dias de atraso
  v_estado := case
                when r.marcado_en is not null then 'por_verificar'
                when v_dias > 0               then 'vencido'
                else 'en_ventana'
              end;

  return jsonb_build_object(
    'visible',          true,
    'estado',           v_estado,
    'periodo',          r.periodo,
    'abre_el',          r.abre_el,
    'vence_el',         r.vence_el,
    'dias_atraso',      greatest(v_dias, 0),
    'dias_para_vencer', greatest(r.vence_el - current_date, 0),
    'monto',            r.monto,
    'moneda',           r.moneda,
    'marcado_en',       r.marcado_en,
    'marcado_nombre',   r.marcado_nombre,
    'marcado_nota',     r.marcado_nota,
    'pendientes',       v_pend,
    'es_super',         public.es_superuser()
  );
end $$;

-- ── El cliente marca que ya pago ────────────────────────────────────────────
create or replace function public.marcar_pago_cobro(p_periodo text, p_nota text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_nombre text;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede marcar el pago';
  end if;
  select name into v_nombre from public.profiles where id = auth.uid();

  update public.cobros_mensuales
     set marcado_en     = now(),
         marcado_por    = auth.uid(),
         marcado_nombre = coalesce(v_nombre, 'Administrador'),
         marcado_nota   = nullif(btrim(coalesce(p_nota, '')), '')
   where periodo = p_periodo
     and confirmado_en is null;

  if not found then
    raise exception 'Ese periodo no existe o ya fue confirmado';
  end if;
  return public.estado_cobro();
end $$;

-- ── El equipo verifica y apaga la notificacion ──────────────────────────────
create or replace function public.confirmar_cobro(p_periodo text, p_nota text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_nombre text;
begin
  if not public.es_superuser() then
    raise exception 'Solo el superusuario puede confirmar un pago';
  end if;
  select name into v_nombre from public.profiles where id = auth.uid();

  update public.cobros_mensuales
     set confirmado_en     = now(),
         confirmado_por    = auth.uid(),
         confirmado_nombre = coalesce(v_nombre, 'Superusuario'),
         confirmado_nota   = nullif(btrim(coalesce(p_nota, '')), '')
   where periodo = p_periodo;

  if not found then raise exception 'Ese periodo no existe'; end if;
  return public.estado_cobro();
end $$;

-- Deshacer: vuelve a encender la notificacion de ese periodo.
create or replace function public.reabrir_cobro(p_periodo text, p_borrar_marca boolean default false)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if not public.es_superuser() then
    raise exception 'Solo el superusuario puede reabrir un cobro';
  end if;
  update public.cobros_mensuales
     set confirmado_en     = null,
         confirmado_por    = null,
         confirmado_nombre = null,
         confirmado_nota   = null,
         marcado_en     = case when p_borrar_marca then null else marcado_en     end,
         marcado_por    = case when p_borrar_marca then null else marcado_por    end,
         marcado_nombre = case when p_borrar_marca then null else marcado_nombre end,
         marcado_nota   = case when p_borrar_marca then null else marcado_nota   end
   where periodo = p_periodo;

  if not found then raise exception 'Ese periodo no existe'; end if;
  return public.estado_cobro();
end $$;

create or replace function public.fijar_monto_cobro(p_periodo text, p_monto numeric, p_moneda text default 'Q')
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if not public.es_superuser() then
    raise exception 'Solo el superusuario puede fijar el monto';
  end if;
  update public.cobros_mensuales
     set monto  = p_monto,
         moneda = coalesce(nullif(btrim(p_moneda), ''), 'Q')
   where periodo = p_periodo;
  if not found then raise exception 'Ese periodo no existe'; end if;
  return public.estado_cobro();
end $$;

-- ── Historial para el panel del superusuario ────────────────────────────────
create or replace function public.historial_cobros(p_limite int default 12)
returns jsonb language plpgsql volatile security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Sin permiso'; end if;
  perform public.asegurar_cobros();
  return coalesce((
    select jsonb_agg(to_jsonb(t) order by t.abre_el desc)
      from (select * from public.cobros_mensuales
             order by abre_el desc limit greatest(p_limite, 1)) t
  ), '[]'::jsonb);
end $$;

revoke all on function public.es_superuser()                         from public, anon;
revoke all on function public.asegurar_cobros()                      from public, anon;
revoke all on function public.estado_cobro()                         from public, anon;
revoke all on function public.marcar_pago_cobro(text, text)          from public, anon;
revoke all on function public.confirmar_cobro(text, text)            from public, anon;
revoke all on function public.reabrir_cobro(text, boolean)           from public, anon;
revoke all on function public.fijar_monto_cobro(text, numeric, text) from public, anon;
revoke all on function public.historial_cobros(int)                  from public, anon;

grant execute on function public.es_superuser()                         to authenticated;
grant execute on function public.estado_cobro()                         to authenticated;
grant execute on function public.marcar_pago_cobro(text, text)          to authenticated;
grant execute on function public.confirmar_cobro(text, text)            to authenticated;
grant execute on function public.reabrir_cobro(text, boolean)           to authenticated;
grant execute on function public.fijar_monto_cobro(text, numeric, text) to authenticated;
grant execute on function public.historial_cobros(int)                  to authenticated;

-- ── Ancla: el primer ciclo es el que abre el 25 de agosto de 2026 ───────────
insert into public.cobros_mensuales (periodo, abre_el, vence_el)
values ('2026-08', date '2026-08-25', date '2026-09-05')
on conflict (periodo) do nothing;
