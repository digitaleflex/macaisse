import { useState } from 'react';
import { t } from '@/content';
import { OrgList } from '@/features/organisation';
import { api } from '@/services';
import { selectMemberships, useAuthStore } from '@/store/useAuthStore';
import { selectUnreadCount, useNotificationsStore } from '@/store/useNotificationsStore';
import { useCurrentSession } from '@/store/useSessionStore';
import { selectIsOnline, selectTab, useUiStore } from '@/store/useUiStore';
import { Avatar, Badge, BrandMark, Button, Icon, IconButton, Modal } from '@/ui';
import { tabDefinition } from './routes';

/** En-tête collant : titre de page, état réseau, actions globales. */
export function Topbar() {
  const tab = useUiStore(selectTab);
  const isOnline = useUiStore(selectIsOnline);
  const setTab = useUiStore((state) => state.setTab);
  const openModal = useUiStore((state) => state.openModal);
  const unread = useNotificationsStore(selectUnreadCount);
  const { user, business, role } = useCurrentSession();
  const memberships = useAuthStore(selectMemberships);
  const [orgSheetOpen, setOrgSheetOpen] = useState(false);
  const page = tabDefinition(tab);

  return (
    <header className="sticky top-0 z-30 bg-canvas/80 backdrop-blur-xl border-b border-line/70">
      <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center gap-3 max-w-[1440px] mx-auto">
        <button
          type="button"
          onClick={() => setOrgSheetOpen(true)}
          aria-label={t.org.switcher}
          className="lg:hidden flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
        >
          <BrandMark className="size-9" />
          <span className="min-w-0">
            <span className="block font-display font-bold text-[15px] text-ink-900 leading-tight truncate">{page.title}</span>
            <span className="flex items-center gap-0.5 text-[11px] text-slate-500">
              <span className="truncate">
                {business.name} · {t.roles[role]}
              </span>
              <Icon name="expand_more" size={14} />
            </span>
          </span>
        </button>

        <div className="hidden lg:block min-w-0 flex-1">
          <div className="text-xs text-slate-500">
            {business.name} <span className="text-slate-300 mx-1">/</span>
            <span className="text-ink-900 font-semibold">{page.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {api.mode === 'mock' && (
            <span className="hidden sm:flex">
              <Badge tone="info" icon="science">
                {t.app.demoBadge}
              </Badge>
            </span>
          )}
          <span className={isOnline ? 'hidden sm:flex' : 'flex'} title={isOnline ? undefined : t.header.offlineHint}>
            <Badge tone={isOnline ? 'success' : 'warning'} dot>
              {isOnline ? t.header.online : t.header.offline}
            </Badge>
          </span>
          {tab !== 'ventes' && (
            <span className="hidden md:flex">
              <Button variant="accent" size="sm" icon="add_shopping_cart" onClick={() => setTab('ventes')}>
                {t.header.newSale}
              </Button>
            </span>
          )}
          <IconButton
            icon="notifications"
            label={t.header.notifications}
            badge={unread > 0}
            onClick={() => openModal('notifications')}
          />
          <button
            type="button"
            onClick={() => openModal('profil')}
            aria-label={t.header.profile}
            className="lg:hidden cursor-pointer rounded-xl active:scale-95 transition-transform"
          >
            <Avatar initials={`${user.firstName[0]}${user.lastName[0]}`} tone="ink" size="sm" className="size-9" />
          </button>
        </div>
      </div>
      <Modal
        open={orgSheetOpen}
        onClose={() => setOrgSheetOpen(false)}
        title={t.org.yourSpaces}
        subtitle={t.org.count(memberships.length)}
        icon="storefront"
      >
        <OrgList onSelected={() => setOrgSheetOpen(false)} />
      </Modal>
    </header>
  );
}
