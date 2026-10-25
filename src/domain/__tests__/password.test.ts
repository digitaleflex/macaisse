import { describe, expect, it } from 'vitest';
import { validatePassword } from '../password';

/**
 * RG-A29 — politique de mot de passe : la longueur et la liste noire priment sur
 * la complexité imposée. Aucun de ces contrôles ne doit rejeter une phrase de
 * passe légitime.
 */
describe('validatePassword', () => {
  it('accepte une phrase de passe longue sans majuscule ni symbole imposé', () => {
    expect(validatePassword('la caisse du quartier 2026')).toEqual([]);
  });

  it('refuse un mot de passe trop court', () => {
    expect(validatePassword('court')).toContain('too_short');
  });

  it('refuse un mot de passe trop long', () => {
    expect(validatePassword('a'.repeat(65))).toContain('too_long');
  });

  it('refuse un mot de passe courant', () => {
    expect(validatePassword('motdepasse')).toContain('common');
    expect(validatePassword('Demo1234')).toContain('common');
  });

  it('refuse l’identité recopiée (e-mail, nom, commerce)', () => {
    expect(validatePassword('aicha2026aicha', { email: 'aicha@test.sn' })).toContain('contains_identity');
    expect(validatePassword('boutique-etoile-2026', { organizationName: 'Boutique Étoile' })).toContain(
      'contains_identity'
    );
  });

  it('refuse les caractères répétés à la suite', () => {
    expect(validatePassword('aaaaaaaaaaaa')).toContain('repeated');
  });
});
