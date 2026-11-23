import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  Trash2, 
  Calendar, 
  FileText,
  Cloud,
  Sparkles,
  Download,
  Copy,
  Mail
} from 'lucide-react';
import { 
  getSavedCVsList, 
  getSavedDocumentsList,
  loadCVById, 
  loadDocumentById,
  deleteCVById, 
  deleteDocumentById,
  saveCVAs, 
  saveDocumentAs,
  checkStorageStatus 
} from '../services/cvStorageService';
import { OpenTab } from '../../../shared/core/documents/tabStore';
import { useConfirm } from '../../../shared/core/ui/ConfirmDialog';
import { useToast } from '../../../shared/core/ui/Toast';

import { InfoHint } from '../../../shared/core/ui/InfoHint';
import { button, elevationSystem, radius } from '../../../shared/core/uiDesignSystem';
import { Modal } from '../../../shared/core/ui/Modal';
import { LidioHelpTrigger } from '../../../shared/core/ui/LidioHelpTrigger';
import { DomSectionIcon } from '../../../shared/core/pdf-engine/layers/icons/DomSectionIcon';
import { UI_ICON_IDS } from '../../../shared/core/ui/iconCatalog';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';
import {
  chooseWorkspaceFolder,
  getWorkspaceFolderStatus,
  listWorkspaceFolderFiles,
  openWorkspaceFileEntry,
  type WorkspaceFolderFileEntry,
  type WorkspaceFolderStatus,
} from '../../../shared/core/storage/nativeFileDocumentService';

export interface SavedCVsModalProps {
  isOpen: boolean;
  docType?: string;
  onClose: () => void;
  onSelectCV: (cvData: any) => void;
  onImportJson?: (e: any) => Promise<void>;

  onDocumentClosed?: (deletedId: string, remainingTabs?: OpenTab[]) => void;
  onGenerateCoverLetterFromCV?: (cvData: any) => void;
}

export default function SavedCVsModal({ 
  isOpen, 
  docType = 'cv',
  onClose, 
  onSelectCV,
  onImportJson,

  onDocumentClosed,
  onGenerateCoverLetterFromCV,
}: SavedCVsModalProps) {

  const { confirm } = useConfirm();
  const { showSuccess, showError } = useToast();
  const [savedList, setSavedList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [folderStatus, setFolderStatus] = useState<WorkspaceFolderStatus | null>(null);
  const [folderFiles, setFolderFiles] = useState<WorkspaceFolderFileEntry[]>([]);

  const statusInfo = checkStorageStatus();

  const refreshWorkspaceFolder = async (requestPerm = false) => {
    const status = await getWorkspaceFolderStatus();
    setFolderStatus(status);
    if (status.configured) {
      const files = await listWorkspaceFolderFiles(requestPerm);
      setFolderFiles(files);
    } else {
      setFolderFiles([]);
    }
  };

  const fetchList = async () => {
    setIsLoading(true);
    await withErrorHandling(
      async () => {
        const list = await getSavedDocumentsList(docType);
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
      void refreshWorkspaceFolder(false);
    }
  }, [isOpen, docType]);

  const handleOpenCV = async (id: string) => {
    await withErrorHandling(
      async () => {
        const loadedData = await loadDocumentById(id, docType);
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

  const handleDuplicate = async (id: string, title: string) => {
    await withErrorHandling(
      async () => {
        const loadedData = await loadDocumentById(id, docType);
        if (loadedData) {
          const cloneLabel = loadedData.version_label ? `${loadedData.version_label} (Copia)` : 'Copia Borrador';
          const clonedData = {
            ...loadedData,
            title: `${loadedData.title || title} (Copia)`
          };
          const res = await saveDocumentAs(clonedData, cloneLabel, docType);
          if (res?.success) {
            showSuccess(`Borrador "${title}" duplicado correctamente.`);
            fetchList();
          } else {
            showError('No se pudo duplicar el borrador.');
          }
        }
      },
      {
        context: 'Duplicación de Borrador',
        errorMessage: 'Error al duplicar el documento.',
        notify: (msg) => showError(msg)
      }
    );
  };

  const handleDelete = async (id: string, title: string) => {
    confirm({
      title: '¿Eliminar documento guardado?',
      message: `¿Estás seguro de que deseas eliminar "${title}" de tus archivos guardados?`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        await withErrorHandling(
          async () => {
            await deleteDocumentById(id, docType);
            showSuccess(`Documento "${title}" eliminado.`);
            fetchList();
            onDocumentClosed?.(id);
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
      icon={<FolderOpen className="w-5 h-5 text-[var(--ui-secondary)]" />}
      size="2xl"
      footer={
        <div className="w-full flex items-center justify-between gap-2 text-xs text-[var(--ui-text-secondary)]">
          <div className="flex items-center gap-2">
            <span>Guardado automático en este dispositivo</span>
            <InfoHint hintId="draftDot" variant="tap" />
          </div>
          <button
            onClick={onClose}
            className={`${button.secondary} px-4 py-1.5 font-bold text-xs`}
          >
            Cerrar
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-4 bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] rounded-[16px]">
        {/* Action Header: Importación e Integración con Carpeta Segura */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative rounded-[14px] bg-[var(--color-secondary-muted)] hover:border-[var(--color-secondary-base)] border border-[var(--color-secondary-base)]/40 transition">
            <label className="p-3 pr-9 cursor-pointer flex items-center gap-3 group w-full h-full">
              <div className="p-2 rounded-[10px] bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] group-hover:scale-105 transition flex-shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-xs text-[var(--ui-text-primary)] truncate">Importar Respaldo (.JSON / .ZIP)</p>
              </div>
              <input 
                type="file" 
                accept=".leecv,.leedoc,.leecard,.leebook,.leeplan,.json,.zip" 
                className="hidden" 
                onChange={async (e) => {
                  if (onImportJson) {
                    await onImportJson(e);
                    onClose();
                  }
                }} 
              />
            </label>
            <div className="absolute top-2.5 right-2.5 z-10">
              <LidioHelpTrigger
                size="xs"
                title="Importar Respaldo (.JSON / .ZIP)"
                text="Abrí un archivo .json o .zip que guardaste antes en tu computadora o pendrive para restaurar tu borrador."
              />
            </div>
          </div>

          {folderStatus?.supported && (
            <div className="relative rounded-[14px] bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/40 hover:border-[var(--color-accent-base)] transition">
              <button
                type="button"
                onClick={async () => {
                  if (folderStatus.configured && folderStatus.permission !== 'granted') {
                    await refreshWorkspaceFolder(true);
                    return;
                  }
                  const res = await chooseWorkspaceFolder();
                  if (res.status === 'selected') {
                    await refreshWorkspaceFolder(true);
                  }
                }}
                className="w-full h-full p-3 pr-9 text-left flex items-center gap-3 cursor-pointer"
              >
                <div className="p-2 rounded-[10px] bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] flex-shrink-0">
                  <DomSectionIcon iconId={UI_ICON_IDS.folderSafe} size={16} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-xs text-[var(--ui-text-primary)] truncate">
                    {folderStatus.configured && folderStatus.folderName
                      ? folderStatus.permission !== 'granted'
                        ? `Re-autorizar: ${folderStatus.folderName}`
                        : `Carpeta: ${folderStatus.folderName}`
                      : 'Vincular Carpeta Segura'}
                  </p>
                </div>
              </button>
              <div className="absolute top-2.5 right-2.5 z-10">
                <LidioHelpTrigger
                  size="xs"
                  title="Carpeta Segura"
                  text="Elegí una carpeta fija en tu PC para ver acá tus respaldos guardados en disco y abrirlos en 1 clic sin buscarlos por todos lados."
                />
              </div>
            </div>
          )}
        </div>

        {/* Archivos en Carpeta Segura si hay vinculados */}
        {folderFiles.length > 0 && (
          <div className="space-y-1.5 rounded-[12px] border border-[var(--color-accent-base)]/35 bg-[var(--ui-bg-card)] p-2.5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-accent-text)] px-1">
              En carpeta "{folderStatus?.folderName}" ({folderFiles.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-28 overflow-y-auto">
              {folderFiles.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  onClick={async () => {
                    try {
                      const opened = await openWorkspaceFileEntry(entry);
                      if (opened?.data) {
                        onSelectCV(opened.data);
                        showSuccess(`Abierto desde carpeta: ${opened.fileName}`);
                        onClose();
                      }
                    } catch {
                      showError(`No se pudo abrir "${entry.name}".`);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-[8px] border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] hover:border-[var(--color-accent-base)] text-left text-[11px] font-bold text-[var(--ui-text-primary)] flex items-center gap-1.5 cursor-pointer truncate"
                >
                  <FileText className="w-3.5 h-3.5 text-[var(--color-accent-text)] shrink-0" />
                  <span className="truncate">{entry.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Body List */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="py-12 text-center text-[var(--ui-text-secondary)] space-y-2">
              <div className="w-8 h-8 border-3 border-[var(--color-secondary-base)] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold">Cargando borradores guardados...</p>
            </div>
          ) : savedList.length === 0 ? (
            <div className="py-12 text-center text-[var(--ui-text-secondary)] space-y-3 border-2 border-dashed border-[var(--ui-border)] rounded-[16px] bg-[var(--ui-bg-panel)]">
              <FileText className="w-10 h-10 mx-auto text-[var(--ui-text-secondary)]" />
              <div>
                <p className="text-sm font-bold text-[var(--ui-text-secondary)]">No hay borradores guardados todavía</p>
                <p className="text-xs text-[var(--ui-text-secondary)] max-w-xs mx-auto mt-1">
                  Presioná "Guardar" en la barra superior para guardar tus archivos en este dispositivo.
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
                  className={`p-4 rounded-[${radius.modal}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] hover:border-[var(--color-secondary-base)]/50 transition flex items-center justify-between gap-4 group`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-[var(--ui-text-primary)] truncate">{item.candidate_name || item.title}</span>
                      
                      {isOfficial ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)] border border-[var(--color-status-success-base)]/40 flex items-center gap-1">
                          🟢 CV Oficial
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)] border border-[var(--color-status-warning-base)]/40 flex items-center gap-1">
                          🟠 Borrador
                        </span>
                      )}

                      {docType === 'cv' && (
                        (item.version_label || item.versionLabel) ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[var(--color-accent-purple-light)] text-[var(--color-accent-purple-text)] border border-[var(--color-accent-purple)]/40 flex items-center gap-1">
                            💼 Postulación: {item.version_label || item.versionLabel}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[var(--ui-dock-hover)] text-[var(--ui-text-secondary)] border border-[var(--ui-border)] flex items-center gap-1">
                            📄 CV Base
                          </span>
                        )
                      )}

                      {item.dni && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--ui-dock-hover)] text-[var(--ui-text-secondary)]">
                          DNI: {item.dni}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--ui-text-secondary)] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[var(--ui-text-secondary)]" />
                      <span>Modificado: {formattedDate}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleOpenCV(item.id)}
                      className={`${button.primary} px-4 py-2 font-extrabold text-xs flex items-center gap-1.5`}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Abrir</span>
                    </button>

                    {docType === 'cv' && onGenerateCoverLetterFromCV && (
                      <button
                        onClick={async () => {
                          const loaded = await loadDocumentById(item.id, 'cv');
                          if (loaded) {
                            onGenerateCoverLetterFromCV(loaded);
                            onClose();
                          }
                        }}
                        className={`${button.secondary} px-3 py-2 font-bold text-xs flex items-center gap-1.5`}
                        title="Generar Carta de Presentación desde este CV"
                      >
                        <Mail className="w-3.5 h-3.5 text-[var(--color-accent-text)]" />
                        <span className="hidden sm:inline">Carta</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDuplicate(item.id, item.candidate_name || item.title)}
                      className={`${button.ghost} p-2 text-[var(--color-secondary-bright)] hover:text-[var(--color-secondary-text)]`}
                      title="Duplicar / Clonar este Borrador"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(item.id, item.candidate_name || item.title)}
                      className={`${button.danger} p-2`}
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
