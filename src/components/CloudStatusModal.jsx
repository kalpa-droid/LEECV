import React from 'react';
import { Cloud, X, RefreshCw, CheckCircle2, HardDrive, WifiOff } from 'lucide-react';
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
              <p className="text-xs text-slate-400">Resguardo automático de datos</p>
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

          {/* Color Guide with Cloud Icons */}
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <h4 className="font-extrabold text-slate-400 text-[11px] uppercase tracking-wider">Significado de los Colores:</h4>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                <Cloud className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <span className="font-black text-emerald-400">Verde:</span>
                  <span className="text-slate-300 ml-1.5">Conectado a la Nube de Supabase.</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                <Cloud className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div>
                  <span className="font-black text-amber-400">Amarillo:</span>
                  <span className="text-slate-300 ml-1.5">Guardado en Memoria Local de tu equipo.</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                <Cloud className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div>
                  <span className="font-black text-red-400">Rojo:</span>
                  <span className="text-slate-300 ml-1.5">Sin Internet (Modo offline protegido).</span>
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
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'Guardando...' : 'Ejecutar Guardado'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
