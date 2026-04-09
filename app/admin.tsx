import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { supabase } from '../supabase';
import { Client } from '../lib/types';
import { calculerNiveau, niveauCouleur, initiales } from '../lib/utils';
import { envoyerNotification } from '../lib/onesignal';

function alerter(titre: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${titre}\n${message}`);
  } else {
    Alert.alert(titre, message);
  }
}

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

export default function AdminScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsFiltres, setClientsFiltres] = useState<Client[]>([]);
  const [clientsInactifs, setClientsInactifs] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [onglet, setOnglet] = useState<'tous' | 'inactifs'>('tous');
  const [notifOuverte, setNotifOuverte] = useState<string | null>(null);
  const [notifTexte, setNotifTexte] = useState('');

  useEffect(() => {
    verifierAdmin();
  }, []);

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

  async function chargerClients() {
    const [clientsRes, sessionsRes] = await Promise.all([
      supabase.from('clients').select('*').order('points', { ascending: false }),
      supabase.from('sessions').select('client_id, created_at'),
    ]);

    if (clientsRes.error) {
      alerter('Erreur', 'Impossible de charger les clients.');
      setLoading(false);
      return;
    }

    const allClients = (clientsRes.data || []) as Client[];
    setClients(allClients);

    const sessions = sessionsRes.data || [];
    const deuxSemainesAvant = new Date();
    deuxSemainesAvant.setDate(deuxSemainesAvant.getDate() - 14);

    const derniereSession: Record<string, Date> = {};
    sessions.forEach(s => {
      const d = new Date(s.created_at);
      if (!derniereSession[s.client_id] || d > derniereSession[s.client_id]) {
        derniereSession[s.client_id] = d;
      }
    });

    const inactifs = allClients.filter(c => {
      const derniere = derniereSession[c.id];
      return !derniere || derniere < deuxSemainesAvant;
    });
    setClientsInactifs(inactifs);

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
            description: 'Entrée Trampo City',
          }),
          supabase.from('clients').update({
            points: nouveauxPoints,
            niveau: calculerNiveau(nouveauxPoints),
          }).eq('id', client.id),
        ]);

        if (sessionRes.error || updateRes.error) {
          alerter('Erreur', 'La mise à jour a échoué. Réessayez.');
          return;
        }

        await envoyerNotification(
          client.id,
          'TRAMPO CITY 🎯',
          `Vous avez gagné ${montant} points ! Solde : ${nouveauxPoints.toLocaleString('fr-FR')} points 🎯`,
        );

        alerter('✅ Fait !', `${client.nom} a maintenant ${nouveauxPoints.toLocaleString('fr-FR')} pts`);
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

  async function envoyerNotifPerso(client: Client) {
    const msg = notifTexte.trim();
    if (!msg) return;
    await envoyerNotification(client.id, 'TRAMPO CITY 🎯', msg);
    alerter('✅ Envoyé', `Notification envoyée à ${client.nom}`);
    setNotifOuverte(null);
    setNotifTexte('');
  }

  async function relancerClient(client: Client) {
    const prenom = client.nom.split(' ')[0];
    await envoyerNotification(
      client.id,
      'TRAMPO CITY vous manque ! 🎯',
      `Salut ${prenom} ! Ça fait un moment qu'on ne vous a pas vu. Revenez sauter, ${client.points.toLocaleString('fr-FR')} pts vous attendent ! 🎉`,
    );
    alerter('✅ Envoyé', `Notification de relance envoyée à ${client.nom}`);
  }

  const totalClients = clients.length;
  const totalPoints = clients.reduce((acc, c) => acc + c.points, 0);
  const moyennePoints = totalClients > 0 ? Math.round(totalPoints / totalClients) : 0;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#E31E24" />
      </View>
    );
  }

  function renderClientCard(c: Client, index: number, isInactif = false) {
    const couleur = niveauCouleur(c.niveau);
    const notifOuvte = notifOuverte === c.id;

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

        {isInactif ? (
          <TouchableOpacity
            style={styles.relanceBtn}
            onPress={() => relancerClient(c)}
            activeOpacity={0.8}>
            <Text style={styles.relanceBtnText}>🔔 Envoyer une relance</Text>
          </TouchableOpacity>
        ) : (
          <>
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

            <TouchableOpacity
              style={[styles.notifBtn, notifOuvte && styles.notifBtnActif]}
              onPress={() => {
                if (notifOuvte) {
                  setNotifOuverte(null);
                  setNotifTexte('');
                } else {
                  setNotifOuverte(c.id);
                  setNotifTexte('');
                }
              }}
              activeOpacity={0.8}>
              <Text style={[styles.notifBtnText, notifOuvte && styles.notifBtnTextActif]}>
                {notifOuvte ? '✕ Annuler' : '🔔 Envoyer une notification'}
              </Text>
            </TouchableOpacity>

            {notifOuvte && (
              <View style={styles.notifForm}>
                <TextInput
                  style={styles.notifInput}
                  placeholder="Votre message personnalisé..."
                  value={notifTexte}
                  onChangeText={setNotifTexte}
                  placeholderTextColor="#888"
                  multiline
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.notifSendBtn, !notifTexte.trim() && styles.notifSendBtnDisabled]}
                  onPress={() => envoyerNotifPerso(c)}
                  disabled={!notifTexte.trim()}
                  activeOpacity={0.8}>
                  <Text style={styles.notifSendBtnText}>Envoyer →</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    );
  }

  const listeAffichee = onglet === 'tous' ? clientsFiltres : clientsInactifs;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Dashboard Admin 📊</Text>
        <Text style={styles.sub}>TRAMPO CITY — Gestion clients</Text>
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

      <View style={styles.ongletRow}>
        <TouchableOpacity
          style={[styles.onglet, onglet === 'tous' && styles.ongletActif]}
          onPress={() => setOnglet('tous')}
          activeOpacity={0.8}>
          <Text style={[styles.ongletText, onglet === 'tous' && styles.ongletTextActif]}>
            Tous ({clients.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.onglet, onglet === 'inactifs' && styles.ongletActif]}
          onPress={() => setOnglet('inactifs')}
          activeOpacity={0.8}>
          <Text style={[styles.ongletText, onglet === 'inactifs' && styles.ongletTextActif]}>
            Inactifs +14j ({clientsInactifs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {onglet === 'tous' && (
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
      )}

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {listeAffichee.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {onglet === 'inactifs' ? 'Aucun client inactif 🎉' : 'Aucun client trouvé'}
            </Text>
          </View>
        ) : (
          listeAffichee.map((c, index) => renderClientCard(c, index, onglet === 'inactifs'))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f5' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#E31E24', padding: 24, paddingTop: 60 },
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
  statVal: { fontSize: 18, fontWeight: '500', color: '#E31E24' },
  statLbl: { fontSize: 10, color: '#888', marginTop: 2 },
  // Onglets
  ongletRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 12,
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5,
    borderColor: '#ddd', overflow: 'hidden',
  },
  onglet: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  ongletActif: { backgroundColor: '#E31E24' },
  ongletText: { fontSize: 12, fontWeight: '500', color: '#888' },
  ongletTextActif: { color: '#fff' },
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
    backgroundColor: '#FDEAEA', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '500', color: '#E31E24' },
  clientInfo: { flex: 1 },
  clientNom: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  clientEmail: { fontSize: 11, color: '#888', marginTop: 2 },
  niveauBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-start' },
  niveauText: { fontSize: 10, fontWeight: '500' },
  clientPoints: { alignItems: 'center' },
  pointsVal: { fontSize: 20, fontWeight: '500', color: '#1a1a1a' },
  pointsLbl: { fontSize: 10, color: '#888' },
  clientActions: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  actionBtn: { flex: 1, backgroundColor: '#E31E24', borderRadius: 10, padding: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 11, fontWeight: '500' },
  actionBtnRed: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E24B4A' },
  actionBtnRedText: { color: '#E24B4A', fontSize: 11, fontWeight: '500' },
  notifBtn: {
    borderRadius: 10, padding: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#E31E24', marginTop: 2,
  },
  notifBtnActif: { backgroundColor: '#fff5f5', borderColor: '#bbb' },
  notifBtnText: { color: '#E31E24', fontSize: 11, fontWeight: '500' },
  notifBtnTextActif: { color: '#888' },
  notifForm: { marginTop: 8, gap: 8 },
  notifInput: {
    backgroundColor: '#f7f7f5', borderRadius: 10, borderWidth: 0.5,
    borderColor: '#ddd', padding: 10, fontSize: 13, color: '#1a1a1a',
    minHeight: 60,
  },
  notifSendBtn: {
    backgroundColor: '#E31E24', borderRadius: 10, padding: 10, alignItems: 'center',
  },
  notifSendBtnDisabled: { opacity: 0.4 },
  notifSendBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  relanceBtn: {
    backgroundColor: '#FFF3E0', borderRadius: 10, padding: 10,
    alignItems: 'center', borderWidth: 0.5, borderColor: '#FFB74D',
  },
  relanceBtnText: { color: '#E65100', fontSize: 12, fontWeight: '500' },
});
