import { useState, type FormEvent } from 'react';
import type { Category, Product, ProductInput } from '@/types';
import { createId } from '@/domain/ids';
import { Button, Input, Modal, Select, type SelectOption } from '@/ui';

/**
 * ProductFormModal — formulaire unique de création ET d'édition d'un article.
 *
 * Remplace la modale inline historique de l'ancienne vue stock (qui ne gérait
 * que la création) et ajoute l'édition. Le statut de stock n'est jamais saisi
 * ici : il est dérivé par `@/domain/stock` à la lecture.
 *
 * En-tête clair (`headerVariant` par défaut de `<Modal>`), conformément aux
 * modales de stock existantes. Le formulaire consomme les primitives
 * `Input` / `Select` / `Button`.
 */

const DEFAULT_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBOFh0s9MG1JpMytvAFgA4ZynFXG4IZdGwTIyxcB4xbSbNq3yI5u18Kjt1CISGXeFYcdzVIUL8SrdKL74YSl48puDJzGcgNe--gTvGB4Yrf6ZBZOuMgR_0LvtbQdkj6-2p4pNyxrH6rFHdw75P9OfJUNbJRLcqfZDEtirFJHbp_1dcyIb4SifvtMogEohp5qUXrdUYMO0PMbNwVkLiFVMBYQWhW-pnmd8aZV9_-0SYcEXQqU39IzpSmqQ';

const CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'Épicerie', label: 'Épicerie' },
  { value: 'Frais', label: 'Frais' },
  { value: 'Boissons', label: 'Boissons' },
  { value: 'Hygiène', label: 'Hygiène' },
];

function isCategory(value: string): value is Category {
  return value === 'Frais' || value === 'Épicerie' || value === 'Boissons' || value === 'Hygiène';
}

export interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Article à éditer ; `null` ou absent => création. */
  product?: Product | null;
  onSubmit: (input: ProductInput) => void;
}

export function ProductFormModal({ open, onClose, product, onSubmit }: ProductFormModalProps) {
  const isEdit = product !== undefined && product !== null;

  // État initial dérivé de l'article ciblé. Le parent remonte le composant
  // (`key`) à chaque ouverture : les valeurs ci-dessous sont donc toujours
  // fraîches, sans `setState` dans un effet.
  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [category, setCategory] = useState<Category>(product?.category ?? 'Épicerie');
  const [price, setPrice] = useState(product?.price ?? 1000);
  const [costPrice, setCostPrice] = useState(product?.costPrice ?? 800);
  const [stock, setStock] = useState(product?.stock ?? 10);
  const [minStockAlert, setMinStockAlert] = useState(product?.minStockAlert ?? 5);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const input: ProductInput = {
      id: product?.id ?? createId('product'),
      name: trimmedName,
      sku: sku.trim() || `#ART-${Math.floor(100 + Math.random() * 900)}`,
      category,
      price: Number(price),
      costPrice: Number(costPrice),
      stock: Number(stock),
      minStockAlert: Number(minStockAlert),
      imageUrl: product?.imageUrl ?? DEFAULT_IMAGE_URL,
      unit: product?.unit ?? 'unité',
    };

    onSubmit(input);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Modifier l'article" : 'Ajouter un nouvel article'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Nom de l'article"
          name="product-name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex: Savon liquide 500ml, Thé Touba..."
        />

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Code SKU / Réf"
            name="product-sku"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            placeholder="#ART-105"
          />
          <Select
            label="Rayon / Catégorie"
            name="product-category"
            value={category}
            onChange={(event) => {
              const value = event.target.value;
              if (isCategory(value)) setCategory(value);
            }}
            options={CATEGORY_OPTIONS}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Prix de vente (FCFA)"
            name="product-price"
            type="number"
            required
            value={price}
            onChange={(event) => setPrice(Number(event.target.value))}
          />
          <Input
            label="Prix d'achat (FCFA)"
            name="product-cost-price"
            type="number"
            value={costPrice}
            onChange={(event) => setCostPrice(Number(event.target.value))}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            label={isEdit ? 'Stock actuel' : 'Stock Initial'}
            name="product-stock"
            type="number"
            value={stock}
            onChange={(event) => setStock(Number(event.target.value))}
          />
          <Input
            label="Seuil d'alerte"
            name="product-min-stock"
            type="number"
            value={minStockAlert}
            onChange={(event) => setMinStockAlert(Number(event.target.value))}
          />
        </div>

        <Button type="submit" variant="primary" size="lg" fullWidth className="mt-2">
          <span className="material-symbols-outlined text-[20px]">check</span>
          <span>{isEdit ? 'Enregistrer les modifications' : 'Enregistrer dans le catalogue'}</span>
        </Button>
      </form>
    </Modal>
  );
}
