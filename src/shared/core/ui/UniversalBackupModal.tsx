import React, { useEffect, useRef, useState } from 'react';
import { Cloud, Download, FolderOpen, HardDrive, RefreshCw, ShieldCheck, Upload } from 'lucide-react';
import { Modal } from './Modal';
import { button, radius } from '../uiDesignSystem';
import { useToast } from './Toast';
import {
  DriveFileEntry,
  downloadLeecvDriveFile,
  isGoogleDriveConfigured,
  listLeecvDriveFiles,
  uploadFileToPersonalDrive,
} from '../storage/googleDriveClient';
import { packDocumentForDisk, unpackDocumentFromDisk } from '../storage/leecvPackageCodec';
import { saveDocument } from '../storage/documentStorageService';
import { openTab, setActiveTabId } from '../documents/tabStore';
import { setPendingDocumentToOpen } from '../storage/pendingDocumentHandoff';
import { getRouteForDocType } from '../capabilities/capabilityRegistry';
import { recordExternalBackupTimestamp } from '../storage/storageResilienceEngine';
import { navigation } from '../utils/navigation';
import { downloadBlob } from '../utils/downloadUtils';
import { getLastExportedArtifact } from '../utils/lastExportArtifactStore';
import { trackFunnelEvent } from '../payments/paymentService';
import type { DocumentTypeId } from '../../../types/document';

export interface UniversalBackupHandlers {
  getEditableBlob?: () => Promise<{ blob: Blob; fileName: string } | null>;
  onRestoreEditableFile?: (file: File) => Promise<void>;
}

interface UniversalBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  docType: DocumentTypeId | string;
  currentData: any;
  backupHandlers?: UniversalBackupHandlers;
}

export default function UniversalBackupModal({
  isOpen,
  onClose,
  docType,
  currentData,
  backupHandlers,
}: UniversalBackupModalProps) {
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFileEntry[]>([]);
  const [driveConnected, setDriveConnected] = useState(false);

  const driveConfigured = isGoogleDriveConfigured();
  const lastArtifact = isOpen ? getLastExportedArtifact() : null;

  useEffect(() => {
    if (!isOpen) {
      setBusyAction(null);
    }
  }, [isOpen]);

  const buildDraftArtifact = async (): Promise<{ blob: Blob; fileName: string }> => {
    if (backupHandlers?.getEditableBlob) {
      const custom = await backupHandlers.getEditableBlob();
      if (!custom) throw new Error('Todavía no hay datos listos para respaldar.');
      return custom;
    }
    const packed = await packDocumentForDisk(docType, currentData || {});
    return { blob: packed.blob, fileName: packed.suggestedFileName };
  };

  const handleSaveLocalCopy = async () => {
    setBusyAction('save_local');
    try {
      const { blob, fileName } = await buildDraftArtifact();
      downloadBlob(blob, fileName);
      recordExternalBackupTimestamp();
      showSuccess(`Copia descargada en tu equipo (${fileName}).`);
    } catch (err: any) {
      showError(err?.message || 'No pudimos guardar la copia en tu computadora.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveDriveCopy = async () => {
    setBusyAction('save_drive');
    try {
      const { blob, fileName } = await buildDraftArtifact();
      const uploaded = await uploadFileToPersonalDrive({
        blob,
        fileName,
        folderKind: 'editable_drafts',
      });
      setDriveConnected(true);
      recordExternalBackupTimestamp();
      trackFunnelEvent('drive_saved', docType);
      showSuccess(`Copia nueva guardada en ${uploaded.folderName}. Tu copia anterior no se borra.`);
    } catch (err: any) {
      showError(err?.message || 'No pudimos guardar tu copia en Google Drive.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleUploadFinishedArtifact = async () => {
    if (!lastArtifact) return;
    setBusyAction('upload_finished');
    try {
      const uploaded = await uploadFileToPersonalDrive({
        blob: lastArtifact.blob,
        fileName: lastArtifact.fileName,
        folderKind: 'finished_docs',
      });
      setDriveConnected(true);
      trackFunnelEvent('drive_saved', docType);
      showSuccess(`Archivo terminado guardado en ${uploaded.folderName}.`);
    } catch (err: any) {
      showError(err?.message || 'No se pudo subir el documento terminado a Google Drive.');
    } finally {
      setBusyAction(null);
    }
  };

  const openFileInNewTab = async (file: File) => {
    if (backupHandlers?.onRestoreEditableFile) {
      await backupHandlers.onRestoreEditableFile(file);
      onClose();
      return;
    }

    const unpacked = await unpackDocumentFromDisk(file);
    const targetDocType = (unpacked.docType || docType) as DocumentTypeId;
    const newId = `opened_${targetDocType}_${Date.now()}`;
    const rawDoc = unpacked.data || {};
    const baseTitle = String(
      rawDoc.title ||
        rawDoc?.personalInfo?.fullName ||
        rawDoc?.meta?.title ||
        file.name.replace(/\.[^.]+$/, '')
    ).trim();

    const docToSave = {
      ...rawDoc,
      id: newId,
      doc_type_id: targetDocType,
      title: `${baseTitle} (Copia)`,
      updatedAt: Date.now(),
    };

    const saveRes = await saveDocument(docToSave, targetDocType);
    if (!saveRes?.success) {
      throw new Error('No pudimos preparar la pestaña nueva con este archivo.');
    }

    openTab(newId, targetDocType, docToSave.title);
    setActiveTabId(newId);
    setPendingDocumentToOpen(newId, targetDocType);
    showSuccess('Archivo abierto en una pestaña nueva. Tu documento anterior quedó intacto.');
    onClose();
    navigation.goTo(getRouteForDocType(targetDocType));
  };

  const handleLocalFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusyAction('open_local');
    try {
      await openFileInNewTab(file);
    } catch (err: any) {
      showError(err?.message || 'No pudimos abrir este archivo de respaldo.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleLoadDriveList = async () => {
    setBusyAction('list_drive');
    try {
      const files = await listLeecvDriveFiles('editable_drafts');
      setDriveFiles(files);
      setDriveConnected(true);
    } catch (err: any) {
      showError(err?.message || 'No pudimos conectar con tu Google Drive.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleOpenDriveFile = async (entry: DriveFileEntry) => {
    setBusyAction(`open_${entry.id}`);
    try {
      const file = await downloadLeecvDriveFile(entry.id, entry.name);
      await openFileInNewTab(file);
    } catch (err: any) {
      showError(err?.message || 'No pudimos abrir el respaldo desde Google Drive.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Abrir o Guardar Copias (Cero Miedo)"
      icon={<ShieldCheck className="w-5 h-5 text-[var(--color-status-success-text)]" />}
      size="lg"
      footer={
        <div className="w-full flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`${button.base} ${button.secondary}`}
          >
            Cerrar
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs text-[var(--ui-text-primary)]">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".leecv,.leedoc,.leecard,.leebook,.leeplan,.leefact,.leecv-fact,.leecv-editor,.json,.zip"
          onChange={(e) => void handleLocalFileChosen(e)}
        />

        {/* Guardar copia nueva */}
        <div
          className="p-4 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] space-y-3"
          style={{ borderRadius: radius.card }}
        >
          <div>
            <h3 className="text-sm font-black">1. Guardar una copia segura ahora</h3>
            <p className="text-[11px] text-[var(--ui-text-secondary)] mt-0.5">
              Cada guardado crea una copia nueva con fecha de hoy. Nunca se borra ni se pisa lo que hiciste antes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => void handleSaveLocalCopy()}
              className="p-3 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] hover:border-[var(--color-accent-base)] text-left flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
              style={{ borderRadius: radius.control }}
            >
              <HardDrive className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
              <div>
                <p className="font-bold">Guardar copia en mi PC / Celular</p>
                <p className="text-[10px] text-[var(--ui-text-secondary)]">Archivo editable sin conexión</p>
              </div>
            </button>

            <button
              type="button"
              disabled={busyAction !== null || !driveConfigured}
              onClick={() => void handleSaveDriveCopy()}
              title={!driveConfigured ? 'Pendiente configurar VITE_GOOGLE_CLIENT_ID' : 'Guardar en Google Drive'}
              className="p-3 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] hover:border-[var(--color-accent-base)] text-left flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
              style={{ borderRadius: radius.control }}
            >
              <Cloud className="w-4 h-4 text-[var(--color-secondary-bright)] shrink-0" />
              <div>
                <p className="font-bold">
                  {busyAction === 'save_drive' ? 'Subiendo a Drive...' : 'Guardar en mi Google Drive'}
                </p>
                <p className="text-[10px] text-[var(--ui-text-secondary)]">
                  {driveConfigured ? 'Carpeta: LEECV / Borradores Editables' : 'Conexión Drive no habilitada aún'}
                </p>
              </div>
            </button>
          </div>

          {lastArtifact && driveConfigured && (
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => void handleUploadFinishedArtifact()}
              className="w-full p-2.5 bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/40 text-[var(--color-status-success-text)] font-bold flex items-center justify-center gap-2 cursor-pointer"
              style={{ borderRadius: radius.control }}
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span>
                {busyAction === 'upload_finished'
                  ? 'Subiendo documento terminado...'
                  : `Subir último archivo exportado (${lastArtifact.fileName}) a Documentos Terminados`}
              </span>
            </button>
          )}
        </div>

        {/* Abrir archivo existente en pestaña nueva */}
        <div
          className="p-4 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] space-y-3"
          style={{ borderRadius: radius.card }}
        >
          <div>
            <h3 className="text-sm font-black">2. Abrir un respaldo guardado</h3>
            <p className="text-[11px] text-[var(--color-status-success-text)] font-semibold mt-0.5">
              Se abre en una pestaña nueva al lado: tu documento actual no se pisa ni se pierde.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => fileInputRef.current?.click()}
              className={`${button.base} ${button.secondary} text-xs flex items-center gap-1.5`}
            >
              <FolderOpen className="w-4 h-4 shrink-0" />
              <span>Abrir archivo desde mi dispositivo</span>
            </button>

            {driveConfigured && (
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleLoadDriveList()}
                className={`${button.base} ${button.primary} text-xs flex items-center gap-1.5`}
              >
                <RefreshCw className={`w-4 h-4 shrink-0 ${busyAction === 'list_drive' ? 'animate-spin' : ''}`} />
                <span>{driveConnected ? 'Actualizar lista de Google Drive' : 'Ver mis respaldos en Google Drive'}</span>
              </button>
            )}
          </div>

          {driveConnected && (
            <div className="space-y-1.5 pt-1">
              {driveFiles.length === 0 ? (
                <p className="text-[11px] text-[var(--ui-text-secondary)]">
                  Todavía no tenés borradores en la carpeta LEECV de tu Google Drive.
                </p>
              ) : (
                driveFiles.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-2.5 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] flex items-center justify-between gap-2"
                    style={{ borderRadius: radius.control }}
                  >
                    <div className="min-w-0">
                      <p className="font-bold truncate">{entry.name}</p>
                      <p className="text-[10px] text-[var(--ui-text-secondary)]">
                        {entry.modifiedTime ? new Date(entry.modifiedTime).toLocaleString('es-AR') : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => void handleOpenDriveFile(entry)}
                      className="px-2.5 py-1.5 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] font-bold text-[11px] shrink-0 cursor-pointer flex items-center gap-1"
                      style={{ borderRadius: radius.control }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{busyAction === `open_${entry.id}` ? 'Abriendo...' : 'Abrir en pestaña'}</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
