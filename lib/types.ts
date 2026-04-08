export interface Client {
  id: string;
  nom: string;
  email: string;
  points: number;
  niveau: string;
  created_at?: string;
}

export interface Session {
  id: string;
  client_id: string;
  points_gagnes: number;
  description: string;
  created_at: string;
}
