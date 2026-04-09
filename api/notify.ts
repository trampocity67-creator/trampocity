// Vercel Edge Function — proxy OneSignal sans exposer la clé REST côté client
export const config = { runtime: 'edge' };

const ONESIGNAL_APP_ID = '528bb44d-bc6b-46a3-a40a-e3e9ed2c84e6';

export default async function handler(req: Request): Promise<Response> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const restKey = process.env.ONESIGNAL_REST_KEY ?? '';
  if (!restKey) {
    console.error('[notify] ONESIGNAL_REST_KEY non configurée dans Vercel');
    return json({ error: 'Configuration serveur manquante' }, 500);
  }

  let body: { userId?: string; titre?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body JSON invalide' }, 400);
  }

  const { userId, titre, message } = body;
  if (!userId || !titre || !message) {
    return json({ error: 'userId, titre et message sont requis' }, 400);
  }

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    include_aliases: { external_id: [userId] },
    target_channel: 'push',
    headings: { fr: titre, en: titre },
    contents: { fr: message, en: message },
  };

  console.log('[notify] envoi →', userId, '|', titre);

  let osRes: Response;
  try {
    osRes = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${restKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('[notify] erreur réseau vers OneSignal:', e);
    return json({ error: 'Erreur réseau vers OneSignal' }, 502);
  }

  const osBody = await osRes.text();

  if (!osRes.ok) {
    console.error('[notify] OneSignal erreur', osRes.status, osBody);
    return json({ error: 'Erreur OneSignal', details: osBody }, osRes.status);
  }

  console.log('[notify] OK ✓', osBody);
  return new Response(osBody, {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
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
