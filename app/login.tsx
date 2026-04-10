import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { supabase } from '../supabase';
import { emailValide } from '../lib/utils';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [nom, setNom] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);

  function validerFormulaire(): string | null {
    if (isRegister && nom.trim().length < 2) return 'Veuillez entrer votre nom complet.';
    if (!emailValide(email)) return 'Adresse email invalide.';
    if (password.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères.';
    return null;
  }

  async function handleLogin() {
    setErreur(null);
    const err = validerFormulaire();
    if (err) { setErreur(err); return; }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);

    if (error) {
      setErreur('Email ou mot de passe incorrect.');
    }
    // La redirection est gérée par _layout.tsx via onAuthStateChange
  }

  async function handleRegister() {
    setErreur(null);
    const err = validerFormulaire();
    if (err) { setErreur(err); return; }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) {
      setErreur(error.message);
      setLoading(false);
      return;
    }

    await supabase.from('clients').insert({
      id: data.user?.id,
      nom: nom.trim(),
      email: email.trim(),
      points: 0,
      niveau: 'Bronze',
    });

    setLoading(false);
    // La redirection est gérée par _layout.tsx via onAuthStateChange
  }

  function basculerMode() {
    setIsRegister(v => !v);
    setEmail('');
    setPassword('');
    setNom('');
    setErreur(null);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>🎯</Text>
          <Text style={styles.title}>TRAMPO CITY</Text>
          <Text style={styles.tagline}>Complexe indoor de Trampoline à Strasbourg</Text>
          <Text style={styles.sub}>{isRegister ? 'Créer un compte' : 'Connexion'}</Text>
        </View>

        <View style={styles.form}>
          {isRegister && (
            <TextInput
              style={styles.input}
              placeholder="Votre nom complet"
              value={nom}
              onChangeText={setNom}
              placeholderTextColor="#888"
              autoCapitalize="words"
              returnKeyType="next"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#888"
            returnKeyType="next"
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe (min. 6 caractères)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#888"
            returnKeyType="done"
            onSubmitEditing={isRegister ? handleRegister : handleLogin}
          />

          {erreur && (
            <View style={styles.erreurBox}>
              <Text style={styles.erreurText}>⚠️ {erreur}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={isRegister ? handleRegister : handleLogin}
            disabled={loading}
            activeOpacity={0.8}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>{isRegister ? 'Créer mon compte' : 'Se connecter'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={basculerMode}>
            <Text style={styles.switchText}>
              {isRegister ? 'Déjà un compte ? Se connecter' : "Pas de compte ? S'inscrire"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/installer' as any)} activeOpacity={0.8}>
            <Text style={styles.installText}>Installer l'app sur mon téléphone 📲</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f5' },
  scroll: { flexGrow: 1 },
  header: { backgroundColor: '#E31E24', padding: 40, paddingTop: 80, alignItems: 'center' },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: 1 },
  tagline: { color: '#fff', fontSize: 13, opacity: 0.85, marginTop: 6, textAlign: 'center' },
  sub: { color: '#fff', fontSize: 14, opacity: 0.7, marginTop: 10 },
  form: { padding: 24, gap: 14 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5,
    borderColor: '#ddd', padding: 14, fontSize: 15, color: '#1a1a1a',
  },
  erreurBox: {
    backgroundColor: '#FDECEA', borderRadius: 10, padding: 12,
    borderWidth: 0.5, borderColor: '#F5C6C4',
  },
  erreurText: { color: '#C0392B', fontSize: 13 },
  btn: { backgroundColor: '#E31E24', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 6 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  switchText: { color: '#E31E24', textAlign: 'center', fontSize: 14, marginTop: 8 },
  installText: { color: '#888', textAlign: 'center', fontSize: 13, marginTop: 16 },
});
