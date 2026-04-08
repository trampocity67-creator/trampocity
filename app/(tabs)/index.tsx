import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useClient } from '../../context/ClientContext';

const NIVEAUX = [
  { emoji: '🥉', nom: 'Bronze', pts: '0 pts' },
  { emoji: '🥈', nom: 'Argent', pts: '500 pts' },
  { emoji: '🥇', nom: 'Or', pts: '1 000 pts' },
  { emoji: '💎', nom: 'Platine', pts: '2 000 pts' },
];

export default function HomeScreen() {
  const { client, sessions, loading } = useClient();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6C3CE1" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const pourcent = client ? Math.min((client.points / 2000) * 100, 100) : 0;
  const pointsManquants = Math.max(0, 2000 - (client?.points ?? 0));

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🏀 Trampocity</Text>
        <Text style={styles.greeting}>Bonjour, {client?.nom?.split(' ')[0]} ! 👋</Text>
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>MES POINTS</Text>
          <Text style={styles.pointsValue}>{client?.points?.toLocaleString('fr-FR')}</Text>
          <Text style={styles.pointsSub}>Niveau {client?.niveau} ⭐</Text>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${pourcent}%` }]} />
          </View>
          {pointsManquants > 0 ? (
            <Text style={styles.pointsNext}>{pointsManquants} pts jusqu'au niveau Platine</Text>
          ) : (
            <Text style={styles.pointsNext}>🏆 Vous êtes au niveau maximum !</Text>
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

        <View style={styles.niveauxCard}>
          <Text style={styles.niveauxTitle}>Les niveaux</Text>
          {NIVEAUX.map((n, i) => (
            <View
              key={n.nom}
              style={[styles.niveauRow, i === NIVEAUX.length - 1 && styles.niveauRowLast]}>
              <Text style={styles.niveauEmoji}>{n.emoji}</Text>
              <Text style={styles.niveauNom}>{n.nom}</Text>
              <Text style={styles.niveauPts}>{n.pts}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Activité récente</Text>

        {sessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🏀</Text>
            <Text style={styles.emptyText}>Pas encore de sessions</Text>
            <Text style={styles.emptyDesc}>
              Venez sauter chez Trampocity et gagnez vos premiers points !
            </Text>
          </View>
        ) : (
          sessions.map((s) => (
            <View key={s.id} style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: s.points_gagnes > 0 ? '#EAF3DE' : '#FAECE7' }]}>
                <Text>{s.points_gagnes > 0 ? '🏀' : '🎁'}</Text>
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
  header: { backgroundColor: '#6C3CE1', padding: 24, paddingTop: 60 },
  logo: { color: '#fff', fontSize: 14, opacity: 0.85, marginBottom: 4 },
  greeting: { color: '#fff', fontSize: 20, fontWeight: '500', marginBottom: 20 },
  pointsCard: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  pointsLabel: { color: '#fff', fontSize: 11, opacity: 0.8, letterSpacing: 0.5 },
  pointsValue: { color: '#fff', fontSize: 42, fontWeight: '500', marginVertical: 4 },
  pointsSub: { color: '#fff', fontSize: 13, opacity: 0.85 },
  barBg: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, height: 6, marginTop: 12 },
  barFill: { backgroundColor: '#fff', borderRadius: 4, height: 6 },
  pointsNext: { color: '#fff', fontSize: 11, opacity: 0.75, marginTop: 5 },
  body: { padding: 16 },
  infoCard: {
    backgroundColor: '#E6F1FB', borderRadius: 12, padding: 14,
    flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'center',
  },
  infoIcon: { fontSize: 20 },
  infoText: { flex: 1, fontSize: 12, color: '#185FA5', lineHeight: 18 },
  niveauxCard: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5,
    borderColor: '#ddd', padding: 14, marginBottom: 20,
  },
  niveauxTitle: { fontSize: 13, fontWeight: '500', color: '#1a1a1a', marginBottom: 12 },
  niveauRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0',
  },
  niveauRowLast: { borderBottomWidth: 0 },
  niveauEmoji: { fontSize: 18, width: 30 },
  niveauNom: { flex: 1, fontSize: 13, color: '#1a1a1a' },
  niveauPts: { fontSize: 12, color: '#6C3CE1', fontWeight: '500' },
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
});
