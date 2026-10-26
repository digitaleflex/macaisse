import { t } from '@/content';
import type { PasswordIssue } from '@/domain/password';

/** Message affiché pour le premier manquement détecté (RG-A29). */
export const PASSWORD_ISSUE_MESSAGE: Record<PasswordIssue, string> = {
  too_short: t.auth.errors.passwordShort,
  too_long: t.auth.errors.passwordLong,
  common: t.auth.errors.passwordCommon,
  contains_identity: t.auth.errors.passwordIdentity,
  repeated: t.auth.errors.passwordRepeated,
};
