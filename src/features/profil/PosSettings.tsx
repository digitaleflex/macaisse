import { t } from '@/content';
import { selectPreferences, useUiStore, type UiPreferences } from '@/store/useUiStore';
import { Badge, Icon, Switch } from '@/ui';

/**
 * Préférences du point de vente. Ces réglages ne sont pas encore reliés à un
 * effet réel : l'interrupteur est donc désactivé et badgé « Bientôt » plutôt que
 * de laisser croire qu'ils agissent.
 */
const ROWS: { key: keyof UiPreferences; icon: string; content: { label: string; hint: string } }[] = [
  { key: 'alertesSmsRupture', icon: 'sms', content: t.profile.settings.smsAlerts },
  { key: 'imprimanteBluetooth', icon: 'print', content: t.profile.settings.printer },
  { key: 'bipSonoreScan', icon: 'volume_up', content: t.profile.settings.beep },
];

export function PosSettings() {
  const preferences = useUiStore(selectPreferences);
  const updatePreferences = useUiStore((state) => state.updatePreferences);

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">{t.profile.posSettings}</h3>
      <ul className="rounded-2xl border border-line divide-y divide-line">
        {ROWS.map((row) => (
          <li key={row.key} className="flex items-center gap-3 px-4 py-3">
            <span className="size-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Icon name={row.icon} size={19} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink-900">{row.content.label}</span>
                <Badge tone="neutral">{t.profile.settings.soon}</Badge>
              </div>
              <div className="text-xs text-slate-500">{row.content.hint}</div>
            </div>
            <Switch
              checked={preferences[row.key]}
              onChange={(checked) => updatePreferences({ [row.key]: checked })}
              label={`${row.content.label} — ${t.profile.settings.soon}`}
              disabled
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
