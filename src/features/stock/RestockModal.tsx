import { useState, type FormEvent } from 'react';
import type { Product } from '@/types';
import { Button, Input, Modal } from '@/ui';

/**
 * RestockModal — saisie d'une quantité de réapprovisionnement.
 *
 * En-tête clair (`<Modal>` par défaut). La validation est déléguée au parent
 * (`onSubmit`) qui appelle `useProductsStore.restock` et gère les erreurs
 * françaises levées par le store (quantité ≤ 0, id inconnu).
 */

export interface RestockModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onSubmit: (quantity: number) => void;
}

const DEFAULT_QUANTITY = 20;

export function RestockModal({ open, onClose, product, onSubmit }: RestockModalProps) {
  // Quantité par défaut ; le parent remonte le composant (`key`) à chaque
  // ouverture, ce qui réinitialise la saisie sans effet ni `setState`.
  const [quantity, setQuantity] = useState(DEFAULT_QUANTITY);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(quantity);
    if (!Number.isFinite(value) || value <= 0) return;
    onSubmit(value);
  };

  return (
    <Modal open={open} onClose={onClose} title="Réapprovisionner">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {product && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0 overflow-hidden border border-slate-200/60">
              <img
                src={product.imageUrl}
                alt={product.imageAlt || product.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display text-xs font-bold text-slate-900 truncate">
                {product.name}
              </span>
              <span className="text-[11px] text-slate-500">
                Stock actuel : {product.stock} {product.unit}
                {product.stock > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        <Input
          label="Quantité à ajouter"
          name="restock-quantity"
          type="number"
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
        />

        <Button type="submit" variant="primary" size="lg" fullWidth className="mt-2">
          <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
          <span>Valider le réapprovisionnement</span>
        </Button>
      </form>
    </Modal>
  );
}
