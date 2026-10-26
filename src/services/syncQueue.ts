// File des mutations optimistes qui n'ont pas atteint le serveur (issue #1, G2).
//
// Une mutation est appliquée localement **puis** envoyée : si l'envoi échoue pour
// une raison rejouable (réseau, timeout, 5xx, 429), on ne peut pas laisser
// l'utilisateur croire qu'elle est enregistrée. On la met en file, on l'annonce
// dans l'interface et on propose un renvoi explicite.
//
// Limite assumée : la ligne métier n'est pas encore marquée individuellement
// (rollback fin = issue #1). La file garantit qu'aucune opération n'est perdue
// silencieusement et qu'elle n'est pas rejouée deux fois.

import type { Api } from './contracts';

export interface PendingSync {
  id: string;
  /** Libellé utilisateur de l'action (ex. « Vente enregistrée »). */
  label: string;
  /** Action à rejouer, avec le client API courant. */
  run: (api: Api) => Promise<unknown>;
  attempts: number;
}

let pending: PendingSync[] = [];
let sequence = 0;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getPendingSyncs(): readonly PendingSync[] {
  return pending;
}

export function subscribePendingSyncs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Ajoute une mutation non synchronisée (idempotent côté appelant). */
export function enqueueSync(input: { label: string; run: (api: Api) => Promise<unknown> }): void {
  sequence += 1;
  pending = [
    ...pending,
    { id: `sync-${sequence}`, label: input.label, run: input.run, attempts: 0 },
  ];
  emit();
}

/**
 * Rejoue la file, dans l'ordre. Une entrée qui échoue **reste** en file avec un
 * compteur d'essais ; une entrée réussie est retirée. Aucune mutation n'est
 * dupliquée : chaque entrée n'est exécutée qu'une fois par passage.
 */
export async function flushSyncQueue(client: Api): Promise<{ done: number; failed: number }> {
  const queue = [...pending];
  let done = 0;
  let failed = 0;

  for (const entry of queue) {
    try {
      await entry.run(client);
      pending = pending.filter((item) => item.id !== entry.id);
      done += 1;
    } catch {
      failed += 1;
      pending = pending.map((item) =>
        item.id === entry.id ? { ...item, attempts: item.attempts + 1 } : item
      );
    }
  }

  emit();
  return { done, failed };
}

/** Vide la file (tests, ou abandon explicite). */
export function clearSyncQueue(): void {
  pending = [];
  emit();
}
