import React from 'react';
import { NotificationItem } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onSelectNotification: (item: NotificationItem) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onSelectNotification,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-xs pt-16 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[80vh] animate-fadeIn">
        {/* Header */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-700 text-[20px]">
              notifications
            </span>
            <span className="font-display font-bold text-xs text-slate-900">Notifications</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onMarkAllRead}
              className="text-[11px] text-emerald-700 font-semibold hover:underline cursor-pointer"
            >
              Tout marquer comme lu
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-2xs border border-slate-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-3 overflow-y-auto divide-y divide-slate-100 space-y-1">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => onSelectNotification(notif)}
              role="button"
              tabIndex={0}
              className={`p-2.5 rounded-xl flex items-start gap-2.5 cursor-pointer transition-colors ${
                notif.read ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/80 hover:bg-slate-100/70'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  notif.type === 'alert'
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : notif.type === 'warning'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {notif.type === 'alert'
                    ? 'warning'
                    : notif.type === 'warning'
                    ? 'priority_high'
                    : 'info'}
                </span>
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-display font-semibold text-xs text-slate-900 truncate">
                    {notif.title}
                  </span>
                  <span className="text-[10px] text-slate-400">{notif.time}</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{notif.message}</p>
              </div>

              {!notif.read && (
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
