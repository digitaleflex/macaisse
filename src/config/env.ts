// Configuration d'exécution lue depuis les variables Vite (`VITE_*`).
// Point d'entrée unique : aucun autre module ne lit `import.meta.env` directement.

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
  /**
   * Connexion par téléphone (OTP WhatsApp, D2) : masquée par défaut tant que les
   * crédits WhatsApp/SMS ne sont pas provisionnés. `VITE_AUTH_PHONE=on` la réaffiche.
   */
  phoneLogin: boolean;
  /** Vrai en build de production : le mode par défaut bascule sur `http`. */
  production: boolean;
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

/** URL manifestement factice : mieux vaut refuser de démarrer que viser dans le vide. */
function isPlaceholderBaseUrl(baseUrl: string): boolean {
  return (
    baseUrl === '' ||
    baseUrl === '/api' ||
    baseUrl === '#' ||
    baseUrl.includes('example.com') ||
    baseUrl.includes('api.example')
  );
}

export interface ReadEnvOptions {
  /** Build de production : `http` devient le défaut, les mocks doivent être demandés. */
  production?: boolean;
}

/**
 * Résout la configuration.
 *
 * Règle de sûreté : en production, le défaut est `http` — un oubli de variable ne
 * doit jamais expédier des données de démonstration à de vrais utilisateurs.
 * Pour un déploiement de démonstration, il faut l'écrire explicitement :
 * `VITE_API_MODE=mock`.
 */
export function readEnv(raw: RawEnv = readRaw(), options: ReadEnvOptions = {}): AppEnv {
  const production = options.production ?? (raw.PROD === true || raw.PROD === 'true');
  const requested = readString(raw, 'VITE_API_MODE', '').toLowerCase();
  const apiMode: ApiMode =
    requested === 'http' ? 'http' : requested === 'mock' ? 'mock' : production ? 'http' : 'mock';

  const apiBaseUrl = readString(raw, 'VITE_API_BASE_URL', '/api').replace(/\/+$/, '');

  if (apiMode === 'http' && isPlaceholderBaseUrl(apiBaseUrl)) {
    throw new Error(
      'Configuration invalide : le mode « http » est actif mais VITE_API_BASE_URL est absente ou ' +
        `factice (« ${apiBaseUrl} »). Renseignez l’URL réelle du backend, ou définissez ` +
        'VITE_API_MODE=mock pour un déploiement de démonstration. Les mocks ne prennent pas le ' +
        'relais silencieusement.',
    );
  }

  return {
    apiMode,
    apiBaseUrl,
    mockLatencyMs: readNumber(raw, 'VITE_API_MOCK_LATENCY_MS', raw.MODE === 'test' ? 0 : 250),
    requestTimeoutMs: readNumber(raw, 'VITE_API_TIMEOUT_MS', 15000),
    phoneLogin: readString(raw, 'VITE_AUTH_PHONE', 'off') === 'on',
    production,
  };
}

export const env: AppEnv = readEnv();

/**
 * Mode démonstration : l'affichage (badge « Démo », textes d'invitation…) en
 * dépend. Les écrans lisent cette constante au lieu d'importer `services/`.
 */
export const isDemoMode = env.apiMode === 'mock';
