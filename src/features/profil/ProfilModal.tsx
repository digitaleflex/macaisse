import { Button, Modal } from '@/ui';
import { selectModal, useUiStore } from '@/store/useUiStore';
import { PosSettings } from './PosSettings';

/**
 * ProfilModal — profil & paramètres, pilotée par `useUiStore`.
 * Ouverture : `modal === 'profil'` ; fermeture : `closeModal`.
 * Aucune prop (montage permanent, visibilité gérée par le store).
 */

export function ProfilModal() {
  const open = useUiStore(selectModal) === 'profil';
  const closeModal = useUiStore((state) => state.closeModal);
  const openModal = useUiStore((state) => state.openModal);
  const showToast = useUiStore((state) => state.showToast);

  return (
    <Modal open={open} onClose={closeModal} title="Profil &amp; Paramètres">
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
            <span className="material-symbols-outlined text-[20px] text-emerald-400">
              workspace_premium
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900">Forfait Pro Commerçant</span>
            <span className="text-[11px] text-slate-500">Actif • Renouvellement le 24 Nov.</span>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => openModal('abonnement')}>
          Gérer
        </Button>
      </div>

      {/* POS Configurations */}
      <PosSettings />

      {/* Backup & Security */}
      <div className="space-y-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block px-1">
          Sauvegarde &amp; Sécurité
        </span>
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">
              cloud_done
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900">Sauvegarde cloud</span>
              <span className="text-[10px] text-slate-500">
                Démo — synchronisation non connectée
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => showToast('Sauvegarde cloud non activée dans cette démo.', 'info')}
          >
            Sync
          </Button>
        </div>
      </div>
    </Modal>
  );
}
