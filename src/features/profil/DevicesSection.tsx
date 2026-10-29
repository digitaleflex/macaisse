import { useEffect, useState } from 'react';
import { t } from '@/content';
import { pinHash, validatePin } from '@/domain/pin';
import { personDisplayName } from '@/domain/users';
import { describeError } from '@/services';
import { useDevicesStore } from '@/store/devices';
import { withStepUp } from '@/store/stepUp';
import { clearEnrollment, readEnrollment, useLockStore, writeEnrollment } from '@/store/lock';
import { useCurrentSession } from '@/store/useSessionStore';
import { useTeamStore } from '@/store/useTeamStore';
import { useUiStore } from '@/store/useUiStore';
import { Badge, Button, Icon, Input, Select } from '@/ui';

/**
 * Appareils de caisse (D6, RG-A15→A17).
 *
 * Un appareil enrôlé s'ouvre avec un PIN, **même sans réseau** : le hash du PIN
 * reste sur le poste (`store/lock.ts`). Trois appareils actifs maximum ;
 * révoquer un appareil invalide sa session et efface le cache local.
 */
export function DevicesSection({ open }: { open: boolean }) {
  const { business, user, role } = useCurrentSession();
  const devices = useDevicesStore((state) => state.devices);
  const status = useDevicesStore((state) => state.status);
  const load = useDevicesStore((state) => state.load);
  const enroll = useDevicesStore((state) => state.enroll);
  const revoke = useDevicesStore((state) => state.revoke);
  const savePin = useDevicesStore((state) => state.setPin);
  const members = useTeamStore((state) => state.members);
  const loadTeam = useTeamStore((state) => state.load);
  const showToast = useUiStore((state) => state.showToast);

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState<string>(t.devices.defaultName);
  const [memberId, setMemberId] = useState(user.id);
  const [pin, setPin] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = role === 'owner';
  const local = readEnrollment();

  useEffect(() => {
    if (!open) return;
    void load(business.id);
    if (isOwner) void loadTeam(business.id);
  }, [open, business.id, isOwner, load, loadTeam]);

  const active = devices.filter((device) => device.revokedAt === null);

  const submit = async () => {
    const issues = validatePin(pin, {
      phone: user.phone || business.phone,
      year: new Date().getFullYear(),
    });
    if (issues.length > 0) {
      setError(t.devices.errors.weak);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await savePin(business.id, memberId, pin);
      const { device } = await withStepUp(() => enroll(business.id, { name: name.trim(), memberId }));
      if (memberId === user.id) {
        writeEnrollment({
          deviceId: device.id,
          organizationId: business.id,
          memberId,
          memberName: personDisplayName(user.firstName, user.lastName),
          pinHash: pinHash(pin),
          enrolledAt: device.enrolledAt,
        });
      }
      showToast(t.devices.enrolled(device.name), 'success');
      setFormOpen(false);
      setPin('');
    } catch (caught) {
      setError(describeError(caught).message);
    } finally {
      setPending(false);
    }
  };

  const handleRevoke = async (deviceId: string) => {
    try {
      await withStepUp(() => revoke(business.id, deviceId));
      if (local?.deviceId === deviceId) {
        clearEnrollment();
        useLockStore.getState().reset();
      }
      showToast(t.devices.revoked, 'success');
    } catch (caught) {
      showToast(describeError(caught).message, 'error');
    }
  };

  if (!isOwner && local === null) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">{t.devices.title}</h3>
      <div className="rounded-2xl border border-line p-4 space-y-3">
        <p className="text-xs text-slate-500">{t.devices.subtitle}</p>

        {status === 'loading' && active.length === 0 && <p className="text-xs text-slate-500">…</p>}
        {active.length === 0 && status !== 'loading' && (
          <p className="text-xs text-slate-500">{t.devices.empty}</p>
        )}

        <ul className="space-y-2">
          {active.map((device) => (
            <li key={device.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2">
              <Icon name={local?.deviceId === device.id ? 'devices' : 'tablet'} size={18} className="text-slate-500" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink-900 truncate">{device.name}</div>
                <div className="text-xs text-slate-500 truncate">
                  {device.memberName} · {device.enrolledAt}
                </div>
              </div>
              {local?.deviceId === device.id && <Badge tone="success">{t.devices.lock}</Badge>}
              {isOwner && (
                <Button variant="ghost" size="sm" onClick={() => void handleRevoke(device.id)}>
                  {t.devices.revoke}
                </Button>
              )}
            </li>
          ))}
        </ul>

        {formOpen ? (
          <div className="space-y-3 border-t border-line pt-3">
            <Input
              label={t.devices.name}
              name="device-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {isOwner && (
              <Select
                label={t.devices.member}
                name="device-member"
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
                options={[
                  { value: user.id, label: personDisplayName(user.firstName, user.lastName) },
                  ...members
                    .filter((member) => member.userId !== user.id)
                    .map((member) => ({
                      value: member.userId,
                      label: personDisplayName(member.firstName, member.lastName),
                    })),
                ]}
              />
            )}
            <Input
              label={t.devices.pin}
              name="device-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={pin}
              hint={t.devices.pinHint}
              error={error ?? undefined}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, '').slice(0, 6));
                setError(null);
              }}
            />
            <div className="flex gap-2">
              <Button variant="ghost" size="lg" onClick={() => setFormOpen(false)}>
                {t.profile.edit.cancel}
              </Button>
              <Button size="lg" fullWidth loading={pending} icon="check" onClick={() => void submit()}>
                {t.devices.enroll}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {isOwner && active.length < 3 && (
              <Button variant="secondary" size="sm" icon="add" onClick={() => setFormOpen(true)}>
                {t.devices.enrollTitle}
              </Button>
            )}
            {local !== null && (
              <Button variant="secondary" size="sm" icon="lock" onClick={() => useLockStore.getState().lock()}>
                {t.devices.lock}
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
