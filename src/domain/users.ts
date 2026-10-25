/**
 * Identité affichable d'une personne — tolérante à un profil incomplet.
 *
 * L'inscription ne demande que l'e-mail et le mot de passe (RG-A04) : le nom et
 * les coordonnées se complètent après l'ouverture de l'espace. Aucun écran ne
 * doit donc supposer `firstName`/`lastName` renseignés (sinon `user.firstName[0]`
 * casse le rendu).
 */

const UNKNOWN_NAME = 'Commerçant';

function firstLetter(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : '';
}

/** Initiales pour les avatars ; `·` quand le profil est encore vide. */
export function personInitials(firstName: string, lastName: string): string {
  const initials = `${firstLetter(firstName)}${firstLetter(lastName)}`;
  return initials.length > 0 ? initials : '·';
}

/** Nom complet affichable (reçu, profil) ; libellé neutre si non renseigné. */
export function personDisplayName(firstName: string, lastName: string): string {
  const full = `${firstName.trim()} ${lastName.trim()}`.trim();
  return full.length > 0 ? full : UNKNOWN_NAME;
}
