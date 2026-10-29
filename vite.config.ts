import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Meme regle que `src/config/env.ts` : en build de production, `http` est le
  // defaut ; les mocks doivent etre demandes explicitement (`VITE_API_MODE=mock`).
  // Consequences quand les mocks sont coupes :
  // - `@/mocks` (fixtures, comptes, seeds) est remplace par `src/mocks/empty.ts` ;
  // - les donnees de demonstration sortent du bundle ;
  // - une organisation demarre vide (le backend fait foi).
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const explicitMode = (fileEnv.VITE_API_MODE ?? process.env.VITE_API_MODE ?? '').toLowerCase();
  const mocksDisabled = explicitMode === 'http' || (explicitMode === '' && mode === 'production');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        ...(mocksDisabled
          ? [
              {
                find: /^@\/mocks$/,
                replacement: path.resolve(__dirname, './src/mocks/empty.ts'),
              },
              {
                find: /^@\/mocks\/fixtures\/accounts$/,
                replacement: path.resolve(__dirname, './src/mocks/empty.ts'),
              },
            ]
          : []),
        { find: '@', replacement: path.resolve(__dirname, './src') },
      ],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'zustand'],
            charts: ['recharts'],
            pdf: ['jspdf', 'jspdf-autotable'],
          },
        },
      },
    },
    server: {
      // Le HMR est désactivé dans AI Studio via la variable d'environnement DISABLE_HMR.
      // Ne pas modifier : la surveillance des fichiers est coupée pour éviter les
      // scintillements pendant les éditions d'agents.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
