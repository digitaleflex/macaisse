import { useEffect, type ComponentType } from 'react';
import type { TabType } from '@/types';
import { t } from '@/content';
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
import { bootstrapApp } from '@/store/bootstrap';
import { selectSession, useSessionStore } from '@/store/useSessionStore';
import { selectTab, useUiStore } from '@/store/useUiStore';
import { BrandMark, Button, EmptyState, Spinner, ToastHost } from '@/ui';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Table de routage onglet → vue de feature (les vues lisent elles-mêmes les stores). */
const VIEWS: Record<TabType, ComponentType> = {
  accueil: AccueilView,
  ventes: VentesView,
  stock: StockView,
  credits: CreditsView,
  bilan: BilanView,
};

function SplashScreen() {
  const status = useSessionStore((state) => state.status);
  const error = useSessionStore((state) => state.error);
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-5 bg-canvas p-6">
      <BrandMark className="size-14" />
      {status === 'error' ? (
        <EmptyState
          icon="cloud_off"
          title={t.app.loadErrorTitle}
          description={error ?? undefined}
          action={
            <Button icon="refresh" onClick={() => void bootstrapApp()}>
              {t.app.retry}
            </Button>
          }
        />
      ) : (
        <div className="flex items-center gap-2.5 text-sm text-slate-500">
          <Spinner size="sm" />
          {t.app.loading}
        </div>
      )}
    </div>
  );
}

/**
 * Shell applicatif : chargement initial (services), layout responsive
 * (sidebar ≥ lg, barre d'onglets < lg), routage d'onglet et overlays globaux.
 */
export default function App() {
  const tab = useUiStore(selectTab);
  const initOnlineListener = useUiStore((state) => state.initOnlineListener);
  const session = useSessionStore(selectSession);

  useEffect(() => initOnlineListener(), [initOnlineListener]);
  useEffect(() => {
    void bootstrapApp();
  }, []);

  if (session === null) return <SplashScreen />;

  const View = VIEWS[tab];

  return (
    <div className="min-h-dvh bg-canvas text-ink-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-ink-900 focus:text-white"
      >
        {t.app.skipToContent}
      </a>
      <Sidebar />
      <div className="lg:pl-[264px] flex flex-col min-h-dvh">
        <Topbar />
        <main id="main" className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-28 lg:pb-10">
          <View key={tab} />
        </main>
      </div>
      <BottomNav />

      {/* Overlays globaux (pilotés par `useUiStore`) */}
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
