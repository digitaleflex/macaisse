import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { InviteMemberInput, Role, TeamMember } from '@/types';
import { isDemoMode } from '@/config/env';
import { t } from '@/content';
import { parseDate } from '@/domain/dates';
import { DEMO_INVITE_PASSWORD } from '@/config/reference';
import { isApiError } from '@/services';
import { useCurrentSession, usePermission } from '@/store/useSessionStore';
import { useTeamStore } from '@/store/useTeamStore';
import { selectModal, useUiStore } from '@/store/useUiStore';
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, IconButton, Input, Modal, Select, Skeleton } from '@/ui';

/**
 * Gestion de l'équipe de l'organisation active (propriétaire uniquement) :
 * liste des membres, invitations, changement de rôle, retrait.
 */

const ASSIGNABLE_ROLES: Exclude<Role, 'owner'>[] = ['manager', 'cashier'];
const ROLE_OPTIONS = ASSIGNABLE_ROLES.map((role) => ({ value: role, label: t.roles[role] }));
const EMPTY_INVITE: InviteMemberInput = { firstName: '', lastName: '', email: '', role: 'cashier' };

function isAssignable(value: string): value is Exclude<Role, 'owner'> {
  return value === 'manager' || value === 'cashier';
}

function formatDate(iso: string): string {
  return parseDate(iso)?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) ?? iso;
}

export function TeamModal() {
  const open = useUiStore(selectModal) === 'equipe';
  const closeModal = useUiStore((state) => state.closeModal);
  const showToast = useUiStore((state) => state.showToast);
  const { business, user } = useCurrentSession();
  const canManage = usePermission('team.manage');

  const members = useTeamStore((state) => state.members);
  const status = useTeamStore((state) => state.status);
  const load = useTeamStore((state) => state.load);
  const inviteMember = useTeamStore((state) => state.invite);
  const updateMemberRole = useTeamStore((state) => state.updateRole);
  const removeMember = useTeamStore((state) => state.remove);

  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState<InviteMemberInput>(EMPTY_INVITE);
  const [pending, setPending] = useState(false);

  const fail = useCallback(
    (error: unknown) => showToast(isApiError(error) ? error.message : t.team.loadError, 'error'),
    [showToast]
  );

  useEffect(() => {
    if (!open) return;
    void load(business.id);
  }, [open, business.id, load]);

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    try {
      const member = await inviteMember(business.id, invite);
      setInvite(EMPTY_INVITE);
      setShowInvite(false);
      showToast(
        isDemoMode
          ? t.team.invitedDemo(member.email, DEMO_INVITE_PASSWORD)
          : t.team.invited(member.email),
        'success'
      );
    } catch (error) {
      fail(error);
    } finally {
      setPending(false);
    }
  };

  const handleRole = async (member: TeamMember, role: Role) => {
    try {
      await updateMemberRole(business.id, member.userId, role);
      showToast(t.team.roleUpdated(`${member.firstName} ${member.lastName}`, t.roles[role]), 'success');
    } catch (error) {
      fail(error);
    }
  };

  const [pendingRemove, setPendingRemove] = useState<TeamMember | null>(null);

  const handleRemove = async (member: TeamMember) => {
    setPendingRemove(member);
  };

  const confirmRemove = async () => {
    if (!pendingRemove) return;
    const member = pendingRemove;
    setPendingRemove(null);
    try {
      await removeMember(business.id, member.userId);
      showToast(t.team.removed(`${member.firstName} ${member.lastName}`));
    } catch (error) {
      fail(error);
    }
  };

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title={t.team.title}
      subtitle={t.team.subtitle(business.name)}
      icon="group"
      size="xl"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500">
          {status === 'ready' ? t.team.members(members.length) : status === 'error' ? t.team.loadError : ''}
        </span>
        {canManage && !showInvite && (
          <Button variant="primary" icon="person_add" onClick={() => setShowInvite(true)}>
            {t.team.invite}
          </Button>
        )}
      </div>

      {showInvite && (
        <form onSubmit={(event) => void handleInvite(event)} className="rounded-2xl border border-line bg-slate-50/70 p-4 flex flex-col gap-3 animate-fade-in">
          <div className="text-sm font-semibold text-ink-900">{t.team.inviteTitle}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label={t.team.firstName} name="invite-first" required value={invite.firstName} onChange={(e) => setInvite({ ...invite, firstName: e.target.value })} />
            <Input label={t.team.lastName} name="invite-last" required value={invite.lastName} onChange={(e) => setInvite({ ...invite, lastName: e.target.value })} />
          </div>
          <div className="grid sm:grid-cols-[1fr_180px] gap-3">
            <Input label={t.team.email} name="invite-email" type="email" icon="mail" required value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
            <Select
              label={t.team.role}
              name="invite-role"
              value={invite.role}
              onChange={(e) => {
                if (isAssignable(e.target.value)) setInvite({ ...invite, role: e.target.value });
              }}
              options={ROLE_OPTIONS}
              hint={t.roleDescriptions[invite.role]}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowInvite(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="primary" icon="send" loading={pending}>
              {t.team.send}
            </Button>
          </div>
        </form>
      )}

      {status === 'loading' || status === 'idle' ? (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : members.length === 0 ? (
        <EmptyState icon="group" title={t.team.title} compact />
      ) : (
        <ul className="rounded-2xl border border-line divide-y divide-line">
          {members.map((member) => {
            const isSelf = member.userId === user.id;
            const editable = canManage && member.role !== 'owner' && !isSelf;
            const fullName = `${member.firstName} ${member.lastName}`;
            return (
              <li key={member.userId} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar initials={`${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`} tone={member.role === 'owner' ? 'ink' : 'neutral'} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-ink-900">{fullName}</span>
                      {isSelf && <Badge tone="info">{t.team.you}</Badge>}
                      {member.status === 'invited' && <Badge tone="warning" dot>{t.team.pending}</Badge>}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {member.email} · {t.team.since(formatDate(member.joinedAt))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  {editable ? (
                    <>
                      <Select
                        name={`role-${member.userId}`}
                        value={member.role}
                        onChange={(e) => {
                          if (isAssignable(e.target.value)) void handleRole(member, e.target.value);
                        }}
                        options={ROLE_OPTIONS}
                        className="w-40"
                      />
                      <IconButton icon="person_remove" label={t.team.remove(fullName)} variant="danger-soft" onClick={() => void handleRemove(member)} />
                    </>
                  ) : (
                    <Badge tone={member.role === 'owner' ? 'dark' : member.role === 'manager' ? 'success' : 'neutral'} size="md">
                      {t.roles[member.role]}
                    </Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">{t.team.rolesTitle}</h3>
        <div className="grid sm:grid-cols-3 gap-2">
          {(['owner', 'manager', 'cashier'] as const).map((role) => (
            <div key={role} className="rounded-2xl bg-slate-50 p-3.5">
              <div className="text-sm font-semibold text-ink-900">{t.roles[role]}</div>
              <p className="text-xs text-slate-500 mt-1">{t.roleDescriptions[role]}</p>
            </div>
          ))}
        </div>
      </section>
      <ConfirmDialog
        open={pendingRemove !== null}
        title={t.team.remove(pendingRemove ? `${pendingRemove.firstName} ${pendingRemove.lastName}` : '')}
        confirmLabel={t.common.delete}
        onConfirm={() => void confirmRemove()}
        onClose={() => setPendingRemove(null)}
      />
    </Modal>
  );
}
