import type { NotificationItem as Notification } from '@/types';
import { t } from '@/content';
import { selectUnreadCount, useNotificationsStore } from '@/store/useNotificationsStore';
import { selectModal, useUiStore } from '@/store/useUiStore';
import { Button, Drawer, EmptyState } from '@/ui';
import { NotificationItem } from './NotificationItem';

/** Tiroir des notifications (pilotée par `useUiStore.modal === 'notifications'`). */
export function NotificationDrawer() {
  const open = useUiStore(selectModal) === 'notifications';
  const closeModal = useUiStore((state) => state.closeModal);
  const setTab = useUiStore((state) => state.setTab);
  const notifications = useNotificationsStore((state) => state.notifications);
  const markAllRead = useNotificationsStore((state) => state.markAllRead);
  const markRead = useNotificationsStore((state) => state.markRead);
  const unread = useNotificationsStore(selectUnreadCount);

  const handleSelect = (notification: Notification) => {
    markRead(notification.id);
    if (notification.relatedTab) setTab(notification.relatedTab);
    closeModal();
  };

  return (
    <Drawer
      open={open}
      onClose={closeModal}
      title={t.notifications.title}
      subtitle={unread > 0 ? t.notifications.unread(unread) : undefined}
      actions={
        unread > 0 ? (
          <Button variant="ghost" size="sm" icon="done_all" onClick={markAllRead}>
            <span className="hidden sm:inline">{t.notifications.markAll}</span>
          </Button>
        ) : undefined
      }
    >
      {notifications.length === 0 ? (
        <EmptyState icon="notifications_off" title={t.notifications.emptyTitle} description={t.notifications.emptyText} />
      ) : (
        <div className="flex flex-col gap-1">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} onSelect={handleSelect} />
          ))}
        </div>
      )}
    </Drawer>
  );
}
