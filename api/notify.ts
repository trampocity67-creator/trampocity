// Vercel Edge Function — proxy OneSignal sans exposer la clé REST côté client
export const config = { runtime: 'edge' };

const ONESIGNAL_APP_ID = '528bb44d-bc6b-46a3-a40a-e3e9ed2c84e6';
const SUPABASE_URL = 'https://rtwraygowrhercdwbyyl.supabase.co';

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

  let body: { userId?: string; broadcast?: boolean; titre?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body JSON invalide' }, 400);
  }

  const { userId, broadcast, titre, message } = body;
  if (!titre || !message) {
    return json({ error: 'titre et message sont requis' }, 400);
  }
  if (!broadcast && !userId) {
    return json({ error: 'userId requis (ou broadcast:true pour tous)' }, 400);
  }

  const payload = broadcast
    ? {
        app_id: ONESIGNAL_APP_ID,
        target_channel: 'push',
        included_segments: ['All'],
        headings: { fr: titre, en: titre },
        contents: { fr: message, en: message },
      }
    : {
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: [userId],
        channel_for_external_user_ids: 'push',
        headings: { en: titre },
        contents: { en: message },
      };

  console.log('[notify]', broadcast ? 'broadcast →' : 'envoi →', broadcast ? 'tous' : userId, '|', titre);

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

  // Persister dans la table notifications — awaité dans un try/catch isolé
  // pour ne jamais bloquer la réponse OneSignal ni crasher la fonction
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (serviceKey) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          client_id: broadcast ? null : userId,
          titre,
          message,
        }),
      });
    } catch (e) {
      console.error('[notify] insert notifications échoué:', e);
    }
  }

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
