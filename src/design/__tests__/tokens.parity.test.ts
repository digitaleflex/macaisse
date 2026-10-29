/**
 * Garde de source unique : `src/index.css` (`@theme`) est la vérité, `tokens.ts`
 * n'en est qu'un miroir lisible par Recharts et jsPDF.
 *
 * Si quelqu'un modifie une couleur dans le CSS sans mettre à jour le module TS
 * (ou l'inverse), ce test échoue avec le nom exact du token divergent.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hexToRgb, themeColors } from '../tokens';

/**
 * Localise `src/index.css` sans dépendre d'un répertoire courant fragile.
 * L'erreur éventuelle remonte dans le corps du test (assertion lisible), pas
 * à la collection du module.
 */
function readIndexCss(): string {
  const dirname = (import.meta as ImportMeta & { dirname?: string }).dirname;
  const candidates = [
    dirname ? resolve(dirname, '../../index.css') : null,
    resolve(process.cwd(), 'src/index.css'),
  ].filter((path): path is string => Boolean(path));

  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new Error(`index.css introuvable (essayé : ${candidates.join(' | ')})`);
  }
  return readFileSync(found, 'utf8');
}

/** `lineStrong` -> `line-strong`, `ink950` -> `ink-950`. */
function toCssVarName(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .toLowerCase();
}

/**
 * Capture toute la valeur jusqu'au `;` : une valeur non littérale (`var()`,
 * `oklch()`, écriture multi-ligne) doit produire un échec explicite et non
 * disparaître silencieusement du relevé.
 */
function parseDeclarations(css: string): Map<string, string> {
  const declared = new Map<string, string>();
  for (const match of css.matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/g)) {
    declared.set(match[1], match[2].trim().toLowerCase());
  }
  return declared;
}

let cache: Map<string, string> | null = null;
function declaredTokens(): Map<string, string> {
  cache ??= parseDeclarations(readIndexCss());
  return cache;
}

const expected = new Map(
  Object.entries(themeColors).map(([key, value]) => [toCssVarName(key), value.toLowerCase()]),
);

describe('tokens.ts — parité avec src/index.css', () => {
  it('lit bien les tokens du bloc @theme', () => {
    expect(declaredTokens().size).toBeGreaterThan(20);
  });

  it.each([...expected.entries()])(
    '--color-%s vaut %s des deux côtés',
    (name, value) => {
      expect(
        declaredTokens().get(name),
        `--color-${name} absent de index.css ou valeur non littérale`,
      ).toBe(value);
    },
  );

  it('ne déclare aucun token CSS absent du module TS', () => {
    const orphans = [...declaredTokens().keys()].filter((name) => !expected.has(name)).sort();
    expect(orphans, `tokens CSS non mirés : ${orphans.join(', ')}`).toEqual([]);
  });

  it('n’expose aucun token TS absent du CSS', () => {
    const missing = [...expected.keys()].filter((name) => !declaredTokens().has(name)).sort();
    expect(missing, `tokens TS sans équivalent CSS : ${missing.join(', ')}`).toEqual([]);
  });
});

describe('hexToRgb — alimente jsPDF', () => {
  it('convertit un hex à 6 chiffres', () => {
    expect(hexToRgb('#0b1220')).toEqual([11, 18, 32]);
  });

  it('convertit un hex à 3 chiffres', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
  });

  it('accepte une valeur sans dièse', () => {
    expect(hexToRgb('c5f441')).toEqual([197, 244, 65]);
  });

  it('rejette une valeur invalide au lieu de produire NaN', () => {
    expect(() => hexToRgb('#zzzzzz')).toThrow(/invalide/);
    expect(() => hexToRgb('')).toThrow(/invalide/);
  });

  it('reproduit les couleurs réellement utilisées par le PDF', () => {
    expect(hexToRgb(themeColors.ink900)).toEqual([11, 18, 32]);
    expect(hexToRgb(themeColors.zest400)).toEqual([197, 244, 65]);
  });
});
