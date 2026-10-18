import { Drawer, EmptyState } from '@/ui';
import { selectModal, useUiStore } from '@/store/useUiStore';
import { selectUnreadCount, useNotificationsStore } from '@/store/useNotificationsStore';
import type { NotificationItem as Notification } from '@/types';
import { NotificationItem } from './NotificationItem';

/**
 * NotificationDrawer — tiroir de notifications piloté par les stores.
 * Ouverture : `useUiStore.modal === 'notifications'`. Aucune prop.
 * Un clic marque la notification lue, navigue vers `relatedTab` si défini,
 * puis referme le tiroir.
 */

export function NotificationDrawer() {
  const open = useUiStore(selectModal) === 'notifications';
  const closeModal = useUiStore((state) => state.closeModal);
  const setTab = useUiStore((state) => state.setTab);

  const notifications = useNotificationsStore((state) => state.notifications);
  const markAllRead = useNotificationsStore((state) => state.markAllRead);
  const markRead = useNotificationsStore((state) => state.markRead);
  const unreadCount = useNotificationsStore(selectUnreadCount);

  const handleSelect = (notification: Notification) => {
    markRead(notification.id);
    if (notification.relatedTab) {
      setTab(notification.relatedTab);
    }
    closeModal();
  };

  const header = (
    <span className="flex items-center gap-2">
      <span className="material-symbols-outlined text-slate-700 text-[20px]">notifications</span>
      <span>Notifications</span>
      {unreadCount > 0 && (
        <button
          type="button"
          onClick={markAllRead}
          className="ml-1 font-sans text-[11px] text-emerald-700 font-semibold hover:underline cursor-pointer"
        >
          Tout marquer comme lu
        </button>
      )}
    </span>
  );

  return (
    <Drawer open={open} onClose={closeModal} title={header}>
      {notifications.length === 0 ? (
        <EmptyState
          icon="notifications_off"
          title="Aucune notification"
          description="Toutes vos alertes sont à jour."
        />
      ) : (
        <div className="divide-y divide-slate-100 space-y-1">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </Drawer>
  );
}
