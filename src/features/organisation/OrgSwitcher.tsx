import { useCallback, useEffect, useRef, useState } from 'react';
import type { Invitation, Membership } from '@/types';
import { t } from '@/content';
import { acceptInvitation, loadInvitations, switchOrganization } from '@/store/auth';
import { selectCurrentOrganizationId, selectMemberships, useAuthStore } from '@/store/useAuthStore';
import { useCurrentSession } from '@/store/useSessionStore';
import { useUiStore } from '@/store/useUiStore';
import { Avatar, Badge, Button, Icon, cn } from '@/ui';

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2);
}

/** Hook commun : bascule d'organisation + toast. */
function useSwitch() {
  const showToast = useUiStore((state) => state.showToast);
  return async (membership: Membership, onDone?: () => void) => {
    onDone?.();
    const ok = await switchOrganization(membership.organizationId);
    showToast(
      ok ? t.org.switched(membership.organizationName) : t.org.switchFailed,
      ok ? 'success' : 'error'
    );
  };
}

/** Invitations reçues, acceptables explicitement (jamais d'accès implicite). */
function PendingInvitations({ onSelected }: { onSelected?: () => void }) {
  const showToast = useUiStore((state) => state.showToast);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [pending, setPending] = useState<string | null>(null);

  const refresh = useCallback(() => {
    let alive = true;
    loadInvitations()
      .then((list) => {
        if (alive) setInvitations(list);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => refresh(), [refresh]);

  if (invitations.length === 0) return null;

  const accept = async (invitation: Invitation) => {
    setPending(invitation.organizationId);
    try {
      onSelected?.();
      await acceptInvitation(invitation.organizationId);
      showToast(t.org.accepted(invitation.organizationName), 'success');
      setInvitations((previous) =>
        previous.filter((item) => item.organizationId !== invitation.organizationId)
      );
    } catch {
      showToast(t.org.acceptFailed, 'error');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="mt-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1 mb-2">
        {t.org.pendingInvitations}
      </div>
      <ul className="flex flex-col gap-1.5">
        {invitations.map((invitation) => (
          <li
            key={invitation.organizationId}
            className="flex items-center gap-3 p-3 rounded-2xl border border-dashed border-line bg-amber-50/40"
          >
            <Icon name="mail" size={20} className="text-amber-600" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-ink-900 truncate">
                {invitation.organizationName}
              </span>
              <span className="block text-xs text-slate-500 truncate">
                {invitation.city} · {t.roles[invitation.role]}
              </span>
            </span>
            <Button
              variant="brand"
              size="sm"
              disabled={pending === invitation.organizationId}
              onClick={() => void accept(invitation)}
            >
              {t.org.acceptInvitation}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Liste des espaces de l'utilisateur (modales, mobile). */
export function OrgList({ onSelected }: { onSelected?: () => void }) {
  const memberships = useAuthStore(selectMemberships);
  const currentId = useAuthStore(selectCurrentOrganizationId);
  const select = useSwitch();

  return (
    <>
    <ul className="flex flex-col gap-1.5">
      {memberships.map((membership) => {
        const active = membership.organizationId === currentId;
        return (
          <li key={membership.organizationId}>
            <button
              type="button"
              disabled={active}
              onClick={() => void select(membership, onSelected)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all',
                active ? 'border-ink-900 bg-slate-50 cursor-default' : 'border-line hover:border-line-strong cursor-pointer'
              )}
            >
              <Avatar initials={initialsOf(membership.organizationName)} tone={active ? 'zest' : 'neutral'} />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-ink-900 truncate">{membership.organizationName}</span>
                <span className="block text-xs text-slate-500 truncate">{membership.city}</span>
              </span>
              <Badge tone={membership.role === 'owner' ? 'dark' : 'neutral'}>{t.roles[membership.role]}</Badge>
              {active && <Icon name="check_circle" size={20} filled className="text-brand-600" />}
            </button>
          </li>
        );
      })}
    </ul>
    <PendingInvitations onSelected={onSelected} />
    </>
  );
}

/** Sélecteur d'organisation de la barre latérale (menu déroulant sur fond sombre). */
export function OrgSwitcher() {
  const { business, role } = useCurrentSession();
  const memberships = useAuthStore(selectMemberships);
  const currentId = useAuthStore(selectCurrentOrganizationId);
  const select = useSwitch();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const multiple = memberships.length > 1;

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.org.switcher}
        onClick={() => setOpen((previous) => !previous)}
        className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.05] ring-1 ring-white/10 hover:ring-white/25 transition-all cursor-pointer text-left"
      >
        <Avatar initials={initialsOf(business.name)} tone="zest" size="md" />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-white truncate">{business.name}</span>
          <span className="block text-xs text-slate-400 truncate">
            {t.roles[role]} · {business.registerLabel}
          </span>
        </span>
        <Icon name="unfold_more" size={20} className="text-slate-400" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t.org.yourSpaces}
          className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-white text-ink-900 shadow-overlay ring-1 ring-black/5 p-2 animate-pop"
        >
          <div className="px-2.5 pt-1.5 pb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {t.org.yourSpaces}
            <span className="normal-case tracking-normal font-medium">{t.org.count(memberships.length)}</span>
          </div>
          {memberships.map((membership) => {
            const active = membership.organizationId === currentId;
            return (
              <button
                key={membership.organizationId}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => (active ? setOpen(false) : void select(membership, () => setOpen(false)))}
                className={cn(
                  'w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left cursor-pointer transition-colors',
                  active ? 'bg-slate-100' : 'hover:bg-slate-50'
                )}
              >
                <Avatar initials={initialsOf(membership.organizationName)} tone={active ? 'ink' : 'neutral'} size="sm" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate">{membership.organizationName}</span>
                  <span className="block text-xs text-slate-500">{t.roles[membership.role]}</span>
                </span>
                {active && <Icon name="check" size={18} className="text-brand-600" />}
              </button>
            );
          })}
          {!multiple && <p className="px-2.5 py-2 text-xs text-slate-500">{t.roleDescriptions[role]}</p>}
        </div>
      )}
    </div>
  );
}
