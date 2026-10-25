/**
 * Politique de mot de passe (RG-A29, `docs/AUTH_DECISIONS.md`).
 *
 * Principe retenu (NIST SP 800-63B-4 / ANSSI) : la **longueur** et le blocage
 * des mots de passe compromis valent mieux que la complexité imposée. Aucune
 * règle de composition, aucune expiration, pas de question secrète.
 *
 * Ici on ne garde que les contrôles vérifiables côté client, en complément du
 * serveur (Argon2id + liste noire complète + HIBP) :
 * longueur, mots de passe trop courants, identité recopiée, répétitions.
 */

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 64;

export type PasswordIssue = 'too_short' | 'too_long' | 'common' | 'contains_identity' | 'repeated';

export interface PasswordContext {
  email?: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
}

/**
 * Extrait des mots de passe les plus fuités (liste complète côté serveur).
 * Volontairement court : le client n'est pas la source de vérité.
 */
const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  '111111',
  '000000',
  '123123',
  '654321',
  'abc123',
  'azerty',
  'azertyuiop',
  'qwerty',
  'qwerty123',
  'password',
  'password1',
  'motdepasse',
  'motdepasse1',
  'monmotdepasse',
  'passe123',
  'admin',
  'admin123',
  'root',
  'test1234',
  'demo1234',
  'welcome',
  'welcome1',
  'letmein',
  'iloveyou',
  'soleil',
  'bonjour',
  'coucou',
  'chocolat',
  'dakar',
  'senegal',
  'maison',
  'boutique',
  'caisse',
  'famille',
  'jesus',
  'allah',
]);

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalize(value: string): string {
  return stripAccents(value.trim().toLowerCase());
}

/** Fragments d'identité qu'il ne faut pas recopier dans le mot de passe. */
function identityTokens(context: PasswordContext): string[] {
  const raw = [
    context.firstName ?? '',
    context.lastName ?? '',
    context.organizationName ?? '',
    context.email?.split('@')[0] ?? '',
  ];
  return raw
    .map(normalize)
    .filter((token) => token.length >= 4)
    .map((token) => token.replace(/[^a-z0-9]/g, ''))
    .filter((token) => token.length >= 4);
}

/**
 * Renvoie la liste des manquements (vide = mot de passe acceptable).
 * L'ordre est stable : l'interface affiche le premier message.
 */
export function validatePassword(password: string, context: PasswordContext = {}): PasswordIssue[] {
  const issues: PasswordIssue[] = [];
  const value = password.trim();

  if (value.length < PASSWORD_MIN_LENGTH) issues.push('too_short');
  if (value.length > PASSWORD_MAX_LENGTH) issues.push('too_long');

  const lowered = normalize(value);
  const compact = lowered.replace(/[^a-z0-9]/g, '');
  if (COMMON_PASSWORDS.has(lowered) || COMMON_PASSWORDS.has(compact)) issues.push('common');
  if (identityTokens(context).some((token) => compact.includes(token))) issues.push('contains_identity');
  if (/(.)\1{3,}/.test(value)) issues.push('repeated');

  return issues;
}
