import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Api } from '../contracts';
import { clearSyncQueue, enqueueSync, flushSyncQueue, getPendingSyncs, subscribePendingSyncs } from '../syncQueue';

/**
 * Issue #1 / G2 — une mutation optimiste qui n'atteint pas le serveur doit être
 * conservée, annoncée, et rejouable **sans doublon**.
 */
const client = {} as Api;

describe('file de synchronisation', () => {
  beforeEach(() => {
    clearSyncQueue();
  });

  it('conserve les mutations en échec et retire celles qui passent', async () => {
    const ok = vi.fn().mockResolvedValue(undefined);
    const ko = vi.fn().mockRejectedValue(new Error('réseau'));
    enqueueSync({ label: 'Vente', run: ok });
    enqueueSync({ label: 'Dépense', run: ko });

    expect(getPendingSyncs()).toHaveLength(2);

    const result = await flushSyncQueue(client);

    expect(result).toEqual({ done: 1, failed: 1 });
    expect(getPendingSyncs()).toHaveLength(1);
    expect(getPendingSyncs()[0]?.label).toBe('Dépense');
    // La mutation réussie n'est pas rejouée une seconde fois.
    expect(ok).toHaveBeenCalledTimes(1);
    expect(ko).toHaveBeenCalledTimes(1);
  });

  it('compte les tentatives d’une entrée qui résiste', async () => {
    enqueueSync({ label: 'Vente', run: vi.fn().mockRejectedValue(new Error('réseau')) });

    await flushSyncQueue(client);
    await flushSyncQueue(client);

    expect(getPendingSyncs()[0]?.attempts).toBe(2);
    expect(getPendingSyncs()).toHaveLength(1);
  });

  it('notifie les abonnés à chaque changement', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribePendingSyncs(listener);

    enqueueSync({ label: 'Vente', run: vi.fn().mockResolvedValue(undefined) });
    expect(listener).toHaveBeenCalledTimes(1);

    await flushSyncQueue(client);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    enqueueSync({ label: 'Dépense', run: vi.fn() });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('se vide explicitement', () => {
    enqueueSync({ label: 'Vente', run: vi.fn() });
    clearSyncQueue();
    expect(getPendingSyncs()).toHaveLength(0);
  });
});
