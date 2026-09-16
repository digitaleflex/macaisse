/**
 * DESIGN TOKENS - Système de Design 'Ma Caisse'
 * Couleurs, typographies, statuts métier et styles réutilisables
 */

export const TOKENS = {
  colors: {
    // Brand Base
    brandNavy: {
      950: '#080e18',
      900: '#0f172a',
      800: '#1e293b',
      700: '#334155',
    },
    // Primary Action Accents
    accent: {
      emerald: '#10b981',
      emeraldHover: '#059669',
      emeraldSubtle: '#ecfdf5',
      emeraldBorder: '#a7f3d0',
      lime: '#84cc16',
      limeVibrant: '#a3e635',
      limeSubtle: '#f7fee7',
    },
    // Surface & Canvas
    surfaces: {
      canvas: '#f8fafc',
      card: '#ffffff',
      subtle: '#f1f5f9',
      hover: '#e2e8f0',
      active: '#cbd5e1',
    },
    // Borders
    borders: {
      base: '#e2e8f0',
      subtle: '#f1f5f9',
      focus: '#0f172a',
    },
    // Typography
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      muted: '#94a3b8',
      inverse: '#ffffff',
    },
    // Semantic Functional States
    status: {
      success: {
        text: '#059669',
        bg: '#ecfdf5',
        border: '#a7f3d0',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      },
      danger: {
        text: '#e11d48',
        bg: '#fff1f2',
        border: '#fecdd3',
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
      },
      warning: {
        text: '#d97706',
        bg: '#fffbeb',
        border: '#fde68a',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
      },
      info: {
        text: '#0284c7',
        bg: '#f0f9ff',
        border: '#bae6fd',
        badge: 'bg-sky-50 text-sky-700 border-sky-200',
      },
    },
  },
  typography: {
    fontBody: 'Inter, system-ui, sans-serif',
    fontDisplay: 'Plus Jakarta Sans, system-ui, sans-serif',
    fontNumber: 'Plus Jakarta Sans, Inter, monospace',
  },
} as const;

/** Helper de style pour les badges de statut comptable ou de stock */
export const getStatusBadgeStyle = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'validé':
    case 'disponible':
    case 'payé':
    case 'succès':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-medium';
    case 'en retard':
    case 'rupture':
    case 'annulé':
      return 'bg-rose-50 text-rose-700 border border-rose-200/80 font-medium';
    case 'en cours':
    case 'faible':
    case 'partiel':
      return 'bg-amber-50 text-amber-700 border border-amber-200/80 font-medium';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200 font-medium';
  }
};
