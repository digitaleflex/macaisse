import React from 'react';
import { TabType } from '../types';

interface BottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  cartCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onChangeTab, cartCount = 0 }) => {
  const tabs: { id: TabType; label: string; icon: string; badge?: string | number }[] = [
    { id: 'accueil', label: 'Accueil', icon: 'dashboard' },
    { id: 'ventes', label: 'Ventes', icon: 'point_of_sale', badge: cartCount > 0 ? cartCount : 'POS' },
    { id: 'stock', label: 'Stock', icon: 'inventory_2' },
    { id: 'credits', label: 'Crédits', icon: 'account_balance_wallet' },
    { id: 'bilan', label: 'Bilan', icon: 'insights' },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-40 pb-[env(safe-area-inset-bottom,0px)] bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-2px_10px_rgba(15,23,42,0.04)]">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
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

                {tab.badge && (
                  <span
                    className={`absolute -top-1 -right-3 px-1.5 py-0.2 text-[9px] rounded-full leading-tight font-extrabold shadow-2xs ${
                      tab.badge === 'POS'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-500 text-slate-950 ring-2 ring-white font-num font-black'
                    }`}
                  >
                    {tab.badge}
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
};
