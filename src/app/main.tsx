import React, { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { ErrorBoundary } from '../shared/core/ui/ErrorBoundary';

const App = lazy(() => import('./App'));
const AdminDashboard = lazy(() => import('../modules/admin/AdminDashboard'));

const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
const RootComponent = isAdminRoute ? AdminDashboard : App;

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
