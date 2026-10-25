import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { t } from '@/content';
import { logout } from '@/store/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { LoginScreen } from '../LoginScreen';

/**
 * Écran d'accès — garde-fous d'ergonomie (écarts A11/A12 de
 * `docs/AUTH_REVIEW.md`) : Google accessible, mot de passe affichable, erreurs
 * par champ, et **inscription en 2 champs** (e-mail + mot de passe, RG-A04).
 */

afterEach(cleanup);

beforeEach(async () => {
  localStorage.clear();
  await logout();
});

/** Les champs sont nommés explicitement : sélecteur stable, insensible aux libellés. */
function input(name: string): HTMLInputElement {
  const element = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (element === null) throw new Error(`Champ introuvable : ${name}`);
  return element;
}

async function openSignup() {
  fireEvent.click(screen.getByRole('radio', { name: t.auth.tabs.signup }));
  await waitFor(() => {
    expect(input('auth-email')).toBeTruthy();
  });
}

describe('LoginScreen — accès', () => {
  it('n’affiche que deux champs à l’inscription', async () => {
    render(<LoginScreen />);
    await openSignup();

    const fields = document.querySelectorAll('form input');
    expect(fields).toHaveLength(2);
    expect(input('auth-email')).toBeTruthy();
    expect(input('auth-password')).toBeTruthy();
  });

  it('expose Google et permet d’afficher le mot de passe saisi', () => {
    render(<LoginScreen />);

    expect(screen.getByRole('button', { name: t.auth.google })).toBeTruthy();

    const password = input('auth-password');
    expect(password.type).toBe('password');

    fireEvent.click(screen.getByRole('button', { name: t.auth.showPassword }));
    expect(password.type).toBe('text');
  });

  it('refuse un mot de passe trop court et signale le champ, sans créer de session', async () => {
    render(<LoginScreen />);
    await openSignup();

    fireEvent.change(input('auth-email'), { target: { value: 'aicha@test.sn' } });
    fireEvent.change(input('auth-password'), { target: { value: 'court' } });
    fireEvent.click(screen.getByRole('button', { name: t.auth.signupSubmit }));

    expect(await screen.findByText(t.auth.errors.passwordShort)).toBeTruthy();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('crée un espace « Mon commerce » sans demander de nom', async () => {
    render(<LoginScreen />);
    await openSignup();

    fireEvent.change(input('auth-email'), { target: { value: 'aicha@test.sn' } });
    fireEvent.change(input('auth-password'), { target: { value: 'motdepasse-solide-2026' } });
    fireEvent.click(screen.getByRole('button', { name: t.auth.signupSubmit }));

    await waitFor(() => {
      expect(useAuthStore.getState().user?.email).toBe('aicha@test.sn');
    });
    const [membership] = useAuthStore.getState().memberships;
    expect(membership?.organizationName).toBe(t.auth.googleDefaultOrg);
    // Nom et coordonnées sont complétés plus tard (RG-A04).
    expect(useAuthStore.getState().user?.firstName).toBe('');
  });
});
