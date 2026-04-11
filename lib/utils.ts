/** Génère les initiales d'un nom complet. */
export function initiales(nom: string): string {
  if (!nom) return '?';
  return nom
    .split(' ')
    .map(n => n[0]?.toUpperCase() || '')
    .join('');
}

/** Retourne "Prénom N." depuis un nom complet. */
export function prenomInitiale(nom: string): string {
  const parts = nom.trim().split(' ').filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? '?';
  return parts[0] + ' ' + parts[1][0].toUpperCase() + '.';
}

/** Valide le format d'une adresse email. */
export function emailValide(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
