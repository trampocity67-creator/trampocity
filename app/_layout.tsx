import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { initOneSignal, loginOneSignal, logoutOneSignal } from '../lib/onesignal';

export default function RootLayout() {
  // undefined = chargement | null = déconnecté | Session = connecté
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // true quand Supabase a détecté un token de récupération de mot de passe
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    initOneSignal();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Ne pas rediriger ici : la Stack n'est peut-être pas encore montée.
        // On lève le flag + on expose la session pour sortir du spinner.
        setIsRecovery(true);
        setSession(s ?? null);
        return;
      }
      if (event === 'INITIAL_SESSION') {
        setSession(s ?? null);
        if (s?.user?.id) void loginOneSignal(s.user.id);
      } else if (event === 'SIGNED_IN') {
        setSession(s);
        if (s?.user?.id) void loginOneSignal(s.user.id);
      } else if (event === 'SIGNED_OUT') {
        setIsRecovery(false);
        setSession(null);
        void logoutOneSignal();
      }
      // TOKEN_REFRESHED, USER_UPDATED → ignorés
    });

    return () => subscription.unsubscribe();
  }, []);

  // Redirect s'exécute APRÈS que la Stack soit montée (session !== undefined)
  useEffect(() => {
    if (session === undefined) return;
    if (isRecovery) {
      router.replace('/reset-password' as any);
    } else if (session) {
      router.replace('/');
    } else {
      router.replace('/login');
    }
  }, [session, isRecovery]);

  if (session === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#E31E24" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="scanner" />
      <Stack.Screen name="login" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
