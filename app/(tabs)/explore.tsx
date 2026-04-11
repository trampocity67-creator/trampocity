import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../../supabase';
import { useClient } from '../../context/ClientContext';
import { prenomInitiale } from '../../lib/utils';

interface Recompense {
  nom: string;
  desc: string;
  points: number;
  emoji: string;
  bg: string;
}

interface TopClient {
  id: string;
  nom: string;
  points: number;
}

const RECOMPENSES: Recompense[] = [
  { nom: 'Boisson offerte', desc: 'Au bar de TRAMPO CITY', points: 200, emoji: '🥤', bg: '#EAF3DE' },
  { nom: 'Chaussettes grip', desc: 'Paire de chaussettes premium', points: 400, emoji: '🧦', bg: '#FBEAF0' },
  { nom: 'Entrée 1h offerte', desc: 'Valable en semaine', points: 800, emoji: '🎟️', bg: '#FDEAEA' },
  { nom: 'Accès VIP 2h', desc: 'Zone exclusive + boisson', points: 2000, emoji: '⭐', bg: '#FAEEDA' },
];

const MEDAILLES = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

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
  const { client, loading } = useClient();
  const [top5, setTop5] = useState<TopClient[]>([]);
  const [top5Loading, setTop5Loading] = useState(true);
  const [qrModal, setQrModal] = useState<Recompense | null>(null);
  const [demandeEnCours, setDemandeEnCours] = useState(false);

  useEffect(() => {
    supabase
      .from('clients')
      .select('id, nom, points')
      .order('points', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setTop5((data ?? []) as TopClient[]);
        setTop5Loading(false);
      });
  }, []);

  async function demanderRecompense(recompense: Recompense) {
    if (!client) return;
    if (client.points < recompense.points) {
      alerter('Points insuffisants', `Il vous faut encore ${(recompense.points - client.points).toLocaleString('fr-FR')} pts.`);
      return;
    }
    confirmer(
      `Demander "${recompense.nom}" pour ${recompense.points} pts ?`,
      async () => {
        setDemandeEnCours(true);
        const { error } = await supabase.from('recompenses_utilisees').insert({
          client_id: client.id,
          recompense_nom: recompense.nom,
          points_depenses: recompense.points,
          statut: 'en_attente',
        });
        setDemandeEnCours(false);
        if (error) {
          alerter('Erreur', "Impossible d'envoyer la demande. Réessayez.");
          return;
        }
        setQrModal(recompense);
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

        {/* Classement Top 5 */}
        <View style={styles.classementCard}>
          <Text style={styles.classementTitle}>Classement 🏆</Text>
          <Text style={styles.classementSub}>Top 5 des membres les plus actifs</Text>

          {top5Loading ? (
            <ActivityIndicator color="#E31E24" style={{ marginTop: 12 }} />
          ) : (
            top5.map((c, i) => {
              const isMe = c.id === client?.id;
              return (
                <View
                  key={c.id}
                  style={[styles.topRow, i === top5.length - 1 && styles.topRowLast, isMe && styles.topRowMe]}>
                  <Text style={styles.topMedal}>{MEDAILLES[i]}</Text>
                  <Text style={[styles.topNom, isMe && styles.topNomMe]}>
                    {prenomInitiale(c.nom)}{isMe ? ' (moi)' : ''}
                  </Text>
                  <Text style={[styles.topPts, isMe && styles.topPtsMe]}>
                    {c.points.toLocaleString('fr-FR')} pts
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* Récompenses */}
        <Text style={styles.sectionTitle}>Mes récompenses</Text>

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
                    style={[styles.btn, (!suffisant || demandeEnCours) && styles.btnLocked]}
                    onPress={() => suffisant && demanderRecompense(r)}
                    activeOpacity={suffisant ? 0.8 : 1}
                    disabled={!suffisant || demandeEnCours}>
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

      {/* Modal QR code récompense */}
      <Modal
        visible={qrModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModal(null)}>
        <View style={styles.qrOverlay}>
          <View style={styles.qrCard}>
            <Text style={styles.qrEmoji}>{qrModal?.emoji}</Text>
            <Text style={styles.qrTitle}>{qrModal?.nom}</Text>
            <Text style={styles.qrDesc}>
              Montrez ce QR code à l'équipe Trampo City pour valider votre récompense
            </Text>
            <View style={styles.qrWrap}>
              <QRCode
                value={client?.id ?? 'trampo-city'}
                size={200}
                color="#0D0D0D"
                backgroundColor="white"
              />
            </View>
            <Text style={styles.qrIdText}>ID : {client?.id?.substring(0, 8).toUpperCase()}</Text>
            <View style={styles.qrInfoBadge}>
              <Text style={styles.qrInfoText}>
                ⏳ Votre demande est en attente de validation par l'équipe
              </Text>
            </View>
            <TouchableOpacity style={styles.qrFermerBtn} onPress={() => setQrModal(null)} activeOpacity={0.8}>
              <Text style={styles.qrFermerText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  // Classement
  classementCard: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5,
    borderColor: '#ddd', padding: 14, marginBottom: 20,
  },
  classementTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  classementSub: { fontSize: 11, color: '#888', marginTop: 2, marginBottom: 12 },
  topRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0', gap: 10,
  },
  topRowLast: { borderBottomWidth: 0 },
  topRowMe: { backgroundColor: '#FFF5F5', marginHorizontal: -14, paddingHorizontal: 14, borderRadius: 8 },
  topMedal: { fontSize: 20, width: 30, textAlign: 'center' },
  topNom: { flex: 1, fontSize: 14, color: '#1a1a1a' },
  topNomMe: { fontWeight: '600', color: '#E31E24' },
  topPts: { fontSize: 13, fontWeight: '500', color: '#888' },
  topPtsMe: { color: '#E31E24' },
  sectionTitle: {
    fontSize: 12, fontWeight: '500', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  // Récompenses
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
  // Modal QR récompense
  qrOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  qrCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    width: '100%', maxWidth: 400, alignItems: 'center', gap: 10,
  },
  qrEmoji: { fontSize: 40 },
  qrTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', textAlign: 'center' },
  qrDesc: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 19 },
  qrWrap: { padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5, borderColor: '#eee', marginVertical: 4 },
  qrIdText: { fontSize: 11, color: '#aaa', fontFamily: 'monospace' },
  qrInfoBadge: { backgroundColor: '#FFF8E1', borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: '#FFE082', width: '100%' },
  qrInfoText: { fontSize: 12, color: '#795548', textAlign: 'center', lineHeight: 18 },
  qrFermerBtn: {
    backgroundColor: '#f0f0f0', borderRadius: 12, paddingVertical: 12,
    paddingHorizontal: 32, marginTop: 4,
  },
  qrFermerText: { color: '#555', fontSize: 14, fontWeight: '500' },
});
