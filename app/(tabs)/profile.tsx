import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../../supabase';
import { useClient } from '../../context/ClientContext';
import { initiales } from '../../lib/utils';

export default function ProfileScreen() {
  const { client, loading } = useClient();
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [recompenses, setRecompenses] = useState<{ recompense_nom: string; points_depenses: number; created_at: string }[]>([]);

  useEffect(() => {
    if (!client?.id) return;
    supabase
      .from('recompenses_utilisees')
      .select('recompense_nom, points_depenses, created_at')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRecompenses(data ?? []));
  }, [client?.id]);

  async function seDeconnecter() {
    const doSignOut = async () => { await supabase.auth.signOut(); };

    if (Platform.OS === 'web') {
      if (window.confirm('Voulez-vous vraiment vous déconnecter ?')) doSignOut();
    } else {
      Alert.alert('Se déconnecter', 'Voulez-vous vraiment vous déconnecter ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnecter', style: 'destructive', onPress: doSignOut },
      ]);
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#E31E24" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initiales(client?.nom ?? '')}</Text>
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
              value={client?.id ?? 'trampo-city'}
              size={180}
              color="#0D0D0D"
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

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setInfoExpanded(v => !v)}
          activeOpacity={0.8}>
          <Text style={styles.menuIcon}>👤</Text>
          <Text style={styles.menuText}>Informations personnelles</Text>
          <Text style={styles.menuArrow}>{infoExpanded ? '∨' : '›'}</Text>
        </TouchableOpacity>

        {infoExpanded && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLbl}>Nom</Text>
              <Text style={styles.infoVal}>{client?.nom}</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLbl}>Email</Text>
              <Text style={styles.infoVal}>{client?.email}</Text>
            </View>
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Récompenses utilisées</Text>

        {recompenses.length === 0 ? (
          <View style={styles.recompenseEmpty}>
            <Text style={styles.recompenseEmptyText}>Aucune récompense utilisée pour l'instant</Text>
          </View>
        ) : (
          recompenses.map((r, i) => (
            <View key={i} style={styles.recompenseItem}>
              <Text style={styles.recompenseEmoji}>🎁</Text>
              <View style={styles.recompenseInfo}>
                <Text style={styles.recompenseNom}>{r.recompense_nom}</Text>
                <Text style={styles.recompenseDate}>
                  {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
              <Text style={styles.recompensePts}>−{r.points_depenses} pts</Text>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Nous trouver</Text>

        <View style={styles.adresseCard}>
          <Text style={styles.adresseIcon}>📍</Text>
          <View style={styles.adresseInfo}>
            <Text style={styles.adresseNom}>TRAMPO CITY Strasbourg</Text>
            <Text style={styles.adresseRue}>5 Rue Alexandre Dumas</Text>
            <Text style={styles.adresseVille}>67200 Strasbourg</Text>
          </View>
        </View>

        {client?.is_admin && (
          <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/admin')} activeOpacity={0.8}>
            <Text style={styles.adminText}>📊 Dashboard Admin</Text>
          </TouchableOpacity>
        )}

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
    backgroundColor: '#E31E24', padding: 24, paddingTop: 60,
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
  infoCard: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5,
    borderColor: '#ddd', marginBottom: 8, overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLbl: { fontSize: 13, color: '#888' },
  infoVal: { fontSize: 13, color: '#1a1a1a', fontWeight: '500', flex: 1, textAlign: 'right' },
  adresseCard: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5,
    borderColor: '#ddd', padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  adresseIcon: { fontSize: 20, marginTop: 2 },
  adresseInfo: { flex: 1 },
  adresseNom: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  adresseRue: { fontSize: 13, color: '#444', marginTop: 2 },
  adresseVille: { fontSize: 13, color: '#444' },
  adminBtn: {
    backgroundColor: '#0D0D0D', borderRadius: 12, padding: 14,
    alignItems: 'center', marginTop: 8, marginBottom: 8,
  },
  adminText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  logoutBtn: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5,
    borderColor: '#ddd', padding: 14, alignItems: 'center', marginTop: 8,
  },
  logoutText: { color: '#E24B4A', fontSize: 14, fontWeight: '500' },
  recompenseEmpty: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 8, borderWidth: 0.5, borderColor: '#ddd' },
  recompenseEmptyText: { color: '#888', fontSize: 13 },
  recompenseItem: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: '#ddd', padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  recompenseEmoji: { fontSize: 22 },
  recompenseInfo: { flex: 1 },
  recompenseNom: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  recompenseDate: { fontSize: 11, color: '#888', marginTop: 2 },
  recompensePts: { fontSize: 13, fontWeight: '500', color: '#E31E24' },
});
