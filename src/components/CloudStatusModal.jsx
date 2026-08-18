import React from 'react';
import { Cloud, X, RefreshCw, CheckCircle2, AlertTriangle, WifiOff, HardDrive, Sparkles } from 'lucide-react';
import { checkStorageStatus } from '../services/cvStorageService';

export default function CloudStatusModal({
  isOpen,
  onClose,
  onForceSave,
  isSaving
}) {
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
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
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
              <h3 className="text-base font-black text-white">Estado de Sincronización</h3>
              <p className="text-xs text-slate-400">Resguardo automático y estado de conexión</p>
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
        <div className="p-5 space-y-4 text-xs">
          {/* Current Active Status Card */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
            currentColor === 'green'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : currentColor === 'yellow'
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              : 'bg-red-950/40 border-red-500/40 text-red-200'
          }`}>
            {currentColor === 'green' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : currentColor === 'yellow' ? (
              <HardDrive className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
            ) : (
              <WifiOff className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            )}

            <div className="space-y-1">
              <h4 className="font-extrabold text-sm text-white">
                {currentColor === 'green' && '🟢 Supabase Nube Conectada'}
                {currentColor === 'yellow' && '🟡 Guardado Local Activo (WebP)'}
                {currentColor === 'red' && '🔴 Sin Conexión a Internet'}
              </h4>
              <p className="text-slate-300 leading-relaxed">
                {currentColor === 'green' && 'Tus cambios se guardan y sincronizan automáticamente en tu base de datos en la nube de Supabase.'}
                {currentColor === 'yellow' && 'La aplicación guarda todos tus cambios de forma segura en la memoria de tu navegador con compresión WebP. Tus datos no se perderán si se corta la luz.'}
                {currentColor === 'red' && 'No hay internet detectado. Todos los cambios quedan protegidos en tu memoria local y se sincronizarán al recuperar la conexión.'}
              </p>
            </div>
          </div>

          {/* Color Guide */}
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <h4 className="font-extrabold text-slate-300 text-xs uppercase tracking-wider">Significado de los Colores de la Nube:</h4>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-emerald-400">Verde:</span>
                  <span className="text-slate-300 ml-1">Hay conexión a Internet y la Nube Supabase está activa. Resguardo completo en servidores remotos.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                <span className="w-3 h-3 rounded-full bg-amber-400 shadow-md shadow-amber-400/50 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-amber-400">Amarillo:</span>
                  <span className="text-slate-300 ml-1">Modo Local Activo. Tus archivos e imágenes comprimidas a WebP se guardan instantáneamente en tu navegador.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                <span className="w-3 h-3 rounded-full bg-red-500 shadow-md shadow-red-500/50 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-black text-red-400">Rojo:</span>
                  <span className="text-slate-300 ml-1">Sin Internet (Offline). Todos los registros nuevos se resguardan en tu equipo hasta que vuelva la red.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={onForceSave}
            disabled={isSaving}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'Guardando...' : 'Forzar Guardado Ahora'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
