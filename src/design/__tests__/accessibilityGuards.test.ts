import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Garde-fous du design : ils lisent le code source pour empêcher le retour de défauts
 * relevés par l'audit d'accessibilité (axe-core) sur les écrans réels. Un défaut de
 * contraste ou de structure est facile à réintroduire en recopiant une classe existante.
 */

const SRC = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : walk(path);
    return path.endsWith('.tsx') ? [path] : [];
  });
}

const FILES = walk(SRC).map((path) => ({ path: path.slice(SRC.length + 1), text: readFileSync(path, 'utf8') }));
const offenders = (test: (file: { path: string; text: string }) => boolean) =>
  FILES.filter(test).map((file) => file.path);

describe('lisibilité', () => {
  it('aucun texte sous 12 px (hors légende décorative du code-barres du ticket)', () => {
    const tiny = FILES.flatMap(({ path, text }) =>
      text
        .split('\n')
        .filter((line) => /text-\[(?:9|10|11)px\]/.test(line) && !line.includes('tracking-[0.25em]'))
        .map((line) => `${path}: ${line.trim().slice(0, 80)}`)
    );
    expect(tiny).toEqual([]);
  });

  it('aucune taille de police de graphique sous 12', () => {
    expect(offenders(({ text }) => /fontSize=\{(?:9|10|11)\}/.test(text))).toEqual([]);
  });
});

describe('contraste du texte', () => {
  it('pas de texte rouge trop clair (rose-600 passe à 4,4:1 sur blanc, rose-700 à 6,5:1)', () => {
    expect(offenders(({ text }) => text.includes('text-rose-600'))).toEqual([]);
  });

  it('pas de texte à opacité réduite (la teinte réelle devient imprévisible)', () => {
    expect(
      offenders(({ text }) => /text-(?:rose|amber|emerald|brand|sky|slate|ink)-\d{3}\/\d+/.test(text))
    ).toEqual([]);
  });

  it('texte orange en 700 : amber-600 reste sous 4,5:1 sur blanc', () => {
    const risky = FILES.flatMap(({ path, text }) =>
      text
        .split('\n')
        // une icône (`<Icon …>`) ou une pastille de fond (`bg-amber-50 text-amber-600`) tolère 3:1
        .filter((line) => line.includes('text-amber-600') && !line.includes('<Icon') && !line.includes('bg-amber-50'))
        .map((line) => `${path}: ${line.trim().slice(0, 80)}`)
    );
    expect(risky).toEqual([]);
  });

  it('un article épuisé n’est pas atténué en entier : son badge resterait illisible', () => {
    const card = FILES.find((file) => file.path.endsWith('ventes/ProductCard.tsx'))?.text ?? '';
    expect(card).not.toMatch(/soldOut && 'opacity-60'\s*\n\s*\)\}\s*\n\s*>/);
    expect(card.match(/opacity-60/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

describe('structure accessible', () => {
  it('les fenêtres et tiroirs n’utilisent pas <header>/<footer> (ce seraient des zones de page en double)', () => {
    for (const name of ['ui/Modal.tsx', 'ui/Drawer.tsx']) {
      const text = FILES.find((file) => file.path === name)?.text ?? '';
      expect(text, name).not.toMatch(/<header|<footer/);
    }
  });

  it('toute liste déroulante a un libellé visible ou un nom accessible', () => {
    const unnamed = FILES.flatMap(({ path, text }) =>
      [...text.matchAll(/<Select\b[\s\S]*?\/>/g)]
        .filter((match) => !/\blabel=|\bariaLabel=/.test(match[0]))
        .map(() => path)
    );
    expect(unnamed).toEqual([]);
  });

  it('chaque zone latérale (<aside>) porte un nom : plusieurs coexistent sur la Caisse', () => {
    const unnamed = FILES.flatMap(({ path, text }) =>
      [...text.matchAll(/<aside\b[^>]*>/g)].filter((match) => !/aria-label=/.test(match[0])).map(() => path)
    );
    // L'écran de connexion a un panneau décoratif unique : un seul <aside> n'est pas ambigu.
    expect(unnamed.filter((path) => !path.endsWith('LoginScreen.tsx'))).toEqual([]);
  });

  it('les boutons dont le texte disparaît sur téléphone gardent un nom accessible', () => {
    const risky = FILES.flatMap(({ path, text }) =>
      [...text.matchAll(/<Button\b[^>]*>\s*<span className="hidden (?:sm|md|lg):inline">/g)]
        .filter((match) => !match[0].includes('aria-label='))
        .map(() => path)
    );
    expect(risky).toEqual([]);
  });

  it('l’identifiant du bouton d’encaissement est unique (panier du bureau et feuille mobile coexistent)', () => {
    const view = FILES.find((file) => file.path.endsWith('ventes/VentesView.tsx'))?.text ?? '';
    const ids = [...view.matchAll(/checkoutId="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('checkout-cta-btn-mobile');
  });

  it('la Caisse expose un titre de page de premier niveau pour les lecteurs d’écran', () => {
    const tab = FILES.find((file) => file.path.endsWith('ventes/VentesTab.tsx'))?.text ?? '';
    expect(tab).toMatch(/<h1 className="sr-only">/);
  });

  it('les zones défilantes des fenêtres sont atteignables au clavier', () => {
    for (const name of ['ui/Modal.tsx', 'ui/Drawer.tsx']) {
      const text = FILES.find((file) => file.path === name)?.text ?? '';
      expect(text, name).toMatch(/tabIndex=\{0\}/);
    }
  });
});
