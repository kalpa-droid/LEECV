import React, { useEffect, useState } from 'react';
import { Cloud, X, RefreshCw, HardDrive, CheckCircle2, AlertTriangle, ShieldCheck, LogIn, ExternalLink } from 'lucide-react';
import { checkStorageStatus } from '../services/cvStorageService';
import { checkGoogleDriveQuota } from '../services/googleDriveQuotaService';
import { getCurrentProfile, signInWithGoogle } from '../../auth/authService';

export interface CloudStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForceSave: () => void;
  isSaving: boolean;
}

export default function CloudStatusModal({
  isOpen,
  onClose,
  onForceSave,
  isSaving
}: CloudStatusModalProps) {
  const [profile, setProfile] = useState<any>(null);
  const [driveQuota, setDriveQuota] = useState<any>(null);
  const [loadingDrive, setLoadingDrive] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function loadStatus() {
      try {
        const userProf = await getCurrentProfile();
        if (isMounted) setProfile(userProf);

        if (userProf?.drive_connected) {
          setLoadingDrive(true);
          // Try fetching access token to check quota
          try {
            const res = await fetch('/api/drive/get-access-token', { method: 'POST' });
            if (res.ok) {
              const { accessToken } = await res.json();
              const quota = await checkGoogleDriveQuota(accessToken);
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

  if (!isOpen) return null;

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const storageStatus = checkStorageStatus();

  let currentColor = 'yellow';
  if (!isOnline) {
    currentColor = 'red';
  } else if (storageStatus.isCloud) {
    currentColor = 'green';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-xl border ${
              currentColor === 'green'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                : currentColor === 'yellow'
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-400'
                : 'bg-red-950/60 border-red-500/40 text-red-400'
            }`}>
              <Cloud className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Estado de Sincronización & Nube</h3>
              <p className="text-xs text-slate-400">Resguardo en equipo, Supabase y Google Drive</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
          {/* Main Active Status Card */}
          <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
            currentColor === 'green'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : currentColor === 'yellow'
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              : 'bg-red-950/40 border-red-500/40 text-red-200'
          }`}>
            <Cloud className={`w-6 h-6 flex-shrink-0 ${
              currentColor === 'green' ? 'text-emerald-400' : currentColor === 'yellow' ? 'text-amber-400' : 'text-red-500'
            }`} />

            <div className="space-y-0.5">
              <h4 className="font-extrabold text-xs text-white">
                {currentColor === 'green' && 'Nube Supabase Conectada'}
                {currentColor === 'yellow' && 'Guardado Local Activo (WebP)'}
                {currentColor === 'red' && 'Sin Conexión a Internet'}
              </h4>
              <p className="text-[11px] text-slate-300">
                {currentColor === 'green' && 'Guardado y sincronizado automáticamente en la nube de Supabase.'}
                {currentColor === 'yellow' && 'Guardado automático en tu equipo. Sin pérdida ante cortes de luz.'}
                {currentColor === 'red' && 'Modo sin conexión. Los cambios quedan protegidos en tu equipo.'}
              </p>
            </div>
          </div>

          {/* Google Drive Status Section */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-blue-400" />
                <span className="font-extrabold text-white text-xs">Google Drive Backup</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                profile?.drive_connected
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {profile?.drive_connected ? 'Conectado' : 'No Conectado'}
              </span>
            </div>

            {profile?.drive_connected ? (
              <div className="space-y-2 text-slate-300 text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Almacenamiento Usado:</span>
                  <span className="font-extrabold text-white">
                    {loadingDrive ? 'Consultando...' : driveQuota ? `${driveQuota.percentUsed}% (${driveQuota.remainingGB} GB libres)` : '15 GB Disponibles'}
                  </span>
                </div>

                {/* Progress Bar */}
                {driveQuota && (
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        driveQuota.isFull ? 'bg-red-500' : driveQuota.isNearLimit ? 'bg-amber-400' : 'bg-blue-400'
                      }`}
                      style={{ width: `${Math.min(100, driveQuota.percentUsed)}%` }}
                    />
                  </div>
                )}

                <p className="text-slate-400 text-[10px]">
                  Tus respaldos en Google Drive se guardan en la carpeta privada de la aplicación sin sobreescribir tus archivos.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-slate-300 text-[11px]">
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
                  className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Vincular Google Drive</span>
                </button>
              </div>
            )}
          </div>

          {/* Storage Architecture Overview */}
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <h4 className="font-extrabold text-slate-400 text-[11px] uppercase tracking-wider">Capas de Protección de Datos:</h4>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <span className="font-black text-emerald-400">IndexedDB + WebP:</span>
                  <span className="text-slate-300 ml-1.5">Almacenamiento ilimitado en tu navegador local.</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                <Cloud className="w-5 h-5 text-purple-400 flex-shrink-0" />
                <div>
                  <span className="font-black text-purple-400">Nube Supabase:</span>
                  <span className="text-slate-300 ml-1.5">Sincronización multi-dispositivo cifrada.</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                <HardDrive className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <div>
                  <span className="font-black text-blue-400">Google Drive API:</span>
                  <span className="text-slate-300 ml-1.5">Copia de respaldo personal en tu cuenta de Google.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={() => {
              onForceSave();
              onClose();
            }}
            disabled={isSaving}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'Guardando...' : 'Forzar Sincronización'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
