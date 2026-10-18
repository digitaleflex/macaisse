import { selectPreferences, useUiStore } from '@/store/useUiStore';

/**
 * PosSettings — configuration du point de vente (ProfilModal).
 * Les quatre interrupteurs sont adossés à `useUiStore.preferences` via
 * `updatePreferences` : ils persistent réellement (localStorage).
 */

interface ToggleRow {
  icon: string;
  iconClass: string;
  label: string;
  hint: string;
  hintClass: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}

export function PosSettings() {
  const preferences = useUiStore(selectPreferences);
  const updatePreferences = useUiStore((state) => state.updatePreferences);

  const rows: ToggleRow[] = [
    {
      icon: 'inventory_2',
      iconClass: 'text-slate-700',
      label: 'Déduction auto du stock',
      hint: 'Diminue les quantités dès encaissement',
      hintClass: 'text-slate-500',
      checked: preferences.deductionAutoStock,
      onToggle: (checked) => updatePreferences({ deductionAutoStock: checked }),
    },
    {
      icon: 'notifications_active',
      iconClass: 'text-rose-600',
      label: 'Alertes SMS Rupture',
      hint: 'Avertir quand le stock est bas',
      hintClass: 'text-slate-500',
      checked: preferences.alertesSmsRupture,
      onToggle: (checked) => updatePreferences({ alertesSmsRupture: checked }),
    },
    {
      icon: 'print',
      iconClass: 'text-slate-900',
      label: 'Imprimante thermique Bluetooth',
      hint: 'Connectée (POS-5801)',
      hintClass: 'text-emerald-700 font-semibold',
      checked: preferences.imprimanteBluetooth,
      onToggle: (checked) => updatePreferences({ imprimanteBluetooth: checked }),
    },
    {
      icon: 'volume_up',
      iconClass: 'text-slate-500',
      label: 'Bip sonore scan',
      hint: 'Confirmation audio au scan',
      hintClass: 'text-slate-500',
      checked: preferences.bipSonoreScan,
      onToggle: (checked) => updatePreferences({ bipSonoreScan: checked }),
    },
  ];

  return (
    <div className="space-y-2">
      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block px-1">
        Configuration du Point de Vente
      </span>

      <div className="bg-white rounded-xl border border-slate-200/80 divide-y divide-slate-100 shadow-2xs">
        {rows.map((row) => (
          <div key={row.label} className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`material-symbols-outlined ${row.iconClass} text-[20px]`}>
                {row.icon}
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900">{row.label}</span>
                <span className={`text-[10px] ${row.hintClass}`}>{row.hint}</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={row.checked}
              onChange={(event) => row.onToggle(event.target.checked)}
              className="w-4 h-4 accent-slate-900 cursor-pointer"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
