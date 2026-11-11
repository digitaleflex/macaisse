import { describe, expect, it, vi } from 'vitest';
import { markIconsReady, waitForIconFont } from '../iconFont';

const fakeFonts = (overrides: Partial<{ load: () => Promise<unknown>; check: () => boolean }> = {}) => ({
  load: vi.fn(async () => []),
  check: vi.fn(() => true),
  ...overrides,
});

describe('police d’icônes', () => {
  it('est prête quand la police est chargée et utilisable', async () => {
    const fonts = fakeFonts();
    expect(await waitForIconFont(fonts)).toBe(true);
    expect(fonts.load).toHaveBeenCalledWith("24px 'Material Symbols Outlined'");
  });

  it('n’est pas prête si le chargement échoue (hors ligne, réseau bloqué)', async () => {
    const fonts = fakeFonts({ load: () => Promise.reject(new Error('réseau')) });
    expect(await waitForIconFont(fonts)).toBe(false);
  });

  it('n’est pas prête si aucune police ne correspond (feuille de style absente)', async () => {
    expect(await waitForIconFont(fakeFonts({ check: () => false }))).toBe(false);
  });

  it('n’est pas prête si le navigateur n’expose pas document.fonts', async () => {
    expect(await waitForIconFont(undefined)).toBe(false);
  });

  it('pose la classe icons-ready seulement quand la police est là', async () => {
    const ok = document.implementation.createHTMLDocument('ok');
    Object.defineProperty(ok, 'fonts', { value: fakeFonts() });
    await markIconsReady(ok);
    expect(ok.documentElement.classList.contains('icons-ready')).toBe(true);

    const ko = document.implementation.createHTMLDocument('ko');
    Object.defineProperty(ko, 'fonts', { value: fakeFonts({ check: () => false }) });
    await markIconsReady(ko);
    expect(ko.documentElement.classList.contains('icons-ready')).toBe(false);
  });
});
