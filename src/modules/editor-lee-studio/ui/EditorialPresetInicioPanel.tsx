import React, { useRef } from 'react';
import { BookOpen, FolderOpen, Save, ShieldCheck } from 'lucide-react';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { ActionGrid } from '../../../shared/core/ui/ActionGrid';
import { ActionTileButton } from '../../../shared/core/ui/ActionTileButton';
import { ContextualGuideBox } from '../../../shared/core/ui/ContextualGuideBox';
import { UI_ICON_IDS } from '../../../shared/core/ui/iconCatalog';
import { radius } from '../../../shared/core/uiDesignSystem';
import { getBoundNativeFileName } from '../../../shared/core/storage/nativeFileDocumentService';
import { DEFAULT_EDITORIAL_PRESET, getEditorialPreset } from '../domain/editorialPresetCatalog';

export interface EditorialPresetInicioPanelProps {
  draft: any;
  onOpenGlobalPresetModal?: () => void;
  onSaveToDisk?: () => void;
  onOpenDiskFile?: (fallbackFile?: File) => Promise<any>;
}

export const EditorialPresetInicioPanel: React.FC<EditorialPresetInicioPanelProps> = ({
  draft,
  onOpenGlobalPresetModal,
  onSaveToDisk,
  onOpenDiskFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePreset = getEditorialPreset(draft?.design?.presetId || '') || DEFAULT_EDITORIAL_PRESET;
  const boundFileName = getBoundNativeFileName(draft?.id || '');
  const sectionsCount = Array.isArray(draft?.sections) ? draft.sections.length : 0;

  const handleOpen = async () => {
    const res = await onOpenDiskFile?.();
    if (res?.data === 'needs-input' || res === 'needs-input') {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-5">
      <PanelSection
        icon={<BookOpen className="w-4 h-4" />}
        title="Obra activa"
        helpTitle="Plantilla en la barra superior"
        helpText="El tipo de obra, la norma visual y el estilo de citas se eligen desde los 3 botones de la barra superior para no repetir opciones en este panel."
      >
        <div
          className="p-3 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] flex items-center justify-between gap-3"
          style={{ borderRadius: radius.card }}
        >
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-[var(--ui-text-primary)] truncate">
              {activePreset.label}
            </p>
            <p className="text-[11px] text-[var(--ui-text-secondary)]">
              {activePreset.audienceTag} · {sectionsCount} apartado(s) activos
            </p>
          </div>
          {onOpenGlobalPresetModal && (
            <button
              type="button"
              onClick={onOpenGlobalPresetModal}
              className="px-2.5 py-1.5 rounded-full border border-[var(--color-accent-base)]/50 bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] text-[11px] font-bold cursor-pointer shrink-0 hover:opacity-90"
            >
              Cambiar obra
            </button>
          )}
        </div>
      </PanelSection>

      <PanelSection
        icon={<ShieldCheck className="w-4 h-4" />}
        title="Carpeta Segura en PC"
        helpTitle="Dónde se guardan tus archivos"
        helpText="Podés guardar tu obra en una carpeta propia de tu computadora (.leedoc). Cada archivo incluye texto e imágenes sin depender de internet."
      >
        <ContextualGuideBox title="Respaldo portátil en tu compu">
          Guardá copias completas `.leedoc` en tu computadora o pendrive para seguir editando en otro momento sin conexión.
        </ContextualGuideBox>

        {boundFileName && (
          <div
            className="text-[11px] px-2.5 py-1.5 border border-[var(--color-status-success-base)]/40 bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)]"
            style={{ borderRadius: radius.control }}
          >
            Archivo vinculado: <strong className="font-mono">{boundFileName}</strong> (usá Ctrl+S para actualizarlo)
          </div>
        )}

        <ActionGrid columns={2}>
          <ActionTileButton
            label="Abrir .leedoc"
            role="io"
            icon={<FolderOpen className="w-4 h-4" />}
            helpText="Abrí un respaldo .leedoc, .json o .zip guardado previamente en tu computadora o pendrive."
            onClick={() => void handleOpen()}
          />
          <ActionTileButton
            label="Guardar copia PC"
            role="io"
            icon={<Save className="w-4 h-4" />}
            iconId={UI_ICON_IDS.folderSafe}
            helpText="Guardá una copia en la carpeta que elijas de tu computadora con el nombre claro de tu obra."
            onClick={() => onSaveToDisk?.()}
          />
        </ActionGrid>

        <input
          ref={fileInputRef}
          type="file"
          accept=".leedoc,.leecv-editor,.json,.zip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.currentTarget.value = '';
            if (f) void onOpenDiskFile?.(f);
          }}
        />
      </PanelSection>
    </div>
  );
};
