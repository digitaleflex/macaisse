import { beforeEach, describe, expect, it } from 'vitest';
import { pinHash } from '@/domain/pin';
import { clearEnrollment, readEnrollment, useLockStore, verifyLocalPin, writeEnrollment } from '../lock';

/**
 * D6 — le déverrouillage hors ligne repose sur le hash local du PIN. Ce cache
 * doit être lisible, vérifiable et effaçable à la révocation (RG-A17).
 */
describe('enrôlement local d’un appareil', () => {
  beforeEach(() => {
    localStorage.clear();
    clearEnrollment();
    useLockStore.setState({ locked: false });
  });

  it('conserve l’enrôlement et vérifie le PIN localement', () => {
    writeEnrollment({
      deviceId: 'dev-1',
      organizationId: 'org-etoile',
      memberId: 'u-mamadou',
      memberName: 'Mamadou Konaté',
      pinHash: pinHash('9274'),
      enrolledAt: '2026-10-26',
    });

    expect(readEnrollment()).toMatchObject({ deviceId: 'dev-1', memberId: 'u-mamadou' });
    expect(verifyLocalPin('9274')).toBe(true);
    expect(verifyLocalPin('1111')).toBe(false);
  });

  it('verrouille puis déverrouille uniquement avec le bon PIN', () => {
    writeEnrollment({
      deviceId: 'dev-1',
      organizationId: 'org-etoile',
      memberId: 'u-mamadou',
      memberName: 'Mamadou Konaté',
      pinHash: pinHash('9274'),
      enrolledAt: '2026-10-26',
    });

    useLockStore.getState().lock();
    expect(useLockStore.getState().locked).toBe(true);

    expect(useLockStore.getState().unlock('0000')).toBe(false);
    expect(useLockStore.getState().locked).toBe(true);

    expect(useLockStore.getState().unlock('9274')).toBe(true);
    expect(useLockStore.getState().locked).toBe(false);
  });

  it('oublie tout à la révocation', () => {
    writeEnrollment({
      deviceId: 'dev-1',
      organizationId: 'org-etoile',
      memberId: 'u-mamadou',
      memberName: 'Mamadou Konaté',
      pinHash: pinHash('9274'),
      enrolledAt: '2026-10-26',
    });
    clearEnrollment();
    expect(readEnrollment()).toBeNull();
    expect(verifyLocalPin('9274')).toBe(false);
  });
});
