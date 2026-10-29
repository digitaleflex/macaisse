import { t } from '@/content';
import { Button, Modal } from './index';

/**
 * Dialogue de confirmation pour une action destructive et irréversible.
 * `confirmLabel` / `cancelLabel` permettent de préciser l'action (ex. « Supprimer »).
 */
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = t.common.cancel,
  danger = true,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      {description && <p className="text-sm text-slate-600">{description}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={() => void onConfirm()}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
