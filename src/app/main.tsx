import '../shared/core/utils/domSafetyPatch';
import React, { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { ErrorBoundary } from '../shared/core/ui/ErrorBoundary';
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
const UserDashboard = lazy(() => import('../modules/dashboard/UserDashboard').then(m => ({ default: m.UserDashboard })));
const PrivacyPolicyPage = lazy(() => import('../modules/legal/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('../modules/legal/TermsOfServicePage'));
const RefundPolicyPage = lazy(() => import('../modules/legal/RefundPolicyPage'));
const AuthCallbackScreen = lazy(() => import('../shared/core/auth/AuthCallbackScreen'));

const pathname = navigation.getPathname().toLowerCase();
const isAuthCallbackRoute = pathname.startsWith('/auth/callback');
const isAdminRoute = pathname.startsWith('/admin');
const isDashboardRoute = pathname.startsWith('/dashboard');
const isPrivacyRoute = pathname.startsWith('/privacidad') || pathname.startsWith('/privacy');
const isTermsRoute = pathname.startsWith('/terminos') || pathname.startsWith('/terms');
const isRefundRoute = pathname.startsWith('/reembolsos') || pathname.startsWith('/refunds');

const RootComponent = isAuthCallbackRoute
  ? AuthCallbackScreen
  : isAdminRoute
  ? AdminDashboard
  : isDashboardRoute
  ? UserDashboard
  : isPrivacyRoute
  ? PrivacyPolicyPage
  : isTermsRoute
  ? TermsOfServicePage
  : isRefundRoute
  ? RefundPolicyPage
  : App;

import { AuthProvider } from '../shared/core/auth/AuthProvider';
import { ToastProvider } from '../shared/core/ui/Toast';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={
              <div className="min-h-screen bg-[var(--color-neutral-text-primary)] text-white flex items-center justify-center font-bold">
                Cargando LEECV...
              </div>
            }>
              <RootComponent />
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
