import { t } from '@/content';
import { isApiError } from './http/ApiError';

/**
 * Traduction d'une erreur technique en message **actionnable** (et en indication
 * de rejouabilité).
 *
 * Règle : un message métier fourni par le serveur (400–499) est conservé tel quel
 * — il est déjà en français et porte l'information utile. Les pannes (réseau,
 * timeout, 5xx) sont reformulées : l'utilisateur n'a que faire de « 500 ».
 */
export interface UserError {
  message: string;
  /** Vrai si un nouvel essai a une chance d'aboutir. */
  retryable: boolean;
}

export function describeError(error: unknown): UserError {
  if (!isApiError(error)) {
    const message = error instanceof Error && error.message.length > 0 ? error.message : t.errors.unknown;
    return { message, retryable: false };
  }

  switch (error.status) {
    case 0:
      return error.code === 'TIMEOUT'
        ? { message: t.errors.timeout, retryable: true }
        : { message: t.errors.network, retryable: true };
    case 401:
      return error.code === 'STEP_UP_REQUIRED'
        ? { message: t.errors.stepUp, retryable: true }
        : { message: error.message || t.errors.session, retryable: false };
    case 403:
      return { message: error.message || t.errors.forbidden, retryable: false };
    case 404:
      return { message: error.message || t.errors.notFound, retryable: false };
    case 409:
      return { message: error.message || t.errors.conflict, retryable: false };
    case 410:
      return { message: error.message || t.errors.expired, retryable: true };
    case 422:
      return { message: error.message || t.errors.validation, retryable: false };
    case 429:
      return { message: error.message || t.errors.tooMany, retryable: true };
    default:
      if (error.status >= 500) return { message: t.errors.server, retryable: true };
      return { message: error.message || t.errors.unknown, retryable: false };
  }
}

/** Raccourci pour les endroits qui n'affichent que le texte. */
export function errorText(error: unknown): string {
  return describeError(error).message;
}
