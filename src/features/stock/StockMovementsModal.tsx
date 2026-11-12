import { useMemo, useState } from 'react';
import type { StockMovement, StockMovementType } from '@/types';
import { t } from '@/content';
import { STOCK_MOVEMENT_STYLE, STOCK_MOVEMENT_TYPES } from '@/config/reference';
import { filterMovements, isEntry } from '@/domain/stockMovements';
import { Badge, Chip, EmptyState, FormError, Icon, Modal, Spinner, cn } from '@/ui';
import { useStockMovements } from './useStockMovements';

export interface StockMovementsModalProps {
  open: boolean;
  onClose: () => void;
  /** Absent : journal de tous les produits. */
  product?: { id: string; name: string };
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Journal de stock (EF-19) : qui a changé quoi, quand et pourquoi, pour un produit ou pour tous. */
export function StockMovementsModal({ open, onClose, product }: StockMovementsModalProps) {
  const [type, setType] = useState<StockMovementType | 'all'>('all');
  const { movements, loading, error } = useStockMovements(open, product?.id);

  const visible = useMemo(
    () => (movements === null ? [] : filterMovements(movements, type === 'all' ? {} : { type })),
    [movements, type]
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? t.stock.movements.titleFor(product.name) : t.stock.movements.title}
      subtitle={t.stock.movements.subtitle}
      icon="history"
      size="lg"
    >
      <div
        role="group"
        aria-label={t.stock.movements.filterLabel}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1"
      >
        <Chip active={type === 'all'} onClick={() => setType('all')}>
          {t.stock.movements.all}
        </Chip>
        {STOCK_MOVEMENT_TYPES.map((entry) => (
          <Chip key={entry} active={type === entry} onClick={() => setType(entry)} icon={STOCK_MOVEMENT_STYLE[entry].icon}>
            {t.stock.movements.types[entry]}
          </Chip>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
          <Spinner /> {t.stock.movements.loading}
        </div>
      )}
      {error !== null && <FormError message={t.stock.movements.error} />}

      {movements !== null && visible.length === 0 && (
        <EmptyState
          icon="inventory_2"
          title={t.stock.movements.emptyTitle}
          description={type === 'all' ? t.stock.movements.emptyText : t.stock.movements.emptyFiltered}
          compact
        />
      )}

      {visible.length > 0 && (
        <>
          <div className="text-xs text-slate-500">{t.stock.movements.count(visible.length)}</div>
          <ul className="rounded-2xl border border-line divide-y divide-line">
            {visible.map((movement) => (
              <MovementRow key={movement.id} movement={movement} showProduct={product === undefined} />
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}

function MovementRow({ movement, showProduct }: { movement: StockMovement; showProduct: boolean }) {
  const style = STOCK_MOVEMENT_STYLE[movement.type];
  const entry = isEntry(movement);
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className="size-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
        <Icon name={style.icon} size={19} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {showProduct && <span className="text-sm font-semibold text-ink-900 truncate">{movement.productName}</span>}
          <Badge tone={style.tone}>{t.stock.movements.types[movement.type]}</Badge>
        </div>
        {movement.reason && <div className="text-xs text-slate-600 mt-0.5">{movement.reason}</div>}
        <div className="text-xs text-slate-500 mt-0.5">
          {[
            formatWhen(movement.createdAt),
            movement.userName ? t.stock.movements.by(movement.userName) : null,
            movement.saleNumber ? t.stock.movements.ticket(movement.saleNumber) : null,
          ]
            .filter((part): part is string => part !== null)
            .join(' · ')}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={cn('font-num font-bold text-sm', entry ? 'text-emerald-600' : 'text-rose-600')}>
          {entry ? '+' : '−'}
          {Math.abs(movement.quantity)}
        </div>
        <div className="text-[11px] text-muted font-num">{t.stock.movements.after(movement.quantityAfter)}</div>
      </div>
    </li>
  );
}
