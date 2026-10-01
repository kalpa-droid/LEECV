import '../shared/core/utils/domSafetyPatch';
import React, { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { navigation } from '../shared/core/utils/navigation';
import { initGlobalUiTheme } from '../shared/core/utils/globalThemePreference';

// Aplica el tema guardado (CSS vars + <meta name="theme-color"> de la barra
// de estado) ANTES de montar React. Ni LandingPage.tsx ni App.tsx lo hacían:
// solo se aplicaba reactivamente al tocar el botón de cambiar tema, así que
// en una carga normal (o al entrar por primera vez) la app se quedaba con
// los valores por defecto del CSS/HTML estático sin importar la preferencia
// guardada del usuario.
initGlobalUiTheme();

const App = lazy(() => import('./App'));
const AdminDashboard = lazy(() => import('../modules/admin/AdminDashboard'));

const PrivacyPolicyPage = lazy(() => import('../modules/legal/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('../modules/legal/TermsOfServicePage'));
const RefundPolicyPage = lazy(() => import('../modules/legal/RefundPolicyPage'));
const pathname = navigation.getPathname().toLowerCase();
const isAdminRoute = pathname.startsWith('/admin');

const isPrivacyRoute = pathname.startsWith('/privacidad') || pathname.startsWith('/privacy');
const isTermsRoute = pathname.startsWith('/terminos') || pathname.startsWith('/terms');
const isRefundRoute = pathname.startsWith('/reembolsos') || pathname.startsWith('/refunds');
const isDashboardRoute = pathname.startsWith('/dashboard');

if (isDashboardRoute) {
  navigation.goTo('/');
}

const RootComponent = isAdminRoute
  ? AdminDashboard
  : isPrivacyRoute
  ? PrivacyPolicyPage
  : isTermsRoute
  ? TermsOfServicePage
  : isRefundRoute
  ? RefundPolicyPage
  : App;

import { ToastProvider } from '../shared/core/ui/Toast';
import { ErrorBoundary } from '../shared/core/ui/ErrorBoundary';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <ToastProvider>
          <Suspense fallback={
            <div className="min-h-screen bg-[var(--color-neutral-text-primary)] text-white flex items-center justify-center font-bold">
              Cargando LEECV...
            </div>
          }>
            <RootComponent />
          </Suspense>
        </ToastProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
