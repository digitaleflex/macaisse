import { describe, expect, it } from 'vitest';
import { t } from '@/content';
import { ApiError } from '../http/ApiError';
import { describeError } from '../errorMessages';

/**
 * Les messages d'erreur doivent être **actionnables** : une panne réseau ne doit
 * pas s'afficher « Le serveur a répondu 500 », et un refus métier doit conserver
 * le texte du serveur.
 */
describe('describeError', () => {
  it('reformule les pannes réseau et les marque rejouables', () => {
    expect(describeError(new ApiError('', 0, 'NETWORK'))).toEqual({
      message: t.errors.network,
      retryable: true,
    });
    expect(describeError(new ApiError('', 0, 'TIMEOUT'))).toEqual({
      message: t.errors.timeout,
      retryable: true,
    });
  });

  it('reformule les 5xx sans exposer le statut', () => {
    const error = describeError(new ApiError('Le serveur a répondu 500.', 500, 'SERVER_ERROR'));
    expect(error).toEqual({ message: t.errors.server, retryable: true });
    expect(error.message).not.toContain('500');
  });

  it('conserve le message métier des refus 4xx', () => {
    expect(describeError(new ApiError('Stock insuffisant.', 422, 'INSUFFICIENT_STOCK'))).toEqual({
      message: 'Stock insuffisant.',
      retryable: false,
    });
    expect(describeError(new ApiError('Un compte existe déjà.', 409, 'EMAIL_TAKEN')).message).toBe(
      'Un compte existe déjà.'
    );
  });

  it('distingue la session expirée du step-up', () => {
    expect(describeError(new ApiError('', 401, 'UNAUTHENTICATED'))).toEqual({
      message: t.errors.session,
      retryable: false,
    });
    expect(describeError(new ApiError('', 401, 'STEP_UP_REQUIRED'))).toEqual({
      message: t.errors.stepUp,
      retryable: true,
    });
  });

  it('propose de patienter sur un 429', () => {
    expect(describeError(new ApiError('', 429, 'OTP_RATE_LIMITED'))).toEqual({
      message: t.errors.tooMany,
      retryable: true,
    });
  });

  it('retombe sur un message générique pour une erreur inconnue', () => {
    expect(describeError(new Error('boum'))).toEqual({ message: 'boum', retryable: false });
    expect(describeError('inconnu')).toEqual({ message: t.errors.unknown, retryable: false });
  });
});
