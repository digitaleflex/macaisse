import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from '@/app/App';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { markIconsReady } from '@/lib/iconFont';
import { setErrorReporter } from '@/services';
import { pushToast } from '@/ui';
import './index.css';

// La couche services ne connaît pas l'UI : le bootstrap décide de l'affichage.
setErrorReporter((message) => pushToast(message, 'error'));

// Les icônes sont du texte tant que la police n'est pas chargée : on les masque jusque-là.
void markIconsReady();

// Enregistrement du service worker (PWA) — best-effort, jamais bloquant.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
