// Store d'interface : onglet courant, modale ouverte, état réseau réel et
// préférences locales. Le toast est délégué au bus `@/ui/toastBus` (le store
// n'est pas propriétaire du rendu visuel).

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine, SaleTransaction, TabType } from '@/types';
import { pushToast, type ToastTone } from '@/ui/toastBus';
import {
  coerceBoolean,
  isRecord,
  isTabType,
  PERSIST_NAMES,
  persistOptions,
} from './storeUtils';

export type UiModal = 'depenses' | 'export' | 'profil' | 'abonnement' | 'notifications';

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

export interface UiPreferences {
  /** Déduction automatique du stock à l'encaissement. */
  deductionAutoStock: boolean;
  /** Alertes SMS en cas de rupture. */
  alertesSmsRupture: boolean;
  /** Imprimante thermique Bluetooth connectée. */
  imprimanteBluetooth: boolean;
  /** Bip sonore au scan. */
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
}

const DEFAULT_PREFERENCES: UiPreferences = {
  deductionAutoStock: true,
  alertesSmsRupture: true,
  imprimanteBluetooth: true,
  bipSonoreScan: true,
};

const UI_MODAL_SET: ReadonlySet<string> = new Set([
  'depenses',
  'export',
  'profil',
  'abonnement',
  'notifications',
]);

function isUiModal(value: unknown): value is UiModal {
  return typeof value === 'string' && UI_MODAL_SET.has(value);
}

function readOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      tab: 'accueil',
      modal: null,
      receipt: null,
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
    }),
    // Seuls `tab` et `modal` sont persistés ; `isOnline` et `receipt` (transitoires)
    // restent hors du `partialize` — le reçu ne doit JAMAIS être écrit dans
    // localStorage.
    persistOptions<UiState, { tab: TabType; modal: UiModal | null }>(
      PERSIST_NAMES.ui,
      (state) => ({ tab: state.tab, modal: state.modal }),
      (persisted) => {
        if (!isRecord(persisted)) return { tab: 'accueil', modal: null };
        return {
          tab: isTabType(persisted.tab) ? persisted.tab : 'accueil',
          modal: isUiModal(persisted.modal) ? persisted.modal : null,
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
export const selectReceipt = (state: UiState): ReceiptState | null => state.receipt;
export const selectIsOnline = (state: UiState): boolean => coerceBoolean(state.isOnline, true);
export const selectPreferences = (state: UiState): UiPreferences => state.preferences;
