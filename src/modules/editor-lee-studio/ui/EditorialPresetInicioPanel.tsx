import React, { useRef, useState } from 'react';
import { BookOpen, FolderOpen, Save, Sparkles, ShieldCheck } from 'lucide-react';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { ActionGrid } from '../../../shared/core/ui/ActionGrid';
import { ActionTileButton } from '../../../shared/core/ui/ActionTileButton';
import { ContextualGuideBox } from '../../../shared/core/ui/ContextualGuideBox';
import { useConfirm } from '../../../shared/core/ui/ConfirmDialog';
import { UI_ICON_IDS } from '../../../shared/core/ui/iconCatalog';
import { emitLidioMessage } from '../../../shared/core/assistant/lidioBus';
import { getBoundNativeFileName } from '../../../shared/core/storage/nativeFileDocumentService';
import {
  EDITORIAL_PRESET_CATALOG,
  applyEditorialPresetToDraft,
  type EditorialPreset,
} from '../domain/editorialPresetCatalog';
import type { EditorialPresetId } from '../domain/editorialTypes';

export interface EditorialPresetInicioPanelProps {
  draft: any;
  updateDraft: (updater: (prev: any) => any) => void;
  setActiveStepTab: (tab: string) => void;
  onSaveToDisk?: () => void;
  onOpenDiskFile?: (fallbackFile?: File) => Promise<any>;
  notify: { success: (msg: string) => void; error: (msg: string) => void };
}

export const EditorialPresetInicioPanel: React.FC<EditorialPresetInicioPanelProps> = ({
  draft,
  updateDraft,
  setActiveStepTab,
  onSaveToDisk,
  onOpenDiskFile,
  notify,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { confirm } = useConfirm();
  const [applyMode, setApplyMode] = useState<'replace-structure' | 'apply-design'>('replace-structure');

  const activePresetId: string = draft?.design?.presetId || 'libro-ensayo-novela';
  const boundFileName = getBoundNativeFileName(draft?.id || '');
  const hasExistingContent =
    Array.isArray(draft?.sections) &&
    draft.sections.some(
      (s: any) =>
        Array.isArray(s?.records) &&
        s.records.some((r: any) => String(r?.content || '').trim().length > 0),
    );

  const handleSelectPreset = async (preset: EditorialPreset) => {
    let modeToUse = applyMode;
    if (modeToUse === 'replace-structure' && hasExistingContent) {
      const ok = await confirm({
        title: `¿Aplicar estructura "${preset.shortLabel}"?`,
        message:
          'Ya tenés texto escrito en algunas secciones. Si reemplazás la estructura se armarán los capítulos nuevos de esta plantilla; también podés cancelar y cambiar el modo arriba para actualizar solo formato y hoja.',
        confirmText: 'Sí, armar plantilla',
        cancelText: 'Cancelar',
      });
      if (!ok) return;
    }

    updateDraft((prev) => applyEditorialPresetToDraft(prev, preset.id as EditorialPresetId, modeToUse));
    notify.success(`Plantilla "${preset.shortLabel}" aplicada.`);
    emitLidioMessage({
      kind: 'state',
      groupKey: 'editorial-preset-changed',
      title: preset.shortLabel,
      body:
        preset.normId === 'apa7'
          ? 'Listo: activamos márgenes de 25 mm, estructura académica y reglas de Normas APA 7.ª edición.'
          : preset.normId === 'vancouver'
            ? 'Listo: preparamos estructura IMRyD y citas numeradas estilo Vancouver [1], [2].'
            : `Listo: configuramos hoja, tapa y secciones iniciales para "${preset.shortLabel}".`,
      targetTab: 'editorial_portada',
      targetLabel: 'Ir a Portada',
    });
  };

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
        title="Tipo de obra o trabajo"
        helpTitle="Elegí el tipo de documento"
        helpText="Cada plantilla arma las partes del documento (escuela secundaria, terciario, tesis universitaria APA 7, científico Vancouver, libro o manual), los márgenes, la tapa y las normas de citas."
      >
        <ContextualGuideBox title="Cómo arrancar rápido">
          Elegí una plantilla abajo según tu trabajo. Los capítulos o apartados van a aparecer con número en tu barra lateral para que los edites uno por uno.
        </ContextualGuideBox>

        {hasExistingContent && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => setApplyMode('replace-structure')}
              className={`px-2.5 py-1 rounded-full border font-semibold cursor-pointer transition ${
                applyMode === 'replace-structure'
                  ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]'
                  : 'border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)]'
              }`}
            >
              Armar capítulos nuevos
            </button>
            <button
              type="button"
              onClick={() => setApplyMode('apply-design')}
              className={`px-2.5 py-1 rounded-full border font-semibold cursor-pointer transition ${
                applyMode === 'apply-design'
                  ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]'
                  : 'border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)]'
              }`}
            >
              Solo formato (sin borrar texto)
            </button>
          </div>
        )}

        <ActionGrid columns={2}>
          {EDITORIAL_PRESET_CATALOG.map((preset) => (
            <ActionTileButton
              key={preset.id}
              label={preset.shortLabel}
              badge={preset.audienceTag}
              iconId={UI_ICON_IDS.book}
              active={activePresetId === preset.id}
              variant={activePresetId === preset.id ? 'accent' : 'default'}
              helpText={`${preset.label}. ${preset.description}`}
              helpGroupKey={`preset-help-${preset.id}`}
              onClick={() => void handleSelectPreset(preset)}
            />
          ))}
        </ActionGrid>
      </PanelSection>

      <PanelSection
        icon={<Sparkles className="w-4 h-4" />}
        title="Pasos siguientes"
        helpText="Podés diseñar la portada, importar un archivo largo desde Word/PDF/fotos o ir directo al editor de capítulos."
      >
        <ActionGrid columns={2}>
          <ActionTileButton
            label="Editar Portada"
            iconId={UI_ICON_IDS.preview}
            variant="secondary"
            helpText="Elegí el diseño de tapa y completá los datos de autor o institución."
            onClick={() => setActiveStepTab('editorial_portada')}
          />
          <ActionTileButton
            label="Importar archivo"
            iconId={UI_ICON_IDS.importar}
            variant="secondary"
            badge="IA / OCR"
            helpText="Subí Word, LibreOffice, PDF o fotos de apuntes para armar capítulos automáticamente."
            onClick={() => setActiveStepTab('editorial_import_ai')}
          />
        </ActionGrid>
      </PanelSection>

      <PanelSection
        icon={<ShieldCheck className="w-4 h-4" />}
        title="Carpeta Segura en PC"
        helpTitle="Dónde se guardan tus archivos"
        helpText="Podés guardar tu obra en una carpeta propia de tu computadora (.leedoc). Cada archivo incluye texto e imágenes sin depender de internet."
      >
        {boundFileName && (
          <div className="text-[11px] px-2.5 py-1.5 rounded-lg border border-[var(--color-status-success-base)]/40 bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)]">
            Archivo vinculado: <strong className="font-mono">{boundFileName}</strong> (usá Ctrl+S para actualizarlo)
          </div>
        )}

        <ActionGrid columns={2}>
          <ActionTileButton
            label="Abrir .leedoc"
            icon={<FolderOpen className="w-4 h-4" />}
            helpText="Abrí un respaldo .leedoc, .json o .zip guardado previamente en tu computadora o pendrive."
            onClick={() => void handleOpen()}
          />
          <ActionTileButton
            label="Guardar copia PC"
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
