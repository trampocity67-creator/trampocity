import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
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

  function validerFormulaire(): string | null {
    if (isRegister && nom.trim().length < 2) return 'Veuillez entrer votre nom complet.';
    if (!emailValide(email)) return 'Adresse email invalide.';
    if (password.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères.';
    return null;
  }

  async function handleLogin() {
    const erreur = validerFormulaire();
    if (erreur) { Alert.alert('Champ invalide', erreur); return; }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);

    if (error) {
      Alert.alert('Erreur de connexion', 'Email ou mot de passe incorrect.');
    } else {
      router.replace('/(tabs)');
    }
  }

  async function handleRegister() {
    const erreur = validerFormulaire();
    if (erreur) { Alert.alert('Champ invalide', erreur); return; }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) {
      Alert.alert('Erreur', error.message);
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

    Alert.alert('✅ Compte créé !', 'Bienvenue sur Trampocity !');
    router.replace('/(tabs)');
    setLoading(false);
  }

  function basculerMode() {
    setIsRegister(v => !v);
    setEmail('');
    setPassword('');
    setNom('');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>🏀</Text>
          <Text style={styles.title}>Trampocity</Text>
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f5' },
  scroll: { flexGrow: 1 },
  header: { backgroundColor: '#6C3CE1', padding: 40, paddingTop: 80, alignItems: 'center' },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { color: '#fff', fontSize: 28, fontWeight: '500' },
  sub: { color: '#fff', fontSize: 14, opacity: 0.8, marginTop: 6 },
  form: { padding: 24, gap: 14 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5,
    borderColor: '#ddd', padding: 14, fontSize: 15, color: '#1a1a1a',
  },
  btn: { backgroundColor: '#6C3CE1', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 6 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  switchText: { color: '#6C3CE1', textAlign: 'center', fontSize: 14, marginTop: 8 },
});
