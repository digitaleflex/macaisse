import type { ClientCredit, CreditStatus } from '@/types';
import { t } from '@/content';
import { CREDIT_STATUS_TONE } from '@/config/reference';
import { fullDaysBetween, parseDate } from '@/domain/dates';
import { formatFCFA } from '@/domain/money';
import { Avatar, Badge, Button, Icon, IconButton, ProgressBar, cn } from '@/ui';

/** Carte d'un débiteur — statut, retard et progression calculés en amont (domaine). */
export interface CreditDetailCardProps {
  credit: ClientCredit;
  status: CreditStatus;
  daysLateCount: number;
  progress: number;
  onPay: (credit: ClientCredit) => void;
  onWhatsAppReminder: (credit: ClientCredit) => void;
}

function formatDue(iso: string): string {
  const date = parseDate(iso);
  return date ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : iso;
}

export function CreditDetailCard({ credit, status, daysLateCount, progress, onPay, onWhatsAppReminder }: CreditDetailCardProps) {
  const overdue = status === 'En retard';
  const paid = credit.totalInitial - credit.remainingAmount;
  const due = parseDate(credit.dueDate);
  const daysLeft = due ? fullDaysBetween(new Date(), due) : null;

  return (
    <article
      className={cn(
        'bg-surface rounded-card border shadow-card p-5 flex flex-col gap-4 transition-shadow hover:shadow-raised',
        overdue ? 'border-rose-200' : 'border-line'
      )}
    >
      <header className="flex items-start gap-3">
        <Avatar initials={credit.initials} tone={overdue ? 'danger' : 'neutral'} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-ink-900 truncate">{credit.clientName}</h3>
          <p className="text-xs text-slate-500 truncate">
            {credit.shopOrLocation} · {credit.phone}
          </p>
        </div>
        <Badge tone={CREDIT_STATUS_TONE[status]} dot>
          {t.labels.creditStatus[status]}
        </Badge>
      </header>

      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500">{t.credits.card.remaining}</div>
          <div className={cn('font-num font-extrabold text-2xl leading-tight', overdue ? 'text-rose-600' : 'text-ink-900')}>
            {formatFCFA(credit.remainingAmount)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">{t.credits.card.due}</div>
          <div className="text-sm font-semibold text-ink-900">{formatDue(credit.dueDate)}</div>
          <div className={cn('text-[11px] font-semibold', overdue ? 'text-rose-600' : 'text-slate-500')}>
            {overdue
              ? t.credits.card.overdueSince(daysLateCount)
              : daysLeft !== null && daysLeft >= 0
                ? t.credits.card.dueIn(daysLeft)
                : ''}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <ProgressBar value={progress} tone={overdue ? 'danger' : 'brand'} label={t.credits.card.paid(formatFCFA(paid))} />
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>{t.credits.card.paid(formatFCFA(paid))}</span>
          <span>{t.credits.card.of(formatFCFA(credit.totalInitial))}</span>
        </div>
      </div>

      <footer className="flex items-center gap-2 pt-1">
        <Button variant="primary" size="md" icon="payments" className="flex-1" onClick={() => onPay(credit)}>
          {t.credits.card.collect}
        </Button>
        <a
          href={`tel:${credit.phone.replace(/\s+/g, '')}`}
          aria-label={t.credits.card.call(credit.clientName)}
          title={t.credits.card.call(credit.clientName)}
          className="size-10 rounded-xl border border-line bg-white text-slate-600 hover:text-ink-900 hover:border-line-strong flex items-center justify-center transition-colors"
        >
          <Icon name="call" size={20} />
        </a>
        <IconButton
          icon="chat"
          label={t.credits.card.remindUnavailable}
          variant="brand-soft"
          onClick={() => onWhatsAppReminder(credit)}
        />
      </footer>
    </article>
  );
}
