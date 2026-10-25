/**
 * Reporter d'erreurs réseau, injecté au démarrage.
 *
 * La couche `services/` ne doit pas dépendre de `ui/` (règle d'architecture) :
 * elle publie un message, l'application décide comment l'afficher (toast, log,
 * monitoring). Sans reporter, l'erreur reste silencieuse — l'appelant a déjà
 * `syncRemote` pour les mutations optimistes.
 */

export type ErrorReporter = (message: string) => void;

let reporter: ErrorReporter | null = null;

/** Branche l'affichage des erreurs (appelé une fois au bootstrap). */
export function setErrorReporter(next: ErrorReporter | null): void {
  reporter = next;
}

/** Publie un message d'erreur déjà lisible (jamais une exception brute). */
export function reportError(message: string): void {
  reporter?.(message);
}
