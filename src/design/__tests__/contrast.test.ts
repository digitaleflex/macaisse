/**
 * Contraste des paires réellement utilisées — WCAG 2.2.
 *
 * Ce test ne prétend pas vérifier l'interface entière : les fonds translucides,
 * les dégradés et les superpositions échappent au calcul. Il verrouille les
 * **paires déclarées** ci-dessous et interdit les combinaisons connues comme
 * fautives, pour que le P0 ne se re-perde pas silencieusement.
 *
 * Paires volontairement non testées : les séries de graphiques (voir
 * `docs/design-system-contrast.md` §7) et les pastels du PDF (thème d'impression).
 */
import { describe, expect, it } from 'vitest';
import { chartColors, hexToRgb, palette, themeColors } from '../tokens';

/** Linéarisation WCAG d'un canal 0-255. */
function channelLuminance(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(channelLuminance);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const luminances = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

const WHITE = themeColors.surface;

/**
 * `slate-400` n'est plus dans `palette` (aucun consommateur JS) mais reste la
 * couleur à interdire sur fond clair : on la déclare ici pour verrouiller
 * l'interdiction, sans la remettre dans le module de production.
 */
const SLATE_400 = '#94a3b8';

/** Paires texte : seuil AA 4,5:1. */
const TEXT_PAIRS = [
  ['ink-900 sur surface', themeColors.ink900, WHITE],
  ['blanc sur ink-900', WHITE, themeColors.ink900],
  ['muted sur surface', themeColors.muted, WHITE],
  ['muted sur canvas', themeColors.muted, themeColors.canvas],
  ['slate-500 sur surface (métadonnées)', palette.slate500, WHITE],
  ['slate-400 sur ink-900 (surfaces sombres)', SLATE_400, themeColors.ink900],
  ['brand-700 sur surface', themeColors.brand700, WHITE],
  ['blanc sur brand-700 (CTA)', WHITE, themeColors.brand700],
  ['zest-400 sur ink-950', themeColors.zest400, themeColors.ink950],
  ['blanc sur ink-950 (overlay)', WHITE, themeColors.ink950],
] as const;

/** Combinaisons connues comme fautives : on verrouille l'interdiction. */
const FORBIDDEN_PAIRS = [
  ['slate-400 sur surface', SLATE_400, WHITE, 3],
  ['slate-400 sur canvas', SLATE_400, themeColors.canvas, 3],
  ['muted sur ink-900', themeColors.muted, themeColors.ink900, 3],
  ['zest-300 sur surface', themeColors.zest300, WHITE, 3],
] as const;

describe('contraste — paires texte déclarées', () => {
  it.each(TEXT_PAIRS)('%s atteint AA (4,5:1)', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('contraste — combinaisons interdites', () => {
  it.each(FORBIDDEN_PAIRS)('%s reste sous 3:1 (interdit)', (_label, fg, bg, ceiling) => {
    expect(contrastRatio(fg, bg)).toBeLessThan(ceiling);
  });
});

describe('contraste — axe des graphiques (non textuel)', () => {
  it('atteint 3:1 sur surface, et 4,5:1 pour ses libellés 11 px', () => {
    expect(contrastRatio(chartColors.axis, WHITE)).toBeGreaterThanOrEqual(4.5);
  });
});
