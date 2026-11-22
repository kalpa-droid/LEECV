import React, { useEffect, useState } from 'react';
import { exportCVToJson, exportCVToZip } from '../../../../shared/core/utils/jsonImporterExporter';
import {
  chooseWorkspaceFolder,
  clearWorkspaceFolder,
  getWorkspaceFolderStatus,
  saveDocumentToDisk,
  type WorkspaceFolderStatus,
} from '../../../../shared/core/storage/nativeFileDocumentService';
import { Modal } from '../../../../shared/core/ui/Modal';
import { ActionGrid } from '../../../../shared/core/ui/ActionGrid';
import { ActionTileButton } from '../../../../shared/core/ui/ActionTileButton';
import { LidioHelpTrigger } from '../../../../shared/core/ui/LidioHelpTrigger';
import { DomSectionIcon } from '../../../../shared/core/pdf-engine/layers/icons/DomSectionIcon';
import { UI_ICON_IDS } from '../../../../shared/core/ui/iconCatalog';
import { button } from '../../../../shared/core/uiDesignSystem';
import { FileText, FileArchive, Download, Sparkles } from 'lucide-react';

export default function JsonDownloadModal({ isOpen, onClose, cvData }: any) {
  const [folderStatus, setFolderStatus] = useState<WorkspaceFolderStatus | null>(null);

  const refreshFolderStatus = async () => {
    const status = await getWorkspaceFolderStatus();
    setFolderStatus(status);
  };

  useEffect(() => {
    if (isOpen) {
      void refreshFolderStatus();
    }
  }, [isOpen]);

  const handleChooseFolder = async () => {
    const res = await chooseWorkspaceFolder();
    if (res.status === 'selected') {
      await refreshFolderStatus();
    }
  };

  const handleClearFolder = async () => {
    await clearWorkspaceFolder();
    await refreshFolderStatus();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Guardar Copia Segura"
      icon={<Download className="w-5 h-5 text-[var(--color-status-warning-bright)]" />}
      helpText="Guardá una copia en tu computadora o pendrive para conservar tu trabajo fuera del navegador. Si vinculás una Carpeta Segura, todos tus archivos .leecv irán directo ahí."
      size="md"
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          <span className="text-[11px] text-[var(--ui-text-secondary)] font-bold truncate">
            {folderStatus?.folderName
              ? `Destino fijo: ${folderStatus.folderName}`
              : 'Elegí dónde guardar tus respaldos'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className={`${button.secondary} px-4 py-1.5 text-xs font-bold cursor-pointer`}
          >
            Cerrar
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs p-3 bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] rounded-[14px] select-none">
        {/* Banner Explícito de Carpeta Segura */}
        <div className="p-3 rounded-[12px] border border-[var(--color-accent-base)]/40 bg-[var(--ui-bg-card)] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-[10px] bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] flex items-center justify-center shrink-0">
                <DomSectionIcon iconId={UI_ICON_IDS.folderSafe} size={17} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-[var(--color-neutral-text-primary)] truncate">
                  {folderStatus?.configured && folderStatus.folderName
                    ? `Carpeta Segura: ${folderStatus.folderName}`
                    : 'Carpeta Segura de respaldos'}
                </p>
                <p className="text-[10px] text-[var(--color-neutral-text-secondary)] truncate">
                  {folderStatus?.lastSavedFileName
                    ? `Último archivo: ${folderStatus.lastSavedFileName}`
                    : folderStatus?.supported
                      ? 'Evita que tus archivos queden sueltos en Descargas.'
                      : 'Este navegador guarda los archivos en tu carpeta Descargas.'}
                </p>
              </div>
            </div>
            <LidioHelpTrigger
              size="xs"
              title="Carpeta Segura"
              text="Por seguridad, ningún navegador muestra ni toca otras carpetas sin tu permiso. Al vincular una carpeta fija (ej. Documentos/LEECV), guardás siempre en ese lugar exacto para no borrar nada por error."
              groupKey="modal-carpeta-segura"
            />
          </div>

          {folderStatus?.supported && (
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleChooseFolder}
                className={`${button.primary} px-3 py-1 text-[11px] font-bold cursor-pointer`}
              >
                {folderStatus.configured ? 'Cambiar carpeta' : 'Elegir Carpeta Segura'}
              </button>
              {folderStatus.configured && (
                <button
                  type="button"
                  onClick={handleClearFolder}
                  className={`${button.secondary} px-2.5 py-1 text-[11px] font-bold cursor-pointer`}
                >
                  Desvincular
                </button>
              )}
            </div>
          )}
        </div>

        {/* Grilla Cero Ruido de Formatos de Guardado */}
        <ActionGrid columns={2}>
          <ActionTileButton
            label="Archivo .leecv"
            icon={<Sparkles className="w-4 h-4" />}
            badge="⚡ Rayo"
            variant="accent"
            helpText="Archivo propio de LEECV. Si instalaste la app, abre directo con doble clic y se guarda directo en tu Carpeta Segura si la vinculaste."
            helpGroupKey="save-leecv-tile"
            onClick={async () => {
              await saveDocumentToDisk(cvData?.id || `cv_${Date.now()}`, 'cv', cvData);
              onClose();
            }}
          />

          <ActionTileButton
            label="Elegir ubicación"
            icon={<DomSectionIcon iconId={UI_ICON_IDS.folderSafe} size={17} strokeWidth={2} />}
            badge="Guardar como"
            helpText="Te permite elegir manualmente en qué carpeta de tu computadora o pendrive guardar el archivo .leecv o .json."
            helpGroupKey="save-as-disk-tile"
            onClick={async () => {
              await saveDocumentToDisk(cvData?.id || `cv_${Date.now()}`, 'cv', cvData, {
                forceSaveAs: true,
              });
              onClose();
            }}
          />

          <ActionTileButton
            label="Archivo .json"
            icon={<FileText className="w-4 h-4" />}
            badge="1 archivo"
            helpText="Respaldo portátil en un solo archivo .json con tus datos y fotos adentro. Se descarga en tu carpeta Descargas."
            helpGroupKey="save-json-tile"
            onClick={() => {
              exportCVToJson(cvData);
              onClose();
            }}
          />

          <ActionTileButton
            label="Paquete .zip"
            icon={<FileArchive className="w-4 h-4" />}
            badge="Con fotos"
            helpText="Carpeta comprimida .zip con cv_datos.json más todas tus imágenes y certificados originales por separado."
            helpGroupKey="save-zip-tile"
            onClick={async () => {
              await exportCVToZip(cvData);
              onClose();
            }}
          />
        </ActionGrid>
      </div>
    </Modal>
  );
}
