import { useState } from 'react';
import { t } from '@/content';
import { parseDate } from '@/domain/dates';
import { api } from '@/services';
import { bootstrapApp } from '@/store/bootstrap';
import { useCurrentSession } from '@/store/useSessionStore';
import { selectModal, useUiStore } from '@/store/useUiStore';
import { Avatar, Badge, Button, Icon, Modal } from '@/ui';
import { PosSettings } from './PosSettings';

function formatDate(iso: string): string {
  const date = parseDate(iso);
  return date ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : iso;
}

/** Profil & paramètres (pilotée par `useUiStore.modal === 'profil'`). */
export function ProfilModal() {
  const open = useUiStore(selectModal) === 'profil';
  const closeModal = useUiStore((state) => state.closeModal);
  const openModal = useUiStore((state) => state.openModal);
  const showToast = useUiStore((state) => state.showToast);
  const { user, business, subscription } = useCurrentSession();
  const [syncing, setSyncing] = useState(false);
  const live = api.mode === 'http';

  const handleSync = async () => {
    if (!live) {
      showToast(t.profile.syncUnavailable, 'info');
      return;
    }
    setSyncing(true);
    await bootstrapApp();
    setSyncing(false);
    showToast(t.profile.syncDone, 'success');
  };

  return (
    <Modal open={open} onClose={closeModal} title={t.profile.title} icon="manage_accounts" size="lg">
      <div className="rounded-2xl bg-ink-900 text-white p-5 bg-grid-ink flex items-center gap-4">
        <Avatar initials={`${user.firstName[0]}${user.lastName[0]}`} tone="zest" size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-lg">
              {user.firstName} {user.lastName}
            </span>
            <Badge tone="zest">{user.role}</Badge>
          </div>
          <div className="text-sm text-slate-400 truncate">{user.email}</div>
          <div className="text-xs text-slate-500">{user.phone}</div>
        </div>
      </div>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">{t.profile.business}</h3>
        <div className="rounded-2xl border border-line p-4 flex items-start gap-3">
          <span className="size-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Icon name="storefront" size={20} />
          </span>
          <div className="min-w-0 text-sm">
            <div className="font-semibold text-ink-900">{business.name}</div>
            <div className="text-slate-500">{business.activity}</div>
            <div className="text-xs text-slate-500 mt-1">
              {business.address}, {business.city} · {t.receipt.taxId(business.taxId)}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-line p-4 flex items-center gap-3">
          <span className="size-10 rounded-xl bg-ink-900 text-zest-400 flex items-center justify-center shrink-0">
            <Icon name="workspace_premium" size={20} filled />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-ink-900">{subscription.plan.name}</div>
            <div className="text-xs text-slate-500">{t.profile.subscriptionActive(formatDate(subscription.renewalDate))}</div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => openModal('abonnement')}>
            {t.profile.manage}
          </Button>
        </div>
      </section>

      <PosSettings />

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">{t.profile.backup}</h3>
        <div className="rounded-2xl border border-line p-4 flex items-center gap-3">
          <span className="size-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <Icon name={live ? 'cloud_done' : 'cloud_off'} size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-ink-900">{t.profile.cloud}</div>
            <div className="text-xs text-slate-500">{live ? t.profile.cloudLive : t.profile.cloudMock}</div>
          </div>
          <Button variant="secondary" size="sm" icon="sync" loading={syncing} onClick={() => void handleSync()}>
            {t.profile.sync}
          </Button>
        </div>
      </section>
    </Modal>
  );
}
