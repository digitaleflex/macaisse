import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product, Role, Session, StockMovement } from '@/types';
import { useProductsStore } from '@/store/useProductsStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useStockStore } from '@/store/useStockStore';
import { InventoryModal } from '../InventoryModal';
import { ProductFormModal } from '../ProductFormModal';
import { StockAdjustModal } from '../StockAdjustModal';
import { StockMovementsModal } from '../StockMovementsModal';
import { StockView } from '../StockView';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Lait',
    sku: '#LAI',
    category: 'Frais',
    price: 1000,
    costPrice: 700,
    stock: 10,
    minStockAlert: 5,
    imageUrl: '',
    unit: 'brique',
    ...overrides,
  };
}

function signIn(role: Role) {
  useSessionStore.setState({
    session: { role, user: { id: 'u1', firstName: 'Awa', lastName: 'Fall' } } as unknown as Session,
    status: 'ready',
  });
}

const stockOf = (id = 'p1') => useProductsStore.getState().products.find((p) => p.id === id)?.stock;

function movement(overrides: Partial<StockMovement>): StockMovement {
  return {
    id: 'm',
    type: 'purchase',
    productId: 'p1',
    productName: 'Lait',
    quantity: 5,
    quantityAfter: 15,
    userName: 'Awa Fall',
    createdAt: '2026-11-10T09:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  signIn('manager');
  useProductsStore.setState({
    products: [product(), product({ id: 'p2', name: 'Riz', sku: '#RIZ', stock: 4, costPrice: 500 })],
  });
  useStockStore.setState({ movements: [], lastInventory: null });
});
afterEach(() => cleanup());

describe('StockAdjustModal', () => {
  const open = (onClose = vi.fn()) => {
    render(<StockAdjustModal product={product()} onClose={onClose} />);
    return onClose;
  };
  const qty = () => screen.getByLabelText(/Quantité (comptée|perdue)/) as HTMLInputElement;
  const reason = () => screen.getByRole('textbox', { name: /^Motif/ }) as HTMLTextAreaElement;
  const submit = () => screen.getByRole('button', { name: 'Enregistrer la correction' });

  it('annonce le nouveau stock avant d’enregistrer', () => {
    open();
    fireEvent.change(qty(), { target: { value: '7' } });
    expect(screen.getByText('Nouveau stock : 7 (-3)')).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: 'Casse / perte' }));
    expect(qty().value).toBe('');
    fireEvent.change(qty(), { target: { value: '4' } });
    expect(screen.getByText('Nouveau stock : 6 (-4)')).toBeTruthy();
  });

  it('exige quantité et motif, sans rien enregistrer', async () => {
    open();
    fireEvent.click(submit());

    expect(await screen.findByText('Indiquez un motif (3 caractères minimum).')).toBeTruthy();
    expect(screen.getByText('Saisissez une quantité entière valide.')).toBeTruthy();
    expect(stockOf()).toBe(10);
    expect(useStockStore.getState().movements).toEqual([]);
  });

  it('enregistre un écart d’inventaire tracé puis se ferme', async () => {
    const onClose = open();
    fireEvent.change(qty(), { target: { value: '7' } });
    fireEvent.change(reason(), { target: { value: 'Erreur de comptage' } });
    fireEvent.click(submit());

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(stockOf()).toBe(7);
    expect(useStockStore.getState().movements[0]).toMatchObject({
      type: 'adjustment',
      quantity: -3,
      reason: 'Erreur de comptage',
      userName: 'Awa Fall',
    });
  });

  it('remplit le motif d’un clic sur une suggestion', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Erreur de comptage' }));
    expect(reason().value).toBe('Erreur de comptage');
  });

  it('affiche le refus d’une casse supérieure au stock sans fermer ni modifier', async () => {
    const onClose = open();
    fireEvent.click(screen.getByRole('radio', { name: 'Casse / perte' }));
    fireEvent.change(qty(), { target: { value: '11' } });
    fireEvent.change(reason(), { target: { value: 'Casse au rayon' } });
    fireEvent.click(submit());

    expect(await screen.findByText(/dépasse le stock/)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    expect(stockOf()).toBe(10);
  });
});

describe('StockMovementsModal', () => {
  beforeEach(() => {
    useStockStore.setState({
      movements: [
        movement({ id: 'm1', createdAt: '2026-11-10T09:00:00Z', reason: 'Livraison' }),
        movement({ id: 'm2', type: 'sale', quantity: -3, quantityAfter: 12, saleNumber: 'V-1', createdAt: '2026-11-12T09:00:00Z' }),
        movement({ id: 'm3', type: 'loss', quantity: -1, quantityAfter: 11, reason: 'Casse', createdAt: '2026-11-11T09:00:00Z' }),
        movement({ id: 'm4', productId: 'p2', productName: 'Riz', createdAt: '2026-11-09T09:00:00Z' }),
      ],
    });
  });

  const rows = () => screen.queryAllByRole('listitem').map((li) => li.textContent ?? '');

  it('liste les mouvements d’un produit, du plus récent au plus ancien', () => {
    render(<StockMovementsModal open onClose={() => undefined} product={{ id: 'p1', name: 'Lait' }} />);

    expect(screen.getByText('Historique — Lait')).toBeTruthy();
    const list = rows();
    expect(list).toHaveLength(3);
    expect(list[0]).toContain('Vente');
    expect(list[0]).toContain('Ticket V-1');
    expect(list[1]).toContain('Casse / perte');
    expect(list[2]).toContain('Livraison');
    expect(list.join()).not.toContain('Riz');
  });

  it('affiche le sens et le stock obtenu de chaque mouvement', () => {
    render(<StockMovementsModal open onClose={() => undefined} product={{ id: 'p1', name: 'Lait' }} />);
    const sale = rows()[0] ?? '';
    expect(sale).toContain('−3');
    expect(sale).toContain('Stock : 12');
    expect(rows()[2]).toContain('+5');
  });

  it('journal complet : tous les produits, avec leur nom', () => {
    render(<StockMovementsModal open onClose={() => undefined} />);
    expect(screen.getByText('Journal de stock')).toBeTruthy();
    expect(rows()).toHaveLength(4);
    expect(rows().join()).toContain('Riz');
  });

  it('filtre par type', () => {
    render(<StockMovementsModal open onClose={() => undefined} />);
    fireEvent.click(within(screen.getByRole('group', { name: 'Type de mouvement' })).getByText('Casse / perte'));
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toContain('Casse');
  });

  it('indique l’absence de mouvement', () => {
    useStockStore.setState({ movements: [] });
    render(<StockMovementsModal open onClose={() => undefined} />);
    expect(screen.getByText('Aucun mouvement')).toBeTruthy();
  });
});

describe('InventoryModal', () => {
  const count = (name: string) => screen.getByLabelText(`Compté : ${name}`) as HTMLInputElement;
  const validate = () => screen.getByRole('button', { name: /^Valider/ }) as HTMLButtonElement;

  it('ne peut pas être validé tant que rien n’est compté', () => {
    render(<InventoryModal open onClose={() => undefined} />);
    expect(validate().disabled).toBe(true);
    expect(screen.getByText('0 / 2 comptés')).toBeTruthy();
  });

  it('affiche les écarts, leur nombre et leur valeur au prix d’achat', () => {
    render(<InventoryModal open onClose={() => undefined} />);
    fireEvent.change(count('Lait'), { target: { value: '8' } }); // −2 × 700 = −1 400
    fireEvent.change(count('Riz'), { target: { value: '4' } }); // conforme

    expect(screen.getByText('2 / 2 comptés')).toBeTruthy();
    expect(screen.getByText('1 écart')).toBeTruthy();
    expect(screen.getByText(/Impact au prix d’achat : −?-?1\D?400/)).toBeTruthy();
    expect(validate().textContent).toContain('Valider l’inventaire · 1 écart');
  });

  it('refuse une saisie invalide et bloque la validation', () => {
    render(<InventoryModal open onClose={() => undefined} />);
    fireEvent.change(count('Lait'), { target: { value: '-3' } });

    expect(screen.getByText('Nombre entier ≥ 0')).toBeTruthy();
    expect(validate().disabled).toBe(true);
  });

  it('valide : corrige les écarts, trace le journal et mémorise l’inventaire', async () => {
    const onClose = vi.fn();
    render(<InventoryModal open onClose={onClose} />);
    fireEvent.change(count('Lait'), { target: { value: '8' } });
    fireEvent.change(count('Riz'), { target: { value: '4' } });
    fireEvent.click(validate());

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(stockOf('p1')).toBe(8);
    expect(stockOf('p2')).toBe(4);
    const { movements, lastInventory } = useStockStore.getState();
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ productId: 'p1', type: 'adjustment', quantity: -2 });
    expect(lastInventory).toMatchObject({ counted: 2, variances: 1, by: 'Awa Fall' });
  });

  it('recherche un article sans perdre les quantités déjà saisies', () => {
    render(<InventoryModal open onClose={() => undefined} />);
    fireEvent.change(count('Lait'), { target: { value: '8' } });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'riz' } });

    expect(screen.queryByLabelText('Compté : Lait')).toBeNull();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    expect(count('Lait').value).toBe('8');
  });
});

describe('fiche produit — stock verrouillé (RG-05)', () => {
  it('en modification, le champ stock est désactivé et renvoie vers « Ajuster »', () => {
    render(<ProductFormModal open onClose={() => undefined} product={product()} onSubmit={() => undefined} />);
    const field = screen.getByLabelText('Stock actuel') as HTMLInputElement;
    expect(field.disabled).toBe(true);
    expect(screen.getByText(/Modifiable via « Ajuster »/)).toBeTruthy();
  });

  it('en création, le stock initial reste saisissable', () => {
    render(<ProductFormModal open onClose={() => undefined} product={null} onSubmit={() => undefined} />);
    expect((screen.getByLabelText('Stock initial') as HTMLInputElement).disabled).toBe(false);
  });
});

describe('StockView — droits', () => {
  it('le gérant voit « Ajuster », l’historique, le journal et l’inventaire', () => {
    render(<StockView />);
    expect(screen.getAllByRole('button', { name: 'Ajuster le stock de Lait' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Historique du stock de Lait' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Journal de stock' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Faire un inventaire' })).toBeTruthy();
  });

  it('le caissier ne voit aucune de ces actions', () => {
    signIn('cashier');
    render(<StockView />);
    expect(screen.queryByRole('button', { name: /Ajuster le stock/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Journal de stock' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Faire un inventaire' })).toBeNull();
  });

  it('affiche le dernier inventaire réalisé', () => {
    useStockStore.setState({
      lastInventory: { at: '2026-11-10T09:00:00Z', by: 'Awa Fall', counted: 12, variances: 2 },
    });
    render(<StockView />);
    expect(screen.getByText(/Dernier inventaire le .* par Awa Fall : 12 articles comptés, 2 écarts/)).toBeTruthy();
  });
});

describe('textes de confirmation', () => {
  it('accorde les pluriels de l’inventaire', async () => {
    const { t } = await import('@/content');
    expect(t.stock.inventory.done(1, 0)).toBe('Inventaire enregistré : 1 article compté, aucun écart.');
    expect(t.stock.inventory.done(2, 1)).toBe('Inventaire enregistré : 2 articles comptés, 1 écart corrigé.');
    expect(t.stock.inventory.done(5, 3)).toBe('Inventaire enregistré : 5 articles comptés, 3 écarts corrigés.');
    expect(t.stock.audit.last('12 novembre 2026', 'Awa Fall', 1, 0)).toContain('1 article compté, 0 écart');
  });
});
