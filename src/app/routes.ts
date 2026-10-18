import type { TabType } from '@/types';

/** Définition d'un onglet de navigation : identifiant, libellés et icône. */
export interface TabDefinition {
  id: TabType;
  /** Libellé court de la barre de navigation inférieure. */
  label: string;
  /** Libellé long affiché sous le logo dans l'en-tête. */
  title: string;
  /** Nom d'icône Material Symbols. */
  icon: string;
}

/**
 * Source unique de vérité de la navigation, consommée par `app/Header.tsx` et
 * `app/BottomNav.tsx` : les libellés et icônes ne sont donc définis qu'ici.
 */
export const TABS: readonly TabDefinition[] = [
  { id: 'accueil', label: 'Accueil', title: 'Accueil', icon: 'dashboard' },
  { id: 'ventes', label: 'Ventes', title: 'Ventes POS', icon: 'point_of_sale' },
  { id: 'stock', label: 'Stock', title: 'Stock & Réserves', icon: 'inventory_2' },
  { id: 'credits', label: 'Crédits', title: 'Crédits Clients', icon: 'account_balance_wallet' },
  { id: 'bilan', label: 'Bilan', title: 'Bilan Financier', icon: 'insights' },
];

/** Libellé long d'un onglet, avec repli sûr « Caisse ». */
export function tabTitle(tab: TabType): string {
  return TABS.find((entry) => entry.id === tab)?.title ?? 'Caisse';
}
