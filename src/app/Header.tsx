import { APP_LOGO } from '@/data/seed';
import { selectUnreadCount, useNotificationsStore } from '@/store/useNotificationsStore';
import { selectIsOnline, selectTab, useUiStore } from '@/store/useUiStore';
import { tabTitle } from './routes';

/**
 * Header du shell — aucune prop métier : l'onglet courant, l'état réseau et
 * l'ouverture des modales proviennent de `useUiStore`, le badge des non-lues de
 * `useNotificationsStore`. L'état réseau réel (`isOnline`) remplace l'ancienne
 * constante `isOffline` passée en dur depuis `App.tsx`.
 */
export function Header() {
  const currentTab = useUiStore(selectTab);
  const isOnline = useUiStore(selectIsOnline);
  const openModal = useUiStore((state) => state.openModal);
  const unreadNotificationsCount = useNotificationsStore(selectUnreadCount);
  const isOffline = !isOnline;

  return (
    <header className="fixed top-0 w-full z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_4px_rgba(15,23,42,0.03)] transition-all">
      <div className="max-w-md mx-auto px-4 h-20 flex flex-col justify-between py-2">
        {/* Hardware Status Bar (09:41, wifi, battery) */}
        <div className="flex items-center justify-between w-full text-xs text-slate-700">
          <span className="font-semibold tracking-tight font-num">09:41</span>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="material-symbols-outlined text-[14px]">signal_cellular_alt</span>
            <span className="material-symbols-outlined text-[14px]">
              {isOffline ? 'wifi_off' : 'wifi'}
            </span>
            <span className="material-symbols-outlined text-[16px]">battery_full</span>
          </div>
        </div>

        {/* Store Brand, Subtitle & Action Bar */}
        <div className="flex items-center justify-between w-full h-11">
          {/* Logo & Store Info */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center p-1 shadow-xs shrink-0 border border-slate-800">
              <img
                src={APP_LOGO}
                alt="Ma Caisse Logo"
                className="h-full w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-sm text-slate-900 leading-tight">
                  Boutique Étoile
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOffline ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 ring-2 ring-emerald-100'
                  }`}
                  title={isOffline ? 'Mode hors-ligne' : 'Connecté en direct (Cloud sync)'}
                />
              </div>
              <span className="text-[11px] text-slate-500 leading-none font-medium mt-0.5">
                {tabTitle(currentTab)}
              </span>
            </div>
          </div>

          {/* Right Actions: Notifications & Avatar */}
          <div className="flex items-center gap-1.5">
            {isOffline && (
              <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Hors-ligne
              </span>
            )}
            <button
              aria-label="Notifications"
              onClick={() => openModal('notifications')}
              type="button"
              className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white" />
              )}
            </button>

            <button
              aria-label="Mon Profil"
              onClick={() => openModal('profil')}
              type="button"
              className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-emerald-400 shadow-xs border border-slate-800 active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
