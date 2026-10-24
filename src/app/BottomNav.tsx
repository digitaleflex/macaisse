import { t } from '@/content';
import { selectCartItemCount, useCartStore } from '@/store/useCartStore';
import { selectTab, useUiStore } from '@/store/useUiStore';
import { Icon, cn } from '@/ui';
import { useAllowedTabs } from './useAllowedTabs';

/** Barre d'onglets mobile (< lg) — la caisse est mise en avant au centre. */
export function BottomNav() {
  const currentTab = useUiStore(selectTab);
  const setTab = useUiStore((state) => state.setTab);
  const cartCount = useCartStore(selectCartItemCount);
  const tabs = useAllowedTabs();

  return (
    <nav
      aria-label={t.app.name}
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-line pb-safe"
    >
      <div className="max-w-xl mx-auto grid h-16 px-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((tab) => {
          const active = currentTab === tab.id;
          if (tab.id === 'ventes') {
            return (
              <div key={tab.id} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setTab(tab.id)}
                  aria-label={tab.label}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative -mt-5 size-14 rounded-2xl flex items-center justify-center shadow-raised transition-all active:scale-95 cursor-pointer ring-4 ring-canvas',
                    active ? 'bg-zest-400 text-ink-950' : 'bg-ink-900 text-zest-400'
                  )}
                >
                  <Icon name={tab.icon} size={26} filled />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white font-num">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>
            );
          }
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors',
                active ? 'text-ink-900' : 'text-slate-400 hover:text-slate-700'
              )}
            >
              <Icon name={tab.icon} size={23} filled={active} />
              <span className={cn('text-[11px] leading-none', active ? 'font-bold' : 'font-medium')}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
