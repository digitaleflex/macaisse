import type { NotificationItem as Notification, NotificationType } from '@/types';
import { Icon, cn } from '@/ui';

export interface NotificationItemProps {
  notification: Notification;
  onSelect: (notification: Notification) => void;
}

const TYPE_STYLE: Record<NotificationType, { icon: string; tone: string }> = {
  alert: { icon: 'error', tone: 'bg-rose-50 text-rose-600' },
  warning: { icon: 'warning', tone: 'bg-amber-50 text-amber-600' },
  info: { icon: 'info', tone: 'bg-sky-50 text-sky-600' },
  success: { icon: 'check_circle', tone: 'bg-brand-50 text-brand-700' },
};

/** Ligne de notification du tiroir. */
export function NotificationItem({ notification, onSelect }: NotificationItemProps) {
  const { read, type, title, time } = notification;
  const style = TYPE_STYLE[type];
  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={cn(
        'w-full p-3 rounded-2xl flex items-start gap-3 text-left cursor-pointer transition-colors',
        read ? 'hover:bg-slate-50' : 'bg-slate-50 hover:bg-slate-100'
      )}
    >
      <span className={cn('size-10 rounded-xl flex items-center justify-center shrink-0', style.tone)}>
        <Icon name={style.icon} size={20} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-start justify-between gap-2">
          <span className={cn('text-sm text-ink-900', read ? 'font-medium' : 'font-semibold')}>{title}</span>
          <span className="text-[11px] text-muted whitespace-nowrap mt-0.5">{time}</span>
        </span>
        <span className="block text-[13px] text-slate-500 mt-0.5 line-clamp-2">{notification.message ?? notification.description}</span>
      </span>
      {!read && <span className="size-2 rounded-full bg-rose-500 shrink-0 mt-2" />}
    </button>
  );
}
