import React, { useEffect, useState } from 'react';
import { Cloud, RefreshCw, HardDrive, ShieldCheck, LogIn, Globe, LogOut } from 'lucide-react';
import { checkStorageStatus } from '../services/cvStorageService';
import { checkGoogleDriveQuota } from '../services/googleDriveQuotaService';
import { getCurrentProfile, signInWithGoogle, logout } from '../../auth/authService';
import { publishCV } from '../../../shared/core/storage/publishService';
import { useToast } from '../../../shared/core/ui/Toast';
import { Modal } from '../../../shared/core/ui/Modal';
import { apiClient } from '../../../shared/core/utils/apiClient';

import { withErrorHandling } from '../../../shared/core/utils/errorHandler';
import { navigation } from '../../../shared/core/utils/navigation';

export interface CloudStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForceSave: () => void;
  isSaving: boolean;
  cvData?: any;
}

export default function CloudStatusModal({
  isOpen,
  onClose,
  onForceSave,
  isSaving,
  cvData
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
        showInfo('La activación del link público en la web requiere el desbloqueo único de $1 USD.');
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

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const storageStatus = checkStorageStatus();

  let currentColor = 'yellow';
  if (!isOnline) {
    currentColor = 'red';
  } else if (storageStatus.isCloud) {
    currentColor = 'green';
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Estado de Sincronización & Nube"
      icon={<Cloud className="w-6 h-6 text-[var(--color-accent-purple)] animate-pulse" />}
      size="lg"
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="px-3.5 py-2 bg-[var(--color-status-success-base)] hover:opacity-90 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
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
              className="px-3.5 py-2 bg-[var(--color-accent-purple)] hover:opacity-90 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Guardando...' : 'Sincronizar'}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Main Active Status Card */}
        <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
          currentColor === 'green'
            ? 'bg-[var(--color-status-success-muted)] border-[var(--color-status-success-base)]/40 text-[var(--color-status-success-text)]'
            : currentColor === 'yellow'
            ? 'bg-[var(--color-status-warning-muted)] border-[var(--color-status-warning-base)]/40 text-[var(--color-status-warning-text)]'
            : 'bg-[var(--color-status-danger-muted)] border-[var(--color-status-danger-base)]/40 text-[var(--color-status-danger-text)]'
        }`}>
          <Cloud className={`w-6 h-6 flex-shrink-0 ${
            currentColor === 'green' ? 'text-[var(--color-status-success-text)]' : currentColor === 'yellow' ? 'text-[var(--color-status-warning-text)]' : 'text-[var(--color-status-danger-text)]'
          }`} />

          <div className="space-y-0.5">
            <h4 className="font-extrabold text-xs text-white">
              {currentColor === 'green' && 'Nube Supabase Conectada'}
              {currentColor === 'yellow' && 'Guardado Local Activo (WebP)'}
              {currentColor === 'red' && 'Sin Conexión a Internet'}
            </h4>
            <p className="text-[11px] text-white/80">
              {currentColor === 'green' && 'Guardado y sincronizado automáticamente en la nube de Supabase.'}
              {currentColor === 'yellow' && 'Guardado automático en tu equipo. Sin pérdida ante cortes de luz.'}
              {currentColor === 'red' && 'Modo sin conexión. Los cambios quedan protegidos en tu equipo.'}
            </p>
          </div>
        </div>

        {/* Google Drive Status Section */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[var(--color-secondary-base)]" />
              <span className="font-extrabold text-white text-xs">Google Drive Backup</span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
              profile?.drive_connected
                ? 'bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)] border border-[var(--color-status-success-base)]/40'
                : 'bg-white/10 text-white/60 border border-white/10'
            }`}>
              {profile?.drive_connected ? 'Conectado' : 'No Conectado'}
            </span>
          </div>

          {profile?.email && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/10 text-[11px]">
              <span className="text-white/60">Cuenta activa:</span>
              <span className="font-bold text-white">{profile.email}</span>
            </div>
          )}

          {profile?.drive_connected ? (
            <div className="space-y-2 text-white/80 text-[11px]">
              <div className="flex items-center justify-between text-white/60">
                <span>Almacenamiento Usado:</span>
                <span className="font-extrabold text-white">
                  {loadingDrive ? 'Consultando...' : driveQuota ? `${driveQuota.percentUsed}% (${driveQuota.remainingGB} GB libres)` : '15 GB Disponibles'}
                </span>
              </div>

              {/* Progress Bar */}
              {driveQuota && (
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      driveQuota.isFull ? 'bg-[var(--color-status-danger-base)]' : driveQuota.isNearLimit ? 'bg-[var(--color-status-warning-base)]' : 'bg-[var(--color-secondary-base)]'
                    }`}
                    style={{ width: `${Math.min(100, driveQuota.percentUsed)}%` }}
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <p className="text-white/60 text-[10px]">
                  Tus respaldos en Google Drive se guardan en la carpeta privada de la aplicación.
                </p>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="px-2.5 py-1 rounded-lg bg-[var(--color-status-danger-muted)] hover:opacity-80 text-[var(--color-status-danger-text)] border border-[var(--color-status-danger-base)]/40 text-[11px] font-extrabold transition flex items-center gap-1 cursor-pointer flex-shrink-0 ml-2"
                >
                  <LogOut className={`w-3 h-3 ${isLoggingOut ? 'animate-spin' : ''}`} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-white/80 text-[11px]">
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
                className="w-full py-2 px-3 rounded-xl bg-[var(--color-secondary-base)] hover:opacity-90 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Vincular Google Drive</span>
              </button>
            </div>
          )}
        </div>

        {/* Storage Architecture Overview */}
        <div className="space-y-2 border-t border-white/10 pt-3">
          <h4 className="font-extrabold text-white/60 text-[11px] uppercase tracking-wider">Capas de Protección de Datos:</h4>
          
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/40 border border-white/10">
              <ShieldCheck className="w-5 h-5 text-[var(--color-status-success-bright)] flex-shrink-0" />
              <div>
                <span className="font-black text-[var(--color-status-success-bright)]">IndexedDB + WebP:</span>
                <span className="text-white/80 ml-1.5">Almacenamiento ilimitado en tu navegador local.</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/40 border border-white/10">
              <Cloud className="w-5 h-5 text-[var(--color-accent-purple-bright)] flex-shrink-0" />
              <div>
                <span className="font-black text-[var(--color-accent-purple-bright)]">Nube Supabase:</span>
                <span className="text-white/80 ml-1.5">Sincronización multi-dispositivo cifrada.</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/40 border border-white/10">
              <HardDrive className="w-5 h-5 text-[var(--color-secondary-base)] flex-shrink-0" />
              <div>
                <span className="font-black text-[var(--color-secondary-base)]">Google Drive API:</span>
                <span className="text-white/80 ml-1.5">Copia de respaldo personal en tu cuenta de Google.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
