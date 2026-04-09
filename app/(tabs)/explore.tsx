import {
  ActivityIndicator, Alert, Platform, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { supabase } from '../../supabase';
import { useClient } from '../../context/ClientContext';
import { calculerNiveau } from '../../lib/utils';

interface Recompense {
  nom: string;
  desc: string;
  points: number;
  emoji: string;
  bg: string;
}

const RECOMPENSES: Recompense[] = [
  { nom: 'Boisson offerte', desc: 'Au bar de TRAMPO CITY', points: 200, emoji: '🥤', bg: '#EAF3DE' },
  { nom: 'Chaussettes grip', desc: 'Paire de chaussettes premium', points: 400, emoji: '🧦', bg: '#FBEAF0' },
  { nom: 'Entrée 1h offerte', desc: 'Valable en semaine', points: 800, emoji: '🎟️', bg: '#FDEAEA' },
  { nom: 'Accès VIP 2h', desc: 'Zone exclusive + boisson', points: 2000, emoji: '⭐', bg: '#FAEEDA' },
];

function alerter(titre: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${titre}\n${message}`);
  } else {
    Alert.alert(titre, message);
  }
}

function confirmer(message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm();
  } else {
    Alert.alert('🎁 Confirmer', message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: onConfirm },
    ]);
  }
}

export default function RewardsScreen() {
  const { client, loading, refresh } = useClient();

  async function utiliserRecompense(recompense: Recompense) {
    if (!client) return;

    if (client.points < recompense.points) {
      alerter(
        'Points insuffisants',
        `Il vous faut encore ${(recompense.points - client.points).toLocaleString('fr-FR')} pts.`
      );
      return;
    }

    confirmer(
      `Utiliser "${recompense.nom}" pour ${recompense.points} pts ?`,
      async () => {
        const nouveauxPoints = client.points - recompense.points;

        const [insertRes, updateRes] = await Promise.all([
          supabase.from('recompenses_utilisees').insert({
            client_id: client.id,
            recompense_nom: recompense.nom,
            points_depenses: recompense.points,
          }),
          supabase.from('clients').update({
            points: nouveauxPoints,
            niveau: calculerNiveau(nouveauxPoints),
          }).eq('id', client.id),
        ]);

        if (insertRes.error || updateRes.error) {
          alerter('Erreur', "Impossible d'utiliser la récompense. Réessayez.");
          return;
        }

        await refresh();
        alerter('✅ Récompense activée !', `Profitez de votre ${recompense.nom} !`);
      }
    );
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
        <Text style={styles.title}>Récompenses 🎁</Text>
        <Text style={styles.sub}>Votre solde : {client?.points?.toLocaleString('fr-FR')} pts</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {RECOMPENSES.map((r) => {
          const suffisant = (client?.points ?? 0) >= r.points;
          return (
            <View key={r.nom} style={styles.rewardCard}>
              <View style={[styles.rewardImg, { backgroundColor: r.bg }]}>
                <Text style={styles.emoji}>{r.emoji}</Text>
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardName}>{r.nom}</Text>
                <Text style={styles.rewardDesc}>{r.desc}</Text>
                <View style={styles.rewardFooter}>
                  <Text style={styles.rewardCost}>{r.points.toLocaleString('fr-FR')} pts</Text>
                  <TouchableOpacity
                    style={[styles.btn, !suffisant && styles.btnLocked]}
                    onPress={() => suffisant && utiliserRecompense(r)}
                    activeOpacity={suffisant ? 0.8 : 1}
                    disabled={!suffisant}>
                    <Text style={[styles.btnText, !suffisant && styles.btnLockedText]}>
                      {suffisant ? 'Utiliser' : 'Insuffisant'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f5' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#E31E24', padding: 24, paddingTop: 60 },
  title: { color: '#fff', fontSize: 22, fontWeight: '500' },
  sub: { color: '#fff', fontSize: 13, opacity: 0.85, marginTop: 4 },
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 24 },
  rewardCard: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5, borderColor: '#ddd',
    marginBottom: 10, flexDirection: 'row', overflow: 'hidden',
  },
  rewardImg: { width: 80, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 32 },
  rewardContent: { padding: 12, flex: 1 },
  rewardName: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  rewardDesc: { fontSize: 11, color: '#888', marginTop: 3 },
  rewardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  rewardCost: { fontSize: 13, fontWeight: '500', color: '#E31E24' },
  btn: { borderWidth: 1.5, borderColor: '#E31E24', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  btnText: { fontSize: 11, color: '#E31E24', fontWeight: '500' },
  btnLocked: { borderColor: '#ddd' },
  btnLockedText: { color: '#888' },
});
