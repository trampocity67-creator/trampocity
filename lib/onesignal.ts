import { Platform } from 'react-native';

const ONESIGNAL_APP_ID = '528bb44d-bc6b-46a3-a40a-e3e9ed2c84e6';

// La clé REST n'est plus nécessaire ici — elle est lue côté serveur par /api/notify

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: Array<(os: any) => Promise<void>>;
  }
}

// Promise unique — évite tout double-init et permet d'attendre la fin
let initPromise: Promise<void> | null = null;

/** Charge le SDK OneSignal et l'initialise (web uniquement, idempotent). */
export function initOneSignal(): Promise<void> {
  if (Platform.OS !== 'web') return Promise.resolve();
  if (initPromise) return initPromise;
  initPromise = _doInit().catch((e) => {
    initPromise = null; // permet une nouvelle tentative
    throw e;
  });
  return initPromise;
}

async function _doInit(): Promise<void> {
  console.log('[OneSignal] init démarrage...');
  console.log('[OneSignal] APP_ID:', ONESIGNAL_APP_ID);

  window.OneSignalDeferred = window.OneSignalDeferred || [];

  // 1. Chargement du script SDK (une seule fois)
  await new Promise<void>((resolve, reject) => {
    if (document.querySelector('script[src*="OneSignalSDK.page.js"]')) {
      console.log('[OneSignal] script déjà présent dans le DOM');
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.async = true;
    script.onload = () => { console.log('[OneSignal] SDK script chargé'); resolve(); };
    script.onerror = (e) => { console.error('[OneSignal] échec chargement script', e); reject(new Error('Échec chargement SDK OneSignal')); };
    document.head.appendChild(script);
  });

  // 2. OneSignal.init() via la file deferred
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.error('[OneSignal] timeout — service worker accessible ? Vérifier https://trampocity.vercel.app/OneSignalSDKWorker.js');
      reject(new Error('OneSignal init timeout (10s)'));
    }, 10_000);

    window.OneSignalDeferred!.push(async (OneSignal: any) => {
      try {
        console.log('[OneSignal] OneSignal.init() en cours...');
        await OneSignal.init({ appId: ONESIGNAL_APP_ID });
        clearTimeout(timeout);
        console.log('[OneSignal] init() OK — window.OneSignal disponible');
        resolve();
      } catch (e) {
        clearTimeout(timeout);
        console.error('[OneSignal] init() erreur:', e);
        reject(e);
      }
    });
  });
}

/**
 * Associe l'utilisateur courant à son ID Supabase dans OneSignal.
 * Attend la fin de l'init avant d'appeler login().
 */
export async function loginOneSignal(supabaseUserId: string): Promise<void> {
  if (Platform.OS !== 'web') return;
  console.log('[OneSignal] loginOneSignal() →', supabaseUserId);
  try {
    await initOneSignal();
    if (window.OneSignal?.login) {
      await window.OneSignal.login(supabaseUserId);
      console.log('[OneSignal] login() OK — external_id défini');
    } else {
      console.warn('[OneSignal] window.OneSignal.login non disponible après init');
    }
    if (window.OneSignal?.User?.addTag) {
      window.OneSignal.User.addTag('supabase_id', supabaseUserId);
      console.log('[OneSignal] tag supabase_id défini →', supabaseUserId);
    }
  } catch (e) {
    console.error('[OneSignal] loginOneSignal() erreur:', e);
  }
}

/** Déconnecte l'utilisateur OneSignal (après logout). */
export async function logoutOneSignal(): Promise<void> {
  if (Platform.OS !== 'web') return;
  try {
    await initOneSignal();
    if (window.OneSignal?.logout) {
      await window.OneSignal.logout();
      console.log('[OneSignal] logout() OK');
    }
  } catch (e) {
    console.error('[OneSignal] logoutOneSignal() erreur:', e);
  }
}

/**
 * Envoie une notification push via l'Edge Function /api/notify (pas de CORS).
 * La clé REST OneSignal est lue côté serveur uniquement.
 */
export async function envoyerNotification(
  supabaseUserId: string,
  titre: string,
  message: string,
): Promise<void> {
  console.log('[OneSignal] envoyerNotification() → userId:', supabaseUserId, '| titre:', titre);

  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: supabaseUserId, titre, message }),
    });

    const body = await res.text();
    if (res.ok) {
      console.log('[OneSignal] notification envoyée ✓', body);
    } else {
      console.error(`[OneSignal] erreur /api/notify ${res.status}:`, body);
    }
  } catch (e) {
    console.error('[OneSignal] erreur réseau vers /api/notify:', e);
  }
}
