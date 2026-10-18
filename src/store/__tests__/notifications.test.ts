import { beforeEach, describe, expect, it } from 'vitest';
import type { NotificationItem } from '@/types';
import {
  selectUnreadCount,
  selectUnreadNotifications,
  useNotificationsStore,
} from '../useNotificationsStore';

function makeNotification(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: 'n1',
    title: 'Stock critique',
    type: 'warning',
    time: 'Il y a 10 min',
    read: false,
    ...overrides,
  };
}

beforeEach(() => {
  useNotificationsStore.setState({ notifications: [] });
});

describe('useNotificationsStore', () => {
  it('empile une notification non lue par défaut', () => {
    useNotificationsStore.getState().push({ title: 'Stock bas', type: 'warning' });

    const [notification] = useNotificationsStore.getState().notifications;
    expect(notification.id).toMatch(/^notif-/);
    expect(notification.read).toBe(false);
    expect(notification.time).toBe('À l’instant');
    expect(selectUnreadCount(useNotificationsStore.getState())).toBe(1);
  });

  it('compte les non-lues puis marque tout comme lu', () => {
    useNotificationsStore.setState({
      notifications: [
        makeNotification({ id: 'n1', read: false }),
        makeNotification({ id: 'n2', read: true }),
        makeNotification({ id: 'n3', read: false }),
      ],
    });

    expect(selectUnreadCount(useNotificationsStore.getState())).toBe(2);
    expect(selectUnreadNotifications(useNotificationsStore.getState()).map((n) => n.id)).toEqual([
      'n1',
      'n3',
    ]);

    useNotificationsStore.getState().markAllRead();
    expect(selectUnreadCount(useNotificationsStore.getState())).toBe(0);
  });

  it('marque une notification lue puis vide la liste', () => {
    useNotificationsStore.setState({
      notifications: [makeNotification({ id: 'n1' }), makeNotification({ id: 'n2' })],
    });

    useNotificationsStore.getState().markRead('n1');
    expect(useNotificationsStore.getState().notifications[0].read).toBe(true);
    expect(useNotificationsStore.getState().notifications[1].read).toBe(false);

    useNotificationsStore.getState().clear();
    expect(useNotificationsStore.getState().notifications).toHaveLength(0);
  });
});
