import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { t } from '@/content';
import { logout } from '@/store/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { LoginScreen } from '../LoginScreen';

/**
 * Écran d'accès — parcours téléphone (D2) et garde-fous d'ergonomie :
 * OTP avant mot de passe, Google accessible, mot de passe affichable, erreurs
 * par champ, inscription e-mail en 2 champs.
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

async function openEmail() {
  fireEvent.click(screen.getByRole('button', { name: t.auth.useEmail }));
  await waitFor(() => {
    expect(input('auth-email')).toBeTruthy();
  });
}

async function openSignup() {
  await openEmail();
  fireEvent.click(screen.getByRole('radio', { name: t.auth.tabs.signup }));
  await waitFor(() => {
    expect(screen.getByRole('button', { name: t.auth.signupSubmit })).toBeTruthy();
  });
}

describe('LoginScreen — téléphone (D2)', () => {
  it('affiche un seul champ téléphone par défaut', () => {
    render(<LoginScreen />);
    expect(input('auth-phone')).toBeTruthy();
    expect(document.querySelectorAll('form input')).toHaveLength(1);
  });

  it('connecte par code et crée l’espace « Mon commerce » si le numéro est inconnu', async () => {
    render(<LoginScreen />);

    fireEvent.change(input('auth-phone'), { target: { value: '77 123 45 67' } });
    fireEvent.click(screen.getByRole('button', { name: t.auth.phoneSubmit }));

    await waitFor(() => {
      expect(input('auth-phone-code')).toBeTruthy();
    });
    fireEvent.change(input('auth-phone-code'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: t.auth.phoneCodeSubmit }));

    await waitFor(() => {
      expect(useAuthStore.getState().user?.phone).toBe('221771234567');
    });
    expect(useAuthStore.getState().memberships[0]?.organizationName).toBe(t.auth.googleDefaultOrg);
    // Aucun e-mail : le bandeau de vérification ne s'appliquera pas.
    expect(useAuthStore.getState().user?.email).toBe('');
  });

  it('refuse un code incorrect sans ouvrir de session', async () => {
    render(<LoginScreen />);

    fireEvent.change(input('auth-phone'), { target: { value: '771234567' } });
    fireEvent.click(screen.getByRole('button', { name: t.auth.phoneSubmit }));
    await waitFor(() => {
      expect(input('auth-phone-code')).toBeTruthy();
    });

    fireEvent.change(input('auth-phone-code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: t.auth.phoneCodeSubmit }));

    expect(await screen.findByText(t.auth.errors.phoneCodeInvalid)).toBeTruthy();
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe('LoginScreen — e-mail', () => {
  it('n’affiche que deux champs à l’inscription', async () => {
    render(<LoginScreen />);
    await openSignup();

    const fields = document.querySelectorAll('form input');
    expect(fields).toHaveLength(2);
    expect(input('auth-email')).toBeTruthy();
    expect(input('auth-password')).toBeTruthy();
  });

  it('expose Google avec son logo officiel et permet d’afficher le mot de passe saisi', async () => {
    render(<LoginScreen />);
    await openEmail();

    const google = screen.getByRole('button', { name: t.auth.google });
    expect(google).toBeTruthy();
    // Logo « G » officiel (SVG inline), pas une icône Material.
    expect(google.querySelector('svg')).not.toBeNull();

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
