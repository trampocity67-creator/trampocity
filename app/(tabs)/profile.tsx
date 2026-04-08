import { router } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../../supabase';
import { useClient } from '../../context/ClientContext';
import { initiales } from '../../lib/utils';

export default function ProfileScreen() {
  const { client, loading } = useClient();

  async function seDeconnecter() {
    Alert.alert(
      'Se déconnecter',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/login');
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6C3CE1" />
      </View>
    );
  }

  const ini = initiales(client?.nom ?? '');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{ini}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{client?.nom}</Text>
          <Text style={styles.since}>Niveau {client?.niveau} ⭐ · {client?.points?.toLocaleString('fr-FR')} pts</Text>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.qrCard}>
          <Text style={styles.qrTitle}>Mon QR code</Text>
          <Text style={styles.qrDesc}>Présentez ce code en caisse pour valider votre session</Text>
          <View style={styles.qrWrap}>
            <QRCode
              value={client?.id ?? 'trampocity'}
              size={180}
              color="#1a1a2e"
              backgroundColor="white"
            />
          </View>
          <Text style={styles.qrId}>ID : {client?.id?.substring(0, 8).toUpperCase()}</Text>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{client?.points?.toLocaleString('fr-FR')}</Text>
            <Text style={styles.statLbl}>Points</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{client?.niveau}</Text>
            <Text style={styles.statLbl}>Niveau</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Mon compte</Text>

        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>👤</Text>
          <Text style={styles.menuText}>Informations personnelles</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>🔔</Text>
          <Text style={styles.menuText}>Notifications</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>👨‍👩‍👧</Text>
          <Text style={styles.menuText}>Parrainer un ami (+200 pts)</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>📋</Text>
          <Text style={styles.menuText}>Historique complet</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuIcon}>❓</Text>
          <Text style={styles.menuText}>Aide & contact</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/admin')} activeOpacity={0.8}>
          <Text style={styles.adminText}>📊 Dashboard Admin</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={seDeconnecter} activeOpacity={0.8}>
          <Text style={styles.logoutText}>🚪 Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f5' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: '#6C3CE1', padding: 24, paddingTop: 60,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '500' },
  headerInfo: { flex: 1 },
  name: { color: '#fff', fontSize: 18, fontWeight: '500' },
  since: { color: '#fff', fontSize: 12, opacity: 0.8, marginTop: 3 },
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 40 },
  qrCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 0.5,
    borderColor: '#ddd', padding: 20, alignItems: 'center', marginBottom: 16,
  },
  qrTitle: { fontSize: 16, fontWeight: '500', color: '#1a1a1a', marginBottom: 6 },
  qrDesc: { fontSize: 12, color: '#888', textAlign: 'center', marginBottom: 16 },
  qrWrap: { padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: '#eee' },
  qrId: { fontSize: 11, color: '#888', marginTop: 12, fontFamily: 'monospace' },
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 0.5, borderColor: '#ddd',
  },
  statVal: { fontSize: 20, fontWeight: '500', color: '#1a1a1a' },
  statLbl: { fontSize: 10, color: '#888', marginTop: 2 },
  sectionTitle: {
    fontSize: 12, fontWeight: '500', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  menuItem: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5,
    borderColor: '#ddd', padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  menuIcon: { fontSize: 18 },
  menuText: { fontSize: 14, color: '#1a1a1a', flex: 1 },
  menuArrow: { fontSize: 18, color: '#888' },
  adminBtn: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    alignItems: 'center', marginTop: 8, marginBottom: 8,
  },
  adminText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  logoutBtn: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5,
    borderColor: '#ddd', padding: 14, alignItems: 'center', marginTop: 8,
  },
  logoutText: { color: '#E24B4A', fontSize: 14, fontWeight: '500' },
});
