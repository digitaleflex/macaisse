// Store des notifications. Simple liste d'items ; le compte de non-lues est un
// sélecteur.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NotificationItem } from '@/types';
import { createId } from '@/domain/ids';
import { SEED_NOTIFICATIONS } from '@/data/seed';
import {
  coerceBoolean,
  coerceId,
  coerceString,
  isNotificationType,
  isRecord,
  isTabType,
  migrateList,
  PERSIST_NAMES,
  persistOptions,
} from './storeUtils';

/** Entrée de création : `id`, `time` et `read` sont générés par défaut. */
export type NotificationInput = Omit<NotificationItem, 'id' | 'time' | 'read'> & {
  time?: string;
  read?: boolean;
};

export interface NotificationsState {
  notifications: NotificationItem[];
  push: (input: NotificationInput) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clear: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      notifications: SEED_NOTIFICATIONS.map((notification) => ({ ...notification })),

      push: (input) =>
        set((state) => ({
          notifications: [
            {
              ...input,
              id: createId('notif'),
              time: input.time ?? 'À l’instant',
              read: input.read ?? false,
            },
            ...state.notifications,
          ],
        })),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((notification) => ({
            ...notification,
            read: true,
          })),
        })),

      markRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((notification) =>
            notification.id === id ? { ...notification, read: true } : notification
          ),
        })),

      clear: () => set({ notifications: [] }),
    }),
    persistOptions<NotificationsState, { notifications: NotificationItem[] }>(
      PERSIST_NAMES.notifications,
      (state) => ({ notifications: state.notifications }),
      (persisted) => ({
        notifications: migrateList(persisted, 'notifications', toNotification, SEED_NOTIFICATIONS),
      })
    )
  )
);

// ---------------------------------------------------------------------------
// Sélecteurs
// ---------------------------------------------------------------------------

/** Nombre de notifications non lues. */
export const selectUnreadCount = (state: NotificationsState): number =>
  state.notifications.filter((notification) => !notification.read).length;

/** Notifications non lues. */
export const selectUnreadNotifications = (state: NotificationsState): NotificationItem[] =>
  state.notifications.filter((notification) => !notification.read);

// ---------------------------------------------------------------------------
// Migration v1 (ids numériques) → v2
// ---------------------------------------------------------------------------

function toNotification(value: unknown): NotificationItem | null {
  if (!isRecord(value)) return null;
  const id = coerceId(value.id);
  const title = coerceString(value.title).trim();
  if (!id || title.length === 0 || !isNotificationType(value.type)) return null;

  const notification: NotificationItem = {
    id,
    title,
    type: value.type,
    time: coerceString(value.time, 'À l’instant'),
    read: coerceBoolean(value.read, false),
  };

  const description = coerceString(value.description).trim();
  if (description.length > 0) notification.description = description;
  const message = coerceString(value.message).trim();
  if (message.length > 0) notification.message = message;
  if (isTabType(value.relatedTab)) notification.relatedTab = value.relatedTab;

  return notification;
}
