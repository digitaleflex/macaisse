import { useEffect, type ComponentType } from 'react';
import type { TabType } from '@/types';
import { AccueilView } from '@/features/accueil';
import { VentesView, ReceiptModal } from '@/features/ventes';
import { StockView } from '@/features/stock';
import { CreditsView } from '@/features/credits';
import { BilanView } from '@/features/bilan';
import { DepensesModal } from '@/features/depenses';
import { ExportModal } from '@/features/export';
import { ProfilModal } from '@/features/profil';
import { AbonnementModal } from '@/features/abonnement';
import { NotificationDrawer } from '@/features/notifications';
import { ToastHost } from '@/ui';
import { selectTab, useUiStore } from '@/store/useUiStore';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

/** Table de routage onglet → vue de feature (les vues lisent elles-mêmes les stores). */
const VIEWS: Record<TabType, ComponentType> = {
  accueil: AccueilView,
  ventes: VentesView,
  stock: StockView,
  credits: CreditsView,
  bilan: BilanView,
};

/**
 * Shell applicatif — volontairement mince : layout + routage d'onglet + montage
 * des overlays globaux, tous auto-gérés par `useUiStore.modal`. Aucune donnée
 * métier ni logique de domaine ici.
 */
export default function App() {
  const tab = useUiStore(selectTab);
  const initOnlineListener = useUiStore((state) => state.initOnlineListener);

  useEffect(() => initOnlineListener(), [initOnlineListener]);

  const View = VIEWS[tab];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-400 selection:text-slate-950">
      <Header />

      {/* Main View Container */}
      <main className="flex-1 w-full max-w-md mx-auto pt-20">
        <View />
      </main>

      <BottomNav />

      {/* Overlays globaux (auto-gardés par `useUiStore`) */}
      <DepensesModal />
      <ExportModal />
      <ProfilModal />
      <AbonnementModal />
      <NotificationDrawer />
      <ReceiptModal />
      <ToastHost />
    </div>
  );
}
