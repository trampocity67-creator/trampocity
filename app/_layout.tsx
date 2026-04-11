import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { initOneSignal, loginOneSignal, logoutOneSignal } from '../lib/onesignal';

export default function RootLayout() {
  // undefined = en cours de chargement | null = pas de session | Session = connecté
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    initOneSignal();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/reset-password' as any);
        return;
      }
      if (event === 'INITIAL_SESSION') {
        setSession(session ?? null);
        if (session?.user?.id) void loginOneSignal(session.user.id);
      } else if (event === 'SIGNED_IN') {
        setSession(session);
        if (session?.user?.id) void loginOneSignal(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        void logoutOneSignal();
      }
      // TOKEN_REFRESHED, USER_UPDATED → ignorés, pas de redirect
    });

    return () => subscription.unsubscribe();
  }, []);

  // Redirect dans un useEffect séparé : s'exécute APRÈS que la Stack soit montée
  useEffect(() => {
    if (session === undefined) return; // chargement en cours, Stack pas encore rendue
    if (session) {
      router.replace('/');
    } else {
      router.replace('/login');
    }
  }, [session]);

  if (session === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#6C3CE1" />
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
