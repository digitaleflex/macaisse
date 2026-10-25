import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { t } from '@/content';
import { logout } from '@/store/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { LoginScreen } from '../LoginScreen';

/**
 * Écran d'accès — garde-fous d'ergonomie (écarts A11/A12 de
 * `docs/AUTH_REVIEW.md`) : Google accessible, mot de passe affichable, erreurs
 * par champ, et inscription en 5 champs au lieu de 8.
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
    expect(input('signup-org')).toBeTruthy();
  });
}

function fillSignup(password: string, email = 'aicha@test.sn') {
  fireEvent.change(input('signup-first'), { target: { value: 'Aïcha' } });
  fireEvent.change(input('signup-last'), { target: { value: 'Ba' } });
  fireEvent.change(input('signup-email'), { target: { value: email } });
  fireEvent.change(input('signup-password'), { target: { value: password } });
  fireEvent.change(input('signup-org'), { target: { value: 'Boutique Aïcha' } });
}

describe('LoginScreen — accès', () => {
  it('expose Google et permet d’afficher le mot de passe saisi', () => {
    render(<LoginScreen />);

    expect(screen.getByRole('button', { name: t.auth.google })).toBeTruthy();

    const password = input('login-password');
    expect(password.type).toBe('password');

    fireEvent.click(screen.getByRole('button', { name: t.auth.showPassword }));
    expect(password.type).toBe('text');
  });

  it('refuse un mot de passe trop court et signale le champ, sans créer de session', async () => {
    render(<LoginScreen />);
    await openSignup();

    fillSignup('court');
    fireEvent.click(screen.getByRole('button', { name: t.auth.signupSubmit }));

    expect(await screen.findByText(t.auth.errors.passwordShort)).toBeTruthy();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('crée le commerce avec les 5 champs du formulaire court', async () => {
    render(<LoginScreen />);
    await openSignup();

    fillSignup('motdepasse-solide-2026');
    fireEvent.click(screen.getByRole('button', { name: t.auth.signupSubmit }));

    await waitFor(() => {
      expect(useAuthStore.getState().user?.email).toBe('aicha@test.sn');
    });
    // Téléphone / ville / activité sont différés (RG-A04).
    expect(useAuthStore.getState().user?.phone).toBe('');
  });
});
