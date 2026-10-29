/**
 * Miroir TypeScript des design tokens de `src/index.css`.
 *
 * `src/index.css` reste la source unique : ce fichier existe uniquement parce que
 * Recharts (props `fill` / `stroke` / `Cell`) et jsPDF (triplets RGB) ne savent pas
 * lire les custom properties CSS. `tokens.parity.test.ts` vérifie que les deux
 * sources restent identiques — toute divergence casse la suite de tests.
 *
 * Règle : ne jamais consommer ces valeurs pour du style DOM (utiliser les classes
 * Tailwind `bg-ink-900`, `text-muted`, …) ; uniquement pour les API JS.
 */

/** Couleurs déclarées dans le bloc `@theme` de `src/index.css` (source unique). */
export const themeColors = {
  ink950: '#060a13',
  ink900: '#0b1220',
  ink800: '#131c2e',
  ink700: '#1e293d',
  ink600: '#334058',

  brand50: '#ecfdf5',
  brand100: '#d1fae5',
  brand200: '#a7f3d0',
  brand300: '#6ee7b7',
  brand400: '#34d399',
  brand500: '#10b981',
  brand600: '#059669',
  brand700: '#047857',
  brand800: '#065f46',

  zest300: '#dcfb8a',
  zest400: '#c5f441',
  zest500: '#a8d820',

  canvas: '#f4f5f8',
  surface: '#ffffff',
  line: '#e5e8ee',
  lineStrong: '#d3d8e2',

  muted: '#475569',
} as const;

/**
 * Palette Tailwind consommée par les graphiques mais non redéclarée dans `@theme`.
 * Ces valeurs viennent du preset Tailwind 4 ; elles ne font pas partie des tokens
 * du produit et ne sont pas couvertes par le test de parité.
 */
export const palette = {
  slate100: '#f1f5f9',
  slate300: '#cbd5e1',
  slate500: '#64748b',
  sky500: '#0ea5e9',
  rose500: '#f43f5e',
  rose600: '#e11d48',
} as const;

/**
 * Couleurs des graphiques, dérivées des tokens quand une équivalence existe.
 * - `axis` : `slate-500` (4,76:1 sur blanc) remplace `slate-400` (2,56:1, échec AA).
 * - `grid` / `cursor` : surfaces du système, plus de gris parallèles.
 */
export const chartColors = {
  axis: palette.slate500,
  grid: themeColors.line,
  cursor: palette.slate100,
  ink: themeColors.ink900,
  positive: themeColors.brand500,
  positiveStrong: themeColors.brand600,
  accent: themeColors.zest400,
  info: palette.sky500,
  negative: palette.rose500,
  target: palette.rose600,
} as const;

/** Série catégorielle : ordre stable, couleurs distinguables deux à deux. */
export const chartSeries = [
  chartColors.ink,
  chartColors.positive,
  chartColors.accent,
  chartColors.info,
  chartColors.negative,
] as const;

/** Convertit un hex `#rgb` / `#rrggbb` en triplet RGB (jsPDF). */
export function hexToRgb(hex: string): [number, number, number] {
  const value = hex.trim().replace(/^#/, '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;

  if (!/^[0-9a-f]{6}$/i.test(full)) {
    throw new Error(`hexToRgb: couleur invalide « ${hex} » (attendu #rgb ou #rrggbb)`);
  }

  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}
