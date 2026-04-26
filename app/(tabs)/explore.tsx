import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Modal, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { supabase } from '../../supabase';
import { useClient } from '../../context/ClientContext';
import { prenomInitiale } from '../../lib/utils';
import { useModales } from '../../hooks/useModales';

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

const MEDAILLES = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

interface HistoriqueItem {
  id: string;
  recompense_nom: string;
  points_depenses: number;
  created_at: string;
  statut: string;
}

export default function RewardsScreen() {
  const { client, loading, refresh } = useClient();
  const [top5, setTop5] = useState<TopClient[]>([]);
  const [top5Loading, setTop5Loading] = useState(true);
  const [confirmModal, setConfirmModal] = useState(false);
  const [demandeEnCours, setDemandeEnCours] = useState(false);
  const [nomRecompenseEnCours, setNomRecompenseEnCours] = useState<string | null>(null);
  const [historique, setHistorique] = useState<HistoriqueItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { alerter, confirmer, ModalNode } = useModales();

  const recompenses = useMemo<Recompense[]>(() => [
    { nom: 'Boisson offerte',  desc: 'Au bar de TRAMPO CITY',        points: 200,  emoji: '🥤', bg: '#EAF3DE' },
    { nom: 'Chaussettes grip', desc: 'Paire de chaussettes premium', points: 400,  emoji: '🧦', bg: '#FBEAF0' },
    { nom: 'Entrée 1h offerte',desc: 'Valable en semaine',           points: 800,  emoji: '🎟️', bg: '#FDEAEA' },
    { nom: 'Accès VIP 2h',     desc: 'Zone exclusive + boisson',     points: 2000, emoji: '⭐', bg: '#FAEEDA' },
  ], []);

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

  useEffect(() => {
    if (!client?.id) return;
    supabase
      .from('recompenses_utilisees')
      .select('id, recompense_nom, points_depenses, created_at, statut')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setHistorique((data ?? []) as HistoriqueItem[]));
  }, [client?.id]);

  async function chargerDonnees() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refresh();
      const { data: top5Data } = await supabase
        .from('clients').select('id, nom, points')
        .order('points', { ascending: false }).limit(5);
      setTop5((top5Data ?? []) as TopClient[]);
      if (client?.id) {
        const { data: histoData } = await supabase
          .from('recompenses_utilisees')
          .select('id, recompense_nom, points_depenses, created_at, statut')
          .eq('client_id', client.id).order('created_at', { ascending: false });
        setHistorique((histoData ?? []) as HistoriqueItem[]);
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function demanderRecompense(recompense: Recompense) {
    if (!client) return;
    if (client.points < recompense.points) {
      alerter('Points insuffisants', `Il vous faut encore ${(recompense.points - client.points).toLocaleString('fr-FR')} pts.`);
      return;
    }
    confirmer(
      '🎁 Utiliser cette récompense',
      `Demander "${recompense.nom}" pour ${recompense.points.toLocaleString('fr-FR')} pts ?`,
      async () => {
        setDemandeEnCours(true);
        setNomRecompenseEnCours(recompense.nom);

        // Re-fetch les points frais pour éviter la race condition
        const { data: fresh, error: fetchErr } = await supabase
          .from('clients')
          .select('points')
          .eq('id', client.id)
          .single();

        if (fetchErr || !fresh) {
          setDemandeEnCours(false);
          setNomRecompenseEnCours(null);
          alerter('Erreur', 'Impossible de vérifier vos points. Réessayez.');
          return;
        }

        if (fresh.points < recompense.points) {
          setDemandeEnCours(false);
          setNomRecompenseEnCours(null);
          alerter('Points insuffisants', `Il vous faut encore ${(recompense.points - fresh.points).toLocaleString('fr-FR')} pts.`);
          return;
        }

        const { error } = await supabase.from('recompenses_utilisees').insert({
          client_id: client.id,
          recompense_nom: recompense.nom,
          points_depenses: recompense.points,
          statut: 'en_attente',
        });
        setDemandeEnCours(false);
        setNomRecompenseEnCours(null);
        if (error) {
          alerter('Erreur', error.message || "Impossible d'envoyer la demande. Réessayez.");
          return;
        }
        supabase
          .from('recompenses_utilisees')
          .select('id, recompense_nom, points_depenses, created_at, statut')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
          .then(({ data }) => setHistorique((data ?? []) as HistoriqueItem[]));
        setConfirmModal(true);
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
        <TouchableOpacity style={styles.refreshBtn} onPress={chargerDonnees} activeOpacity={0.7} disabled={refreshing}>
          <Text style={[styles.refreshIcon, refreshing && { opacity: 0.4 }]}>🔄</Text>
        </TouchableOpacity>
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

        {recompenses.map((r) => {
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
                    {nomRecompenseEnCours === r.nom ? (
                      <ActivityIndicator size="small" color="#888" style={{ paddingHorizontal: 4 }} />
                    ) : (
                      <Text style={[styles.btnText, !suffisant && styles.btnLockedText]}>
                        {suffisant ? 'Utiliser' : 'Insuffisant'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {/* Historique des récompenses */}
        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Mes demandes</Text>

        {historique.length === 0 ? (
          <View style={styles.histoEmpty}>
            <Text style={styles.histoEmptyText}>Aucune demande pour l'instant</Text>
          </View>
        ) : (
          historique.map((h) => {
            const statutInfo =
              h.statut === 'validee'   ? { label: '✅ Validée',    color: '#2E7D32', bg: '#EAF6EC' } :
              h.statut === 'refusee'   ? { label: '❌ Refusée',    color: '#C62828', bg: '#FDEAEA' } :
                                         { label: '⏳ En attente', color: '#795548', bg: '#FFF8E1' };
            return (
              <View key={h.id} style={styles.histoItem}>
                <View style={styles.histoInfo}>
                  <Text style={styles.histoNom}>{h.recompense_nom}</Text>
                  <Text style={styles.histoDate}>
                    {new Date(h.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
                <View style={[styles.histoStatut, { backgroundColor: statutInfo.bg }]}>
                  <Text style={[styles.histoStatutText, { color: statutInfo.color }]}>{statutInfo.label}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal confirmation demande */}
      <Modal
        visible={confirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmEmoji}>⏳</Text>
            <Text style={styles.confirmTitle}>Votre demande est en attente</Text>
            <Text style={styles.confirmDesc}>
              L'équipe Trampo City va valider votre récompense. Vous serez notifié dès la validation.
            </Text>
            <TouchableOpacity style={styles.confirmBtn} onPress={() => setConfirmModal(false)} activeOpacity={0.8}>
              <Text style={styles.confirmBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {ModalNode}
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
  // Historique
  histoEmpty: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5,
    borderColor: '#ddd', padding: 16, alignItems: 'center', marginBottom: 8,
  },
  histoEmptyText: { color: '#888', fontSize: 13 },
  histoItem: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5,
    borderColor: '#ddd', padding: 12, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  histoInfo: { flex: 1 },
  histoNom: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  histoDate: { fontSize: 11, color: '#888', marginTop: 2 },
  histoStatut: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  histoStatutText: { fontSize: 11, fontWeight: '600' },
  // Modal confirmation
  confirmOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  confirmCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 28,
    width: '100%', maxWidth: 360, alignItems: 'center', gap: 12,
  },
  confirmEmoji: { fontSize: 44 },
  confirmTitle: { fontSize: 17, fontWeight: '600', color: '#1a1a1a', textAlign: 'center' },
  confirmDesc: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 19 },
  confirmBtn: {
    backgroundColor: '#E31E24', borderRadius: 12, paddingVertical: 12,
    paddingHorizontal: 40, marginTop: 4,
  },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  refreshBtn: { position: 'absolute', top: 16, right: 16, padding: 8 },
  refreshIcon: { fontSize: 16, opacity: 0.8 },
});
