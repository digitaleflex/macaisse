// Configuration d'exécution lue depuis les variables Vite (`VITE_*`).
// Point d'entrée unique : aucun autre module ne lit `import.meta.env` directement
// (à l'exception de `lib/ai/client.ts`, historique).

export type ApiMode = 'mock' | 'http';

export interface AppEnv {
  /** `mock` : données de démonstration locales ; `http` : backend REST réel. */
  apiMode: ApiMode;
  /** URL de base du backend REST (ex. `https://api.macaisse.app/v1`). */
  apiBaseUrl: string;
  /** Délai de réponse simulé par l'adaptateur mock (ms). */
  mockLatencyMs: number;
  /** Délai maximal d'une requête HTTP avant abandon (ms). */
  requestTimeoutMs: number;
}

type RawEnv = Record<string, string | boolean | undefined>;

function readRaw(): RawEnv {
  return (import.meta.env ?? {}) as unknown as RawEnv;
}

function readString(raw: RawEnv, key: string, fallback: string): string {
  const value = raw[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function readNumber(raw: RawEnv, key: string, fallback: number): number {
  const value = Number(readString(raw, key, ''));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function readEnv(raw: RawEnv = readRaw()): AppEnv {
  const mode = readString(raw, 'VITE_API_MODE', 'mock');
  return {
    apiMode: mode === 'http' ? 'http' : 'mock',
    apiBaseUrl: readString(raw, 'VITE_API_BASE_URL', '/api').replace(/\/+$/, ''),
    mockLatencyMs: readNumber(raw, 'VITE_API_MOCK_LATENCY_MS', raw.MODE === 'test' ? 0 : 250),
    requestTimeoutMs: readNumber(raw, 'VITE_API_TIMEOUT_MS', 15000),
  };
}

export const env: AppEnv = readEnv();

/**
 * Mode démonstration : l'affichage (badge « Démo », textes d'invitation…) en
 * dépend. Les écrans lisent cette constante au lieu d'importer `services/`.
 */
export const isDemoMode = env.apiMode === 'mock';
