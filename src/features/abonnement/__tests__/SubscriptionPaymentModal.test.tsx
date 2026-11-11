import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// Suivi accéléré : la tentative de démonstration aboutit à la 2e interrogation.
vi.mock('@/domain/billing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/domain/billing')>()),
  PAYMENT_POLL_INTERVAL_MS: 15,
}));

import { DEMO_PASSWORD } from '@/mocks';
import { api, setActiveOrganization } from '@/services';
import { useSessionStore } from '@/store/useSessionStore';
import { SubscriptionPaymentModal } from '../SubscriptionPaymentModal';

const ORG = 'org-etoile';

beforeAll(async () => {
  await api.auth.login({ email: 'mamadou@boutique-etoile.sn', password: DEMO_PASSWORD });
  setActiveOrganization(ORG);
});

afterEach(() => cleanup());

async function open() {
  useSessionStore.getState().setSession(await api.session.get(ORG));
  const onClose = vi.fn();
  render(<SubscriptionPaymentModal open initialCycle="monthly" onClose={onClose} />);
  await screen.findByRole('radio', { name: /Pro Commerçant/ });
  return onClose;
}

const invoiceCount = () => useSessionStore.getState().session?.subscription.invoices.length ?? 0;
const payButton = () => screen.getByRole('button', { name: /^Payer / });
const phoneField = () => screen.getByLabelText(/Numéro Mobile Money/) as HTMLInputElement;

describe('SubscriptionPaymentModal', () => {
  it('propose les forfaits et le mobile money avant la carte, avec le montant à payer', async () => {
    await open();

    const labels = screen
      .getAllByRole('radio')
      .map((radio) => radio.lastElementChild?.textContent)
      .filter((text) => ['MTN MoMo', 'Moov Money', 'Orange Money', 'Wave', 'Celtiis Cash', 'Carte'].includes(text ?? ''));
    expect(labels).toEqual(['MTN MoMo', 'Moov Money', 'Orange Money', 'Wave', 'Celtiis Cash', 'Carte']);
    expect(payButton().textContent).toMatch(/15\D?000/);
    // Pas de moyen hors ligne : ni espèces ni crédit.
    expect(screen.queryByRole('radio', { name: 'Espèces' })).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Crédit' })).toBeNull();
  });

  it('met à jour le montant quand on change de forfait ou de durée', async () => {
    await open();

    fireEvent.click(screen.getByRole('radio', { name: /Starter/ }));
    expect(payButton().textContent).toMatch(/5\D?000/);

    fireEvent.click(screen.getByRole('radio', { name: 'Annuel' }));
    expect(payButton().textContent).toMatch(/50\D?000/);
  });

  it('refuse un numéro non international sans démarrer de paiement', async () => {
    await open();

    fireEvent.change(phoneField(), { target: { value: '97000001' } });
    fireEvent.click(payButton());

    expect(await screen.findByText(/format international/)).toBeTruthy();
    expect(screen.queryByText('Paiement en cours')).toBeNull();
  });

  it('mobile money : demande la validation sur le téléphone puis confirme le paiement', async () => {
    await open();
    const before = invoiceCount();

    fireEvent.change(phoneField(), { target: { value: '+229 97 00 00 01' } });
    fireEvent.click(payButton());

    expect(await screen.findByText('Paiement en cours')).toBeTruthy();
    expect(screen.getByText(/Validez le paiement sur votre téléphone \(\+229 97 00 00 01\)/)).toBeTruthy();
    expect(screen.getByText(/via FedaPay/)).toBeTruthy();

    expect(await screen.findByText('Paiement reçu', undefined, { timeout: 3000 })).toBeTruthy();
    await waitFor(() => expect(invoiceCount()).toBe(before + 1));
  });

  it('carte : pas de numéro, mais une page de paiement sécurisée à ouvrir', async () => {
    await open();

    fireEvent.click(screen.getByRole('radio', { name: 'Carte' }));
    expect(screen.queryByLabelText(/Numéro Mobile Money/)).toBeNull();
    fireEvent.click(payButton());

    expect(await screen.findByRole('button', { name: 'Ouvrir la page de paiement' })).toBeTruthy();
    expect(screen.getByText(/page sécurisée de votre banque/)).toBeTruthy();
  });

  it('refus de l’opérateur : message clair, rien n’est facturé, on peut réessayer', async () => {
    await open();
    const before = invoiceCount();

    fireEvent.change(phoneField(), { target: { value: '+229 97 00 00 00' } });
    fireEvent.click(payButton());

    expect(await screen.findByText('Paiement non abouti', undefined, { timeout: 3000 })).toBeTruthy();
    expect(screen.getByText(/refusé/)).toBeTruthy();
    expect(invoiceCount()).toBe(before);

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByRole('button', { name: /^Payer / })).toBeTruthy();
  });

  it('permet d’annuler un paiement en attente', async () => {
    await open();
    const before = invoiceCount();

    fireEvent.change(phoneField(), { target: { value: '+229 97 00 00 01' } });
    fireEvent.click(payButton());
    fireEvent.click(await screen.findByRole('button', { name: 'Annuler le paiement' }));

    expect(await screen.findByText('Paiement non abouti')).toBeTruthy();
    expect(screen.getByText('Paiement annulé.')).toBeTruthy();
    expect(invoiceCount()).toBe(before);
  });
});
