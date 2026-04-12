// Vercel Edge Function — supprime un compte auth Supabase via service role
export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://rtwraygowrhercdwbyyl.supabase.co';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!serviceKey) {
    console.error('[delete-user] SUPABASE_SERVICE_ROLE_KEY non configurée');
    return json({ error: 'Configuration serveur manquante' }, 500);
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body JSON invalide' }, 400);
  }

  const { email } = body;
  if (!email) {
    return json({ error: 'email requis' }, 400);
  }

  // Cherche le compte auth par email (liste paginée, suffisant pour < 1000 users)
  const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
  });

  if (!listRes.ok) {
    const err = await listRes.text();
    console.error('[delete-user] erreur liste users', listRes.status, err);
    return json({ error: 'Impossible de lister les utilisateurs', details: err }, listRes.status);
  }

  const listData = await listRes.json();
  const authUser = (listData.users ?? []).find((u: { email: string }) => u.email === email);

  if (!authUser) {
    console.warn('[delete-user] aucun compte auth trouvé pour', email);
    return json({ ok: true, skipped: true });
  }

  console.log('[delete-user] suppression auth user →', authUser.id, email);

  const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUser.id}`, {
    method: 'DELETE',
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
  });

  if (!delRes.ok) {
    const err = await delRes.text();
    console.error('[delete-user] erreur suppression', delRes.status, err);
    return json({ error: 'Échec suppression compte auth', details: err }, delRes.status);
  }

  console.log('[delete-user] compte auth supprimé ✓', authUser.id);
  return json({ ok: true });
}

function json(data: object, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': 'https://trampocity.vercel.app',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
