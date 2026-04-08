/** Calcule le niveau de fidélité à partir du nombre de points. */
export function calculerNiveau(points: number): string {
  if (points >= 2000) return 'Platine';
  if (points >= 1000) return 'Or';
  if (points >= 500) return 'Argent';
  return 'Bronze';
}

/** Retourne la couleur associée à un niveau. */
export function niveauCouleur(niveau: string): string {
  if (niveau === 'Platine') return '#378ADD';
  if (niveau === 'Or') return '#EF9F27';
  if (niveau === 'Argent') return '#888';
  return '#CD7F32';
}

/** Génère les initiales d'un nom complet. */
export function initiales(nom: string): string {
  if (!nom) return '?';
  return nom
    .split(' ')
    .map(n => n[0]?.toUpperCase() || '')
    .join('');
}

/** Valide le format d'une adresse email. */
export function emailValide(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
