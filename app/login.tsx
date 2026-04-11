import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform,
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
  const [resetEnvoye, setResetEnvoye] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleResetPassword() {
    if (!emailValide(email)) {
      setErreur('Entrez votre email pour recevoir le lien de réinitialisation.');
      return;
    }
    setResetLoading(true);
    await supabase.auth.resetPasswordForEmail(email.trim());
    setResetLoading(false);
    setResetEnvoye(true);
  }

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
    if (error) setErreur('Email ou mot de passe incorrect.');
  }

  async function handleRegister() {
    setErreur(null);
    const err = validerFormulaire();
    if (err) { setErreur(err); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) { setErreur(error.message); setLoading(false); return; }
    await supabase.from('clients').insert({
      id: data.user?.id,
      nom: nom.trim(),
      email: email.trim(),
      points: 0,
    });
    setLoading(false);
  }

  function basculerMode() {
    setIsRegister(v => !v);
    setEmail(''); setPassword(''); setNom(''); setErreur(null);
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
          <Image source={require('../public/icon.png')} style={styles.logo} />
          <Text style={styles.title}>TRAMPO CITY</Text>
          <Text style={styles.city}>Strasbourg</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {isRegister ? 'Créer un compte' : 'Connexion'}
          </Text>

          {isRegister && (
            <TextInput
              style={styles.input}
              placeholder="Nom complet"
              value={nom}
              onChangeText={setNom}
              placeholderTextColor="#aaa"
              autoCapitalize="words"
              returnKeyType="next"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Adresse email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#aaa"
            returnKeyType="next"
          />

          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#aaa"
            returnKeyType="done"
            onSubmitEditing={isRegister ? handleRegister : handleLogin}
          />

          {erreur && (
            <View style={styles.erreurBox}>
              <Text style={styles.erreurText}>⚠️  {erreur}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={isRegister ? handleRegister : handleLogin}
            disabled={loading}
            activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>
                  {isRegister ? 'Créer mon compte' : 'Se connecter'}
                </Text>
            }
          </TouchableOpacity>

          {!isRegister && (
            resetEnvoye
              ? <View style={styles.resetBox}>
                  <Text style={styles.resetOkText}>✅ Email envoyé ! Vérifiez votre boîte mail.</Text>
                </View>
              : <TouchableOpacity onPress={handleResetPassword} disabled={resetLoading} activeOpacity={0.7} style={styles.resetBtn}>
                  {resetLoading
                    ? <ActivityIndicator size="small" color="#E31E24" />
                    : <Text style={styles.resetText}>Mot de passe oublié ?</Text>
                  }
                </TouchableOpacity>
          )}

          <TouchableOpacity onPress={basculerMode} activeOpacity={0.7} style={styles.switchBtn}>
            <Text style={styles.switchText}>
              {isRegister ? 'Déjà un compte ? ' : "Pas de compte ? "}
              <Text style={styles.switchTextLink}>
                {isRegister ? 'Se connecter' : "S'inscrire"}
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/installer' as any)}
            activeOpacity={0.7}
            style={styles.installBtn}>
            <Text style={styles.installText}>Installer l'app sur mon téléphone 📲</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1 },

  hero: { alignItems: 'center', paddingTop: 72, paddingBottom: 32 },
  logo: { width: 120, height: 120, borderRadius: 24, marginBottom: 16 },
  title: { color: '#E31E24', fontSize: 26, fontWeight: '800', letterSpacing: 2 },
  city: { color: '#999', fontSize: 13, marginTop: 4, letterSpacing: 1 },

  form: { paddingHorizontal: 28, paddingBottom: 48, gap: 12 },
  formTitle: { color: '#111', fontSize: 18, fontWeight: '600', marginBottom: 4 },

  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111',
  },

  erreurBox: {
    backgroundColor: '#fff5f5',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  erreurText: { color: '#c0392b', fontSize: 13 },

  btn: {
    backgroundColor: '#E31E24',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  switchBtn: { alignItems: 'center', paddingVertical: 4 },
  switchText: { color: '#666', fontSize: 14, textAlign: 'center' },
  switchTextLink: { color: '#E31E24', fontWeight: '600' },

  installBtn: { alignItems: 'center', marginTop: 8 },
  installText: { color: '#bbb', fontSize: 13 },
  resetBtn: { alignItems: 'flex-end' },
  resetText: { color: '#E31E24', fontSize: 13 },
  resetBox: { backgroundColor: '#f0faf0', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#c3e6cb' },
  resetOkText: { color: '#2d6a4f', fontSize: 13 },
});
