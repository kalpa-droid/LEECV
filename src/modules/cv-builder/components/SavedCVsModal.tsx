import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  Trash2, 
  Calendar, 
  FileText,
  Cloud,
  Sparkles,
  Download
} from 'lucide-react';
import { getSavedCVsList, loadCVById, deleteCVById, checkStorageStatus } from '../services/cvStorageService';
import { useConfirm } from '../../../shared/core/ui/ConfirmDialog';
import { useToast } from '../../../shared/core/ui/Toast';
import { colorSystem } from '../../../shared/core/uiDesignSystem';
import { Modal } from '../../../shared/core/ui/Modal';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';
import { validateFieldValue } from '../../../shared/core/utils/validationEngine';

export interface SavedCVsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCV: (cvData: any) => void;
  onImportJson?: (e: any) => Promise<void>;
  onOpenCloudStatus?: () => void;
}

export default function SavedCVsModal({ 
  isOpen, 
  onClose, 
  onSelectCV,
  onImportJson,
  onOpenCloudStatus
}: SavedCVsModalProps) {
  const { confirm } = useConfirm();
  const { showSuccess, showError } = useToast();
  const [savedList, setSavedList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const statusInfo = checkStorageStatus();

  const fetchList = async () => {
    setIsLoading(true);
    await withErrorHandling(
      async () => {
        const list = await getSavedCVsList();
        setSavedList(list);
      },
      {
        context: 'Carga de Borradores Guardados',
        errorMessage: 'Error al obtener la lista de documentos guardados.',
        notify: (msg) => showError(msg)
      }
    );
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchList();
    }
  }, [isOpen]);

  const handleOpenCV = async (id: string) => {
    await withErrorHandling(
      async () => {
        const loadedData = await loadCVById(id);
        if (loadedData) {
          onSelectCV(loadedData);
          onClose();
        }
      },
      {
        context: 'Apertura de Documento',
        errorMessage: 'No se pudo abrir el documento seleccionado.',
        notify: (msg) => showError(msg)
      }
    );
  };

  const handleDelete = async (id: string, title: string) => {
    confirm({
      title: '¿Eliminar currículum guardado?',
      message: `¿Estás seguro de que deseas eliminar "${title}" de tus archivos guardados?`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        await withErrorHandling(
          async () => {
            await deleteCVById(id);
            showSuccess(`Documento "${title}" eliminado.`);
            fetchList();
          },
          {
            context: 'Eliminación de Documento',
            errorMessage: 'Error al eliminar el documento.',
            notify: (msg) => showError(msg)
          }
        );
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Abrir Documento"
      icon={<FolderOpen className="w-5 h-5 text-teal-400" />}
      size="2xl"
      footer={
        <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1.5 ${
              statusInfo.isCloud 
                ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300' 
                : 'bg-teal-950/60 border-teal-700/60 text-teal-300'
            }`}>
              <Cloud className="w-3.5 h-3.5" /> {statusInfo.label}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Action Header: 2 Options Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="p-3 rounded-2xl bg-teal-950/40 hover:bg-teal-900/60 border border-teal-800/40 hover:border-teal-500/60 transition cursor-pointer flex items-center gap-3 group">
            <div className={`p-2 rounded-xl bg-[var(--color-secondary-base)]/20 text-[var(--color-secondary-base)] group-hover:scale-110 transition flex-shrink-0`}>
              <Download className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-xs text-white">Cargar Copia (.JSON)</p>
              <p className="text-[10px] text-teal-300 truncate">Restaurar respaldo local</p>
            </div>
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              onChange={async (e) => {
                if (onImportJson) {
                  await onImportJson(e);
                  onClose();
                }
              }} 
            />
          </label>

          <button
            type="button"
            onClick={() => {
              if (onOpenCloudStatus) {
                onClose();
                onOpenCloudStatus();
              }
            }}
            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/60 transition cursor-pointer flex items-center gap-3 text-left group"
          >
            <div className="p-2 rounded-xl bg-slate-800 text-teal-400 group-hover:scale-110 transition flex-shrink-0">
              <Cloud className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-xs text-white">Google Drive / Nube</p>
              <p className="text-[10px] text-slate-400 truncate">Estado de sincronización</p>
            </div>
          </button>
        </div>

        {/* Explanation Banner */}
        <div className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-300 leading-snug flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Estado:</strong> <span className="text-amber-400 font-bold"> 🟠 Borrador (En Edición)</span> pasa a <span className="text-emerald-400 font-bold"> 🟢 CV Oficial</span> al exportar tu documento.
          </span>
        </div>

        {/* Body List */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold">Cargando borradores guardados...</p>
            </div>
          ) : savedList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/30">
              <FileText className="w-10 h-10 mx-auto text-slate-600" />
              <div>
                <p className="text-sm font-bold text-slate-300">No hay borradores guardados todavía</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  Presiona "Guardar" en la barra superior para almacenar tus archivos en tu navegador.
                </p>
              </div>
            </div>
          ) : (
            savedList.map((item) => {
              const formattedDate = item.updated_at 
                ? new Date(item.updated_at).toLocaleDateString('es-AR', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })
                : 'Reciente';

              const isOfficial = item.is_official || item.isOfficial || item.pdf_exported;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-teal-500/50 transition flex items-center justify-between gap-4 group"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-slate-100 truncate">{item.candidate_name || item.title}</span>
                      
                      {isOfficial ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-950 text-emerald-400 border border-emerald-700/60 flex items-center gap-1">
                          🟢 CV Oficial
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-950/80 text-amber-300 border border-amber-700/60 flex items-center gap-1">
                          🟠 Borrador
                        </span>
                      )}

                      {item.dni && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          DNI: {item.dni}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Modificado: {formattedDate}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleOpenCV(item.id)}
                      className="px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-800 hover:from-teal-500 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Abrir</span>
                    </button>

                    <button
                      onClick={() => handleDelete(item.id, item.candidate_name || item.title)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition border border-transparent hover:border-red-900/50 cursor-pointer"
                      title="Eliminar este documento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
