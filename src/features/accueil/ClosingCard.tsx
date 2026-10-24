import { t } from '@/content';
import { useCurrentSession } from '@/store/useSessionStore';
import { Button, Icon, cn } from '@/ui';

/** Clôture journalière de la caisse (état local à la session d'affichage). */
export function ClosingCard({ closed, onToggle }: { closed: boolean; onToggle: () => void }) {
  const { business } = useCurrentSession();
  return (
    <section className="rounded-card border border-line bg-surface shadow-card p-4 flex items-center gap-3.5">
      <span
        className={cn(
          'size-11 rounded-2xl flex items-center justify-center shrink-0',
          closed ? 'bg-brand-50 text-brand-600' : 'bg-ink-900 text-zest-400'
        )}
      >
        <Icon name={closed ? 'task_alt' : 'lock_clock'} size={22} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-ink-900">
          {closed ? t.dashboard.closing.doneTitle : t.dashboard.closing.title}
        </div>
        <div className="text-xs text-slate-500">
          {closed ? t.dashboard.closing.doneHint : t.dashboard.closing.hint(business.closingTime)}
        </div>
      </div>
      <Button variant={closed ? 'secondary' : 'primary'} size="sm" onClick={onToggle}>
        {closed ? t.dashboard.closing.reopen : t.dashboard.closing.close}
      </Button>
    </section>
  );
}
