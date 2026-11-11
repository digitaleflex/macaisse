/**
 * Police d'icônes (Material Symbols Outlined, chargée par `index.html`).
 *
 * Tant qu'elle n'est pas disponible, une icône est un simple texte (« point_of_sale »).
 * Cette fonction attend le chargement réel et pose la classe `icons-ready` sur `<html>` ;
 * le CSS masque le texte de repli avant ce moment (voir `index.css`).
 */

const ICON_FONT = "24px 'Material Symbols Outlined'";

interface FontSet {
  load(font: string): Promise<unknown>;
  check(font: string): boolean;
}

/** Vrai si la police d'icônes est chargée et utilisable. */
export async function waitForIconFont(fonts: FontSet | undefined): Promise<boolean> {
  if (!fonts) return false;
  try {
    await fonts.load(ICON_FONT);
    return fonts.check(ICON_FONT);
  } catch {
    return false;
  }
}

/** Marque le document « icônes prêtes » dès que la police est chargée. Sans effet si elle échoue. */
export async function markIconsReady(doc: Document = document): Promise<boolean> {
  const ready = await waitForIconFont(doc.fonts as FontSet | undefined);
  if (ready) doc.documentElement.classList.add('icons-ready');
  return ready;
}
