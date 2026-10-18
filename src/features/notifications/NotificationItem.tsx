import type { NotificationItem as Notification } from '@/types';

/**
 * NotificationItem — ligne de notification du tiroir (présentation pure).
 * Reprend à l'identique le markup de l'ancien `NotificationDrawer` :
 * icône/teinte selon `type`, pastille de non-lu, horodatage.
 * Le corps affiche `message` si présent, sinon `description`.
 */

export interface NotificationItemProps {
  notification: Notification;
  onSelect: (notification: Notification) => void;
}

export function NotificationItem({ notification, onSelect }: NotificationItemProps) {
  const { read, type, title, time } = notification;
  const body = notification.message ?? notification.description;

  return (
    <div
      onClick={() => onSelect(notification)}
      role="button"
      tabIndex={0}
      className={`p-2.5 rounded-xl flex items-start gap-2.5 cursor-pointer transition-colors ${
        read ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/80 hover:bg-slate-100/70'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          type === 'alert'
            ? 'bg-rose-50 text-rose-600 border border-rose-200'
            : type === 'warning'
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">
          {type === 'alert' ? 'warning' : type === 'warning' ? 'priority_high' : 'info'}
        </span>
      </div>

      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="font-display font-semibold text-xs text-slate-900 truncate">{title}</span>
          <span className="text-[10px] text-slate-400">{time}</span>
        </div>
        <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{body}</p>
      </div>

      {!read && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />}
    </div>
  );
}
