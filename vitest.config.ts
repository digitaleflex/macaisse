import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // jsdom coûte ~350 s quand 37 workers démarrent en parallèle sur Windows :
    // certains expiraient au démarrage et leurs fichiers de test n'étaient
    // jamais exécutés, alors que le reste passait. On garde l'isolation par
    // fichier (vmThreads casse `instanceof Array` : realms distincts) et on
    // borne la concurrence.
    maxWorkers: 4,
    // Un worker bloqué ne doit plus faire sortir la suite en erreur après coup.
    teardownTimeout: 10_000,
    hookTimeout: 20_000,
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/types/**',
        'src/mocks/**',
        'src/main.tsx',
      ],
      // Seuils calés juste sous la couverture mesurée (65,1 / 62,8 / 58,1) :
      // ils interdisent une régression, sans transformer la couverture en but.
      thresholds: {
        lines: 63,
        functions: 60,
        branches: 55,
      },
    },
  },
});
