import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TODAY_CHECK_INTERVAL_MS, useToday } from '../useToday';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 11, 23, 50));
});
afterEach(() => vi.useRealTimers());

describe('useToday', () => {
  it('garde le même objet tant que le jour ne change pas (pas de recalcul inutile)', () => {
    const { result } = renderHook(() => useToday());
    const first = result.current;

    act(() => vi.advanceTimersByTime(TODAY_CHECK_INTERVAL_MS * 5));

    expect(result.current).toBe(first);
  });

  it('passe au jour suivant après minuit sans recharger l’écran', () => {
    const { result } = renderHook(() => useToday());
    expect(result.current.getDate()).toBe(11);

    act(() => {
      vi.setSystemTime(new Date(2026, 10, 12, 0, 5));
      vi.advanceTimersByTime(TODAY_CHECK_INTERVAL_MS);
    });

    expect(result.current.getDate()).toBe(12);
  });

  it('se met à jour dès le retour de l’application au premier plan', () => {
    const { result } = renderHook(() => useToday());

    act(() => {
      vi.setSystemTime(new Date(2026, 10, 12, 8, 0));
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.getDate()).toBe(12);
  });

  it('arrête ses minuteurs au démontage', () => {
    const { unmount } = renderHook(() => useToday());
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
