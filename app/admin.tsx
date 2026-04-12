import jsQR from 'jsqr';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { supabase } from '../supabase';
import { Client } from '../lib/types';
import { initiales } from '../lib/utils';
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

interface Demande {
  id: string;
  client_id: string;
  recompense_nom: string;
  points_depenses: number;
  created_at: string;
  client_nom?: string;
  client_points?: number;
}

export default function AdminScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsFiltres, setClientsFiltres] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [onglet, setOnglet] = useState<'tous' | 'recompenses'>('tous');
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [demandesLoading, setDemandesLoading] = useState(false);
  const [notifOuverte, setNotifOuverte] = useState<string | null>(null);
  const [notifTexte, setNotifTexte] = useState('');
  const [notifTousModal, setNotifTousModal] = useState(false);
  const [notifTousTitre, setNotifTousTitre] = useState('');
  const [notifTousMessage, setNotifTousMessage] = useState('');
  const [notifTousEnvoi, setNotifTousEnvoi] = useState(false);
  const [scanModal, setScanModal] = useState(false);
  const [scanId, setScanId] = useState('');
  const [scanClient, setScanClient] = useState<Client | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanErreur, setScanErreur] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'saisie' | 'camera'>('saisie');
  const videoRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const animRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (onglet === 'recompenses') chargerDemandes();
  }, [onglet]);

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
    const { data, error } = await supabase
      .from('clients').select('*').order('points', { ascending: false });

    if (error) {
      alerter('Erreur', 'Impossible de charger les clients.');
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
            description: 'Entrée Trampo City',
          }),
          supabase.from('clients').update({
            points: nouveauxPoints,
          }).eq('id', client.id),
        ]);

        if (sessionRes.error || updateRes.error) {
          alerter('Erreur', 'La mise à jour a échoué. Réessayez.');
          return;
        }

        await envoyerNotification(
          client.id,
          'TRAMPO CITY 🤸',
          `Vous avez gagné ${montant} points ! Solde : ${nouveauxPoints.toLocaleString('fr-FR')} points 🤸`,
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
        }).eq('id', client.id);

        chargerClients();
      }
    );
  }

  async function envoyerNotifPerso(client: Client) {
    const msg = notifTexte.trim();
    if (!msg) return;
    await envoyerNotification(client.id, 'TRAMPO CITY 🤸', msg);
    alerter('✅ Envoyé', `Notification envoyée à ${client.nom}`);
    setNotifOuverte(null);
    setNotifTexte('');
  }

  function arreterCamera() {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t: MediaStreamTrack) => t.stop()); streamRef.current = null; }
  }

  function fermerScanModal() {
    arreterCamera();
    setScanModal(false);
    setScanClient(null);
    setScanId('');
    setScanErreur(null);
    setScanMode('saisie');
  }

  async function rechercherClientParId(id: string) {
    const trimmed = id.trim();
    if (!trimmed) return;
    setScanErreur(null);
    setScanLoading(true);
    const { data, error } = await supabase.from('clients').select('*').eq('id', trimmed).single();
    setScanLoading(false);
    if (error || !data) {
      setScanErreur("Aucun client trouvé. Vérifiez l'ID affiché sous le QR code.");
      return;
    }
    setScanClient(data as Client);
  }

  async function rechercherClientScan() {
    await rechercherClientParId(scanId);
  }

  useEffect(() => {
    if (!scanModal || scanMode !== 'camera') {
      arreterCamera();
      return;
    }
    if (Platform.OS !== 'web') return;

    let stopped = false;

    async function demarrerCamera() {
      // Attendre que les éléments <video> et <canvas> soient montés dans le DOM
      let attempts = 0;
      while ((!videoRef.current || !canvasRef.current) && attempts < 20) {
        await new Promise(r => setTimeout(r, 50));
        attempts++;
      }
      if (stopped || !videoRef.current || !canvasRef.current) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped) { stream.getTracks().forEach((t: MediaStreamTrack) => t.stop()); return; }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const canvas: HTMLCanvasElement = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const scan = () => {
          if (stopped || !videoRef.current) return;
          const video = videoRef.current;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code?.data) {
              arreterCamera();
              setScanMode('saisie');
              setScanLoading(true);
              supabase.from('clients').select('*').eq('id', code.data).single()
                .then(({ data, error }) => {
                  setScanLoading(false);
                  if (error || !data) {
                    setScanErreur("QR code non reconnu. Vérifiez que le client utilise bien l'app Trampo City.");
                  } else {
                    setScanClient(data as Client);
                  }
                });
              return;
            }
          }
          animRef.current = requestAnimationFrame(scan);
        };
        animRef.current = requestAnimationFrame(scan);
      } catch {
        setScanErreur("Impossible d'accéder à la caméra. Vérifiez les permissions du navigateur.");
        setScanMode('saisie');
      }
    }

    demarrerCamera();
    return () => { stopped = true; arreterCamera(); };
  }, [scanModal, scanMode]);

  async function validerSessionScan(montant: number) {
    if (!scanClient) return;
    const nouveauxPoints = scanClient.points + montant;

    const [sessionRes, updateRes] = await Promise.all([
      supabase.from('sessions').insert({
        client_id: scanClient.id,
        points_gagnes: montant,
        description: `Main court ${montant === 150 ? '1h' : '2h'}`,
      }),
      supabase.from('clients').update({
        points: nouveauxPoints,
      }).eq('id', scanClient.id),
    ]);

    if (sessionRes.error || updateRes.error) {
      const err = sessionRes.error?.message || updateRes.error?.message || 'Erreur inconnue';
      console.error('[validerSessionScan] erreur Supabase:', sessionRes.error, updateRes.error);
      alerter('Erreur', `La session n'a pas pu être enregistrée.\n${err}`);
      return;
    }

    void envoyerNotification(
      scanClient.id,
      'TRAMPO CITY 🤸',
      `Vous avez gagné ${montant} points ! Solde : ${nouveauxPoints.toLocaleString('fr-FR')} points 🤸`,
    );

    alerter('✅ Session validée !', `${scanClient.nom} a reçu +${montant} pts\nTotal : ${nouveauxPoints.toLocaleString('fr-FR')} pts`);
    setScanModal(false);
    setScanClient(null);
    setScanId('');
    setScanErreur(null);
    chargerClients();
  }

  async function chargerDemandes() {
    setDemandesLoading(true);
    const { data, error } = await supabase
      .from('recompenses_utilisees')
      .select('id, client_id, recompense_nom, points_depenses, created_at, clients(nom, points)')
      .eq('statut', 'en_attente')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[chargerDemandes]', error);
      setDemandesLoading(false);
      return;
    }

    const liste: Demande[] = (data ?? []).map((d: any) => ({
      id: d.id,
      client_id: d.client_id,
      recompense_nom: d.recompense_nom,
      points_depenses: d.points_depenses,
      created_at: d.created_at,
      client_nom: d.clients?.nom,
      client_points: d.clients?.points,
    }));
    setDemandes(liste);
    setDemandesLoading(false);
  }

  async function validerDemande(demande: Demande) {
    confirmer(
      'Valider la récompense',
      `Valider "${demande.recompense_nom}" pour ${demande.client_nom} (−${demande.points_depenses.toLocaleString('fr-FR')} pts) ?`,
      async () => {
        // Fetch fresh points to avoid stale join data
        const { data: fresh, error: fetchErr } = await supabase
          .from('clients')
          .select('points')
          .eq('id', demande.client_id)
          .single();

        if (fetchErr || !fresh) {
          alerter('Erreur', 'Impossible de récupérer les données du client.');
          return;
        }

        if (fresh.points < demande.points_depenses) {
          alerter('Points insuffisants', `${demande.client_nom} n'a que ${fresh.points.toLocaleString('fr-FR')} pts (besoin : ${demande.points_depenses.toLocaleString('fr-FR')} pts).`);
          return;
        }

        const nouveauxPoints = fresh.points - demande.points_depenses;
        const [updateStatut, updatePts] = await Promise.all([
          supabase.from('recompenses_utilisees').update({ statut: 'validee' }).eq('id', demande.id),
          supabase.from('clients').update({ points: nouveauxPoints }).eq('id', demande.client_id),
        ]);
        if (updateStatut.error || updatePts.error) {
          alerter('Erreur', 'La validation a échoué. Réessayez.');
          return;
        }
        void envoyerNotification(demande.client_id, 'TRAMPO CITY 🎁', `Votre récompense "${demande.recompense_nom}" a été validée ! Profitez-en 🤸`);
        chargerDemandes();
        chargerClients();
      }
    );
  }

  async function refuserDemande(demande: Demande) {
    confirmer(
      'Refuser la récompense',
      `Refuser "${demande.recompense_nom}" pour ${demande.client_nom} ?`,
      async () => {
        await supabase.from('recompenses_utilisees').update({ statut: 'refusee' }).eq('id', demande.id);
        void envoyerNotification(demande.client_id, 'TRAMPO CITY 🎁', `Votre demande pour "${demande.recompense_nom}" a été refusée. Contactez notre équipe pour plus d'infos.`);
        chargerDemandes();
      }
    );
  }

  async function chargerDonnees() {
    setLoading(true);
    await chargerClients();
    if (onglet === 'recompenses') chargerDemandes();
  }

  async function envoyerNotifTous() {
    const titre = notifTousTitre.trim();
    const message = notifTousMessage.trim();
    if (!titre || !message) return;
    setNotifTousEnvoi(true);
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broadcast: true, titre, message }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alerter('Erreur', err.error || "L'envoi a échoué. Réessayez.");
      } else {
        alerter('✅ Envoyé', `Notification envoyée à tous les abonnés.`);
        setNotifTousModal(false);
        setNotifTousTitre('');
        setNotifTousMessage('');
      }
    } catch {
      alerter('Erreur', 'Erreur réseau. Vérifiez votre connexion.');
    }
    setNotifTousEnvoi(false);
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

  function renderClientCard(c: Client, index: number) {
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

        <TouchableOpacity
          style={[styles.notifBtn, notifOuvte && styles.notifBtnActif]}
          onPress={() => {
            if (notifOuvte) { setNotifOuverte(null); setNotifTexte(''); }
            else { setNotifOuverte(c.id); setNotifTexte(''); }
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
        <Text style={styles.sub}>TRAMPO CITY — Gestion clients</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={chargerDonnees} activeOpacity={0.7}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => { setScanModal(true); setScanClient(null); setScanId(''); setScanErreur(null); }} activeOpacity={0.8}>
            <Text style={styles.headerBtnText}>📋 Scanner un QR code</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setNotifTousModal(true)} activeOpacity={0.8}>
            <Text style={styles.headerBtnText}>📣 Notifier tous</Text>
          </TouchableOpacity>
        </View>
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
            Clients ({clients.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.onglet, onglet === 'recompenses' && styles.ongletActif]}
          onPress={() => setOnglet('recompenses')}
          activeOpacity={0.8}>
          <Text style={[styles.ongletText, onglet === 'recompenses' && styles.ongletTextActif]}>
            🎁 Récompenses{demandes.length > 0 ? ` (${demandes.length})` : ''}
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

      {onglet === 'recompenses' ? (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <Text style={styles.demandesSectionTitle}>Récompenses à valider</Text>
          <Text style={styles.demandesDesc}>
            Quand un client demande une récompense dans l'app, elle apparaît ici. Validez après avoir vérifié son QR code.
          </Text>
          {demandesLoading ? (
            <ActivityIndicator color="#E31E24" style={{ marginTop: 20 }} />
          ) : demandes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Aucune récompense en attente 🎉</Text>
            </View>
          ) : (
            demandes.map(d => (
              <View key={d.id} style={styles.demandeCard}>
                <View style={styles.demandeHeader}>
                  <View style={styles.clientAvatar}>
                    <Text style={styles.avatarText}>{initiales(d.client_nom ?? '?')}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.demandeNom}>{d.client_nom ?? d.client_id.slice(0, 8)}</Text>
                    <Text style={styles.demandeRecompense}>{d.recompense_nom}</Text>
                    <Text style={styles.demandeDate}>
                      {new Date(d.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={styles.demandePts}>−{d.points_depenses.toLocaleString('fr-FR')} pts</Text>
                </View>
                <View style={styles.demandeActions}>
                  <TouchableOpacity style={styles.demandeValiderBtn} onPress={() => validerDemande(d)} activeOpacity={0.8}>
                    <Text style={styles.demandeValiderText}>✅ Valider</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.demandeRefuserBtn} onPress={() => refuserDemande(d)} activeOpacity={0.8}>
                    <Text style={styles.demandeRefuserText}>✕ Refuser</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {clientsFiltres.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Aucun client trouvé</Text>
            </View>
          ) : (
            clientsFiltres.map((c, index) => renderClientCard(c, index))
          )}
        </ScrollView>
      )}

      {/* Modal notification à tous */}
      {notifTousModal && (
        <View style={styles.scanOverlay}>
          <View style={styles.scanModalCard}>
            <Text style={styles.scanModalTitle}>📣 Notification à tous</Text>
            <Text style={styles.scanModalDesc}>
              Envoie un message push à tous les abonnés de l'application.
            </Text>
            <TextInput
              style={styles.scanInput}
              placeholder="Titre (ex: Offre spéciale 🎉)"
              value={notifTousTitre}
              onChangeText={setNotifTousTitre}
              placeholderTextColor="#bbb"
              autoCorrect={false}
            />
            <TextInput
              style={[styles.scanInput, { minHeight: 80 }]}
              placeholder="Message..."
              value={notifTousMessage}
              onChangeText={setNotifTousMessage}
              placeholderTextColor="#bbb"
              multiline
            />
            <TouchableOpacity
              style={[styles.scanActionBtn, (!notifTousTitre.trim() || !notifTousMessage.trim() || notifTousEnvoi) && styles.scanActionBtnDisabled]}
              onPress={envoyerNotifTous}
              disabled={!notifTousTitre.trim() || !notifTousMessage.trim() || notifTousEnvoi}
              activeOpacity={0.8}>
              {notifTousEnvoi
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.scanActionBtnText}>Envoyer à tous →</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.scanFermerBtn} onPress={() => { setNotifTousModal(false); setNotifTousTitre(''); setNotifTousMessage(''); }} activeOpacity={0.8}>
              <Text style={styles.scanFermerText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal scan QR */}
      {scanModal && (
        <View style={styles.scanOverlay}>
          <View style={styles.scanModalCard}>
            {scanClient ? (
              <>
                <View style={styles.scanClientHeader}>
                  <View style={styles.scanAvatar}>
                    <Text style={styles.scanAvatarText}>{initiales(scanClient.nom)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scanClientNom}>{scanClient.nom}</Text>
                    <Text style={styles.scanClientEmail}>{scanClient.email}</Text>
                  </View>
                  <View style={styles.scanPtsWrap}>
                    <Text style={styles.scanPtsVal}>{scanClient.points.toLocaleString('fr-FR')}</Text>
                    <Text style={styles.scanPtsLbl}>pts</Text>
                  </View>
                </View>

                <Text style={styles.scanQuestion}>Quelle session valider ?</Text>

                <TouchableOpacity style={styles.scanActionBtn} onPress={() => validerSessionScan(150)} activeOpacity={0.8}>
                  <Text style={styles.scanActionBtnText}>🤸 +150 pts — Session 1h</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.scanActionBtn} onPress={() => validerSessionScan(300)} activeOpacity={0.8}>
                  <Text style={styles.scanActionBtnText}>🤸 +300 pts — Session 2h</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.scanAnnulerBtn} onPress={() => setScanClient(null)} activeOpacity={0.8}>
                  <Text style={styles.scanAnnulerText}>← Rechercher un autre client</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.scanModalTitle}>Valider une session</Text>

                {/* Sélecteur de mode */}
                <View style={styles.scanModeRow}>
                  <TouchableOpacity
                    style={[styles.scanModeBtn, scanMode === 'saisie' && styles.scanModeBtnActif]}
                    onPress={() => setScanMode('saisie')}
                    activeOpacity={0.8}>
                    <Text style={[styles.scanModeText, scanMode === 'saisie' && styles.scanModeTextActif]}>
                      ⌨️ Douchette / Clavier
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.scanModeBtn, scanMode === 'camera' && styles.scanModeBtnActif]}
                    onPress={() => setScanMode('camera')}
                    activeOpacity={0.8}>
                    <Text style={[styles.scanModeText, scanMode === 'camera' && styles.scanModeTextActif]}>
                      📷 Caméra
                    </Text>
                  </TouchableOpacity>
                </View>

                {scanMode === 'saisie' ? (
                  <>
                    <Text style={styles.scanModalDesc}>
                      Scannez avec une douchette (envoie l'ID + Entrée automatiquement), ou collez l'ID client affiché sous le QR code.
                    </Text>
                    <TextInput
                      style={styles.scanInput}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={scanId}
                      onChangeText={(v) => { setScanId(v); setScanErreur(null); }}
                      placeholderTextColor="#bbb"
                      autoCapitalize="none"
                      autoCorrect={false}
                      onSubmitEditing={rechercherClientScan}
                      autoFocus
                    />
                    {scanErreur && (
                      <View style={styles.scanErreurBox}>
                        <Text style={styles.scanErreurText}>⚠️  {scanErreur}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[styles.scanActionBtn, (!scanId.trim() || scanLoading) && styles.scanActionBtnDisabled]}
                      onPress={rechercherClientScan}
                      disabled={!scanId.trim() || scanLoading}
                      activeOpacity={0.8}>
                      {scanLoading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.scanActionBtnText}>Rechercher ce client →</Text>
                      }
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {Platform.OS === 'web' ? (
                      <View style={styles.scanVideoWrap}>
                        {/* @ts-ignore */}
                        <video
                          ref={videoRef}
                          style={{ width: '100%', borderRadius: 10, display: 'block', maxHeight: 220, objectFit: 'cover' } as any}
                          playsInline
                          muted
                        />
                        {/* @ts-ignore — canvas caché, utilisé pour jsQR */}
                        <canvas ref={canvasRef} style={{ display: 'none' } as any} />
                        {scanLoading && (
                          <View style={styles.scanVideoOverlay}>
                            <ActivityIndicator color="#fff" size="large" />
                          </View>
                        )}
                        <Text style={styles.scanVideoHint}>Pointez la caméra vers le QR code du client</Text>
                      </View>
                    ) : (
                      <View style={styles.scanCameraUnsupported}>
                        <Text style={styles.scanCameraUnsupportedText}>
                          ⚠️  La caméra n'est disponible que sur le web.
                        </Text>
                      </View>
                    )}
                    {scanErreur && (
                      <View style={styles.scanErreurBox}>
                        <Text style={styles.scanErreurText}>⚠️  {scanErreur}</Text>
                      </View>
                    )}
                  </>
                )}
              </>
            )}

            <TouchableOpacity style={styles.scanFermerBtn} onPress={fermerScanModal} activeOpacity={0.8}>
              <Text style={styles.scanFermerText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  headerBtns: { flexDirection: 'row', gap: 8, marginTop: 12 },
  headerBtn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10,
    padding: 10, alignItems: 'center',
  },
  headerBtnText: { color: '#fff', fontSize: 13, fontWeight: '500' },
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
  // Modal scan
  scanOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  scanModalCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    width: '100%', maxWidth: 480, gap: 10,
  },
  scanModalTitle: { fontSize: 17, fontWeight: '600', color: '#1a1a1a' },
  scanModalDesc: { fontSize: 13, color: '#666', lineHeight: 19 },
  scanModalLabel: { fontSize: 12, fontWeight: '500', color: '#888', textTransform: 'uppercase', letterSpacing: 0.4 },
  scanInput: {
    backgroundColor: '#f7f7f5', borderRadius: 10, borderWidth: 0.5,
    borderColor: '#ddd', padding: 12, fontSize: 13, color: '#1a1a1a',
  },
  scanErreurBox: { backgroundColor: '#fff5f5', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#fcc' },
  scanErreurText: { color: '#c0392b', fontSize: 12 },
  scanClientHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  scanAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FDEAEA', alignItems: 'center', justifyContent: 'center',
  },
  scanAvatarText: { fontSize: 15, fontWeight: '500', color: '#E31E24' },
  scanClientNom: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  scanClientEmail: { fontSize: 11, color: '#888', marginTop: 1 },
  scanPtsWrap: { alignItems: 'center' },
  scanPtsVal: { fontSize: 20, fontWeight: '500', color: '#1a1a1a' },
  scanPtsLbl: { fontSize: 10, color: '#888' },
  scanQuestion: { fontSize: 13, color: '#888', textAlign: 'center', marginVertical: 4 },
  scanActionBtn: { backgroundColor: '#E31E24', borderRadius: 12, padding: 14, alignItems: 'center' },
  scanActionBtnDisabled: { opacity: 0.45 },
  scanActionBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  scanAnnulerBtn: { alignItems: 'center', paddingVertical: 6 },
  scanAnnulerText: { color: '#888', fontSize: 13 },
  scanFermerBtn: {
    marginTop: 4, borderRadius: 12, padding: 12, alignItems: 'center',
    borderWidth: 0.5, borderColor: '#ddd',
  },
  scanFermerText: { color: '#888', fontSize: 14 },
  scanModeRow: {
    flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 10, overflow: 'hidden',
  },
  scanModeBtn: { flex: 1, paddingVertical: 9, alignItems: 'center' },
  scanModeBtnActif: { backgroundColor: '#0D0D0D' },
  scanModeText: { fontSize: 12, fontWeight: '500', color: '#888' },
  scanModeTextActif: { color: '#fff' },
  scanVideoWrap: { borderRadius: 10, overflow: 'hidden', position: 'relative' },
  scanVideoOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  scanVideoHint: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 6 },
  scanCameraUnsupported: {
    backgroundColor: '#fff8e1', borderRadius: 10, padding: 14,
    borderWidth: 0.5, borderColor: '#ffe082',
  },
  scanCameraUnsupportedText: { color: '#795548', fontSize: 13, lineHeight: 20 },
  // Onglet récompenses à valider
  demandesSectionTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  demandesDesc: { fontSize: 12, color: '#888', lineHeight: 17, marginBottom: 14 },
  demandeCard: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5,
    borderColor: '#ddd', padding: 14, marginBottom: 10,
  },
  demandeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  demandeNom: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  demandeRecompense: { fontSize: 12, color: '#E31E24', fontWeight: '500', marginTop: 1 },
  demandeDate: { fontSize: 11, color: '#aaa', marginTop: 2 },
  demandePts: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  demandeActions: { flexDirection: 'row', gap: 8 },
  demandeValiderBtn: {
    flex: 1, backgroundColor: '#E31E24', borderRadius: 10, padding: 10, alignItems: 'center',
  },
  demandeValiderText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  demandeRefuserBtn: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center',
    borderWidth: 0.5, borderColor: '#ddd',
  },
  demandeRefuserText: { color: '#888', fontSize: 13 },
  refreshBtn: { position: 'absolute', top: 16, right: 16, padding: 8 },
  refreshIcon: { fontSize: 16, opacity: 0.8 },
});
