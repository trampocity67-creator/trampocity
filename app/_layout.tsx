import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../supabase';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        // Premier chargement : on sait si on est connecté ou non
        setReady(true);
        if (!session) router.replace('/login');
        // Si session existante, expo-router charge l'URL courante (qui est '/' par défaut)
      } else if (event === 'SIGNED_IN') {
        router.replace('/');
      } else if (event === 'SIGNED_OUT') {
        router.replace('/login');
      }
      // TOKEN_REFRESHED, USER_UPDATED, etc. → ignorés, pas de redirect
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!ready) {
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
    </Stack>
  );
}
