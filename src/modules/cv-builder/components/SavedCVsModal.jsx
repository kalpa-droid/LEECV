import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  Trash2, 
  Check, 
  X, 
  Calendar, 
  User, 
  FileText,
  Cloud,
  Sparkles,
  Download
} from 'lucide-react';
import { getSavedCVsList, loadCVById, deleteCVById, checkStorageStatus } from '../services/cvStorageService';

export default function SavedCVsModal({ 
  isOpen, 
  onClose, 
  onSelectCV,
  onImportJson 
}) {
  const [savedList, setSavedList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const statusInfo = checkStorageStatus();

  const fetchList = async () => {
    setIsLoading(true);
    try {
      const list = await getSavedCVsList();
      setSavedList(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchList();
    }
  }, [isOpen]);

  const handleOpenCV = async (id) => {
    const loadedData = await loadCVById(id);
    if (loadedData) {
      onSelectCV(loadedData);
      onClose();
    }
  };

  const handleDelete = async (id, title) => {
    if (window.confirm(`¿Estás seguro de eliminar "${title}"?`)) {
      await deleteCVById(id);
      fetchList();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Mis Currículums Guardados</h3>
              <p className="text-xs text-slate-400">Selecciona un archivo guardado o carga una copia de respaldo (.json)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Header: Cargar archivo de respaldo */}
        <div className="p-4 bg-purple-950/40 border-b border-purple-900/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-200">
            <Download className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>¿Tienes una copia de respaldo guardada en tu computadora o celular?</span>
          </div>
          <label className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl shadow-lg cursor-pointer transition flex items-center gap-1.5 whitespace-nowrap">
            <span>📥 Cargar Archivo (.json)</span>
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
        </div>

        {/* Body List */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold">Cargando lista de CVs...</p>
            </div>
          ) : savedList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/30">
              <FileText className="w-10 h-10 mx-auto text-slate-600" />
              <div>
                <p className="text-sm font-bold text-slate-300">No hay CVs guardados todavía</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  Cuando hagas cambios, presiona el botón "Guardar" en la barra superior para almacenar tus archivos en formato WebP optimizado.
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

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-purple-500/50 transition flex items-center justify-between gap-4 group"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-100 truncate">{item.candidate_name || item.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900/40 text-purple-300 border border-purple-700/50">
                        {item.dni ? `DNI: ${item.dni}` : 'Borrador'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Modificado: {formattedDate}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleOpenCV(item.id)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Abrir</span>
                    </button>

                    <button
                      onClick={() => handleDelete(item.id, item.candidate_name || item.title)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition border border-transparent hover:border-red-900/50"
                      title="Eliminar este CV"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1.5 ${
              statusInfo.isCloud 
                ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300' 
                : 'bg-purple-950/60 border-purple-700/60 text-purple-300'
            }`}>
              <Cloud className="w-3.5 h-3.5" /> {statusInfo.label}
            </span>
            <span className="text-[10px] text-slate-500 hidden sm:inline">• Compresión WebP Activa (80%)</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
