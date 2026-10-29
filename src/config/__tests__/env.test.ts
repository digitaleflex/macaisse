import { describe, expect, it } from 'vitest';
import { readEnv } from '../env';

const REAL_API = 'https://api.macaisse.app/v1';

describe('readEnv — interrupteur unique des mocks', () => {
  it('démarre en mode démo par défaut hors production', () => {
    expect(readEnv({}, { production: false }).apiMode).toBe('mock');
  });

  it('bascule sur http par défaut en production (aucune fuite de démo)', () => {
    const env = readEnv({ VITE_API_BASE_URL: REAL_API }, { production: true });
    expect(env.apiMode).toBe('http');
    expect(env.production).toBe(true);
  });

  it('respecte un mock explicite même en production', () => {
    expect(readEnv({ VITE_API_MODE: 'mock' }, { production: true }).apiMode).toBe('mock');
  });

  it('respecte http explicite hors production', () => {
    const env = readEnv({ VITE_API_MODE: 'http', VITE_API_BASE_URL: REAL_API }, { production: false });
    expect(env.apiMode).toBe('http');
  });

  it('refuse de démarrer en http sans URL de backend réelle', () => {
    expect(() => readEnv({ VITE_API_MODE: 'http' })).toThrow(/VITE_API_BASE_URL/);
    expect(() => readEnv({ VITE_API_MODE: 'http', VITE_API_BASE_URL: '/api' })).toThrow(
      /VITE_API_BASE_URL/,
    );
    expect(() =>
      readEnv({ VITE_API_MODE: 'http', VITE_API_BASE_URL: 'https://api.example.com/v1' }),
    ).toThrow(/VITE_API_BASE_URL/);
  });

  it('lit les délais et l’option téléphone', () => {
    const env = readEnv({ VITE_AUTH_PHONE: 'on', VITE_API_TIMEOUT_MS: '9000', MODE: 'test' });
    expect(env.phoneLogin).toBe(true);
    expect(env.requestTimeoutMs).toBe(9000);
    expect(env.mockLatencyMs).toBe(0);
  });

  it('retombe sur le défaut si le mode est inconnu', () => {
    expect(readEnv({ VITE_API_MODE: 'nonsense' }, { production: false }).apiMode).toBe('mock');
    expect(
      readEnv({ VITE_API_MODE: 'nonsense', VITE_API_BASE_URL: REAL_API }, { production: true })
        .apiMode,
    ).toBe('http');
  });

  it('normalise l’URL de base (barre finale retirée)', () => {
    const env = readEnv({ VITE_API_MODE: 'http', VITE_API_BASE_URL: `${REAL_API}/` });
    expect(env.apiBaseUrl).toBe(REAL_API);
  });
});
