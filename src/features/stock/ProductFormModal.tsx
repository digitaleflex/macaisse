import { useState, type FormEvent } from 'react';
import type { Category, Product, ProductInput } from '@/types';
import { t } from '@/content';
import { PRODUCT_CATEGORIES } from '@/config/reference';
import { createId } from '@/domain/ids';
import { validateProductForm, type ValidationCode } from '@/domain/validation';
import { Button, FormError, Input, Modal, Select } from '@/ui';

/** Formulaire unique de création ET d'édition d'un article. */
export interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  onSubmit: (input: ProductInput) => void;
}

const CATEGORY_OPTIONS = PRODUCT_CATEGORIES.map((category) => ({
  value: category,
  label: category,
}));

function isCategory(value: string): value is Category {
  return (PRODUCT_CATEGORIES as readonly string[]).includes(value);
}

function generateSku(): string {
  return `#ART-${createId('sku').slice(-4).toUpperCase()}`;
}

export function ProductFormModal({ open, onClose, product, onSubmit }: ProductFormModalProps) {
  const isEdit = product !== undefined && product !== null;
  // Le parent remonte le composant (`key`) à chaque ouverture : état toujours frais.
  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [category, setCategory] = useState<Category>(product?.category ?? 'Épicerie');
  const [unit, setUnit] = useState(product?.unit ?? t.stock.form.defaultUnit);
  const [price, setPrice] = useState(product?.price ?? 1000);
  const [costPrice, setCostPrice] = useState(product?.costPrice ?? 800);
  const [stock, setStock] = useState(product?.stock ?? 10);
  const [minStockAlert, setMinStockAlert] = useState(product?.minStockAlert ?? 5);
  const [error, setError] = useState<ValidationCode | null>(null);

  const margin = price > 0 ? ((price - costPrice) / price) * 100 : 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const code = validateProductForm({ name: trimmedName, price, costPrice, stock, minStockAlert });
    if (code !== null) {
      setError(code);
      return;
    }
    setError(null);
    onSubmit({
      id: product?.id ?? createId('product'),
      name: trimmedName,
      sku: sku.trim() || generateSku(),
      category,
      price: Number(price),
      costPrice: Number(costPrice),
      stock: Number(stock),
      minStockAlert: Number(minStockAlert),
      imageUrl: product?.imageUrl ?? '',
      unit: unit.trim() || t.stock.form.defaultUnit,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t.stock.form.editTitle : t.stock.form.createTitle}
      subtitle={t.stock.form.subtitle}
      icon={isEdit ? 'edit' : 'add_box'}
      size="lg"
    >
      <form id="product-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={t.stock.form.name}
          name="product-name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t.stock.form.namePlaceholder}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t.stock.form.sku}
            name="product-sku"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            placeholder={t.stock.form.skuPlaceholder}
          />
          <Select
            label={t.stock.form.category}
            name="product-category"
            value={category}
            onChange={(event) => {
              if (isCategory(event.target.value)) setCategory(event.target.value);
            }}
            options={CATEGORY_OPTIONS}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t.stock.form.price}
            name="product-price"
            type="number"
            inputMode="numeric"
            required
            suffix={t.common.currency}
            min={0}
            step={1}
            value={price}
            onChange={(event) => {
              setPrice(Number(event.target.value));
              setError(null);
            }}
          />
          <Input
            label={t.stock.form.cost}
            name="product-cost-price"
            type="number"
            inputMode="numeric"
            suffix={t.common.currency}
            min={0}
            step={1}
            value={costPrice}
            onChange={(event) => {
              setCostPrice(Number(event.target.value));
              setError(null);
            }}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input
            label={isEdit ? t.stock.form.stockCurrent : t.stock.form.stockInitial}
            name="product-stock"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={stock}
            onChange={(event) => {
              setStock(Number(event.target.value));
              setError(null);
            }}
          />
          <Input
            label={t.stock.form.minStock}
            name="product-min-stock"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={minStockAlert}
            onChange={(event) => {
              setMinStockAlert(Number(event.target.value));
              setError(null);
            }}
          />
          <Input
            label={t.stock.form.unit}
            name="product-unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder={t.stock.form.unitPlaceholder}
          />
        </div>
        <p className="text-xs text-slate-500 -mt-1">
          {t.stock.form.marginPreview(margin.toFixed(1))}
        </p>
        <FormError message={error !== null ? t.validation[error] : null} />
        <Button type="submit" variant="primary" size="lg" fullWidth icon="check">
          {isEdit ? t.stock.form.submitEdit : t.stock.form.submitCreate}
        </Button>
      </form>
    </Modal>
  );
}
