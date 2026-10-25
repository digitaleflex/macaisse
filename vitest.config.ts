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
