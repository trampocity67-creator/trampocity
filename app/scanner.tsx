import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { supabase } from '../supabase';
import { Client } from '../lib/types';
import { initiales } from '../lib/utils';

// ─── Web scanner : saisie manuelle de l'ID client ────────────────────────────

function ScannerWeb() {
  const [idInput, setIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function rechercherClient() {
    const id = idInput.trim();
    if (!id) return;
    setErreur(null);
    setLoading(true);
    const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
    setLoading(false);
    if (error || !data) {
      setErreur('Aucun client trouvé avec cet identifiant. Vérifiez l\'ID affiché sous le QR code.');
      return;
    }
    setClient(data as Client);
  }

  async function valider(montant: number) {
    if (!client) return;
    const nouveauxPoints = client.points + montant;

    const [sessionRes, updateRes] = await Promise.all([
      supabase.from('sessions').insert({
        client_id: client.id,
        points_gagnes: montant,
        description: `Main court ${montant === 150 ? '1h' : '2h'}`,
      }),
      supabase.from('clients').update({
        points: nouveauxPoints,
      }).eq('id', client.id),
    ]);

    if (sessionRes.error || updateRes.error) {
      window.alert("Erreur — La session n'a pas pu être enregistrée. Réessayez.");
    } else {
      window.alert(`✅ Session validée !\n${client.nom} a reçu +${montant} pts\nTotal : ${nouveauxPoints.toLocaleString('fr-FR')} pts`);
    }

    setClient(null);
    setIdInput('');
  }

  if (client) {
    return (
      <View style={styles.modalPage}>
        <View style={styles.clientCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initiales(client.nom)}</Text>
          </View>
          <Text style={styles.clientNom}>{client.nom}</Text>
          <Text style={styles.clientEmail}>{client.email}</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Text style={styles.infoVal}>{client.points.toLocaleString('fr-FR')}</Text>
              <Text style={styles.infoLbl}>Points</Text>
            </View>
          </View>
        </View>

        <Text style={styles.question}>Quelle session valider ?</Text>

        <TouchableOpacity style={styles.btn} onPress={() => valider(150)} activeOpacity={0.8}>
          <Text style={styles.btnText}>🤸 +150 pts — Session 1h</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => valider(300)} activeOpacity={0.8}>
          <Text style={styles.btnText}>🤸 +300 pts — Session 2h</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnAnnuler} onPress={() => { setClient(null); setIdInput(''); }} activeOpacity={0.8}>
          <Text style={styles.btnAnnulerText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.webContainer}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <View style={styles.webHeader}>
        <Text style={styles.webHeaderIcon}>📋</Text>
        <Text style={styles.webHeaderTitle}>Valider une session</Text>
        <Text style={styles.webHeaderSub}>Saisissez l'identifiant client affiché sous le QR code dans l'application</Text>
      </View>

      <View style={styles.webCard}>
        <Text style={styles.webStepLabel}>1. Client ouvre son profil dans l'app</Text>
        <Text style={styles.webStepDesc}>L'ID est affiché en bas du QR code : <Text style={styles.webStepMono}>ID : XXXXXXXX</Text></Text>

        <Text style={[styles.webStepLabel, { marginTop: 16 }]}>2. Entrez l'ID complet (UUID)</Text>
        <TextInput
          style={styles.webInput}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          value={idInput}
          onChangeText={(v) => { setIdInput(v); setErreur(null); }}
          placeholderTextColor="#bbb"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={rechercherClient}
        />

        {erreur && (
          <View style={styles.webErrorBox}>
            <Text style={styles.webErrorText}>⚠️  {erreur}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btn, (!idInput.trim() || loading) && styles.btnDisabled]}
          onPress={rechercherClient}
          disabled={!idInput.trim() || loading}
          activeOpacity={0.8}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Rechercher le client →</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Scanner mobile : caméra QR ──────────────────────────────────────────────

export default function ScannerScreen() {
  if (Platform.OS === 'web') return <ScannerWeb />;
  return <ScannerMobile />;
}

function ScannerMobile() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [modal, setModal] = useState(false);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>Accès caméra requis</Text>
        <Text style={styles.permissionDesc}>Autorisez la caméra pour scanner les clients.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission} activeOpacity={0.8}>
          <Text style={styles.btnText}>Autoriser</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.lien}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleScan({ data }: { data: string }) {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    const { data: clientData, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', data)
      .single();

    setLoading(false);

    if (error || !clientData) {
      Alert.alert(
        'QR code non reconnu',
        'Ce code ne correspond à aucun client TRAMPO CITY.',
        [{ text: 'Réessayer', onPress: () => setScanned(false) }]
      );
      return;
    }

    setClient(clientData as Client);
    setModal(true);
  }

  async function valider(montant: number) {
    if (!client) return;
    setModal(false);

    const nouveauxPoints = client.points + montant;

    const [sessionRes, updateRes] = await Promise.all([
      supabase.from('sessions').insert({
        client_id: client.id,
        points_gagnes: montant,
        description: `Main court ${montant === 150 ? '1h' : '2h'}`,
      }),
      supabase.from('clients').update({
        points: nouveauxPoints,
      }).eq('id', client.id),
    ]);

    if (sessionRes.error || updateRes.error) {
      Alert.alert('Erreur', "La session n'a pas pu être enregistrée. Réessayez.");
    } else {
      Alert.alert(
        '✅ Session validée !',
        `${client.nom} a reçu +${montant} pts (${nouveauxPoints.toLocaleString('fr-FR')} pts au total)`
      );
    }

    setClient(null);
    setScanned(false);
  }

  function annuler() {
    setModal(false);
    setClient(null);
    setScanned(false);
  }

  return (
    <View style={styles.container}>
      {!modal && (
        <CameraView
          style={styles.camera}
          onBarcodeScanned={scanned ? undefined : handleScan}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}>
          <View style={styles.overlay}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backText}>← Retour</Text>
            </TouchableOpacity>
            <View style={styles.scanArea}>
              <View style={styles.cadre}>
                <View style={[styles.coin, styles.tl]} />
                <View style={[styles.coin, styles.tr]} />
                <View style={[styles.coin, styles.bl]} />
                <View style={[styles.coin, styles.br]} />
              </View>
              {loading
                ? <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
                : <Text style={styles.scanText}>Scannez le QR code du client</Text>
              }
            </View>
          </View>
        </CameraView>
      )}

      {modal && client && (
        <View style={styles.modalPage}>
          <View style={styles.clientCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initiales(client.nom)}</Text>
            </View>
            <Text style={styles.clientNom}>{client.nom}</Text>
            <Text style={styles.clientEmail}>{client.email}</Text>
            <View style={styles.infoRow}>
              <View style={styles.infoCard}>
                <Text style={styles.infoVal}>{client.points.toLocaleString('fr-FR')}</Text>
                <Text style={styles.infoLbl}>Points</Text>
              </View>
            </View>
          </View>

          <Text style={styles.question}>Quelle session valider ?</Text>

          <TouchableOpacity style={styles.btn} onPress={() => valider(150)} activeOpacity={0.8}>
            <Text style={styles.btnText}>🤸 +150 pts — Session 1h</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => valider(300)} activeOpacity={0.8}>
            <Text style={styles.btnText}>🤸 +300 pts — Session 2h</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnAnnuler} onPress={annuler} activeOpacity={0.8}>
            <Text style={styles.btnAnnulerText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Mobile camera
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  backBtn: { margin: 24, marginTop: 60 },
  backText: { color: '#fff', fontSize: 16 },
  scanArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cadre: { width: 240, height: 240, position: 'relative', marginBottom: 24 },
  coin: { position: 'absolute', width: 40, height: 40, borderColor: '#E31E24', borderWidth: 4 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  scanText: { color: '#fff', fontSize: 15, textAlign: 'center', paddingHorizontal: 40 },
  // Permissions
  permissionContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 16, backgroundColor: '#f7f7f5',
  },
  permissionIcon: { fontSize: 48 },
  permissionTitle: { fontSize: 20, fontWeight: '500', color: '#1a1a1a' },
  permissionDesc: { fontSize: 14, color: '#888', textAlign: 'center' },
  lien: { color: '#E31E24', fontSize: 14 },
  // Client modal (shared)
  modalPage: { flex: 1, backgroundColor: '#f7f7f5', padding: 24, paddingTop: 60, gap: 12 },
  clientCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 8, borderWidth: 0.5, borderColor: '#ddd',
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FDEAEA', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '500', color: '#E31E24' },
  clientNom: { fontSize: 20, fontWeight: '500', color: '#1a1a1a' },
  clientEmail: { fontSize: 13, color: '#888' },
  infoRow: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 8 },
  infoCard: { flex: 1, backgroundColor: '#f7f7f5', borderRadius: 12, padding: 12, alignItems: 'center' },
  infoVal: { fontSize: 20, fontWeight: '500', color: '#E31E24' },
  infoLbl: { fontSize: 11, color: '#888', marginTop: 2 },
  question: { fontSize: 14, color: '#888', textAlign: 'center' },
  btn: { backgroundColor: '#E31E24', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  btnAnnuler: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 0.5, borderColor: '#ddd',
  },
  btnAnnulerText: { color: '#888', fontSize: 15 },
  // Web fallback
  webContainer: { flex: 1, backgroundColor: '#f7f7f5', padding: 24, paddingTop: 60 },
  webCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 14, borderWidth: 0.5, borderColor: '#ddd', marginTop: 16,
  },
  webIcon: { fontSize: 48 },
  webTitle: { fontSize: 18, fontWeight: '500', color: '#1a1a1a' },
  webDesc: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 },
  webInput: {
    width: '100%', backgroundColor: '#f7f7f5', borderRadius: 12, borderWidth: 0.5,
    borderColor: '#ddd', padding: 14, fontSize: 14, color: '#1a1a1a',
  },
  webErrorBox: { backgroundColor: '#fff5f5', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#fcc', width: '100%' },
  webErrorText: { color: '#c0392b', fontSize: 13 },
  webHeader: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 24 },
  webHeaderIcon: { fontSize: 40, marginBottom: 8 },
  webHeaderTitle: { fontSize: 20, fontWeight: '600', color: '#1a1a1a' },
  webHeaderSub: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  webStepLabel: { fontSize: 12, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  webStepDesc: { fontSize: 13, color: '#444', marginBottom: 8 },
  webStepMono: { fontFamily: 'monospace', color: '#1a1a1a', fontWeight: '600' },
});
