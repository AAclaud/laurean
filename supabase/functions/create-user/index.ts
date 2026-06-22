// ============================================================
// LAUREAN — Edge Function: create-user
//
// Crea un usuario en auth.users + su fila en public.profiles usando
// service_role, SIN exponer la service key al frontend.
//
// - Verifica que QUIEN llama sea admin/superuser (JWT del header).
// - Recibe { name, email, password, role, phone?, code?, bodega_ids?,
//   can_login_pos? }.
// - Acciones soportadas vía { action }: 'create' (default), 'update',
//   'deactivate', 'reset_password', 'delete'.
//
// ENV (ya disponibles en Edge Functions de Supabase):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, json } from '../_shared/cors.ts';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON    = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const VALID_ROLES = ['superuser', 'admin', 'vendedor', 'bodega', 'agente_pedidos'];
const MIN_PASSWORD_LENGTH = 8;

async function verifyAdmin(req: Request): Promise<{ ok: boolean; role?: string; error?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { ok: false, error: 'missing_token' };
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { ok: false, error: 'invalid_token' };
  const { data: profile, error: profErr } = await supabase
    .from('profiles').select('role, active').eq('id', userData.user.id).single();
  if (profErr || !profile) return { ok: false, error: 'no_profile' };
  if (!profile.active) return { ok: false, error: 'inactive' };
  if (!['admin', 'superuser'].includes(profile.role)) return { ok: false, error: 'forbidden_role' };
  return { ok: true, role: profile.role };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')    return json({ error: 'method_not_allowed' }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: 'service_not_configured' }, 500);

  const auth = await verifyAdmin(req);
  if (!auth.ok) return json({ error: 'forbidden', detail: auth.error }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }

  const action = body.action ?? 'create';
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Solo superuser puede crear/editar otros admin/superuser
  function roleGuard(targetRole?: string) {
    if (targetRole && ['admin', 'superuser'].includes(targetRole) && auth.role !== 'superuser') {
      return 'Solo un superuser puede gestionar admins.';
    }
    return null;
  }

  async function loadTargetProfile(id: string): Promise<{
    ok: boolean;
    error?: string;
    profile?: { role: string; email: string };
  }> {
    const { data, error } = await admin
      .from('profiles')
      .select('role, email')
      .eq('id', id)
      .maybeSingle();
    if (error) return { ok: false, error: 'target_lookup_failed' };
    if (!data) return { ok: false, error: 'target_not_found' };
    return { ok: true, profile: data as { role: string; email: string } };
  }

  function targetGuard(targetRole?: string) {
    if (targetRole && ['admin', 'superuser'].includes(targetRole) && auth.role !== 'superuser') {
      return 'Solo un superuser puede gestionar admins.';
    }
    return null;
  }

  try {
    if (action === 'create') {
      const { name, email, password, role, phone, code, bodega_ids, can_login_pos, commission_rate, birthday,
        dpi, bank_name, bank_account, bank_account_type, account_holder } = body;
      if (!email || !password || !role) return json({ error: 'missing_fields' }, 400);
      if (!VALID_ROLES.includes(role))   return json({ error: 'invalid_role' }, 400);
      if (String(password).length < MIN_PASSWORD_LENGTH) return json({ error: 'weak_password' }, 400);
      const guard = roleGuard(role);
      if (guard) return json({ error: 'forbidden', detail: guard }, 403);

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { name },
      });
      if (cErr || !created.user) {
        console.error('[create-user] create_failed:', cErr?.message);
        // Mensaje accionable sin filtrar internals: el caso común es email duplicado.
        return json({ error: 'create_failed', detail: 'No se pudo crear el usuario (¿el correo ya existe?).' }, 400);
      }

      const { error: pErr } = await admin.from('profiles').insert({
        id: created.user.id,
        email, name: name || email, role,
        phone: phone || null, code: code || null,
        bodega_ids: bodega_ids || [],
        can_login_pos: can_login_pos !== false,
        commission_rate: commission_rate ?? null,
        birthday: birthday || null,
        dpi: dpi || null, bank_name: bank_name || null, bank_account: bank_account || null,
        bank_account_type: bank_account_type || null, account_holder: account_holder || null,
        active: true,
      });
      if (pErr) {
        // rollback del auth user para no dejar huérfanos
        await admin.auth.admin.deleteUser(created.user.id);
        console.error('[create-user] profile_failed:', pErr.message);
        return json({ error: 'profile_failed' }, 400);
      }
      return json({ ok: true, id: created.user.id });
    }

    const { id } = body;
    if (!id) return json({ error: 'missing_id' }, 400);

    if (action === 'update') {
      const target = await loadTargetProfile(id);
      if (!target.ok) return json({ error: target.error }, target.error === 'target_not_found' ? 404 : 400);
      const targetBlock = targetGuard(target.profile?.role);
      if (targetBlock) return json({ error: 'forbidden', detail: targetBlock }, 403);

      const fields: Record<string, unknown> = {};
      ['name', 'phone', 'code', 'role', 'bodega_ids', 'commission_rate', 'birthday',
       'dpi', 'bank_name', 'bank_account', 'bank_account_type', 'account_holder', 'gift'].forEach((k) => {
        if (body[k] !== undefined) fields[k] = body[k];
      });
      if (body.can_login_pos !== undefined) fields.can_login_pos = body.can_login_pos;
      if (fields.role && !VALID_ROLES.includes(fields.role as string)) return json({ error: 'invalid_role' }, 400);
      const guard = roleGuard(fields.role as string);
      if (guard) return json({ error: 'forbidden', detail: guard }, 403);
      if (body.password) {
        if (String(body.password).length < MIN_PASSWORD_LENGTH) return json({ error: 'weak_password' }, 400);
        await admin.auth.admin.updateUserById(id, { password: body.password });
      }
      if (body.email) await admin.auth.admin.updateUserById(id, { email: body.email });
      if (body.email) fields.email = body.email;
      if (Object.keys(fields).length) {
        const { error } = await admin.from('profiles').update(fields).eq('id', id);
        if (error) { console.error('[create-user] update_failed:', error.message); return json({ error: 'update_failed' }, 400); }
      }
      return json({ ok: true });
    }

    if (action === 'deactivate') {
      const target = await loadTargetProfile(id);
      if (!target.ok) return json({ error: target.error }, target.error === 'target_not_found' ? 404 : 400);
      const targetBlock = targetGuard(target.profile?.role);
      if (targetBlock) return json({ error: 'forbidden', detail: targetBlock }, 403);

      const { error } = await admin.from('profiles').update({ active: body.active !== false ? false : true }).eq('id', id);
      if (error) { console.error('[create-user] deactivate_failed:', error.message); return json({ error: 'deactivate_failed' }, 400); }
      return json({ ok: true });
    }

    if (action === 'reset_password') {
      const target = await loadTargetProfile(id);
      if (!target.ok) return json({ error: target.error }, target.error === 'target_not_found' ? 404 : 400);
      const targetBlock = targetGuard(target.profile?.role);
      if (targetBlock) return json({ error: 'forbidden', detail: targetBlock }, 403);

      if (!body.password || String(body.password).length < MIN_PASSWORD_LENGTH) return json({ error: 'weak_password' }, 400);
      const { error } = await admin.auth.admin.updateUserById(id, { password: body.password });
      if (error) { console.error('[create-user] reset_failed:', error.message); return json({ error: 'reset_failed' }, 400); }
      return json({ ok: true });
    }

    if (action === 'delete') {
      if (auth.role !== 'superuser') return json({ error: 'forbidden', detail: 'Solo superuser puede eliminar.' }, 403);
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) { console.error('[create-user] delete_failed:', error.message); return json({ error: 'delete_failed' }, 400); }
      return json({ ok: true });
    }

    return json({ error: 'unknown_action', action }, 400);
  } catch (e) {
    console.error('[create-user] unexpected:', e);
    return json({ error: 'unexpected' }, 500);
  }
});
