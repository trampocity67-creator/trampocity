import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { initOneSignal, loginOneSignal, logoutOneSignal } from '../lib/onesignal';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isRecovery, setIsRecovery] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    initOneSignal();
  }, []);

  function checkAdmin(email: string) {
    supabase.from('clients').select('is_admin').eq('email', email).single()
      .then(({ data }) => setIsAdmin(data?.is_admin ?? false));
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        setSession(s ?? null);
        setIsAdmin(false);
        return;
      }
      if (event === 'INITIAL_SESSION') {
        setSession(s ?? null);
        if (s?.user?.email) checkAdmin(s.user.email);
        else setIsAdmin(false);
        if (s?.user?.id) void loginOneSignal(s.user.id);
      } else if (event === 'SIGNED_IN') {
        setIsAdmin(null);
        setSession(s);
        if (s?.user?.email) checkAdmin(s.user.email);
        else setIsAdmin(false);
        if (s?.user?.id) void loginOneSignal(s.user.id);
      } else if (event === 'SIGNED_OUT') {
        setIsRecovery(false);
        setSession(null);
        setIsAdmin(null);
        void logoutOneSignal();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (session !== null && isAdmin === null) return;
    if (isRecovery) {
      router.replace('/reset-password' as any);
    } else if (session) {
      router.replace(isAdmin ? '/admin' : '/');
    } else {
      router.replace('/login');
    }
  }, [session, isRecovery, isAdmin]);

  if (session === undefined || (session !== null && isAdmin === null)) {
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
