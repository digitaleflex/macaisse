import React, { useState } from 'react';

interface ProfilModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAbonnement: () => void;
  onShowToast: (msg: string) => void;
}

export const ProfilModal: React.FC<ProfilModalProps> = ({
  isOpen,
  onClose,
  onOpenAbonnement,
  onShowToast,
}) => {
  const [autoStock, setAutoStock] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [scannerSound, setScannerSound] = useState(true);
  const [bluetoothPrinter, setBluetoothPrinter] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200/80">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-slate-50">
          <h2 className="font-display font-bold text-sm text-slate-900">Profil &amp; Paramètres</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 shadow-2xs border border-slate-200 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* User Card */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center gap-3.5 shadow-sm border border-slate-800">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white font-display font-bold text-xl flex items-center justify-center shrink-0 shadow-md">
              MK
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base text-white truncate">
                  Mamadou Konaté
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Gérant
                </span>
              </div>
              <span className="text-xs text-slate-300 mt-0.5">Boutique Étoile - Dakar Plateau</span>
              <span className="text-[11px] text-slate-400">+221 77 482 19 02</span>
            </div>
          </div>

          {/* Subscription Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[20px] text-emerald-400">workspace_premium</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900">Forfait Pro Commerçant</span>
                <span className="text-[11px] text-slate-500">
                  Actif • Renouvellement le 24 Nov.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAbonnement();
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold active:scale-95 transition-transform cursor-pointer"
            >
              Gérer
            </button>
          </div>

          {/* POS Configurations */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block px-1">
              Configuration du Point de Vente
            </span>

            <div className="bg-white rounded-xl border border-slate-200/80 divide-y divide-slate-100 shadow-2xs">
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-slate-700 text-[20px]">
                    inventory_2
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">Déduction auto du stock</span>
                    <span className="text-[10px] text-slate-500">
                      Diminue les quantités dès encaissement
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoStock}
                  onChange={(e) => setAutoStock(e.target.checked)}
                  className="w-4 h-4 accent-slate-900 cursor-pointer"
                />
              </div>

              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-rose-600 text-[20px]">
                    notifications_active
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">Alertes SMS Rupture</span>
                    <span className="text-[10px] text-slate-500">Avertir quand le stock est bas</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  className="w-4 h-4 accent-slate-900 cursor-pointer"
                />
              </div>

              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-slate-900 text-[20px]">print</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">
                      Imprimante thermique Bluetooth
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      Connectée (POS-5801)
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={bluetoothPrinter}
                  onChange={(e) => setBluetoothPrinter(e.target.checked)}
                  className="w-4 h-4 accent-slate-900 cursor-pointer"
                />
              </div>

              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-slate-500 text-[20px]">volume_up</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">Bip sonore scan</span>
                    <span className="text-[10px] text-slate-500">Confirmation audio au scan</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={scannerSound}
                  onChange={(e) => setScannerSound(e.target.checked)}
                  className="w-4 h-4 accent-slate-900 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Backup & Security */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block px-1">
              Sauvegarde &amp; Sécurité
            </span>
            <div className="p-3 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">cloud_done</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900">Sauvegarde cloud</span>
                  <span className="text-[10px] text-slate-500">
                    Dernière sync : il y a 3 minutes
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onShowToast('Synchronisation cloud effectuée avec succès !')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-900 transition-colors cursor-pointer"
              >
                Sync
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
