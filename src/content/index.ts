/**
 * Accès au contenu textuel de l'interface. Usage : `import { t } from '@/content'`
 * puis `t.dashboard.greeting(prénom)`. Langue unique (fr) à ce stade.
 */
import { fr, plural, type Content } from './fr';

export const t: Content = fr;
export { plural };
export type { Content };
