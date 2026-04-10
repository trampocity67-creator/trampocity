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
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
      niveau: 'Bronze',
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

        {/* Logo + titre */}
        <View style={styles.hero}>
          <View style={styles.logoGlow}>
            <Image source={require('../public/icon.png')} style={styles.logo} />
          </View>
          <Text style={styles.title}>TRAMPO CITY</Text>
          <Text style={styles.city}>STRASBOURG</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {isRegister ? 'Créer un compte' : 'Se connecter'}
          </Text>

          {isRegister && (
            <View style={[styles.inputWrap, focusedField === 'nom' && styles.inputWrapFocus]}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom complet"
                value={nom}
                onChangeText={setNom}
                placeholderTextColor="#555"
                autoCapitalize="words"
                returnKeyType="next"
                onFocus={() => setFocusedField('nom')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          )}

          <View style={[styles.inputWrap, focusedField === 'email' && styles.inputWrapFocus]}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              style={styles.input}
              placeholder="Adresse email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#555"
              returnKeyType="next"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={[styles.inputWrap, focusedField === 'password' && styles.inputWrapFocus]}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#555"
              returnKeyType="done"
              onSubmitEditing={isRegister ? handleRegister : handleLogin}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

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
              : <Text style={styles.btnText}>{isRegister ? 'Créer mon compte' : 'Se connecter'}</Text>
            }
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.switchBtn} onPress={basculerMode} activeOpacity={0.7}>
            <Text style={styles.switchText}>
              {isRegister ? 'Déjà un compte ?' : "Pas encore de compte ?"}
              <Text style={styles.switchTextBold}>
                {isRegister ? '  Se connecter' : "  S'inscrire"}
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.installBtn}
            onPress={() => router.push('/installer' as any)}
            activeOpacity={0.7}>
            <Text style={styles.installText}>Installer l'app sur mon téléphone 📲</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  scroll: { flexGrow: 1 },

  // Hero
  hero: { alignItems: 'center', paddingTop: 80, paddingBottom: 40 },
  logoGlow: {
    shadowColor: '#E31E24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 32,
    elevation: 20,
    borderRadius: 30,
    marginBottom: 24,
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 30,
  },
  title: {
    color: '#E31E24',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  city: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 6,
    marginTop: 6,
    opacity: 0.6,
  },

  // Form
  form: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 12,
  },
  formTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },

  // Champs
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 14,
    height: 54,
    gap: 10,
  },
  inputWrapFocus: {
    borderColor: '#E31E24',
    shadowColor: '#E31E24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  inputIcon: { fontSize: 16 },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },

  // Erreur
  erreurBox: {
    backgroundColor: '#2a0a0a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#5a1010',
  },
  erreurText: { color: '#ff6b6b', fontSize: 13 },

  // Bouton principal
  btn: {
    backgroundColor: '#E31E24',
    borderRadius: 12,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#E31E24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#2a2a2a' },
  dividerText: { color: '#444', fontSize: 12 },

  // Switch
  switchBtn: { alignItems: 'center', paddingVertical: 4 },
  switchText: { color: '#888', fontSize: 14, textAlign: 'center' },
  switchTextBold: { color: '#fff', fontWeight: '600' },

  // Install
  installBtn: { alignItems: 'center', marginTop: 8 },
  installText: { color: '#444', fontSize: 13 },
});
