// Verrouillage local de la caisse (D6, RG-A14/A16).
//
// L'appareil enrôlé conserve — **localement uniquement** — le hash du PIN du
// titulaire. Il permet d'ouvrir la caisse sans réseau ; la révocation de
// l'appareil efface ce cache (RG-A17). En production, le PIN de référence est
// un hash Argon2id côté serveur et ce fichier n'est qu'un cache d'appareil.

import { create } from 'zustand';
import { pinHash } from '@/domain/pin';

const ENROLLMENT_KEY = 'ma-caisse/device';

export interface EnrolledDevice {
  deviceId: string;
  organizationId: string;
  memberId: string;
  memberName: string;
  /** Hash local (démo) du PIN du titulaire. */
  pinHash: string;
  enrolledAt: string;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function readEnrollment(): EnrolledDevice | null {
  const store = storage();
  if (store === null) return null;
  try {
    const raw = store.getItem(ENROLLMENT_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<EnrolledDevice>;
    if (
      typeof parsed.deviceId !== 'string' ||
      typeof parsed.organizationId !== 'string' ||
      typeof parsed.memberId !== 'string' ||
      typeof parsed.pinHash !== 'string'
    ) {
      return null;
    }
    return {
      deviceId: parsed.deviceId,
      organizationId: parsed.organizationId,
      memberId: parsed.memberId,
      memberName: typeof parsed.memberName === 'string' ? parsed.memberName : '',
      pinHash: parsed.pinHash,
      enrolledAt: typeof parsed.enrolledAt === 'string' ? parsed.enrolledAt : '',
    };
  } catch {
    return null;
  }
}

export function writeEnrollment(enrollment: EnrolledDevice): void {
  const store = storage();
  if (store === null) return;
  try {
    store.setItem(ENROLLMENT_KEY, JSON.stringify(enrollment));
  } catch {
    // Stockage plein ou désactivé : la caisse reste utilisable en ligne.
  }
}

/** Efface l'enrôlement local (révocation de l'appareil, RG-A17). */
export function clearEnrollment(): void {
  const store = storage();
  if (store === null) return;
  try {
    store.removeItem(ENROLLMENT_KEY);
  } catch {
    // Rien à faire : le cache disparaîtra au prochain nettoyage.
  }
}

/** Vérifie un PIN contre le hash local (déverrouillage hors ligne). */
export function verifyLocalPin(pin: string): boolean {
  const enrolled = readEnrollment();
  return enrolled !== null && enrolled.pinHash === pinHash(pin);
}

export interface LockState {
  locked: boolean;
  /** Verrouille la caisse si un appareil est enrôlé. */
  lock: () => void;
  /** Tente de déverrouiller ; renvoie `false` si le PIN ne correspond pas. */
  unlock: (pin: string) => boolean;
  reset: () => void;
}

export const useLockStore = create<LockState>()((set) => ({
  locked: readEnrollment() !== null,
  lock: () => {
    if (readEnrollment() !== null) set({ locked: true });
  },
  unlock: (pin) => {
    if (!verifyLocalPin(pin)) return false;
    set({ locked: false });
    return true;
  },
  reset: () => set({ locked: false }),
}));
