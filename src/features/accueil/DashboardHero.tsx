import { t } from '@/content';
import { formatFCFA } from '@/domain/money';
import { selectCartItemCount, useCartStore } from '@/store/useCartStore';
import { useUiStore } from '@/store/useUiStore';
import { Icon } from '@/ui';

export interface DashboardHeroProps {
  todayCount: number;
  averageTicket: number;
}

/** Carte d'action principale (nouvelle vente) + raccourcis + pouls du jour. */
export function DashboardHero({ todayCount, averageTicket }: DashboardHeroProps) {
  const cartCount = useCartStore(selectCartItemCount);
  const setTab = useUiStore((state) => state.setTab);
  const openModal = useUiStore((state) => state.openModal);

  const actions = [
    { label: t.dashboard.quickActions.expense, icon: 'remove_circle', tone: 'text-rose-300', onClick: () => openModal('depenses') },
    { label: t.dashboard.quickActions.product, icon: 'add_box', tone: 'text-brand-300', onClick: () => setTab('stock') },
    { label: t.dashboard.quickActions.credit, icon: 'person_add', tone: 'text-sky-300', onClick: () => setTab('credits') },
    { label: t.dashboard.quickActions.export, icon: 'download', tone: 'text-amber-200', onClick: () => openModal('export') },
  ];

  return (
    <section className="relative overflow-hidden rounded-card bg-ink-900 text-white p-5 sm:p-6 bg-grid-ink shadow-raised flex flex-col gap-5 h-full">
      <div className="absolute -right-16 -top-16 size-56 rounded-full bg-zest-400/20 blur-3xl pointer-events-none" />
      <button
        id="btn-nouvelle-vente"
        type="button"
        onClick={() => setTab('ventes')}
        className="relative group flex items-center gap-4 text-left cursor-pointer"
      >
        <span className="size-14 rounded-2xl bg-zest-400 text-ink-950 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
          <Icon name="add_shopping_cart" size={28} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-display font-extrabold text-xl leading-tight">{t.dashboard.heroTitle}</span>
          <span className="block text-sm text-slate-400 mt-0.5">{t.dashboard.heroSubtitle}</span>
        </span>
        <span className="size-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-zest-400 group-hover:text-ink-950 transition-colors">
          <Icon name="arrow_forward" size={20} />
        </span>
      </button>

      <div className="relative grid grid-cols-4 gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] ring-1 ring-white/10 transition-colors cursor-pointer"
          >
            <Icon name={action.icon} size={22} className={action.tone} />
            <span className="text-xs font-semibold text-slate-200">{action.label}</span>
          </button>
        ))}
      </div>

      <dl className="relative mt-auto grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
        {[
          { label: t.dashboard.heroToday, value: String(todayCount) },
          { label: t.dashboard.heroBasket, value: formatFCFA(averageTicket, { withSuffix: false }) },
          { label: t.dashboard.heroCart, value: String(cartCount) },
        ].map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-[11px] text-slate-400 truncate">{item.label}</dt>
            <dd className="font-num font-bold text-lg text-white truncate">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
