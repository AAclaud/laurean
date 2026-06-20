// ============================================================
// LAUREAN — Edge Function: create-user  (versión AUTOCONTENIDA)
//
// Pégala TAL CUAL en: Supabase → Edge Functions → "Deploy a new function"
// Nombre de la función: create-user
//
// No necesita el archivo _shared/cors.ts (el CORS va incluido aquí).
// Las variables SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
// ya las inyecta Supabase automáticamente.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const ALLOW_ORIGIN = Deno.env.get('FRONTEND_ORIGIN') || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin':  ALLOW_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age':       '86400',
  'Vary':                         'Origin',
};
function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
  });
}

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON    = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const MIN_PASSWORD_LENGTH = 8;
const VALID_ROLES = ['superuser', 'admin', 'vendedor', 'bodega', 'agente_pedidos'];

async function verifyAdmin(req: Request): Promise<{ ok: boolean; role?: string; error?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { ok: false, error: 'missing_token' };
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: authHeader } } });
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
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

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
      const { name, email, password, role, phone, code, bodega_ids, can_login_pos, commission_rate } = body;
      if (!email || !password || !role) return json({ error: 'missing_fields' }, 400);
      if (!VALID_ROLES.includes(role))   return json({ error: 'invalid_role' }, 400);
      if (String(password).length < MIN_PASSWORD_LENGTH) return json({ error: 'weak_password' }, 400);
      const guard = roleGuard(role);
      if (guard) return json({ error: 'forbidden', detail: guard }, 403);

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { name },
      });
      if (cErr || !created.user) {
        return json({ error: 'create_failed', detail: 'No se pudo crear el usuario (¿el correo ya existe?).' }, 400);
      }
      const { error: pErr } = await admin.from('profiles').insert({
        id: created.user.id, email, name: name || email, role,
        phone: phone || null, code: code || null,
        bodega_ids: bodega_ids || [], can_login_pos: can_login_pos !== false,
        commission_rate: commission_rate ?? null, active: true,
      });
      if (pErr) {
        await admin.auth.admin.deleteUser(created.user.id);
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
      ['name', 'phone', 'code', 'role', 'bodega_ids', 'commission_rate'].forEach((k) => {
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
      if (body.email) { await admin.auth.admin.updateUserById(id, { email: body.email }); fields.email = body.email; }
      if (Object.keys(fields).length) {
        const { error } = await admin.from('profiles').update(fields).eq('id', id);
        if (error) return json({ error: 'update_failed' }, 400);
      }
      return json({ ok: true });
    }

    if (action === 'deactivate') {
      const target = await loadTargetProfile(id);
      if (!target.ok) return json({ error: target.error }, target.error === 'target_not_found' ? 404 : 400);
      const targetBlock = targetGuard(target.profile?.role);
      if (targetBlock) return json({ error: 'forbidden', detail: targetBlock }, 403);

      const { error } = await admin.from('profiles').update({ active: body.active !== false ? false : true }).eq('id', id);
      if (error) return json({ error: 'deactivate_failed' }, 400);
      return json({ ok: true });
    }
    if (action === 'reset_password') {
      const target = await loadTargetProfile(id);
      if (!target.ok) return json({ error: target.error }, target.error === 'target_not_found' ? 404 : 400);
      const targetBlock = targetGuard(target.profile?.role);
      if (targetBlock) return json({ error: 'forbidden', detail: targetBlock }, 403);

      if (!body.password || String(body.password).length < MIN_PASSWORD_LENGTH) return json({ error: 'weak_password' }, 400);
      const { error } = await admin.auth.admin.updateUserById(id, { password: body.password });
      if (error) return json({ error: 'reset_failed' }, 400);
      return json({ ok: true });
    }
    if (action === 'delete') {
      if (auth.role !== 'superuser') return json({ error: 'forbidden', detail: 'Solo superuser puede eliminar.' }, 403);
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return json({ error: 'delete_failed' }, 400);
      return json({ ok: true });
    }
    return json({ error: 'unknown_action', action }, 400);
  } catch (e) {
    return json({ error: 'unexpected' }, 500);
  }
});
