/**
 * Barrel du shell applicatif (« app/ ») : layout, navigation et routage d'onglet.
 * Seul point d'entrée consommé par `src/main.tsx`.
 */

export { default as App } from './App';
export { Header } from './Header';
export { BottomNav } from './BottomNav';
export { TABS, tabTitle } from './routes';
export type { TabDefinition } from './routes';
