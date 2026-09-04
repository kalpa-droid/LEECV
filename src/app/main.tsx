import '../shared/core/utils/domSafetyPatch';
import React, { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { ErrorBoundary } from '../shared/core/ui/ErrorBoundary';
import { navigation } from '../shared/core/utils/navigation';

const App = lazy(() => import('./App'));
const AdminDashboard = lazy(() => import('../modules/admin/AdminDashboard'));
const UserDashboard = lazy(() => import('../modules/dashboard/UserDashboard').then(m => ({ default: m.UserDashboard })));

const pathname = navigation.getPathname();
const isAdminRoute = pathname.startsWith('/admin');
const isDashboardRoute = pathname.startsWith('/dashboard');
const RootComponent = isAdminRoute ? AdminDashboard : isDashboardRoute ? UserDashboard : App;

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <Suspense fallback={
          <div className="min-h-screen bg-[var(--color-neutral-text-primary)] text-white flex items-center justify-center font-bold">
            Cargando LEECV...
          </div>
        }>
          <RootComponent />
        </Suspense>
      </ErrorBoundary>
    </StrictMode>,
  );
}
