import { useCallback, useSyncExternalStore } from 'react';

/**
 * Suit une media query CSS sans monter deux variantes du même écran.
 * Repli `true` quand `matchMedia` est indisponible (jsdom, SSR) : le rendu
 * « large » est celui qui contient le plus d'information.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => undefined;
      }
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
    return window.matchMedia(query).matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
