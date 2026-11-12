import { useMemo, useState } from 'react';
import type { Product } from '@/types';
import { t } from '@/content';
import { formatFCFA } from '@/domain/money';
import { activeProducts } from '@/domain/stock';
import {
  countedProducts,
  inventoryImpact,
  inventoryVariances,
} from '@/domain/stockMovements';
import { errorText } from '@/services';
import { applyInventoryCount } from '@/store/stockActions';
import { useProductsStore } from '@/store/useProductsStore';
import { useUiStore } from '@/store/useUiStore';
import { Badge, Button, EmptyState, FormError, Input, Modal, SearchField, cn } from '@/ui';

export interface InventoryModalProps {
  open: boolean;
  onClose: () => void;
}

/** Quantité saisie : `undefined` = non comptée, `null` = saisie invalide, sinon l'entier compté. */
function parseCount(text: string | undefined): number | undefined | null {
  if (text === undefined || text.trim() === '') return undefined;
  const value = Number(text);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * Inventaire : on compte les articles, l'écran affiche les écarts et leur valeur, et la
 * validation crée un mouvement `adjustment` par écart, en une seule opération (tout ou rien).
 */
export function InventoryModal({ open, onClose }: InventoryModalProps) {
  const allProducts = useProductsStore((state) => state.products);
  // Un produit désactivé n'est pas compté : il n'est plus vendu ni suivi.
  const products = useMemo(() => activeProducts(allProducts), [allProducts]);
  const showToast = useUiStore((state) => state.showToast);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const sorted = useMemo(() => [...products].sort((a, b) => a.name.localeCompare(b.name, 'fr')), [products]);
  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term === '' ? sorted : sorted.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(term));
  }, [sorted, query]);

  // Saisies converties : les valeurs invalides sont écartées du calcul et signalées en rouge.
  const counts = useMemo(() => {
    const result: Record<string, number | undefined> = {};
    for (const [id, text] of Object.entries(texts)) {
      const parsed = parseCount(text);
      if (typeof parsed === 'number') result[id] = parsed;
    }
    return result;
  }, [texts]);
  const hasInvalid = Object.values(texts).some((text) => parseCount(text) === null);
  const variances = useMemo(() => inventoryVariances(products, counts), [products, counts]);
  const varianceById = useMemo(() => new Map(variances.map((item) => [item.product.id, item.delta])), [variances]);
  const counted = countedProducts(products, counts);
  const impact = inventoryImpact(variances);

  const submit = async () => {
    if (busy || hasInvalid) return;
    setBusy(true);
    setFailure(null);
    try {
      const outcome = await applyInventoryCount(counts, note);
      showToast(t.stock.inventory.done(outcome.counted, outcome.movements.length), 'success');
      onClose();
    } catch (error) {
      setFailure(errorText(error));
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={t.stock.inventory.title}
      subtitle={t.stock.inventory.subtitle}
      icon="fact_check"
      size="xl"
      footer={
        <Button fullWidth size="lg" onClick={() => void submit()} disabled={busy || hasInvalid || counted === 0}>
          {busy ? t.stock.inventory.working : t.stock.inventory.submit(variances.length)}
        </Button>
      }
    >
      <p className="text-sm text-slate-600">{t.stock.inventory.intro}</p>

      <SearchField
        id="inventory-search"
        value={query}
        onChange={setQuery}
        placeholder={t.stock.inventory.search}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600" aria-live="polite">
        <span className="font-semibold text-ink-900 font-num">{t.stock.inventory.progress(counted, products.length)}</span>
        <span>{t.stock.inventory.variances(variances.length)}</span>
        {variances.length > 0 && (
          <span className={cn('font-num font-semibold', impact < 0 ? 'text-rose-700' : 'text-emerald-700')}>
            {t.stock.inventory.impact(`${impact > 0 ? '+' : ''}${formatFCFA(impact)}`)}
          </span>
        )}
      </div>

      {shown.length === 0 ? (
        <EmptyState icon="inventory_2" title={t.stock.inventory.empty} compact />
      ) : (
        <ul className="rounded-2xl border border-line divide-y divide-line">
          {shown.map((product) => (
            <InventoryRow
              key={product.id}
              product={product}
              text={texts[product.id] ?? ''}
              delta={varianceById.get(product.id)}
              invalid={parseCount(texts[product.id]) === null}
              onChange={(text) => setTexts((current) => ({ ...current, [product.id]: text }))}
            />
          ))}
        </ul>
      )}

      <Input
        label={t.stock.inventory.noteLabel}
        name="inventory-note"
        value={note}
        placeholder={t.stock.inventory.notePlaceholder}
        onChange={(event) => setNote(event.target.value)}
      />
      {failure !== null && <FormError message={failure} />}
    </Modal>
  );
}

interface InventoryRowProps {
  product: Product;
  text: string;
  /** Écart compté − théorique ; `undefined` si non compté ou conforme. */
  delta: number | undefined;
  invalid: boolean;
  onChange: (text: string) => void;
}

function InventoryRow({ product, text, delta, invalid, onChange }: InventoryRowProps) {
  const inputId = `inventory-count-${product.id}`;
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <label htmlFor={inputId} className="flex-1 min-w-0 cursor-pointer">
        <span className="block text-sm font-semibold text-ink-900 truncate">{product.name}</span>
        <span className="block text-xs text-slate-500 font-num">
          {t.stock.inventory.theoretical} : {product.stock} {product.unit}
        </span>
      </label>
      {delta !== undefined && (
        <Badge tone={delta < 0 ? 'danger' : 'success'}>
          {delta > 0 ? '+' : '−'}
          {Math.abs(delta)}
        </Badge>
      )}
      <div className="w-24 shrink-0">
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={text}
          placeholder="—"
          aria-label={`${t.stock.inventory.counted} : ${product.name}`}
          aria-invalid={invalid}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            'w-full h-10 rounded-xl border bg-white px-3 text-right font-num text-sm text-ink-900 outline-none',
            'focus:border-ink-900 focus:ring-4 focus:ring-ink-900/5',
            invalid ? 'border-rose-300' : 'border-line hover:border-line-strong'
          )}
        />
        {invalid && <span className="block text-xs text-rose-700 mt-1">{t.stock.inventory.invalid}</span>}
      </div>
    </li>
  );
}
