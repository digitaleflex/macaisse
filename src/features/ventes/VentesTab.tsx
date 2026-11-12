import { t } from '@/content';
import { useUiStore, type SalesView } from '@/store/useUiStore';
import { SegmentedControl } from '@/ui';
import { SalesHistoryView } from './SalesHistoryView';
import { VentesView } from './VentesView';

const VIEW_OPTIONS = [
  { value: 'pos', label: t.sales.views.pos },
  { value: 'history', label: t.sales.views.history },
] as const;

/**
 * Onglet Caisse : bascule entre l'encaissement (catalogue + panier) et
 * l'historique des ventes. Le volet courant vit dans `useUiStore` pour que
 * l'accueil puisse ouvrir directement l'historique.
 */
export function VentesTab() {
  const view = useUiStore((state) => state.salesView);
  const setView = useUiStore((state) => state.setSalesView);

  return (
    <div className="flex flex-col gap-4">
      {/* Titre de page pour les lecteurs d'écran : la Caisse n'a pas d'en-tête visible. */}
      <h1 className="sr-only">{t.nav.ventes.title}</h1>
      <SegmentedControl<SalesView>
        label={t.sales.views.label}
        size="sm"
        value={view}
        options={VIEW_OPTIONS}
        onChange={setView}
      />
      {view === 'history' ? <SalesHistoryView /> : <VentesView />}
    </div>
  );
}
