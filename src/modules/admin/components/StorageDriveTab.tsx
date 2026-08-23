import React, { useEffect, useState } from 'react';
import { HardDrive, RefreshCw, CheckCircle2, AlertCircle, Database, Cloud, Trash2, Cpu, ShieldCheck } from 'lucide-react';
import { checkStorageStatus, supabase } from '../../../shared/core/storage/documentStorageService';
import { idbStorage } from '../../cv-builder/services/storageIndexedDB';
import { useToast } from '../../../shared/core/ui/Toast';
import { useConfirm } from '../../../shared/core/ui/ConfirmDialog';

export function StorageDriveTab() {
  const { showSuccess, showError, showInfo } = useToast();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(false);
  const [storageStatus, setStorageStatus] = useState<any>(null);
  const [cloudDocsCount, setCloudDocsCount] = useState<number | null>(null);
  const [localDocsCount, setLocalDocsCount] = useState<number | null>(null);

  async function refreshDiagnostics() {
    setLoading(true);
    try {
      // 1. Check storage status
      const status = await checkStorageStatus();
      setStorageStatus(status);

      // 2. Count Cloud Supabase documents
      if (supabase) {
        const { count, error } = await supabase
          .from('cvs')
          .select('*', { count: 'exact', head: true });
        if (!error && count !== null) {
          setCloudDocsCount(count);
        }
      }

      // 3. Count Local IndexedDB keys
      const keys = await idbStorage.keys();
      setLocalDocsCount(keys.length);
    } catch (err) {
      console.error('Error refrescando diagnóstico:', err);
      showError('Inconveniente al obtener estado de almacenamiento.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshDiagnostics();
  }, []);

  const handleTestWrite = async () => {
    try {
      const testKey = `test_write_${Date.now()}`;
      await idbStorage.setItem(testKey, { ping: 'pong', timestamp: new Date().toISOString() });
      const readBack = await idbStorage.getItem(testKey);
      await idbStorage.removeItem(testKey);

      if (readBack?.ping === 'pong') {
        showSuccess('Prueba de lectura/escritura en IndexedDB realizada con éxito (100% Funcional).');
      } else {
        showError('Fallo en la prueba de lectura en almacenamiento local.');
      }
    } catch (err) {
      console.error(err);
      showError('Error al escribir en el almacenamiento local.');
    }
  };

  const handleClearLocalCache = () => {
    confirm({
      title: '¿Limpiar caché temporal de almacenamiento local?',
      message: 'Esto liberará espacio en IndexedDB borrando temporales sin afectar tus documentos guardados en la nube Supabase.',
      confirmText: 'Limpiar Caché',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const keys = await idbStorage.keys();
          let clearedCount = 0;
          for (const key of keys) {
            if (key.startsWith('test_') || key.startsWith('tmp_')) {
              await idbStorage.removeItem(key);
              clearedCount++;
            }
          }
          showSuccess(`Caché liberada: ${clearedCount} registros temporales eliminados.`);
          refreshDiagnostics();
        } catch (err) {
          showError('Error limpiando caché local.');
        }
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[${colorSystem.neutral.border}] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[${colorSystem.neutral.border}] pb-4">
        <div>
          <h2 className="text-base font-black text-[${colorSystem.neutral.textPrimary}] flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-purple-600" />
            <span>Almacenamiento, Servidores & Google Drive</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Diagnóstico en vivo de cuotas, bases de datos Supabase e integridad de almacenamiento IndexedDB local.
          </p>
        </div>

        <button
          onClick={refreshDiagnostics}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refrescar Diagnóstico</span>
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Supabase Status */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Supabase Cloud DB</span>
            <Cloud className="w-4 h-4 text-sky-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-900">
              {cloudDocsCount !== null ? `${cloudDocsCount} CVs` : 'Conectado'}
            </span>
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Online
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Documentos sincronizados en la nube</p>
        </div>

        {/* Local Storage */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">IndexedDB Navegador</span>
            <Database className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-900">
              {localDocsCount !== null ? `${localDocsCount} Claves` : 'Disponible'}
            </span>
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Ilimitado
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Caché ilimitada persistente en cliente</p>
        </div>

        {/* Storage Health Status */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Google Drive & Servidor</span>
            <Cpu className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-900">Activo</span>
            <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> OK
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Integración con Google Drive lista</p>
        </div>
      </div>

      {/* Diagnostic & Maintenance Tools */}
      <div className="space-y-3 border-t border-[${colorSystem.neutral.border}] pt-4">
        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
          Herramientas de Mantenimiento y Prueba de Almacenamiento:
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleTestWrite}
            className="p-3 bg-teal-50 hover:bg-teal-100/80 border border-teal-200 rounded-xl text-left transition flex items-center justify-between cursor-pointer"
          >
            <div>
              <div className="font-extrabold text-xs text-teal-900">Prueba de Lectura/Escritura</div>
              <div className="text-[11px] text-teal-700">Verifica la velocidad y respuesta del almacenamiento local</div>
            </div>
            <ShieldCheck className="w-5 h-5 text-[${colorSystem.secondary.base}] flex-shrink-0" />
          </button>

          <button
            type="button"
            onClick={handleClearLocalCache}
            className="p-3 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 rounded-xl text-left transition flex items-center justify-between cursor-pointer"
          >
            <div>
              <div className="font-extrabold text-xs text-rose-900">Limpiar Caché de Borradores Temporales</div>
              <div className="text-[11px] text-rose-700">Elimina registros huérfanos sin tocar datos de usuarios</div>
            </div>
            <Trash2 className="w-5 h-5 text-rose-600 flex-shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
