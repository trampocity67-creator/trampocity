import { useState, useCallback } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface AlerteState {
  titre: string;
  message: string;
  onClose?: () => void;
}

interface ConfirmState {
  titre: string;
  message: string;
  onConfirm: () => void | Promise<void>;
}

export function useModales() {
  const [alerte, setAlerte] = useState<AlerteState | null>(null);
  const [confirme, setConfirme] = useState<ConfirmState | null>(null);

  const alerter = useCallback((titre: string, message: string, onClose?: () => void) => {
    setAlerte({ titre, message, onClose });
  }, []);

  const confirmer = useCallback((
    titre: string,
    message: string,
    onConfirm: () => void | Promise<void>,
  ) => {
    setConfirme({ titre, message, onConfirm });
  }, []);

  const ModalNode = (
    <>
      <Modal
        visible={!!alerte}
        transparent
        animationType="fade"
        onRequestClose={() => { alerte?.onClose?.(); setAlerte(null); }}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            {alerte?.titre ? <Text style={styles.titre}>{alerte.titre}</Text> : null}
            <Text style={styles.message}>{alerte?.message}</Text>
            <Pressable
              style={styles.btnPrimaire}
              onPress={() => { alerte?.onClose?.(); setAlerte(null); }}>
              <Text style={styles.btnPrimaireText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!confirme}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirme(null)}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            {confirme?.titre ? <Text style={styles.titre}>{confirme.titre}</Text> : null}
            <Text style={styles.message}>{confirme?.message}</Text>
            <View style={styles.btnRow}>
              <Pressable style={styles.btnSecondaire} onPress={() => setConfirme(null)}>
                <Text style={styles.btnSecondaireText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={styles.btnPrimaire}
                onPress={() => { const fn = confirme?.onConfirm; setConfirme(null); void fn?.(); }}>
                <Text style={styles.btnPrimaireText}>Confirmer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );

  return { alerter, confirmer, ModalNode };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    gap: 12,
  },
  titre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D0D0D',
  },
  message: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btnPrimaire: {
    flex: 1,
    backgroundColor: '#E31E24',
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
  },
  btnPrimaireText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  btnSecondaire: {
    flex: 1,
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  btnSecondaireText: {
    color: '#555',
    fontSize: 14,
  },
});
