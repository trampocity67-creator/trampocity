import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';
import { useClient } from '../../context/ClientContext';

const HORAIRES_NORMAL = [
  { jours: 'Mer · Sam · Dim', heure: '10h – 21h', ferme: false },
  { jours: 'Jeu · Ven', heure: '16h – 21h', ferme: false },
  { jours: 'Lun · Mar', heure: 'Fermé', ferme: true },
];

export default function HomeScreen() {
  const { client, sessions, loading, erreur, refresh } = useClient();
  const [notifPermission, setNotifPermission] = useState<'default' | 'granted' | 'denied'>('default');
  const [isPwa, setIsPwa] = useState(false);
  const [classement, setClassement] = useState<{ rang: number; total: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    setNotifPermission((window as any).Notification?.permission ?? 'default');
    setIsPwa(!!(window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  useEffect(() => {
    if (!client?.id) return;
    Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }).gt('points', client.points),
      supabase.from('clients').select('id', { count: 'exact', head: true }),
    ]).then(([devant, tous]) => {
      const rang = (devant.count ?? 0) + 1;
      const total = tous.count ?? 0;
      setClassement({ rang, total });
    });
  }, [client?.id, client?.points]);

  async function chargerDonnees() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refresh();
      if (!client?.id) return;
      const [devant, tous] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }).gt('points', client.points),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
      ]);
      setClassement({ rang: (devant.count ?? 0) + 1, total: tous.count ?? 0 });
    } finally {
      setRefreshing(false);
    }
  }

  async function activerNotifications() {
    if (Platform.OS !== 'web') return;
    try {
      await (window as any).OneSignal?.Notifications?.requestPermission();
      setNotifPermission((window as any).Notification?.permission ?? 'default');
    } catch (e) {
      console.error('[OneSignal] requestPermission erreur:', e);
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#E31E24" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (erreur) {
    return (
      <View style={styles.loading}>
        <Text style={styles.erreurIcon}>⚠️</Text>
        <Text style={styles.erreurText}>{erreur}</Text>
        <TouchableOpacity style={styles.erreurBtn} onPress={refresh} activeOpacity={0.8}>
          <Text style={styles.erreurBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🤸 TRAMPO CITY</Text>
        <Text style={styles.greeting}>Bonjour, {client?.nom?.split(' ')[0]} ! 👋</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={chargerDonnees} activeOpacity={0.7} disabled={refreshing}>
          <Text style={[styles.refreshIcon, refreshing && { opacity: 0.4 }]}>🔄</Text>
        </TouchableOpacity>
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>MES POINTS</Text>
          <Text style={styles.pointsValue}>{client?.points?.toLocaleString('fr-FR')}</Text>

          <Text style={styles.classementLabel}>CLASSEMENT 🏆</Text>
          {classement ? (
            <View style={styles.classementRow}>
              <Text style={styles.classementRang}>#{classement.rang}</Text>
              <View style={styles.classementMeta}>
                <Text style={styles.classementSur}>sur {classement.total} membres</Text>
                <Text style={styles.classementHint}>votre place au classement</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.classementPlaceholder}>Calcul du classement…</Text>
          )}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Vos points sont ajoutés par notre équipe après chaque session.
            Présentez votre QR code en caisse !
          </Text>
        </View>

        {/* Notifications */}
        {Platform.OS === 'web' && (
          notifPermission === 'granted'
            ? <View style={styles.notifActif}><Text style={styles.notifActifText}>Notifications activées ✅</Text></View>
            : isPwa
              ? <TouchableOpacity style={styles.notifBtn} onPress={activerNotifications} activeOpacity={0.8}>
                  <Text style={styles.notifBtnText}>Activer les notifications 🔔</Text>
                </TouchableOpacity>
              : <View style={styles.notifInstall}>
                  <Text style={styles.notifInstallIcon}>📲</Text>
                  <Text style={styles.notifInstallText}>
                    Pour activer les notifications, installez l'app sur votre écran d'accueil depuis Safari
                  </Text>
                </View>
        )}

        {/* Horaires */}
        <View style={styles.hoursCard}>
          <Text style={styles.hoursTitle}>🕐 Horaires</Text>

          <View style={styles.hoursSection}>
            <Text style={styles.hoursSectionLabel}>HORS VACANCES SCOLAIRES</Text>
            {HORAIRES_NORMAL.map(h => (
              <View key={h.jours} style={styles.hoursRow}>
                <Text style={styles.hoursDay}>{h.jours}</Text>
                <Text style={[styles.hoursTime, h.ferme && styles.hoursFerme]}>{h.heure}</Text>
              </View>
            ))}
          </View>

          <View style={styles.hoursDivider} />

          <View style={styles.hoursSection}>
            <Text style={styles.hoursSectionLabel}>VACANCES SCOLAIRES</Text>
            <View style={styles.hoursRow}>
              <Text style={styles.hoursDay}>Tous les jours</Text>
              <Text style={styles.hoursTime}>10h – 21h</Text>
            </View>
          </View>

          <View style={styles.hoursBadge}>
            <Text style={styles.hoursBadgeText}>Dernière séance à 19h45</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Activité récente</Text>

        {sessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🤸</Text>
            <Text style={styles.emptyText}>Pas encore de sessions</Text>
            <Text style={styles.emptyDesc}>
              Venez sauter chez TRAMPO CITY et gagnez vos premiers points !
            </Text>
          </View>
        ) : (
          sessions.map((s) => (
            <View key={s.id} style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: s.points_gagnes > 0 ? '#FDEAEA' : '#FAECE7' }]}>
                <Text>{s.points_gagnes > 0 ? '🤸' : '🎁'}</Text>
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityName}>{s.description}</Text>
                <Text style={styles.activityDate}>
                  {new Date(s.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </Text>
              </View>
              <Text style={[styles.activityPts, { color: s.points_gagnes > 0 ? '#3B6D11' : '#993C1D' }]}>
                {s.points_gagnes > 0 ? '+' : ''}{s.points_gagnes} pts
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f5' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#888', fontSize: 14 },
  header: { backgroundColor: '#E31E24', padding: 24, paddingTop: 60 },
  logo: { color: '#fff', fontSize: 14, opacity: 0.85, marginBottom: 4, fontWeight: '600' },
  greeting: { color: '#fff', fontSize: 20, fontWeight: '500', marginBottom: 20 },
  pointsCard: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  pointsLabel: { color: '#fff', fontSize: 11, opacity: 0.8, letterSpacing: 0.5 },
  pointsValue: { color: '#fff', fontSize: 42, fontWeight: '500', marginVertical: 6 },
  classementLabel: { color: '#fff', fontSize: 10, opacity: 0.7, letterSpacing: 0.5, marginTop: 8 },
  classementRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3 },
  classementRang: { color: '#fff', fontSize: 34, fontWeight: '800' },
  classementMeta: { gap: 1 },
  classementSur: { color: '#fff', fontSize: 13, opacity: 0.85 },
  classementHint: { color: '#fff', fontSize: 10, opacity: 0.6 },
  classementPlaceholder: { color: '#fff', fontSize: 13, opacity: 0.6, marginTop: 4 },
  body: { padding: 16 },
  infoCard: {
    backgroundColor: '#FDEAEA', borderRadius: 12, padding: 14,
    flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'center',
    borderWidth: 0.5, borderColor: '#F5C6C4',
  },
  infoIcon: { fontSize: 20 },
  infoText: { flex: 1, fontSize: 12, color: '#C0392B', lineHeight: 18 },
  notifBtn: {
    backgroundColor: '#E31E24', borderRadius: 12, minHeight: 50,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16, width: '100%',
  },
  notifBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  notifActif: {
    backgroundColor: '#EAF6EC', borderRadius: 12, minHeight: 50,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  notifActifText: { color: '#2E7D32', fontSize: 14, fontWeight: '500' },
  notifInstall: {
    backgroundColor: '#FFF8E1', borderRadius: 12, padding: 14, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 0.5, borderColor: '#FFE082',
  },
  notifInstallIcon: { fontSize: 22 },
  notifInstallText: { flex: 1, fontSize: 12, color: '#795548', lineHeight: 18 },
  hoursCard: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5,
    borderColor: '#ddd', padding: 14, marginBottom: 16,
  },
  hoursTitle: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 },
  hoursSection: { gap: 6 },
  hoursSectionLabel: {
    fontSize: 9, fontWeight: '600', color: '#E31E24',
    letterSpacing: 0.8, marginBottom: 4,
  },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hoursDay: { fontSize: 13, color: '#1a1a1a' },
  hoursTime: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  hoursFerme: { color: '#aaa' },
  hoursDivider: { height: 0.5, backgroundColor: '#f0f0f0', marginVertical: 10 },
  hoursBadge: {
    backgroundColor: '#FDEAEA', borderRadius: 8, padding: 8,
    alignItems: 'center', marginTop: 10,
  },
  hoursBadgeText: { fontSize: 11, color: '#E31E24', fontWeight: '600' },
  sectionTitle: {
    fontSize: 12, fontWeight: '500', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5,
    borderColor: '#ddd', padding: 24, alignItems: 'center', gap: 8,
  },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15, fontWeight: '500', color: '#1a1a1a' },
  emptyDesc: { fontSize: 12, color: '#888', textAlign: 'center', lineHeight: 18 },
  activityItem: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 0.5,
    borderColor: '#ddd', marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  activityIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  activityDate: { fontSize: 11, color: '#888', marginTop: 2 },
  activityPts: { fontSize: 14, fontWeight: '500' },
  refreshBtn: { position: 'absolute', top: 16, right: 16, padding: 8 },
  refreshIcon: { fontSize: 16, opacity: 0.8 },
  erreurIcon: { fontSize: 40, marginBottom: 8 },
  erreurText: { fontSize: 14, color: '#888', textAlign: 'center', paddingHorizontal: 32, lineHeight: 20, marginBottom: 20 },
  erreurBtn: { backgroundColor: '#E31E24', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32 },
  erreurBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
