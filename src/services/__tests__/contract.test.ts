import { beforeEach, describe, expect, it } from 'vitest';
import type { ClientCredit, Product, SaleTransaction } from '@/types';
import { DEMO_PASSWORD, SEED_PRODUCTS } from '@/mocks';
import { createMockApi } from '../adapters/mockApi';
import { createHttpApi } from '../adapters/httpApi';
import { createHttpClient } from '../http/httpClient';
import { ApiError } from '../http/ApiError';
import { ENDPOINTS } from '../endpoints';
import { setActiveOrganization } from '../tenant';
import type { Api } from '../contracts';

/**
 * Harnais de contrat : vérifie que les deux adaptateurs respectent les mêmes
 * règles observables (codes d'erreur, transaction vente + créance, contexte
 * multi-organisation). Sert de spécification exécutable pour l'équipe backend.
 */

const ORG = 'org-etoile';
const BASE_URL = 'https://api.test/v1';

const SALE: SaleTransaction = {
  id: 'sale-1',
  saleNumber: 'V-20260101-0001',
  time: '09:15',
  date: '2026-01-01',
  paymentMethod: 'credit',
  amount: 3000,
  status: 'partial',
  clientName: 'M. Ba Ousmane',
  remainingAmount: 2000,
  itemsCount: 3,
};

const CREDIT: ClientCredit = {
  id: 'credit-1',
  clientName: 'M. Ba Ousmane',
  initials: 'BO',
  shopOrLocation: 'Client comptoir',
  phone: '',
  remainingAmount: 2000,
  totalInitial: 2000,
  dueDate: '2026-01-31',
  status: 'pending',
};

interface Captured {
  url: string;
  method: string;
  body: unknown;
  authorization: string | null;
  csrf: string | null;
  credentials: RequestCredentials | undefined;
}

/** Faux serveur minimal : renvoie ce que le test décide, capture la requête. */
function stubFetch(reply: { status: number; body: unknown }): {
  fetchImpl: typeof fetch;
  captured: Captured[];
} {
  const captured: Captured[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    captured.push({
      url,
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      authorization: new Headers(init?.headers).get('authorization'),
      csrf: new Headers(init?.headers).get('x-csrf-token'),
      credentials: init?.credentials,
    });
    return new Response(JSON.stringify(reply.body), {
      status: reply.status,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  return { fetchImpl, captured };
}

function httpApiWith(reply: { status: number; body: unknown }) {
  const { fetchImpl, captured } = stubFetch(reply);
  return {
    captured,
    api: createHttpApi(
      createHttpClient({
        baseUrl: BASE_URL,
        timeoutMs: 1000,
        getCsrfToken: () => 'csrf-test',
        fetchImpl,
      })
    ),
  };
}

describe('contrat http — contexte et payload', () => {
  beforeEach(() => {
    setActiveOrganization(ORG);
  });

  it('préfixe chaque route métier par /orgs/:orgId et envoie les cookies', async () => {
    const { api, captured } = httpApiWith({ status: 200, body: [] });
    await api.products.list();

    expect(captured).toHaveLength(1);
    expect(captured[0]?.url).toBe(`${BASE_URL}${ENDPOINTS.products(ORG)}`);
    // D1 : session par cookie, aucun jeton dans les en-têtes.
    expect(captured[0]?.authorization).toBeNull();
    expect(captured[0]?.credentials).toBe('include');
  });

  it('transmet la créance dans la même requête que la vente', async () => {
    const { api, captured } = httpApiWith({ status: 201, body: SALE });
    const lines = [
      { productId: 'p1', name: 'Lait', price: 1000, quantity: 3, unit: 'brique' },
    ];

    await api.sales.create({ sale: SALE, lines, credit: CREDIT });

    expect(captured[0]?.method).toBe('POST');
    expect(captured[0]?.url).toBe(`${BASE_URL}${ENDPOINTS.sales(ORG)}`);
    expect(captured[0]?.body).toEqual({ sale: SALE, lines, credit: CREDIT });
  });

  it('annule une vente par POST /sales/:id/cancel avec le seul motif', async () => {
    const { api, captured } = httpApiWith({ status: 200, body: { ...SALE, status: 'cancelled' } });

    await api.sales.cancel('sale-1', 'erreur de produit');

    expect(captured[0]?.method).toBe('POST');
    expect(captured[0]?.url).toBe(`${BASE_URL}${ENDPOINTS.saleCancel(ORG, 'sale-1')}`);
    expect(captured[0]?.body).toEqual({ reason: 'erreur de produit' });
  });

  it('démarre, suit et annule un paiement d’abonnement sur les routes /billing', async () => {
    const intent = { id: 'pay-1', status: 'pending' };
    const input = { id: 'pay-1', planId: 'pro', cycle: 'monthly' as const, paymentMethod: 'mtn_money' as const, phone: '+22997000001' };

    const created = httpApiWith({ status: 201, body: intent });
    await created.api.billing.pay(ORG, input);
    expect(created.captured[0]?.method).toBe('POST');
    expect(created.captured[0]?.url).toBe(`${BASE_URL}${ENDPOINTS.billingPayments(ORG)}`);
    // Le montant n'est jamais envoyé : le serveur le calcule.
    expect(created.captured[0]?.body).toEqual(input);
    expect(created.captured[0]?.body).not.toHaveProperty('amount');

    const read = httpApiWith({ status: 200, body: intent });
    await read.api.billing.payment(ORG, 'pay-1');
    expect(read.captured[0]?.method).toBe('GET');
    expect(read.captured[0]?.url).toBe(`${BASE_URL}${ENDPOINTS.billingPayment(ORG, 'pay-1')}`);

    const cancelled = httpApiWith({ status: 200, body: { ...intent, status: 'cancelled' } });
    await cancelled.api.billing.cancel(ORG, 'pay-1');
    expect(cancelled.captured[0]?.url).toBe(`${BASE_URL}${ENDPOINTS.billingPaymentCancel(ORG, 'pay-1')}`);

    const plans = httpApiWith({ status: 200, body: [] });
    await plans.api.billing.plans(ORG);
    expect(plans.captured[0]?.url).toBe(`${BASE_URL}${ENDPOINTS.billingPlans(ORG)}`);
  });

  it('remonte le statut et le message du serveur sans les réécrire', async () => {
    const { api } = httpApiWith({
      status: 409,
      body: { message: 'Stock insuffisant pour « Lait ».', code: 'INSUFFICIENT_STOCK' },
    });

    await expect(
      api.sales.create({
        sale: SALE,
        lines: [{ productId: 'p1', name: 'Lait', price: 1000, quantity: 3, unit: 'brique' }],
        credit: CREDIT,
      })
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      message: 'Stock insuffisant pour « Lait ».',
    });
  });

  it('échoue explicitement sans organisation active', async () => {
    setActiveOrganization(null);
    const { api, captured } = httpApiWith({ status: 200, body: [] });
    // `requireOrganization()` lève de façon synchrone : aucune requête ne part.
    expect(() => api.products.list()).toThrow(/organisation active/i);
    expect(captured).toHaveLength(0);
  });
});

describe('contrat mock — même sémantique que le serveur', () => {
  let api: Api;

  async function connectAsOwner(): Promise<void> {
    await api.auth.login({
      email: 'mamadou@boutique-etoile.sn',
      password: DEMO_PASSWORD,
    });
    setActiveOrganization(ORG);
  }

  function product(): Product {
    return SEED_PRODUCTS[0] as Product;
  }

  function line(quantity: number) {
    const item = product();
    return {
      productId: item.id,
      name: item.name,
      price: item.price,
      quantity,
      unit: item.unit,
    };
  }

  beforeEach(async () => {
    setActiveOrganization(null);
    api = createMockApi();
    await connectAsOwner();
  });

  it('refuse une vente dont le stock est insuffisant avec un 409', async () => {
    const item = product();
    await expect(
      api.sales.create({
        sale: { ...SALE, amount: item.price, remainingAmount: undefined, status: 'completed' },
        lines: [line(item.stock + 1)],
      })
    ).rejects.toMatchObject({ name: 'ApiError', status: 409 });
  });

  it('écrit la créance en même temps que la vente', async () => {
    await api.sales.create({
      sale: { ...SALE, amount: product().price, remainingAmount: undefined, status: 'completed' },
      lines: [line(1)],
      credit: { ...CREDIT, id: 'credit-pos-1' },
    });

    const credits = await api.credits.list();
    expect(credits.map((credit) => credit.id)).toContain('credit-pos-1');
  });

  describe('annulation de vente', () => {
    async function sell(quantity: number, credit?: ClientCredit) {
      const item = product();
      const sale: SaleTransaction = {
        ...SALE,
        id: `sale-cancel-${quantity}-${credit ? 'c' : 'n'}`,
        amount: item.price * quantity,
        status: credit ? 'partial' : 'completed',
        remainingAmount: credit?.remainingAmount,
        creditId: credit?.id,
      };
      await api.sales.create({ sale, lines: [line(quantity)], ...(credit ? { credit } : {}) });
      return sale;
    }

    async function stockOf(): Promise<number> {
      return (await api.products.list()).find((p) => p.id === product().id)?.stock ?? -1;
    }

    it('remet le stock, garde la vente et trace motif, auteur et date', async () => {
      const before = await stockOf();
      const sale = await sell(2);
      expect(await stockOf()).toBe(before - 2);

      const cancelled = await api.sales.cancel(sale.id, 'erreur de produit');

      expect(await stockOf()).toBe(before);
      expect(cancelled).toMatchObject({ status: 'cancelled', cancelReason: 'erreur de produit' });
      expect(cancelled.cancelledBy).toBeTruthy();
      expect(cancelled.cancelledAt).toBeTruthy();
      // La vente n'est jamais supprimée (RG-04).
      expect((await api.sales.list()).find((s) => s.id === sale.id)?.status).toBe('cancelled');
    });

    it('refuse un motif absent avec un 422', async () => {
      const sale = await sell(1);
      await expect(api.sales.cancel(sale.id, '  ')).rejects.toMatchObject({
        status: 422,
        code: 'VALIDATION_ERROR',
      });
    });

    it('refuse une seconde annulation avec un 409', async () => {
      const sale = await sell(1);
      await api.sales.cancel(sale.id, 'doublon');
      await expect(api.sales.cancel(sale.id, 'doublon')).rejects.toMatchObject({ status: 409 });
    });

    it('supprime le crédit lié quand rien n’a été remboursé', async () => {
      const credit: ClientCredit = { ...CREDIT, id: 'credit-cancel-1', saleId: 'sale-cancel-1-c' };
      const sale = await sell(1, credit);

      await api.sales.cancel(sale.id, 'erreur');

      expect((await api.credits.list()).map((c) => c.id)).not.toContain('credit-cancel-1');
    });

    it('bloque l’annulation quand le crédit lié a reçu un remboursement', async () => {
      const credit: ClientCredit = { ...CREDIT, id: 'credit-cancel-2', saleId: 'sale-cancel-1-c' };
      const sale = await sell(1, credit);
      await api.credits.pay(credit.id, 500);

      await expect(api.sales.cancel(sale.id, 'erreur')).rejects.toMatchObject({ status: 409 });
      expect((await api.sales.list()).find((s) => s.id === sale.id)?.status).not.toBe('cancelled');
    });

    it('répond 404 pour une vente inconnue', async () => {
      await expect(api.sales.cancel('sale-inconnue', 'erreur')).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('paiement de l’abonnement (FedaPay / KKiaPay)', () => {
    const MTN = '+22997000001';
    const pay = (overrides: Partial<Parameters<Api['billing']['pay']>[1]> = {}) =>
      api.billing.pay(ORG, {
        id: 'pay-1',
        planId: 'pro',
        cycle: 'monthly',
        paymentMethod: 'mtn_money',
        phone: MTN,
        ...overrides,
      });
    /** Interroge jusqu'à un statut final (au plus 5 fois). */
    async function settle(id: string) {
      let latest = await api.billing.payment(ORG, id);
      for (let i = 0; i < 5 && latest.status === 'pending'; i += 1) latest = await api.billing.payment(ORG, id);
      return latest;
    }

    it('liste les forfaits', async () => {
      const plans = await api.billing.plans(ORG);
      expect(plans.map((plan) => plan.id)).toEqual(['starter', 'pro']);
    });

    it('calcule le montant côté serveur et choisit l’agrégateur', async () => {
      const intent = await pay();
      expect(intent).toMatchObject({
        status: 'pending',
        purpose: 'subscription',
        amount: 15000,
        provider: 'fedapay',
        checkout: { type: 'push' },
      });
      expect((await pay({ id: 'pay-2', cycle: 'yearly', planId: 'starter' })).amount).toBe(50000);
    });

    it('gère tous les moyens en ligne, mobile money d’abord, carte par page sécurisée', async () => {
      for (const method of ['mtn_money', 'moov_money', 'orange_money', 'wave', 'celtiis_cash'] as const) {
        const intent = await pay({ id: `pay-${method}`, paymentMethod: method });
        expect(intent.checkout.type).toBe('push');
      }
      const card = await pay({ id: 'pay-card', paymentMethod: 'card', phone: undefined });
      expect(card.checkout.type).toBe('redirect');
    });

    it('est idempotent : rejouer le même identifiant ne crée pas une seconde tentative', async () => {
      const first = await pay();
      const again = await pay({ planId: 'starter', cycle: 'yearly' });
      expect(again.id).toBe(first.id);
      expect(again.amount).toBe(first.amount);
    });

    it('aboutit, prolonge l’abonnement et ajoute la facture', async () => {
      const before = (await api.session.get(ORG)).subscription;
      const intent = await pay();

      const final = await settle(intent.id);

      expect(final.status).toBe('succeeded');
      const after = (await api.session.get(ORG)).subscription;
      expect(after.invoices).toHaveLength(before.invoices.length + 1);
      expect(after.invoices[0]).toMatchObject({ amount: 15000, paymentMethod: 'mtn_money', status: 'paid' });
      // La numérotation continue la suite (INV-0012 → INV-0013), elle ne repart pas du nombre de factures.
      expect(after.invoices[0]?.id).toBe('INV-0013');
      expect(after.paymentMethod).toBe('mtn_money');
      // Même forfait encore en cours : on prolonge, aucun jour perdu.
      expect(after.renewalDate > before.renewalDate).toBe(true);
    });

    it('simule un refus de l’opérateur sans rien facturer', async () => {
      const before = (await api.session.get(ORG)).subscription;
      // Numéro finissant par 0000 : refus simulé de l'opérateur (démonstration).
      const refused = await pay({ id: 'pay-refus', phone: '+229 97 00 00 00' });

      const final = await settle(refused.id);

      expect(final.status).toBe('failed');
      expect(final.failureReason).toBeTruthy();
      expect((await api.session.get(ORG)).subscription.invoices).toHaveLength(before.invoices.length);
    });

    it('refuse une demande invalide avec un 422', async () => {
      await expect(pay({ phone: undefined })).rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
      await expect(pay({ id: 'p-b', phone: '97000001' })).rejects.toMatchObject({ status: 422 });
      await expect(pay({ id: 'p-c', paymentMethod: 'cash' })).rejects.toMatchObject({ status: 422 });
      await expect(pay({ id: 'p-d', planId: 'inconnu' })).rejects.toMatchObject({ status: 422 });
    });

    it('annule une tentative en attente, puis refuse de l’annuler à nouveau', async () => {
      const intent = await pay();
      expect((await api.billing.cancel(ORG, intent.id)).status).toBe('cancelled');
      await expect(api.billing.cancel(ORG, intent.id)).rejects.toMatchObject({ status: 409 });
      // Une tentative annulée n'aboutit jamais.
      expect((await api.billing.payment(ORG, intent.id)).status).toBe('cancelled');
    });

    it('refuse d’annuler une tentative déjà payée', async () => {
      const intent = await pay();
      await settle(intent.id);
      await expect(api.billing.cancel(ORG, intent.id)).rejects.toMatchObject({ status: 409 });
    });

    it('répond 404 pour une tentative inconnue', async () => {
      await expect(api.billing.payment(ORG, 'inconnue')).rejects.toMatchObject({ status: 404 });
    });

    it('réserve le paiement au propriétaire', async () => {
      await api.auth.logout();
      await api.auth.login({ email: 'awa@boutique-etoile.sn', password: DEMO_PASSWORD });
      setActiveOrganization(ORG);

      await expect(pay()).rejects.toMatchObject({ status: 403, code: 'INSUFFICIENT_ROLE' });
      await expect(api.billing.plans(ORG)).rejects.toMatchObject({ status: 403 });
    });
  });

  it('refuse toute route métier sans appartenance à l’organisation', async () => {
    setActiveOrganization('org-inconnue');
    await expect(api.products.list()).rejects.toBeInstanceOf(ApiError);
    await expect(api.products.list()).rejects.toMatchObject({ status: 403 });
  });
});
