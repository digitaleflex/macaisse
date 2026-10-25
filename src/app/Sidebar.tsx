import { t } from '@/content';
import { can, type Permission } from '@/domain/permissions';
import { formatFCFA } from '@/domain/money';
import { OrgSwitcher } from '@/features/organisation';
import { isDemoMode } from '@/config/env';
import { logout } from '@/store/auth';
import { selectCartItemCount, useCartStore } from '@/store/useCartStore';
import { selectUnreadCount, useNotificationsStore } from '@/store/useNotificationsStore';
import { useCurrentSession } from '@/store/useSessionStore';
import { selectTab, useUiStore, type UiModal } from '@/store/useUiStore';
import { Avatar, BrandMark, Icon, IconButton, cn } from '@/ui';
import { useAllowedTabs } from './useAllowedTabs';

/** Barre latérale (≥ lg) : marque, navigation principale, raccourcis, compte. */
export function Sidebar() {
  const currentTab = useUiStore(selectTab);
  const setTab = useUiStore((state) => state.setTab);
  const openModal = useUiStore((state) => state.openModal);
  const cartCount = useCartStore(selectCartItemCount);
  const unread = useNotificationsStore(selectUnreadCount);
  const { user, subscription, role } = useCurrentSession();
  const tabs = useAllowedTabs();

  const shortcuts: { id: UiModal; icon: string; label: string; count?: number; permission?: Permission }[] = [
    { id: 'depenses', icon: 'receipt_long', label: t.navSecondary.expenses, permission: 'expenses.manage' },
    { id: 'export', icon: 'download', label: t.navSecondary.export, permission: 'export.run' },
    { id: 'equipe', icon: 'group', label: t.navSecondary.team, permission: 'team.manage' },
    { id: 'notifications', icon: 'notifications', label: t.navSecondary.notifications, count: unread },
  ];
  const visibleShortcuts = shortcuts.filter((item) => !item.permission || can(role, item.permission));

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[264px] flex-col bg-ink-900 text-slate-300 bg-grid-ink">
      <div className="px-5 pt-6 pb-4 flex items-center gap-2.5">
        <BrandMark className="size-8" />
        <span className="font-display font-extrabold text-white text-[17px] tracking-tight">{t.app.name}</span>
        {isDemoMode && (
          <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-zest-400/80">{t.app.demoBadge}</span>
        )}
      </div>
      <div className="px-3 pb-5">
        <OrgSwitcher />
      </div>

      <nav className="px-3 flex flex-col gap-1" aria-label={t.app.name}>
        {tabs.map((tab) => {
          const active = tab.id === currentTab;
          const count = tab.id === 'ventes' ? cartCount : 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex items-center gap-3 h-11 px-3 rounded-xl text-sm font-semibold transition-all cursor-pointer',
                active ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              )}
            >
              {active && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-zest-400" />}
              <Icon name={tab.icon} size={21} filled={active} className={active ? 'text-zest-400' : ''} />
              <span className="flex-1 text-left">{tab.label}</span>
              {count > 0 && (
                <span className="min-w-6 h-6 px-1.5 rounded-full bg-zest-400 text-ink-950 text-xs font-bold flex items-center justify-center font-num">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-6 mt-7 mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {t.navSecondary.title}
      </div>
      <div className="px-3 flex flex-col gap-1">
        {visibleShortcuts.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openModal(item.id)}
            className="flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <Icon name={item.icon} size={19} />
            <span className="flex-1 text-left">{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-auto p-3 flex flex-col gap-2">
        {can(role, 'billing.manage') && (
          <button
            type="button"
            onClick={() => openModal('abonnement')}
            className="text-left rounded-2xl p-4 bg-gradient-to-br from-white/[0.09] to-white/[0.02] ring-1 ring-white/10 hover:ring-zest-400/40 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 text-zest-400 text-xs font-bold uppercase tracking-wider">
              <Icon name="workspace_premium" size={16} filled />
              {subscription.plan.name}
            </div>
            <div className="mt-1.5 font-num font-bold text-white text-lg leading-none">
              {formatFCFA(subscription.plan.monthlyPrice)}
              <span className="text-xs font-medium text-slate-400 ml-1">{t.subscription.perMonth}</span>
            </div>
          </button>
        )}

        <div className="flex items-center gap-1 p-1.5 rounded-2xl hover:bg-white/[0.04] transition-colors">
          <button
            type="button"
            onClick={() => openModal('profil')}
            aria-label={t.header.profile}
            className="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer"
          >
            <Avatar initials={`${user.firstName[0]}${user.lastName[0]}`} tone="zest" size="md" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-white truncate">
                {user.firstName} {user.lastName}
              </span>
              <span className="block text-xs text-slate-500 truncate">{t.roles[role]}</span>
            </span>
          </button>
          <IconButton
            icon="logout"
            label={t.auth.logout}
            className="text-slate-500 hover:text-white hover:bg-white/10"
            onClick={() => void logout()}
          />
        </div>
      </div>
    </aside>
  );
}
