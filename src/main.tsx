import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './i18n';
import App from './App';
import { ColorModeProvider } from './theme/ColorModeContext';
import { AuthProvider } from './auth/AuthContext';
import { ensureSeed } from './db/seed';

// Siembra los datos de ejemplo la primera vez que se abre la app (si no hay productos).
void ensureSeed();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ColorModeProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ColorModeProvider>
  </StrictMode>,
);
