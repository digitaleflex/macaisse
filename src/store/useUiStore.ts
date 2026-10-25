// Store d'interface : onglet courant, modale ouverte, état réseau réel et
// préférences locales. Le toast est délégué au bus `@/ui/toastBus` (le store
// n'est pas propriétaire du rendu visuel).

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine, SaleTransaction, TabType } from '@/types';
import { toIsoDate } from '@/domain/dates';
// Exception de couche assumée (contrat `toastBus`) : le store publie des toasts
// sans connaître le rendu, et `ToastHost` ne dépend pas du store.
// eslint-disable-next-line no-restricted-imports
import { pushToast, type ToastTone } from '@/ui/toastBus';
import {
  coerceBoolean,
  coerceString,
  isRecord,
  isTabType,
  PERSIST_NAMES,
  persistOptions,
} from './storeUtils';

export type UiModal = 'depenses' | 'export' | 'profil' | 'abonnement' | 'notifications' | 'equipe';

/**
 * Contenu du reçu global (ticket de caisse) affiché par `ReceiptModal`.
 * `items` est le snapshot des lignes du panier au moment de la vente ; il peut
 * être vide quand la vente provient d'un historique ne portant pas le détail des
 * lignes (le reçu retombe alors sur son affichage `itemsCount`).
 */
export interface ReceiptState {
  sale: SaleTransaction;
  items: CartLine[];
}

/**
 * Préférences du point de vente. Les trois options ci-dessous sont **persistées
 * mais pas encore branchées** (marquées « Bientôt » dans l'interface) : ne pas
 * les présenter comme actives. La déduction de stock, elle, est toujours
 * appliquée à l'encaissement — ce n'est pas une option.
 */
export interface UiPreferences {
  /** Alerte SMS en cas de rupture (à brancher sur un service d'envoi). */
  alertesSmsRupture: boolean;
  /** Impression via imprimante thermique Bluetooth (à brancher). */
  imprimanteBluetooth: boolean;
  /** Bip sonore au scan (à brancher sur le lecteur). */
  bipSonoreScan: boolean;
}

export interface UiState {
  tab: TabType;
  modal: UiModal | null;
  /**
   * Reçu global transitoire (NON persisté) : il n'existe qu'en mémoire le temps
   * d'afficher le ticket d'une vente. `App.tsx` monte un unique `<ReceiptModal>`
   * piloté par ce champ.
   */
  receipt: ReceiptState | null;
  isOnline: boolean;
  preferences: UiPreferences;
  /** Date (ISO) de la dernière clôture de caisse ; `null` = caisse ouverte. */
  registerClosedAt: string | null;
  setTab: (tab: TabType) => void;
  openModal: (modal: UiModal) => void;
  closeModal: () => void;
  toggleModal: (modal: UiModal) => void;
  /** Ouvre le reçu d'une vente ; `items` vaut `[]` si le détail des lignes est inconnu. */
  openReceipt: (sale: SaleTransaction, items?: CartLine[]) => void;
  closeReceipt: () => void;
  showToast: (message: string, tone?: ToastTone) => void;
  clearToast: () => void;
  setOnline: (isOnline: boolean) => void;
  /** À appeler une fois dans un `useEffect` de l'app ; renvoie le nettoyage. */
  initOnlineListener: () => () => void;
  updatePreferences: (patch: Partial<UiPreferences>) => void;
  /** Clôture / réouverture de la caisse du jour (persistée). */
  toggleRegisterClosed: () => void;
}

const DEFAULT_PREFERENCES: UiPreferences = {
  alertesSmsRupture: false,
  imprimanteBluetooth: false,
  bipSonoreScan: false,
};

function readOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      tab: 'accueil',
      modal: null,
      receipt: null,
      registerClosedAt: null,
      isOnline: readOnline(),
      preferences: { ...DEFAULT_PREFERENCES },

      setTab: (tab) => set({ tab }),
      // Le reçu et une modale ne se superposent jamais : ouvrir l'un referme
      // l'autre. L'app n'a aucune pile d'overlays et rouvrir coûte un clic ; le
      // dernier geste de l'utilisateur prime donc sur l'overlay encore ouvert.
      openModal: (modal) => set({ modal, receipt: null }),
      closeModal: () => set({ modal: null }),
      toggleModal: (modal) =>
        set((state) => ({ modal: state.modal === modal ? null : modal, receipt: null })),
      openReceipt: (sale, items = []) => set({ receipt: { sale, items }, modal: null }),
      closeReceipt: () => set({ receipt: null }),

      // Le bus possède le toast : le store ne fait que le publier.
      showToast: (message, tone = 'info') => pushToast(message, tone),
      // Le toast s'auto-efface (`DISMISS_AFTER_MS`) : plus rien à nettoyer ici.
      clearToast: () => undefined,

      setOnline: (isOnline) => set({ isOnline }),

      initOnlineListener: () => {
        if (typeof window === 'undefined') return () => undefined;
        const sync = () => {
          get().setOnline(readOnline());
        };
        window.addEventListener('online', sync);
        window.addEventListener('offline', sync);
        sync();
        return () => {
          window.removeEventListener('online', sync);
          window.removeEventListener('offline', sync);
        };
      },

      updatePreferences: (patch) =>
        set((state) => ({ preferences: { ...state.preferences, ...patch } })),

      toggleRegisterClosed: () => {
        const today = toIsoDate(new Date());
        set((state) => ({ registerClosedAt: state.registerClosedAt === today ? null : today }));
      },
    }),
    // Seuls `tab` et `registerClosedAt` sont persistés ; `isOnline` et `receipt` (transitoires)
    // restent hors du `partialize` — le reçu ne doit JAMAIS être écrit dans
    // localStorage.
    // `modal` et `receipt` sont transitoires : les persister rouvrait une modale
    // après reconnexion (constat m1 de l'audit).
    persistOptions<UiState, { tab: TabType; registerClosedAt: string | null }>(
      PERSIST_NAMES.ui,
      (state) => ({ tab: state.tab, registerClosedAt: state.registerClosedAt }),
      (persisted) => {
        if (!isRecord(persisted)) return { tab: 'accueil', registerClosedAt: null };
        const closedAt = coerceString(persisted.registerClosedAt);
        return {
          tab: isTabType(persisted.tab) ? persisted.tab : 'accueil',
          registerClosedAt: /^\d{4}-\d{2}-\d{2}$/.test(closedAt) ? closedAt : null,
        };
      }
    )
  )
);

// ---------------------------------------------------------------------------
// Sélecteurs
// ---------------------------------------------------------------------------

export const selectTab = (state: UiState): TabType => state.tab;
export const selectModal = (state: UiState): UiModal | null => state.modal;
export const selectIsOnline = (state: UiState): boolean => coerceBoolean(state.isOnline, true);
export const selectPreferences = (state: UiState): UiPreferences => state.preferences;
