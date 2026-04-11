import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { supabase } from '../supabase';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [pret, setPret] = useState(false);

  // Supabase fires PASSWORD_RECOVERY when the reset link is followed.
  // On web the token is in the URL hash — Supabase parses it automatically.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPret(true);
      }
    });

    // Also check if there's already an active session (token already parsed)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPret(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleReset() {
    setErreur(null);
    if (password.length < 6) {
      setErreur('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      setErreur('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setErreur('Erreur : ' + error.message);
    } else {
      setSucces(true);
      setTimeout(() => router.replace('/'), 2500);
    }
  }

  if (succes) {
    return (
      <View style={styles.center}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Mot de passe mis à jour !</Text>
        <Text style={styles.successSub}>Vous allez être redirigé…</Text>
      </View>
    );
  }

  if (!pret) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E31E24" />
        <Text style={styles.waitText}>Vérification du lien…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View style={styles.hero}>
          <Text style={styles.logo}>🔑</Text>
          <Text style={styles.title}>Nouveau mot de passe</Text>
          <Text style={styles.sub}>Choisissez un mot de passe sécurisé</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Nouveau mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#aaa"
            returnKeyType="next"
          />
          <TextInput
            style={styles.input}
            placeholder="Confirmer le mot de passe"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholderTextColor="#aaa"
            returnKeyType="done"
            onSubmitEditing={handleReset}
          />

          {erreur && (
            <View style={styles.erreurBox}>
              <Text style={styles.erreurText}>⚠️  {erreur}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleReset}
            disabled={loading}
            activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Enregistrer le mot de passe</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', gap: 12 },
  waitText: { color: '#888', fontSize: 14, marginTop: 8 },
  successIcon: { fontSize: 52 },
  successTitle: { fontSize: 20, fontWeight: '600', color: '#1a1a1a' },
  successSub: { fontSize: 14, color: '#888' },

  hero: { alignItems: 'center', paddingTop: 80, paddingBottom: 32 },
  logo: { fontSize: 52, marginBottom: 12 },
  title: { color: '#1a1a1a', fontSize: 22, fontWeight: '700' },
  sub: { color: '#999', fontSize: 13, marginTop: 6 },

  form: { paddingHorizontal: 28, paddingBottom: 48, gap: 12 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1,
    borderColor: '#e0e0e0', paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#111',
  },
  erreurBox: { backgroundColor: '#fff5f5', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#fcc' },
  erreurText: { color: '#c0392b', fontSize: 13 },
  btn: { backgroundColor: '#E31E24', borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
