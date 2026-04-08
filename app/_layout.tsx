import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {session ? (
        <>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="scanner" />
        </>
      ) : (
        <Stack.Screen name="login" />
      )}
    </Stack>
  );
}
