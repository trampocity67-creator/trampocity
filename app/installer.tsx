import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ETAPES_IOS = [
  { emoji: '🌐', label: 'Ouvre cette page dans', highlight: 'Safari' },
  { emoji: '⬆️', label: 'Appuie sur le bouton', highlight: 'Partager' },
  { emoji: '📲', label: 'Sélectionne', highlight: 'Sur l\'écran d\'accueil' },
  { emoji: '✅', label: 'Appuie sur', highlight: 'Ajouter' },
];

const ETAPES_ANDROID = [
  { emoji: '⋮', label: 'Appuie sur les', highlight: '3 points en haut à droite' },
  { emoji: '📲', label: 'Sélectionne', highlight: 'Ajouter à l\'écran d\'accueil' },
  { emoji: '✅', label: 'Appuie sur', highlight: 'Ajouter' },
];

export default function InstallerScreen() {
  const [os, setOs] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Déjà dans l'app native — retour accueil
      router.replace('/');
      return;
    }

    // Déjà installée en PWA — retour accueil
    const isStandalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      router.replace('/');
      return;
    }

    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setOs('ios');
    else if (/android/.test(ua)) setOs('android');
    else setOs('other');
  }, []);

  const etapes = os === 'android' ? ETAPES_ANDROID : ETAPES_IOS;
  const titreOs = os === 'android' ? 'Android (Chrome)' : 'iPhone / iPad (Safari)';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🎯</Text>
        <Text style={styles.title}>TRAMPO CITY</Text>
        <Text style={styles.sub}>Installer l'app sur votre téléphone</Text>
      </View>

      {/* Badge avantages */}
      <View style={styles.avantagesCard}>
        <Text style={styles.avantagesTitle}>Pourquoi installer l'app ?</Text>
        {[
          '🔔  Notifications quand vous gagnez des points',
          '⚡  Accès rapide depuis votre écran d\'accueil',
          '📶  Fonctionne même avec une connexion lente',
        ].map(t => (
          <Text key={t} style={styles.avantagesItem}>{t}</Text>
        ))}
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionOs}>{titreOs}</Text>
        </View>

        {os === 'ios' && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              ⚠️  Cette page doit être ouverte dans <Text style={styles.bold}>Safari</Text> (pas Chrome ni Firefox) pour pouvoir installer l'app.
            </Text>
          </View>
        )}

        {etapes.map((e, i) => (
          <View key={i} style={styles.etapeRow}>
            <View style={styles.etapeNumWrap}>
              <Text style={styles.etapeNum}>{i + 1}</Text>
            </View>
            <View style={styles.etapeEmoji}>
              <Text style={styles.etapeEmojiText}>{e.emoji}</Text>
            </View>
            <View style={styles.etapeContent}>
              <Text style={styles.etapeLabel}>{e.label}</Text>
              <Text style={styles.etapeHighlight}>« {e.highlight} »</Text>
            </View>
            {i < etapes.length - 1 && <View style={styles.etapeConnector} />}
          </View>
        ))}
      </View>

      {/* Switcher iOS / Android */}
      <View style={styles.switcherRow}>
        <TouchableOpacity
          style={[styles.switcherBtn, os !== 'android' && styles.switcherBtnActif]}
          onPress={() => setOs('ios')}
          activeOpacity={0.8}>
          <Text style={[styles.switcherText, os !== 'android' && styles.switcherTextActif]}>iPhone / iPad</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.switcherBtn, os === 'android' && styles.switcherBtnActif]}
          onPress={() => setOs('android')}
          activeOpacity={0.8}>
          <Text style={[styles.switcherText, os === 'android' && styles.switcherTextActif]}>Android</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
        <Text style={styles.backText}>← Retour à la connexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content: { paddingBottom: 48 },

  // Header
  header: { backgroundColor: '#E31E24', padding: 40, paddingTop: 80, alignItems: 'center' },
  logo: { fontSize: 52, marginBottom: 8 },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', letterSpacing: 1 },
  sub: { color: '#fff', fontSize: 14, opacity: 0.85, marginTop: 6 },

  // Avantages
  avantagesCard: {
    margin: 16, marginTop: 20, backgroundColor: '#1a1a1a',
    borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: '#333',
  },
  avantagesTitle: { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 10 },
  avantagesItem: { color: '#ccc', fontSize: 13, lineHeight: 24 },

  // Section étapes
  section: {
    marginHorizontal: 16, backgroundColor: '#1a1a1a',
    borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: '#333',
  },
  sectionHeader: { marginBottom: 16 },
  sectionOs: { color: '#E31E24', fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },

  warningCard: {
    backgroundColor: '#2a1f00', borderRadius: 10, padding: 12,
    marginBottom: 16, borderWidth: 0.5, borderColor: '#7a5500',
  },
  warningText: { color: '#FFC107', fontSize: 12, lineHeight: 18 },
  bold: { fontWeight: '700' },

  // Étape
  etapeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  etapeNumWrap: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#E31E24', alignItems: 'center', justifyContent: 'center',
  },
  etapeNum: { color: '#fff', fontSize: 12, fontWeight: '700' },
  etapeEmoji: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#262626', alignItems: 'center', justifyContent: 'center',
  },
  etapeEmojiText: { fontSize: 22 },
  etapeContent: { flex: 1 },
  etapeLabel: { color: '#aaa', fontSize: 12 },
  etapeHighlight: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 2 },
  etapeConnector: {
    position: 'absolute', left: 13, top: 26, width: 1,
    height: 16, backgroundColor: '#333',
  },

  // Switcher
  switcherRow: {
    flexDirection: 'row', margin: 16, marginTop: 12,
    backgroundColor: '#1a1a1a', borderRadius: 10,
    borderWidth: 0.5, borderColor: '#333', overflow: 'hidden',
  },
  switcherBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  switcherBtnActif: { backgroundColor: '#E31E24' },
  switcherText: { fontSize: 13, fontWeight: '500', color: '#888' },
  switcherTextActif: { color: '#fff' },

  // Retour
  backBtn: { marginHorizontal: 16, marginTop: 4, padding: 16, alignItems: 'center' },
  backText: { color: '#888', fontSize: 14 },
});
