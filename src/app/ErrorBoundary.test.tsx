import { cleanup, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/content';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): ReactElement {
  throw new Error('boum au rendu');
}

/**
 * Un crash de rendu ne doit jamais aboutir à un écran blanc : l'utilisateur voit
 * un écran de secours avec deux issues (recharger, copier le détail).
 */
afterEach(cleanup);

describe('ErrorBoundary', () => {
  it('affiche l’écran de secours au lieu d’un écran vide', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText(t.crash.title)).toBeTruthy();
    expect(screen.getByText(/boum au rendu/)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.crash.reload })).toBeTruthy();
    expect(screen.getByRole('button', { name: t.crash.copy })).toBeTruthy();

    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  it('rend les enfants quand tout va bien', () => {
    render(
      <ErrorBoundary>
        <p>contenu normal</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('contenu normal')).toBeTruthy();
  });
});
