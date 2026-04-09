import { Platform } from 'react-native';

const ONESIGNAL_APP_ID = '528bb44d-bc6b-46a3-a40a-e3e9ed2c84e6';

// ⚠️  Remplacer par votre clé REST OneSignal :
//     Dashboard OneSignal → Settings → Keys & IDs → REST API Key
export const ONESIGNAL_REST_KEY = 'os_v2_app_kkf3itn4nndkhjak4pu62lee43wv6gsmkuze6q4eeckm3xg7nbkqzlfior3xxymho3nkvkv3an2zeqnud7f6qoqirrhsilpghfdmlta';

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: Array<(os: any) => Promise<void>>;
  }
}

let initialized = false;

/** Charge le SDK OneSignal et l'initialise (web uniquement). */
export async function initOneSignal(): Promise<void> {
  if (Platform.OS !== 'web' || initialized) return;
  initialized = true;

  window.OneSignalDeferred = window.OneSignalDeferred || [];

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Impossible de charger le SDK OneSignal'));
    document.head.appendChild(script);
  });

  await new Promise<void>((resolve) => {
    window.OneSignalDeferred!.push(async (OneSignal: any) => {
      await OneSignal.init({ appId: ONESIGNAL_APP_ID });
      resolve();
    });
  });
}

/**
 * Associe l'utilisateur courant à son ID Supabase dans OneSignal.
 * Doit être appelé après connexion.
 */
export function loginOneSignal(supabaseUserId: string): void {
  if (Platform.OS !== 'web') return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal: any) => {
    await OneSignal.login(supabaseUserId);
  });
}

/** Déconnecte l'utilisateur OneSignal (après logout). */
export function logoutOneSignal(): void {
  if (Platform.OS !== 'web') return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal: any) => {
    await OneSignal.logout();
  });
}

/**
 * Envoie une notification push à un client identifié par son ID Supabase.
 * Utilise l'API REST OneSignal — nécessite ONESIGNAL_REST_KEY configurée.
 */
export async function envoyerNotification(
  supabaseUserId: string,
  titre: string,
  message: string,
): Promise<void> {
  if (ONESIGNAL_REST_KEY === 'REMPLACER_PAR_VOTRE_CLE_REST_ONESIGNAL') {
    console.warn('[OneSignal] Clé REST non configurée — notification ignorée');
    return;
  }

  try {
    const res = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${ONESIGNAL_REST_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_aliases: { external_id: [supabaseUserId] },
        target_channel: 'push',
        headings: { fr: titre, en: titre },
        contents: { fr: message, en: message },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[OneSignal] Erreur API:', res.status, body);
    }
  } catch (e) {
    console.error('[OneSignal] Erreur réseau:', e);
  }
}
