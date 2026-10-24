import type { TabType } from '@/types';
import { t } from '@/content';
import { TAB_ICON, TAB_ORDER } from '@/config/reference';

/** Définition d'un onglet de navigation : identifiant, libellés et icône. */
export interface TabDefinition {
  id: TabType;
  /** Libellé court (navigation). */
  label: string;
  /** Titre de page (en-tête). */
  title: string;
  /** Sous-titre de page. */
  description: string;
  /** Nom d'icône Material Symbols. */
  icon: string;
}

/** Source unique de la navigation, dérivée du contenu (`@/content`) et du référentiel. */
export const TABS: readonly TabDefinition[] = TAB_ORDER.map((id) => ({
  id,
  icon: TAB_ICON[id],
  ...t.nav[id],
}));

export function tabDefinition(tab: TabType): TabDefinition {
  return TABS.find((entry) => entry.id === tab) ?? TABS[0];
}

export function tabTitle(tab: TabType): string {
  return tabDefinition(tab).title;
}
