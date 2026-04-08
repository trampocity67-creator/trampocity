import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Client, Session } from '../lib/types';

interface ClientContextValue {
  client: Client | null;
  sessions: Session[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const ClientContext = createContext<ClientContextValue>({
  client: null,
  sessions: [],
  loading: true,
  refresh: async () => {},
});

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<Client | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  async function chargerDonnees(email: string) {
    const { data: clientData, error } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !clientData) { setLoading(false); return; }
    setClient(clientData as Client);

    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*')
      .eq('client_id', clientData.id)
      .order('created_at', { ascending: false })
      .limit(10);

    setSessions((sessionData || []) as Session[]);
    setLoading(false);
  }

  async function refresh() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) await chargerDonnees(user.email);
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (session?.user?.email) {
          setLoading(true);
          chargerDonnees(session.user.email);
        } else {
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setClient(null);
        setSessions([]);
        setLoading(false);
      }
      // TOKEN_REFRESHED, USER_UPDATED → session déjà valide, pas de rechargement
    });

    return () => subscription.unsubscribe();
  }, []);

  // Abonnements temps réel — mis à jour dès que l'ID client est connu
  useEffect(() => {
    if (!client?.id) return;

    const channel = supabase
      .channel(`client-${client.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'clients', filter: `id=eq.${client.id}` },
        (payload) => setClient(payload.new as Client)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sessions', filter: `client_id=eq.${client.id}` },
        (payload) => {
          setSessions(prev => [payload.new as Session, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [client?.id]);

  return (
    <ClientContext.Provider value={{ client, sessions, loading, refresh }}>
      {children}
    </ClientContext.Provider>
  );
}

export const useClient = () => useContext(ClientContext);
