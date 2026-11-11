import { beforeEach, describe, expect, it } from 'vitest';
import type { CartLine, Product, Role, Session } from '@/types';
import { useCartStore } from '../useCartStore';
import { t } from '@/content';
import { useCreditsStore } from '../useCreditsStore';
import { useNotificationsStore } from '../useNotificationsStore';
import { useProductsStore } from '../useProductsStore';
import { useSalesStore } from '../useSalesStore';
import { useSessionStore } from '../useSessionStore';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Lait demi-écrémé',
    sku: '#LAI-018',
    category: 'Frais',
    price: 1000,
    costPrice: 750,
    stock: 10,
    minStockAlert: 5,
    imageUrl: '',
    unit: 'brique',
    ...overrides,
  };
}

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    productId: 'p1',
    name: 'Lait demi-écrémé',
    price: 1000,
    quantity: 2,
    unit: 'brique',
    ...overrides,
  };
}

beforeEach(() => {
  useSalesStore.setState({ sales: [], sequence: 0 });
  useCartStore.setState({ lines: [] });
  useProductsStore.setState({
    products: [
      makeProduct({ id: 'p1', stock: 10, price: 1000 }),
      makeProduct({ id: 'p2', name: 'Riz Parfumé 5kg', stock: 2, price: 4500, unit: 'sac' }),
    ],
  });
});

describe('useSalesStore.completeSale', () => {
  it('persiste la vente, décrémente le stock, vide le panier et incrémente la séquence', () => {
    useCartStore.setState({ lines: [line()] });

    const sale = useSalesStore.getState().completeSale({ paymentMethod: 'Espèces' });

    expect(sale.amount).toBe(2000);
    expect(sale.status).toBe('Validé');
    expect(sale.saleNumber).toMatch(/^V-\d{8}-0001$/);

    expect(useSalesStore.getState().sales[0]).toBe(sale);
    expect(useSalesStore.getState().sequence).toBe(1);
    expect(useProductsStore.getState().products.find((p) => p.id === 'p1')?.stock).toBe(8);
    expect(useCartStore.getState().lines).toEqual([]);
    // Le statut dérivé n'est pas conservé en état produits.
    expect(useProductsStore.getState().products.every((p) => !('status' in p))).toBe(true);
  });

  it('refuse un stock insuffisant sans rien muter', () => {
    useCartStore.setState({ lines: [line({ productId: 'p2', name: 'Riz Parfumé 5kg', price: 4500, quantity: 3, unit: 'sac' })] });
    const productsBefore = useProductsStore.getState().products;

    expect(() => useSalesStore.getState().completeSale({ paymentMethod: 'Espèces' })).toThrowError(
      /Stock insuffisant/
    );

    expect(useSalesStore.getState().sales).toHaveLength(0);
    expect(useSalesStore.getState().sequence).toBe(0);
    expect(useProductsStore.getState().products).toEqual(productsBefore);
    expect(useCartStore.getState().lines).toHaveLength(1);
  });

  it('refuse un panier vide', () => {
    useCartStore.setState({ lines: [] });
    expect(() => useSalesStore.getState().completeSale({ paymentMethod: 'Espèces' })).toThrowError(
      /sans article/
    );
    expect(useSalesStore.getState().sales).toHaveLength(0);
  });

  it('gère un paiement partiel (crédit)', () => {
    useCartStore.setState({ lines: [line()] });

    const sale = useSalesStore.getState().completeSale({
      paymentMethod: 'Crédit Partiel',
      creditAmount: 500,
      clientName: 'Mme Diallo',
    });

    expect(sale.status).toBe('Partiel');
    expect(sale.remainingAmount).toBe(500);
    expect(sale.clientName).toBe('Mme Diallo');
  });
});

describe('completeSale — vente à crédit', () => {
  beforeEach(() => {
    useProductsStore.setState({ products: [makeProduct({ price: 1000, stock: 10 })] });
    useCartStore.setState({ lines: [line({ quantity: 2 })] });
    useCreditsStore.setState({ credits: [] });
    useSalesStore.setState({ sales: [], sequence: 0 });
  });

  it('crée la créance correspondante dans le store des crédits', () => {
    const sale = useSalesStore.getState().completeSale({
      paymentMethod: 'Crédit Partiel',
      clientName: 'M. Ba Ousmane',
      creditAmount: 2000,
    });

    expect(sale.remainingAmount).toBe(2000);
    expect(sale.status).toBe('Partiel');

    const credits = useCreditsStore.getState().credits;
    expect(credits).toHaveLength(1);
    expect(credits[0]).toMatchObject({
      clientName: 'M. Ba Ousmane',
      initials: 'BO',
      remainingAmount: 2000,
      totalInitial: 2000,
      status: 'En attente',
    });
  });

  it('ne crée aucune créance pour une vente soldée', () => {
    useSalesStore.getState().completeSale({ paymentMethod: 'Espèces' });
    expect(useCreditsStore.getState().credits).toHaveLength(0);
  });

  it('vide le panier et décrémente le stock dans le même mouvement', () => {
    useSalesStore.getState().completeSale({
      paymentMethod: 'Crédit Partiel',
      clientName: 'Awa',
      creditAmount: 1000,
    });
    expect(useCartStore.getState().lines).toHaveLength(0);
    expect(useProductsStore.getState().products[0]?.stock).toBe(8);
  });
});

describe('completeSale — notifications métier', () => {
  beforeEach(() => {
    useProductsStore.setState({ products: [makeProduct({ price: 1000, stock: 2 })] });
    useCartStore.setState({ lines: [line({ quantity: 1 })] });
    useCreditsStore.setState({ credits: [] });
    useNotificationsStore.setState({ notifications: [] });
    useSalesStore.setState({ sales: [], sequence: 0 });
  });

  it('publie une notification quand un règlement partiel ouvre un crédit', () => {
    useSalesStore.getState().completeSale({
      paymentMethod: 'Crédit Partiel',
      clientName: 'M. Ba Ousmane',
      creditAmount: 500,
    });

    const [notification] = useNotificationsStore.getState().notifications;
    expect(notification?.title).toBe(t.notifications.feed.creditCreated('M. Ba Ousmane'));
    expect(notification?.type).toBe('info');
    expect(notification?.relatedTab).toBe('credits');
  });

  it('publie une alerte quand la vente épuise le stock', () => {
    useCartStore.setState({ lines: [line({ quantity: 2 })] });
    useSalesStore.getState().completeSale({ paymentMethod: 'Espèces' });

    const titles = useNotificationsStore.getState().notifications.map((n) => n.title);
    expect(titles).toContain(t.notifications.feed.stockOut('Lait demi-écrémé'));
  });

  it('ne duplique pas une alerte de rupture déjà non lue', () => {
    useCartStore.setState({ lines: [line({ quantity: 2 })] });
    useSalesStore.getState().completeSale({ paymentMethod: 'Espèces' });
    // Deuxième vente impossible (stock à 0) : on republie directement la même alerte.
    useNotificationsStore.getState().push({
      title: t.notifications.feed.stockOut('Lait demi-écrémé'),
      type: 'alert',
    });
    const titles = useNotificationsStore.getState().notifications.map((n) => n.title);
    expect(titles.filter((title) => title === t.notifications.feed.stockOut('Lait demi-écrémé'))).toHaveLength(1);
  });
});

describe('useSalesStore.completeSale — vendeur', () => {
  it('enregistre le vendeur de la session sur la vente', () => {
    useSessionStore.setState({
      session: { role: 'cashier', user: { id: 'u-awa', firstName: 'Awa', lastName: 'Fall' } } as unknown as Session,
      status: 'ready',
    });
    useCartStore.setState({ lines: [line()] });

    const sale = useSalesStore.getState().completeSale({ paymentMethod: 'Espèces' });

    expect(sale).toMatchObject({ sellerId: 'u-awa', sellerName: 'Awa Fall' });
  });
});

describe('useSalesStore.cancelSale', () => {
  function signIn(role: Role) {
    useSessionStore.setState({
      session: { role, user: { firstName: 'Awa', lastName: 'Fall' } } as unknown as Session,
      status: 'ready',
    });
  }

  function sell(creditAmount = 0) {
    useCartStore.setState({ lines: [line({ quantity: 3 })] });
    return useSalesStore
      .getState()
      .completeSale(
        creditAmount > 0
          ? { paymentMethod: 'Crédit Partiel', clientName: 'M. Ba', creditAmount }
          : { paymentMethod: 'Espèces' },
      );
  }

  const stock = () => useProductsStore.getState().products.find((p) => p.id === 'p1')?.stock;

  beforeEach(() => {
    useCreditsStore.setState({ credits: [] });
    useNotificationsStore.setState({ notifications: [] });
    signIn('manager');
  });

  it('annule : stock remis, vente conservée avec motif, auteur et date', async () => {
    const sale = sell();
    expect(stock()).toBe(7);

    const cancelled = await useSalesStore.getState().cancelSale(sale.id, 'erreur de produit');

    expect(stock()).toBe(10);
    expect(cancelled).toMatchObject({
      status: 'Annulée',
      cancelReason: 'erreur de produit',
      cancelledBy: 'Awa Fall',
    });
    const stored = useSalesStore.getState().sales.find((s) => s.id === sale.id);
    expect(stored?.status).toBe('Annulée');
    expect(stored?.cancelledAt).toBeTruthy();
    expect(useNotificationsStore.getState().notifications[0]?.title).toContain(sale.saleNumber);
  });

  it('lie le crédit à la vente puis le supprime à l’annulation', async () => {
    const sale = sell(1000);
    const credit = useCreditsStore.getState().credits[0];
    expect(credit?.saleId).toBe(sale.id);
    expect(sale.creditId).toBe(credit?.id);

    await useSalesStore.getState().cancelSale(sale.id, 'erreur');

    expect(useCreditsStore.getState().credits).toHaveLength(0);
  });

  it('refuse sans motif et ne modifie rien', async () => {
    const sale = sell();
    await expect(useSalesStore.getState().cancelSale(sale.id, ' ')).rejects.toThrow(/motif/i);
    expect(stock()).toBe(7);
    expect(useSalesStore.getState().sales[0]?.status).toBe('Validé');
  });

  it('refuse le caissier même en appelant le store directement', async () => {
    const sale = sell();
    signIn('cashier');
    await expect(useSalesStore.getState().cancelSale(sale.id, 'erreur')).rejects.toThrow(/rôle/);
    expect(stock()).toBe(7);
  });

  it('bloque l’annulation quand le crédit a reçu un remboursement', async () => {
    const sale = sell(1000);
    const credit = useCreditsStore.getState().credits[0];
    useCreditsStore.getState().payCredit(credit?.id ?? '', 200);

    await expect(useSalesStore.getState().cancelSale(sale.id, 'erreur')).rejects.toThrow(
      /remboursement/,
    );
    expect(stock()).toBe(7);
    expect(useCreditsStore.getState().credits).toHaveLength(1);
  });

  it('refuse une seconde annulation', async () => {
    const sale = sell();
    await useSalesStore.getState().cancelSale(sale.id, 'doublon');
    await expect(useSalesStore.getState().cancelSale(sale.id, 'doublon')).rejects.toThrow(
      /déjà annulée/,
    );
    expect(stock()).toBe(10);
  });

  it('exclut la vente annulée de l’export comptable', async () => {
    const { buildAccountingRows } = await import('@/lib/export/accounting');
    const sale = sell();
    await useSalesStore.getState().cancelSale(sale.id, 'erreur');
    expect(buildAccountingRows(useSalesStore.getState().sales, [], 'sales')).toHaveLength(0);
  });
});
