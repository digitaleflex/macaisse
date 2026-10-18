import { beforeEach, describe, expect, it } from 'vitest';
import type { Product, ProductInput } from '@/types';
import {
  retailValueOf,
  selectLowStock,
  selectOutOfStock,
  selectProductsWithStatus,
  stockValueOf,
  useProductsStore,
} from '../useProductsStore';

function makeInput(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    id: 'input-temp',
    name: 'Lait demi-écrémé',
    sku: '#LAI-018',
    category: 'Frais',
    price: 950,
    costPrice: 750,
    stock: 10,
    minStockAlert: 5,
    imageUrl: '',
    unit: 'brique',
    ...overrides,
  };
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p',
    name: 'Lait demi-écrémé',
    sku: '#LAI-018',
    category: 'Frais',
    price: 950,
    costPrice: 750,
    stock: 10,
    minStockAlert: 5,
    imageUrl: '',
    unit: 'brique',
    ...overrides,
  };
}

function reset(): void {
  useProductsStore.setState({ products: [] });
}

describe('useProductsStore — CRUD', () => {
  beforeEach(reset);

  it('ajoute un produit avec un identifiant string', () => {
    useProductsStore.getState().addProduct(makeInput());
    const [product] = useProductsStore.getState().products;
    expect(product.id).toMatch(/^product-/);
    expect(product.name).toBe('Lait demi-écrémé');
  });

  it('met à jour un produit existant', () => {
    useProductsStore.getState().addProduct(makeInput());
    const id = useProductsStore.getState().products[0].id;
    useProductsStore.getState().updateProduct(id, { price: 1200, stock: 3 });
    const updated = useProductsStore.getState().products[0];
    expect(updated.price).toBe(1200);
    expect(updated.stock).toBe(3);
  });

  it('supprime un produit', () => {
    useProductsStore.getState().addProduct(makeInput());
    const id = useProductsStore.getState().products[0].id;
    useProductsStore.getState().removeProduct(id);
    expect(useProductsStore.getState().products).toHaveLength(0);
  });

  it('réapprovisionne un produit existant', () => {
    useProductsStore.setState({ products: [makeProduct({ id: 'p1', stock: 2 })] });
    useProductsStore.getState().restock('p1', 8);
    expect(useProductsStore.getState().products[0].stock).toBe(10);
  });

  it('refuse un id inconnu ou une quantité non positive', () => {
    useProductsStore.setState({ products: [makeProduct({ id: 'p1', stock: 2 })] });
    expect(() => useProductsStore.getState().restock('inconnu', 5)).toThrowError(/introuvable/);
    expect(() => useProductsStore.getState().restock('p1', 0)).toThrowError(/supérieure à zéro/);
    expect(() => useProductsStore.getState().restock('p1', -3)).toThrowError(/supérieure à zéro/);
    expect(useProductsStore.getState().products[0].stock).toBe(2);
  });
});

describe('useProductsStore — decrementStock', () => {
  beforeEach(reset);

  it('décrémente et borne le stock à 0 (jamais négatif)', () => {
    useProductsStore.setState({ products: [makeProduct({ id: 'p1', stock: 2 })] });
    useProductsStore.getState().decrementStock([{ productId: 'p1', quantity: 5 }]);
    expect(useProductsStore.getState().products[0].stock).toBe(0);
  });

  it('cumule les mises à jour dupliquées et ignore les produits inconnus', () => {
    useProductsStore.setState({ products: [makeProduct({ id: 'p1', stock: 10 })] });
    useProductsStore.getState().decrementStock([
      { productId: 'p1', quantity: 2 },
      { productId: 'p1', quantity: 3 },
      { productId: 'inconnu', quantity: 9 },
    ]);
    expect(useProductsStore.getState().products[0].stock).toBe(5);
  });
});

describe('statut de stock dérivé', () => {
  beforeEach(() => {
    useProductsStore.setState({
      products: [
        makeProduct({ id: 'p1', stock: 0, minStockAlert: 5 }),
        makeProduct({ id: 'p2', stock: 3, minStockAlert: 5 }),
        makeProduct({ id: 'p3', stock: 20, minStockAlert: 5 }),
      ],
    });
  });

  it('n’est jamais stocké', () => {
    expect(useProductsStore.getState().products.every((p) => !('status' in p))).toBe(true);
  });

  it('est hydraté à la lecture', () => {
    const withStatus = selectProductsWithStatus(useProductsStore.getState());
    expect(withStatus.map((p) => p.status)).toEqual(['rupture', 'faible', 'disponible']);
  });

  it('expose les listes faible / rupture', () => {
    const state = useProductsStore.getState();
    expect(selectLowStock(state).map((p) => p.id)).toEqual(['p2']);
    expect(selectOutOfStock(state).map((p) => p.id)).toEqual(['p1']);
  });
});

describe('valorisation du stock', () => {
  it('délègue au domaine', () => {
    const products = [makeProduct({ id: 'p1', stock: 2, costPrice: 100, price: 150 })];
    expect(stockValueOf(products)).toBe(200);
    expect(retailValueOf(products)).toBe(300);
  });
});
