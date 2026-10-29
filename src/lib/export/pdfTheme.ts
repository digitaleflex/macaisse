/**
 * Thème d'impression du PDF comptable, dérivé des design tokens.
 *
 * Divergence corrigée : l'encre était `#0b1c30`, elle devient `ink-900` (`#0b1220`),
 * identique à l'écran et aux reçus.
 *
 * Exception documentée : les teintes pastel des encadrés (verts / rouges / bleus)
 * et les gris de pied de page sont des valeurs d'impression choisies pour rester
 * lisibles sur papier blanc ; elles ne font pas partie de la palette écran et ne
 * sont donc pas couvertes par le test de parité de `themeColors`.
 */
import { hexToRgb, themeColors } from '@/design/tokens';

type Rgb = [number, number, number];

export const pdfTheme = {
  /** Encre principale : en-tête, en-têtes de tableau, texte. */
  ink: hexToRgb(themeColors.ink900) as Rgb,
  /** Accent de marque (titre du document). */
  accent: hexToRgb(themeColors.zest400) as Rgb,
  white: [255, 255, 255] as Rgb,

  /** Métadonnées d'en-tête — teinte papier, hors palette écran. */
  headerMeta: [218, 226, 253] as Rgb,

  /* Encadré « Ventes » */
  successFill: [240, 253, 244] as Rgb,
  successBorder: [187, 247, 208] as Rgb,
  successText: [22, 101, 52] as Rgb,

  /* Encadré « Dépenses » */
  dangerFill: [254, 242, 242] as Rgb,
  dangerBorder: [254, 202, 202] as Rgb,
  dangerText: [153, 27, 27] as Rgb,

  /* Encadré « Solde net » */
  infoFill: [239, 244, 255] as Rgb,
  infoBorder: [220, 233, 255] as Rgb,

  /* Tableau */
  tableLine: [229, 238, 255] as Rgb,
  tableAlt: [248, 249, 255] as Rgb,
  tableTotal: [234, 241, 255] as Rgb,

  /* Pied de page */
  footerMuted: [86, 94, 116] as Rgb,
  /** Pagination 7 pt : gris assombri (≈4,8:1 sur blanc), l'ancien #828ca0 tombait à 3,4:1. */
  pageMuted: [107, 114, 128] as Rgb,
  signatureBorder: [200, 210, 230] as Rgb,
} as const;
