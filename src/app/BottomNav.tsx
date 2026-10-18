import { selectCartItemCount, useCartStore } from '@/store/useCartStore';
import { selectTab, useUiStore } from '@/store/useUiStore';
import { TABS } from './routes';

/**
 * Barre de navigation inférieure — aucune prop : les onglets viennent de `TABS`
 * (source unique), l'onglet courant et la navigation de `useUiStore`, et le badge
 * du panier de `useCartStore`.
 */
export function BottomNav() {
  const currentTab = useUiStore(selectTab);
  const setTab = useUiStore((state) => state.setTab);
  const cartCount = useCartStore(selectCartItemCount);

  return (
    <nav className="fixed bottom-0 w-full z-40 pb-[env(safe-area-inset-bottom,0px)] bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-2px_10px_rgba(15,23,42,0.04)]">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">
        {TABS.map((tab) => {
          const isActive = currentTab === tab.id;
          const badge = tab.id === 'ventes' ? (cartCount > 0 ? cartCount : 'POS') : undefined;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              type="button"
              className={`relative flex flex-col items-center justify-center flex-1 h-12 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-slate-900 font-bold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/80'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span
                  className={`material-symbols-outlined text-[23px] transition-transform ${
                    isActive ? 'material-symbols-filled text-slate-950 scale-105' : 'text-slate-500'
                  }`}
                >
                  {tab.icon}
                </span>

                {badge && (
                  <span
                    className={`absolute -top-1 -right-3 px-1.5 py-0.2 text-[9px] rounded-full leading-tight font-extrabold shadow-2xs ${
                      badge === 'POS'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-500 text-slate-950 ring-2 ring-white font-num font-black'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </div>

              <span className={`text-[11px] mt-0.5 leading-none ${isActive ? 'font-bold text-slate-950' : 'font-medium text-slate-500'}`}>
                {tab.label}
              </span>

              {/* Active Pill Indicator */}
              {isActive && (
                <span className="absolute bottom-0.5 w-5 h-1 rounded-full bg-emerald-600 animate-fadeIn" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
