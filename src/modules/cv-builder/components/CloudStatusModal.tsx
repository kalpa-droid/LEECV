import React, { useEffect, useState } from 'react';
import { RefreshCw, LogIn, Globe, LogOut } from 'lucide-react';
import { checkGoogleDriveQuota } from '../services/googleDriveQuotaService';
import { getCurrentProfile, signInWithGoogle, logout } from '../../auth/authService';
import { publishCV } from '../../../shared/core/storage/publishService';
import { useToast } from '../../../shared/core/ui/Toast';
import { Modal } from '../../../shared/core/ui/Modal';
import { apiClient } from '../../../shared/core/utils/apiClient';

import { withErrorHandling } from '../../../shared/core/utils/errorHandler';
import { navigation } from '../../../shared/core/utils/navigation';

import { elevationSystem, radius } from '../../../shared/core/uiDesignSystem';

export interface CloudStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForceSave: () => void;
  isSaving: boolean;
  cvData?: any;
  onOpenPdfCheckout?: () => void;
}

export default function CloudStatusModal({
  isOpen,
  onClose,
  onForceSave,
  isSaving,
  cvData,
  onOpenPdfCheckout
}: CloudStatusModalProps) {
  const { showSuccess, showInfo } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [driveQuota, setDriveQuota] = useState<any>(null);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await withErrorHandling(
      async () => {
        await logout();
        showSuccess('Sesión cerrada correctamente. Puedes ingresar con otra cuenta.');
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      },
      { context: 'Cerrar Sesión' }
    );
    setIsLoggingOut(false);
  };

  const handlePublish = async () => {
    if (!cvData) return;
    setIsPublishing(true);
    await withErrorHandling(async () => {
      const res = await publishCV(cvData);
      if (res.success && res.publicUrl) {
        showSuccess(`¡CV publicado en la web! 🌐 ${res.publicUrl}`);
        navigation.openExternal(res.publicUrl);
      } else if (res.needsPayment) {
        showInfo(res.message || 'La activación del link público requiere créditos.');
        if (onOpenPdfCheckout) {
          onClose();
          onOpenPdfCheckout();
        }
      } else {
        throw new Error(res.error || res.message || 'No se pudo publicar el CV.');
      }
    }, { context: 'Publicar CV' });
    setIsPublishing(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function loadStatus() {
      try {
        const userProf = await getCurrentProfile();
        if (isMounted) setProfile(userProf);

        if (userProf?.drive_connected) {
          setLoadingDrive(true);
          try {
            const { ok, data } = await apiClient.post('/api/drive/get-access-token');
            if (ok && data?.accessToken) {
              const quota = await checkGoogleDriveQuota(data.accessToken);
              if (isMounted) setDriveQuota(quota);
            }
          } catch (err) {
            console.warn('Error obteniendo cuota de Drive:', err);
          } finally {
            if (isMounted) setLoadingDrive(false);
          }
        }
      } catch (err) {
        console.warn('Error cargando estado en CloudStatusModal:', err);
      }
    }

    loadStatus();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);



  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Publicar en la Web"
      icon={<Globe className="w-6 h-6 text-[var(--color-status-success-bright)] animate-pulse" />}
      size="lg"
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className={`px-3.5 py-2 bg-[var(--color-status-success-base)] hover:opacity-90 text-[var(--color-status-success-on-base)] font-extrabold text-xs rounded-[${radius.card}] ${elevationSystem.floating} transition flex items-center gap-1.5 cursor-pointer`}
            >
              <Globe className={`w-3.5 h-3.5 ${isPublishing ? 'animate-spin' : ''}`} />
              <span>{isPublishing ? 'Publicando...' : 'Publicar CV Web'}</span>
            </button>

            <button
              onClick={() => {
                onForceSave();
                onClose();
              }}
              disabled={isSaving}
              className={`px-3.5 py-2 bg-[var(--color-accent-purple)] hover:opacity-90 text-white font-extrabold text-xs rounded-[${radius.card}] ${elevationSystem.floating} transition flex items-center gap-1.5 cursor-pointer`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Guardando...' : 'Sincronizar'}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className={`px-3 py-2 bg-[var(--ui-btn-neutral-bg)] hover:bg-[var(--ui-btn-neutral-hover)] text-[var(--ui-btn-neutral-text)] border border-[var(--ui-btn-neutral-border)] font-bold text-xs rounded-[${radius.card}] transition cursor-pointer`}
          >
            Cerrar
          </button>
        </div>
      }
    >
      <div className={`space-y-4 text-xs bg-[var(--ui-bg-panel)] p-4 rounded-[${radius.modal}] text-[var(--ui-text-primary)]`}>
        {/* Main Active Status Card */}
        <div className={`p-3.5 rounded-[${radius.modal}] border flex items-center gap-3 ${
          profile?.drive_connected
            ? 'bg-[var(--ui-bg-card)] border-[var(--color-status-success-base)]/40 text-[var(--color-status-success-bright)]'
            : 'bg-[var(--ui-bg-card)] border-[var(--color-accent-amber)]/40 text-[var(--color-accent-amber-bright)]'
        }`}>
          {profile?.drive_connected ? (
            <Globe className="w-6 h-6 flex-shrink-0 text-[var(--color-status-success-bright)]" />
          ) : (
            <LogIn className="w-6 h-6 flex-shrink-0 text-[var(--color-accent-amber-bright)]" />
          )}
          <div className="space-y-0.5">
            <h4 className="font-extrabold text-xs text-[var(--ui-text-primary)]">
              {profile?.drive_connected ? 'Cuenta vinculada ✅' : 'Vinculá tu correo para publicar'}
            </h4>
            <p className="text-[11px] text-[var(--ui-text-secondary)]">
              {profile?.drive_connected
                ? 'Tu cuenta de Google está conectada. Puedes publicar y respaldar tu CV.'
                : 'Conectá tu cuenta de Google para publicar tu currículum en la web con un link público.'}
            </p>
          </div>
        </div>

        {/* Google Drive Status Section */}
        <div className={`p-4 rounded-[${radius.modal}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-[var(--color-secondary-bright)]" />
              <span className="font-extrabold text-[var(--ui-text-primary)] text-xs">Vincular Cuenta de Google</span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
              profile?.drive_connected
                ? 'bg-[var(--ui-bg-panel)] text-[var(--color-status-success-bright)] border border-[var(--color-status-success-base)]/40'
                : 'bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)] border border-[var(--ui-border)]'
            }`}>
              {profile?.drive_connected ? '🟢 Conectado' : '⚪ No vinculado'}
            </span>
          </div>

          {profile?.drive_connected ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--ui-text-secondary)] font-bold">Cuota de Almacenamiento:</span>
                <span className="text-[var(--ui-text-primary)] font-black">
                  {loadingDrive ? 'Consultando...' : driveQuota ? `${driveQuota.percentUsed}% (${driveQuota.remainingGB} GB libres)` : '15 GB Disponibles'}
                </span>
              </div>

              {/* Progress Bar */}
              {driveQuota && (
                <div className="w-full bg-[var(--ui-bg-panel)] h-2 rounded-full overflow-hidden border border-[var(--ui-border)]">
                  <div
                    className={`h-full transition-all duration-500 ${
                      driveQuota.isFull ? 'bg-[var(--color-status-danger-bright)]' : driveQuota.isNearLimit ? 'bg-[var(--color-accent-amber-bright)]' : 'bg-[var(--color-secondary-bright)]'
                    }`}
                    style={{ width: `${Math.min(100, driveQuota.percentUsed)}%` }}
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <p className="text-[var(--ui-text-secondary)] text-[10px]">
                  Tus respaldos en Google Drive se guardan en la carpeta privada de la aplicación.
                </p>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={`px-2.5 py-1 rounded-[${radius.control}] bg-[var(--color-status-danger-muted)] hover:opacity-80 text-[var(--color-status-danger-bright)] border border-[var(--color-status-danger-base)]/40 text-[11px] font-extrabold transition flex items-center gap-1 cursor-pointer flex-shrink-0 ml-2`}
                >
                  <LogOut className={`w-3 h-3 ${isLoggingOut ? 'animate-spin' : ''}`} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[var(--ui-text-secondary)] text-[11px]">
                Conecta tu cuenta de Google para respaldar tus currículums y certificados directamente en tu propio Google Drive.
              </p>

              <button
                onClick={async () => {
                  try {
                    await signInWithGoogle();
                  } catch (err) {
                    console.error('Error conectando Google Drive:', err);
                  }
                }}
                className={`w-full py-2 px-3 rounded-[${radius.card}] bg-[var(--color-secondary-base)] hover:opacity-90 text-[var(--color-secondary-on-base)] font-extrabold text-xs flex items-center justify-center gap-2 transition ${elevationSystem.raised} cursor-pointer`}
              >
                <LogIn className="w-4 h-4" />
                <span>Vincular Google Drive</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
}
