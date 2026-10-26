import { useState } from 'react';
import { t } from '@/content';
import { api, flushSyncQueue } from '@/services';
import { usePendingSyncCount } from '@/store/useSyncQueue';
import { useUiStore } from '@/store/useUiStore';
import { Button, Icon } from '@/ui';

/**
 * Bandeau des mutations optimistes non synchronisées (issue #1).
 *
 * Une vente appliquée localement mais refusée par le réseau ne doit pas passer
 * inaperçue : on affiche combien d'opérations attendent, et on laisse l'utilisateur
 * les renvoyer. Le renvoi se fait aussi automatiquement au retour du réseau.
 */
export function SyncBanner() {
  const count = usePendingSyncCount();
  const showToast = useUiStore((state) => state.showToast);
  const [flushing, setFlushing] = useState(false);

  if (count === 0) return null;

  const retry = async () => {
    setFlushing(true);
    const { done, failed } = await flushSyncQueue(api);
    setFlushing(false);
    if (failed === 0 && done > 0) showToast(t.sync.done(done), 'success');
    else if (failed > 0) showToast(t.sync.failed, 'error');
  };

  return (
    <div
      role="status"
      className="mx-4 sm:mx-6 lg:mx-8 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <Icon name="cloud_off" size={20} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t.sync.title(count)}</p>
        <p className="text-xs opacity-90">{t.sync.text}</p>
      </div>
      <Button type="button" size="sm" variant="secondary" icon="sync" loading={flushing} onClick={() => void retry()}>
        {t.sync.retry}
      </Button>
    </div>
  );
}
