import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

function confirmer(titre: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${titre}\n${message}`)) onConfirm();
  } else {
    Alert.alert(titre, message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: onConfirm },
    ]);
  }
}
import { supabase } from '../supabase';
import { Client } from '../lib/types';
import { calculerNiveau, niveauCouleur, initiales } from '../lib/utils';

export default function AdminScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsFiltres, setClientsFiltres] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    verifierAdmin();
  }, []);

  async function verifierAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/'); return; }

    const { data } = await supabase
      .from('clients')
      .select('is_admin')
      .eq('email', user.email)
      .single();

    if (!data?.is_admin) {
      router.replace('/');
      return;
    }

    chargerClients();
  }

  useEffect(() => {
    const q = recherche.toLowerCase().trim();
    setClientsFiltres(
      q === ''
        ? clients
        : clients.filter(c =>
            c.nom.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
          )
    );
  }, [recherche, clients]);

  async function chargerClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('points', { ascending: false });

    if (error) {
      Alert.alert('Erreur', 'Impossible de charger les clients.');
      setLoading(false);
      return;
    }
    setClients((data || []) as Client[]);
    setLoading(false);
  }

  function ajouterPoints(client: Client, montant: number) {
    confirmer(
      '➕ Ajouter des points',
      `Ajouter ${montant} pts à ${client.nom} ?`,
      async () => {
        const nouveauxPoints = client.points + montant;

        const [sessionRes, updateRes] = await Promise.all([
          supabase.from('sessions').insert({
            client_id: client.id,
            points_gagnes: montant,
            description: 'Session trampoline',
          }),
          supabase.from('clients').update({
            points: nouveauxPoints,
            niveau: calculerNiveau(nouveauxPoints),
          }).eq('id', client.id),
        ]);

        if (sessionRes.error || updateRes.error) {
          Alert.alert('Erreur', 'La mise à jour a échoué. Réessayez.');
          return;
        }

        if (Platform.OS === 'web') {
          window.alert(`✅ Fait ! ${client.nom} a maintenant ${nouveauxPoints.toLocaleString('fr-FR')} pts`);
        } else {
          Alert.alert('✅ Fait !', `${client.nom} a maintenant ${nouveauxPoints.toLocaleString('fr-FR')} pts`);
        }
        chargerClients();
      }
    );
  }

  function retirerPoints(client: Client) {
    confirmer(
      '➖ Retirer des points',
      `Retirer 200 pts à ${client.nom} ?`,
      async () => {
        const nouveauxPoints = Math.max(0, client.points - 200);

        await supabase.from('clients').update({
          points: nouveauxPoints,
          niveau: calculerNiveau(nouveauxPoints),
        }).eq('id', client.id);

        chargerClients();
      }
    );
  }

  const totalClients = clients.length;
  const totalPoints = clients.reduce((acc, c) => acc + c.points, 0);
  const moyennePoints = totalClients > 0 ? Math.round(totalPoints / totalClients) : 0;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6C3CE1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Dashboard Admin 📊</Text>
        <Text style={styles.sub}>Trampocity — Gestion clients</Text>
        <TouchableOpacity style={styles.scanBtn} onPress={() => router.push('/scanner')} activeOpacity={0.8}>
          <Text style={styles.scanBtnText}>📷 Scanner un QR code</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{totalClients}</Text>
          <Text style={styles.statLbl}>Clients</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{totalPoints.toLocaleString('fr-FR')}</Text>
          <Text style={styles.statLbl}>Points total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{moyennePoints.toLocaleString('fr-FR')}</Text>
          <Text style={styles.statLbl}>Moyenne pts</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Rechercher un client..."
          value={recherche}
          onChangeText={setRecherche}
          placeholderTextColor="#888"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {clientsFiltres.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucun client trouvé</Text>
          </View>
        ) : (
          clientsFiltres.map((c, index) => {
            const couleur = niveauCouleur(c.niveau);
            return (
              <View key={c.id} style={styles.clientCard}>
                <View style={styles.clientTop}>
                  <View style={styles.clientAvatar}>
                    <Text style={styles.avatarText}>{initiales(c.nom)}</Text>
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientNom}>#{index + 1} {c.nom}</Text>
                    <Text style={styles.clientEmail}>{c.email}</Text>
                    <View style={[styles.niveauBadge, { backgroundColor: couleur + '22' }]}>
                      <Text style={[styles.niveauText, { color: couleur }]}>{c.niveau}</Text>
                    </View>
                  </View>
                  <View style={styles.clientPoints}>
                    <Text style={styles.pointsVal}>{c.points.toLocaleString('fr-FR')}</Text>
                    <Text style={styles.pointsLbl}>pts</Text>
                  </View>
                </View>
                <View style={styles.clientActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => ajouterPoints(c, 150)} activeOpacity={0.8}>
                    <Text style={styles.actionBtnText}>+150 pts (1h)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => ajouterPoints(c, 300)} activeOpacity={0.8}>
                    <Text style={styles.actionBtnText}>+300 pts (2h)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnRed]} onPress={() => retirerPoints(c)} activeOpacity={0.8}>
                    <Text style={styles.actionBtnRedText}>-200 pts</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f5' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#6C3CE1', padding: 24, paddingTop: 60 },
  backBtn: { marginBottom: 8 },
  backText: { color: '#fff', opacity: 0.8, fontSize: 14 },
  title: { color: '#fff', fontSize: 22, fontWeight: '500' },
  sub: { color: '#fff', fontSize: 13, opacity: 0.8, marginTop: 4 },
  scanBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10,
    padding: 10, marginTop: 12, alignItems: 'center',
  },
  scanBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 0 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 0.5, borderColor: '#ddd',
  },
  statVal: { fontSize: 18, fontWeight: '500', color: '#6C3CE1' },
  statLbl: { fontSize: 10, color: '#888', marginTop: 2 },
  searchWrap: { padding: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 0.5,
    borderColor: '#ddd', padding: 12, fontSize: 14, color: '#1a1a1a',
  },
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingTop: 8, paddingBottom: 24 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 24, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 14 },
  clientCard: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5,
    borderColor: '#ddd', padding: 14, marginBottom: 10,
  },
  clientTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  clientAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#EEEDfe', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '500', color: '#6C3CE1' },
  clientInfo: { flex: 1 },
  clientNom: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  clientEmail: { fontSize: 11, color: '#888', marginTop: 2 },
  niveauBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-start' },
  niveauText: { fontSize: 10, fontWeight: '500' },
  clientPoints: { alignItems: 'center' },
  pointsVal: { fontSize: 20, fontWeight: '500', color: '#1a1a1a' },
  pointsLbl: { fontSize: 10, color: '#888' },
  clientActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, backgroundColor: '#6C3CE1', borderRadius: 10, padding: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 11, fontWeight: '500' },
  actionBtnRed: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E24B4A' },
  actionBtnRedText: { color: '#E24B4A', fontSize: 11, fontWeight: '500' },
});
