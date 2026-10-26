import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import type { TabType } from '@/types';
import { t } from '@/content';
import { canAccessTab } from '@/domain/permissions';
import { LockScreen, LoginScreen, StepUpModal, VerifyEmailBanner, useInactivityLock } from '@/features/auth';
import { SyncBanner } from './SyncBanner';
import { ReceiptModal } from '@/features/ventes';
import { DepensesModal } from '@/features/depenses';
import { ExportModal } from '@/features/export';
import { ProfilModal } from '@/features/profil';
import { AbonnementModal } from '@/features/abonnement';
import { NotificationDrawer } from '@/features/notifications';
import { OnboardingModal } from '@/features/onboarding';
import { TeamModal } from '@/features/equipe';
import { api, flushSyncQueue } from '@/services';
import { logout, reloadOrganization, restoreSession } from '@/store/auth';
import { selectIsAuthenticated, useAuthStore } from '@/store/useAuthStore';
import { selectSession, useSessionStore } from '@/store/useSessionStore';
import { selectTab, useUiStore } from '@/store/useUiStore';
import { BrandMark, Button, EmptyState, Spinner, ToastHost } from '@/ui';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

// Chaque vue est chargée à la demande : la caisse n'embarque ni Recharts (bilan)
// ni les écrans qu'un caissier n'ouvrira jamais.
const AccueilView = lazy(() =>
  import('@/features/accueil').then((module) => ({ default: module.AccueilView }))
);
const VentesView = lazy(() =>
  import('@/features/ventes').then((module) => ({ default: module.VentesView }))
);
const StockView = lazy(() =>
  import('@/features/stock').then((module) => ({ default: module.StockView }))
);
const CreditsView = lazy(() =>
  import('@/features/credits').then((module) => ({ default: module.CreditsView }))
);
const BilanView = lazy(() =>
  import('@/features/bilan').then((module) => ({ default: module.BilanView }))
);

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
            <div className="flex gap-2">
              <Button variant="secondary" icon="logout" onClick={() => void logout()}>
                {t.auth.logout}
              </Button>
              <Button icon="refresh" onClick={() => void reloadOrganization()}>
                {t.app.retry}
              </Button>
            </div>
          }
        />
      ) : (
        <div className="flex items-center gap-2.5 text-sm text-slate-500">
          <Spinner size="sm" />
          {t.auth.restoring}
        </div>
      )}
    </div>
  );
}

/** Attente du chargement d'une vue découpée (première visite de l'onglet). */
function ViewFallback() {
  return (
    <div className="flex items-center justify-center gap-2.5 py-24 text-sm text-slate-500" role="status">
      <Spinner size="sm" />
      {t.common.loading}
    </div>
  );
}

/** Voile affiché pendant l'ouverture d'une autre organisation. */
function SwitchingOverlay() {
  const loading = useSessionStore((state) => state.status === 'loading');
  if (!loading) return null;
  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-canvas/70 backdrop-blur-sm animate-fade-in" role="status">
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-ink-900 text-white text-sm shadow-overlay">
        <Spinner size="sm" />
        {t.org.switching}
      </div>
    </div>
  );
}

function AccessDenied() {
  const setTab = useUiStore((state) => state.setTab);
  const role = useSessionStore((state) => state.session?.role ?? 'cashier');
  return (
    <div className="bg-surface rounded-card border border-line">
      <EmptyState
        icon="lock"
        title={t.access.title}
        description={t.access.text(t.roles[role])}
        action={
          <Button icon="point_of_sale" onClick={() => setTab('ventes')}>
            {t.access.back}
          </Button>
        }
      />
    </div>
  );
}

/**
 * Shell applicatif : authentification, organisation active, layout responsive
 * (sidebar ≥ lg, barre d'onglets < lg), routage d'onglet et overlays globaux.
 */
export default function App() {
  const tab = useUiStore(selectTab);
  const isOnline = useUiStore((state) => state.isOnline);
  const initOnlineListener = useUiStore((state) => state.initOnlineListener);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const session = useSessionStore(selectSession);

  useEffect(() => initOnlineListener(), [initOnlineListener]);
  useEffect(() => {
    void restoreSession();
  }, []);
  // D6 : verrouillage après 15 min sans interaction sur un appareil enrôlé.
  useInactivityLock(session !== null);
  // Retour du réseau : on rejoue les mutations optimistes en attente.
  useEffect(() => {
    if (isOnline) void flushSyncQueue(api);
  }, [isOnline]);

  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen />
        <ToastHost />
      </>
    );
  }
  if (session === null) return <SplashScreen />;

  const View = canAccessTab(session.role, tab) ? VIEWS[tab] : AccessDenied;

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
        <VerifyEmailBanner />
        <SyncBanner />
        <main id="main" className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-28 lg:pb-10">
          <Suspense fallback={<ViewFallback />}>
            <View key={`${session.business.id}-${tab}`} />
          </Suspense>
        </main>
      </div>
      <BottomNav />

      {/* Overlays globaux (pilotés par `useUiStore`) */}
      <DepensesModal />
      <ExportModal />
      <ProfilModal />
      <AbonnementModal />
      <TeamModal />
      <OnboardingModal />
      <NotificationDrawer />
      <ReceiptModal />
      <SwitchingOverlay />
      <StepUpModal />
      <LockScreen />
      <ToastHost />
    </div>
  );
}
