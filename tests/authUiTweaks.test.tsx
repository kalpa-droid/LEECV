// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SavedCVsModal from '../src/modules/cv-builder/components/SavedCVsModal';
import CloudStatusModal from '../src/modules/cv-builder/components/CloudStatusModal';

import * as AuthProviderModule from '../src/shared/core/auth/AuthProvider';
import * as ToastModule from '../src/shared/core/ui/Toast';

function GlobalLoginToastManager() {
  const { user } = AuthProviderModule.useAuth();
  const { showSuccess } = ToastModule.useToast();
  const prevUserRef = React.useRef(user);

  React.useEffect(() => {
    if (!prevUserRef.current && user?.email) {
      showSuccess(`Ingresaste como ${user.email}`);
    }
    prevUserRef.current = user;
  }, [user, showSuccess]);

  return null;
}

vi.mock('../src/shared/core/auth/AuthProvider', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../src/shared/core/ui/Toast', () => ({
  useToast: vi.fn(),
  ToastProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../src/shared/core/ui/ConfirmDialog', () => ({
  useConfirm: () => ({ confirm: vi.fn() }),
}));

vi.mock('../src/modules/cv-builder/services/cvStorageService', () => ({
  getSavedCVsList: vi.fn().mockResolvedValue([]),
  getSavedDocumentsList: vi.fn().mockResolvedValue([]),
  loadDocumentById: vi.fn(),
  deleteDocumentById: vi.fn(),
  saveDocumentAs: vi.fn(),
  checkStorageStatus: vi.fn().mockReturnValue({}),
}));

describe('Auth UI Tweaks', () => {
  let root: Root;
  
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="root"></div>';
    root = createRoot(document.getElementById('root')!);
  });

  afterEach(() => {
    root.unmount();
  });

  describe('SavedCVsModal', () => {
    it('muestra banner de inicio de sesion si no hay perfil', async () => {
      vi.mocked(AuthProviderModule.useAuth).mockReturnValue({ user: null, login: vi.fn() } as any);
      vi.mocked(ToastModule.useToast).mockReturnValue({ showSuccess: vi.fn(), showError: vi.fn(), showInfo: vi.fn() } as any);
      
      await act(async () => {
        root.render(<SavedCVsModal isOpen={true} onClose={() => {}} onSelectCV={() => {}} onOpenCloudStatus={() => {}} />);
      });

      expect(document.body.textContent).toContain('Iniciá sesión con tu cuenta de Google');
    });

    it('muestra email y estado de Drive si hay perfil', async () => {
      vi.mocked(AuthProviderModule.useAuth).mockReturnValue({ 
        user: { email: 'test@example.com', drive_connected: true }, 
        login: vi.fn() 
      } as any);
      
      await act(async () => {
        root.render(<SavedCVsModal isOpen={true} onClose={() => {}} onSelectCV={() => {}} onOpenCloudStatus={() => {}} />);
      });

      expect(document.body.textContent).toContain('test@example.com');
      expect(document.body.textContent).toContain('Google Drive sincronizado');
    });
  });

  describe('CloudStatusModal', () => {
    it('muestra el correo electrónico del usuario debajo de Cuenta vinculada', async () => {
      vi.mocked(AuthProviderModule.useAuth).mockReturnValue({ 
        user: { email: 'cloud@example.com', drive_connected: true }, 
        login: vi.fn(), 
        logout: vi.fn() 
      } as any);
      vi.mocked(ToastModule.useToast).mockReturnValue({ showSuccess: vi.fn(), showError: vi.fn(), showInfo: vi.fn() } as any);
      
      await act(async () => {
        root.render(<CloudStatusModal isOpen={true} onClose={() => {}} onForceSave={() => {}} isSaving={false} />);
      });

      expect(document.body.textContent).toContain('cloud@example.com');
    });
  });

  describe('GlobalLoginToastManager', () => {
    it('dispara showSuccess cuando el usuario pasa de null a tener perfil', async () => {
      const showSuccessMock = vi.fn();
      vi.mocked(ToastModule.useToast).mockReturnValue({ showSuccess: showSuccessMock, showError: vi.fn(), showInfo: vi.fn() } as any);
      
      let currentUser: any = null;
      vi.mocked(AuthProviderModule.useAuth).mockImplementation(() => ({ user: currentUser } as any));
      
      await act(async () => {
        root.render(<GlobalLoginToastManager />);
      });
      
      expect(showSuccessMock).not.toHaveBeenCalled();
      
      currentUser = { email: 'newuser@example.com' };
      
      await act(async () => {
        root.render(<GlobalLoginToastManager />);
      });
      
      expect(showSuccessMock).toHaveBeenCalledWith('Ingresaste como newuser@example.com');
    });
  });
});
