// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Regresión de la pantalla en blanco en /admin:
 * - Mientras verifica la sesión, NO se pinta null: se ve "Verificando sesión…".
 * - Si getCurrentProfile falla (red/lock/timeout), se ve una pantalla de
 *   error con botón Reintentar (profile nunca queda en undefined para siempre).
 * - Sin sesión → login; rol no admin → aviso de permisos; admin → panel.
 */

const getCurrentProfileMock = vi.fn();
const logoutMock = vi.fn();

vi.mock('../../src/shared/core/auth/authService', () => ({
  getCurrentProfile: (...args: any[]) => getCurrentProfileMock(...args),
  logout: (...args: any[]) => logoutMock(...args),
}));

vi.mock('../../src/modules/admin/adminService', () => ({
  setUserPlan: vi.fn(),
  setPdfExportAccess: vi.fn(),
  getBasicStats: vi.fn().mockResolvedValue({ totalUsers: 0, proUsers: 0, activeSubscriptions: 0 }),
  listPendingClaims: vi.fn().mockResolvedValue([]),
  reviewManualClaim: vi.fn(),
  listAdminNotifications: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  getIntegrationsStatus: vi.fn().mockResolvedValue({}),
  getAiProvidersStatus: vi.fn().mockResolvedValue({}),
  listCustomers: vi.fn().mockResolvedValue({ customers: [], totalCount: 0 }),
  getPublishedCvsCount: vi.fn().mockResolvedValue(0),
}));

vi.mock('../../src/shared/core/ui/Toast', () => ({
  useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

vi.mock('../../src/shared/core/ui/ConfirmDialog', () => ({
  useConfirm: () => ({ confirm: vi.fn() }),
}));

vi.mock('../../src/modules/admin/components/StorageDriveTab', () => ({ StorageDriveTab: () => <div>StorageDriveTab</div> }));
vi.mock('../../src/modules/admin/components/SentryReportsTab', () => ({ SentryReportsTab: () => <div>SentryReportsTab</div> }));
vi.mock('../../src/modules/admin/components/PaymentsAdminTab', () => ({ PaymentsAdminTab: () => <div>PaymentsAdminTab</div> }));
vi.mock('../../src/modules/admin/components/AiTelemetryTab', () => ({ AiTelemetryTab: () => <div>AiTelemetryTab</div> }));
vi.mock('../../src/modules/admin/components/AdminOverviewTab', () => ({ AdminOverviewTab: () => <div>AdminOverviewTab</div> }));
vi.mock('../../src/modules/admin/components/AuditAndErrorsTab', () => ({ AuditAndErrorsTab: () => <div>AuditAndErrorsTab</div> }));
vi.mock('../../src/modules/admin/components/TemplateManagementTab', () => ({ TemplateManagementTab: () => <div>TemplateManagementTab</div> }));
vi.mock('../../src/modules/admin/components/UsersTab', () => ({ UsersTab: () => <div>UsersTab</div> }));

import AdminDashboard from '../../src/modules/admin/AdminDashboard';

describe('AdminDashboard — sesión / pantalla en blanco', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // vite.config no expone globals:true → RTL no desmonta solo; cada test
    // desmonta y dispara el cleanup del useEffect (clearTimeout del debounce).
    cleanup();
  });

  it('mientras verifica la sesión muestra "Verificando sesión…" (no pinta null)', () => {
    getCurrentProfileMock.mockReturnValue(new Promise(() => {})); // nunca resuelve
    const { container } = render(<AdminDashboard />);
    expect(screen.getByText('Verificando sesión de administrador…')).toBeTruthy();
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it('fallo de red/lock/timeout en getCurrentProfile → pantalla de error con Reintentar', async () => {
    getCurrentProfileMock.mockRejectedValue(new Error('AbortError: lock request aborted'));
    render(<AdminDashboard />);
    expect(await screen.findByText('No pudimos verificar tu sesión')).toBeTruthy();
    expect(screen.getByText('Reintentar')).toBeTruthy();

    fireEvent.click(screen.getByText('Reintentar'));
    expect(getCurrentProfileMock).toHaveBeenCalledTimes(2);
  });

  it('sin sesión → muestra el login de administrador (no blanco)', async () => {
    getCurrentProfileMock.mockResolvedValue(null);
    render(<AdminDashboard />);
    expect(await screen.findByText('Panel de Administración')).toBeTruthy();
  });

  it('usuario con rol distinto de admin → aviso de permisos (no blanco)', async () => {
    getCurrentProfileMock.mockResolvedValue({ id: 'u1', email: 'user@leecv.app', role: 'user' });
    render(<AdminDashboard />);
    expect(await screen.findByText('Tu cuenta no tiene permisos de administrador supremo.')).toBeTruthy();
  });

  it('usuario admin → muestra el panel con sus pestañas', async () => {
    getCurrentProfileMock.mockResolvedValue({ id: 'admin1', email: 'admin@leecv.app', role: 'admin' });
    render(<AdminDashboard />);
    expect(await screen.findByText(/Panel de Administración Suprema/)).toBeTruthy();
    expect(await screen.findByText('AdminOverviewTab')).toBeTruthy();
  });
});
