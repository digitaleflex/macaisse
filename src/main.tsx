import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from '@/app/App';
import { setErrorReporter } from '@/services';
import { pushToast } from '@/ui';
import './index.css';

// La couche services ne connaît pas l'UI : le bootstrap décide de l'affichage.
setErrorReporter((message) => pushToast(message, 'error'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
