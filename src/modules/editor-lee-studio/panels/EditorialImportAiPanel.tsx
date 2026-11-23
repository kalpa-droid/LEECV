import React, { useRef, useState } from 'react';
import { Camera, FileSpreadsheet, FileText, Sparkles, Upload } from 'lucide-react';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { ActionGrid } from '../../../shared/core/ui/ActionGrid';
import { ActionTileButton } from '../../../shared/core/ui/ActionTileButton';
import { ContextualGuideBox } from '../../../shared/core/ui/ContextualGuideBox';
import { Field } from '../../../shared/core/ui/Field';
import { AIButton } from '../../../shared/core/ui/AIButton';
import { useConfirm } from '../../../shared/core/ui/ConfirmDialog';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';
import {
  extractEditorialTextFromFiles,
  structureManuscriptInChunks,
  type ImportProgressUpdate,
} from '../domain/editorialUniversalImporter';
import {
  detectEditorialPresetForText,
  type EditorialPresetRecommendation,
} from '../domain/editorialPresetDetector';
import { DEFAULT_EDITORIAL_PRESET, getEditorialPreset } from '../domain/editorialPresetCatalog';
import { applyEditorialGlobalConfig } from '../domain/editorialNormEngine';
import { resolveCanonicalEditorialKey } from '../domain/editorialDockEngine';
import { emitLidioMessage } from '../../../shared/core/assistant/lidioBus';
import type { EditorialPresetId, EditorialSection } from '../domain/editorialTypes';

interface EditorialImportAiPanelProps {
  draft: any;
  updateDraft: (updater: (prev: any) => any) => void;
  notify: { success: (msg: string) => void; error: (msg: string) => void };
  setActiveStepTab?: (tab: string) => void;
  onExportPDF?: () => void;
}

export const EditorialImportAiPanel: React.FC<EditorialImportAiPanelProps> = ({
  draft,
  updateDraft,
  notify,
  setActiveStepTab,
  onExportPDF,
}) => {
  const showSuccess = notify?.success ?? (() => {});
  const showError = notify?.error ?? (() => {});
  const { confirm } = useConfirm();

  const [manuscriptText, setManuscriptText] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [progress, setProgress] = useState<ImportProgressUpdate | null>(null);
  const [extractSummary, setExtractSummary] = useState<{
    digitalPages: number;
    ocrPages: number;
    totalFiles: number;
  } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [presetRecommendation, setPresetRecommendation] =
    useState<EditorialPresetRecommendation | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const currentPreset =
    getEditorialPreset(draft?.design?.presetId || '') || DEFAULT_EDITORIAL_PRESET;

  const runInstantPresetCheck = async (text: string, fileName?: string) => {
    const activePresetId = (draft?.design?.presetId as EditorialPresetId) || DEFAULT_EDITORIAL_PRESET.id;
    const rec = await detectEditorialPresetForText({
      fullText: text,
      currentPresetId: activePresetId,
      fileName,
    });
    if (rec && rec.recommendedPresetId !== activePresetId) {
      setPresetRecommendation(rec);
      emitLidioMessage({
        kind: 'state',
        groupKey: 'editorial-preset-recommend',
        title: `Detectamos: ${rec.detectedLabel}`,
        body: `Tu editor está en "${currentPreset.shortLabel}". Te recomendamos cambiar a "${rec.detectedLabel}" arriba en el panel.`,
      });
    } else {
      setPresetRecommendation(null);
    }
  };

  const handleApplyRecommendation = (rec: EditorialPresetRecommendation) => {
    updateDraft((prev) =>
      applyEditorialGlobalConfig(prev, {
        presetId: rec.recommendedPresetId,
        presetMode: 'apply-design',
        structuralNormId: rec.recommendedStructuralNormId,
        bibliographyStyle: rec.recommendedBibliographyStyle,
        applyMode: 'preserve-manual',
      }),
    );
    setPresetRecommendation(null);
    showSuccess(`Tipo de obra cambiado a "${rec.detectedLabel}" conservando tu texto.`);
  };

  const handleFilesSelected = async (filesList: FileList | null) => {
    const files = filesList ? Array.from(filesList) : [];
    if (files.length === 0) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsBusy(true);

    const res = await withErrorHandling(
      async () => {
        const extracted = await extractEditorialTextFromFiles(files, {
          onProgress: (upd) => setProgress(upd),
          signal: controller.signal,
        });
        setManuscriptText(extracted.text);
        setExtractSummary({
          digitalPages: extracted.pdfDigitalPages,
          ocrPages: extracted.ocrPages,
          totalFiles: extracted.totalFiles,
        });
        setShowPasteBox(true);
        showSuccess(
          `Texto extraído por completo (${extracted.text.length.toLocaleString('es-AR')} caracteres). Tocá el botón de IA para armar tus capítulos.`,
        );
        void runInstantPresetCheck(extracted.text, files[0]?.name);
        return extracted;
      },
      {
        context: 'Importación universal EditorLee',
        errorMessage: 'No pudimos leer uno de los archivos.',
        notify: (msg) => showError(msg),
      },
    );

    if (!res.success) {
      setProgress(null);
    } else {
      setProgress((prev) =>
        prev
          ? { ...prev, stage: 'done', message: 'Texto cargado completo. Listo para estructurar en capítulos.' }
          : null,
      );
    }
    setIsBusy(false);
  };

  const handleStructureManuscript = async (): Promise<string> => {
    const raw = manuscriptText.trim();
    if (!raw) {
      throw new Error('Subí un documento o pegá tu manuscrito antes de estructurar.');
    }

    if (!presetRecommendation) {
      void runInstantPresetCheck(raw);
    }

    const hasExisting = Array.isArray(draft?.sections) && draft.sections.length > 0;
    let mergeMode: 'replace' | 'append' = 'replace';
    if (hasExisting) {
      const replaceIt = await confirm({
        title: 'Ya tenés capítulos en tu documento',
        message:
          '¿Querés reemplazar la estructura actual con los capítulos detectados en este archivo o conservarlos?',
        confirmText: 'Reemplazar con importado',
        cancelText: 'Cancelar',
      });
      if (!replaceIt) return '';
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsBusy(true);

    let firstSectionId = '';
    try {
      const result = await structureManuscriptInChunks({
        fullText: raw,
        presetId: draft?.design?.presetId as EditorialPresetId | undefined,
        signal: controller.signal,
        onProgress: (upd) => setProgress(upd),
        onPartialSections: (sectionsSoFar, metadata) => {
          const normalizedSections: EditorialSection[] = sectionsSoFar.map((s) => {
            const { sectionKey, category } = resolveCanonicalEditorialKey(s);
            return { ...s, sectionKey, category };
          });
          if (!firstSectionId && normalizedSections.length > 0) {
            firstSectionId = normalizedSections[0].id;
          }
          updateDraft((prev) => ({
            ...prev,
            metadata: {
              ...(prev?.metadata || {}),
              ...(metadata?.title && !prev?.metadata?.title ? { title: metadata.title } : {}),
              ...(metadata?.author && !prev?.metadata?.author ? { author: metadata.author } : {}),
              ...(metadata?.subtitle && !prev?.metadata?.subtitle ? { subtitle: metadata.subtitle } : {}),
            },
            sections:
              mergeMode === 'replace'
                ? normalizedSections
                : [...(prev?.sections || []), ...normalizedSections],
          }));
        },
      });

      if (result.sections.length === 0) {
        throw new Error('No encontramos secciones legibles en el texto.');
      }

      if (result.usedFallbackForChunks > 0) {
        showSuccess(
          `Organizamos ${result.sections.length} secciones (${result.usedFallbackForChunks} fragmento(s) por detección local).`,
        );
      } else {
        showSuccess(`${result.sections.length} capítulos/apartados listos en tu barra lateral.`);
      }

      if (firstSectionId && setActiveStepTab) {
        setActiveStepTab(firstSectionId);
      }
      return `${result.sections.length} secciones detectadas`;
    } finally {
      setIsBusy(false);
    }
  };

  const progressPercent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : 0;

  return (
    <div className="space-y-5">
      <PanelSection
        icon={<Upload className="w-4 h-4" />}
        title="Importar manuscrito o apuntes"
        helpTitle="Importación sin perder contenido"
        helpText="Leemos Word (.docx), LibreOffice / Google Docs (.odt), .rtf, texto (.txt / .md), PDF digitales y fotos o PDFs escaneados. Si un texto es largo, lo dividimos por fragmentos para detectar cada capítulo, metodología y conclusión."
      >
        <ContextualGuideBox title="Elegí cómo traer tu material">
          Los archivos con texto (Word, LibreOffice, PDF digital) se leen directo sin gastar pasadas de imagen; las fotos o escaneos pasan por lectura inteligente de páginas.
        </ContextualGuideBox>

        <ActionGrid columns={2}>
          <ActionTileButton
            label="Word / LibreOffice"
            badge=".docx .odt"
            icon={<FileText className="w-4 h-4" />}
            accept=".docx,.odt,.rtf,.txt,.md,.html,.htm"
            multiple
            onFileSelect={(files) => void handleFilesSelected(files)}
            helpText="Subí documentos de Word (.docx), LibreOffice Writer o exportados desde Google Docs (.odt / .rtf / .txt)."
          />
          <ActionTileButton
            label="PDF o Escaneado"
            badge=".pdf"
            icon={<FileSpreadsheet className="w-4 h-4" />}
            accept=".pdf,application/pdf"
            onFileSelect={(files) => void handleFilesSelected(files)}
            helpText="Lee texto directo en PDFs digitales y aplica lectura inteligente únicamente si alguna página viene como foto."
          />
          <ActionTileButton
            label="Fotos de páginas"
            badge="OCR"
            icon={<Camera className="w-4 h-4" />}
            accept="image/png,image/jpeg,image/webp"
            multiple
            onFileSelect={(files) => void handleFilesSelected(files)}
            helpText="Sacale foto a hojas impresas o apuntes en orden; podés elegir varias fotos juntas."
          />
          <ActionTileButton
            label="Pegar texto"
            badge="Libre"
            icon={<Sparkles className="w-4 h-4" />}
            active={showPasteBox}
            onClick={() => setShowPasteBox((v) => !v)}
            helpText="Pegá un texto extenso sin formato para que Lidio reconozca prólogo, capítulos, citas y cierre."
          />
        </ActionGrid>

        {progress && (
          <div className="p-3 rounded-xl border border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--color-accent-text)]">
              <span className="truncate">{progress.message}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--ui-bg-card)] overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent-base)] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {presetRecommendation && (
          <div className="p-3.5 rounded-xl border-2 border-[var(--color-accent-base)] bg-[var(--ui-bg-surface)] space-y-2.5">
            <div className="space-y-1 bg-[var(--ui-bg-surface)]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] text-[10px] font-bold uppercase">
                <Sparkles className="w-3 h-3" />
                Sugerencia de tipo de obra
              </span>
              <p className="text-xs font-bold text-[var(--ui-text-primary)]">
                Este documento parece un «{presetRecommendation.detectedLabel}» (ahora estás en «{currentPreset.shortLabel}»).
              </p>
              <p className="text-[11px] text-[var(--ui-text-secondary)] leading-relaxed">
                {presetRecommendation.reason} ¿Querés cambiar la plantilla ahora sin perder tu texto?
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleApplyRecommendation(presetRecommendation)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-xs font-bold cursor-pointer hover:opacity-90"
              >
                Cambiar a {presetRecommendation.detectedLabel}
              </button>
              <button
                type="button"
                onClick={() => setPresetRecommendation(null)}
                className="py-1.5 px-3 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] text-xs font-bold cursor-pointer"
              >
                Seguir en {currentPreset.shortLabel}
              </button>
            </div>
          </div>
        )}
      </PanelSection>

      {(showPasteBox || manuscriptText.length > 0) && (
        <PanelSection
          icon={<Sparkles className="w-4 h-4" />}
          title="Estructurar capítulos"
          helpText="Revisá o pegá el texto completo y tocá el botón con el símbolo de IA. Cada capítulo aparecerá numerado en tu barra lateral."
          headerRight={
            <AIButton
              iconOnly={false}
              label={isBusy ? 'Procesando…' : 'Armar capítulos'}
              disabled={isBusy || !manuscriptText.trim()}
              onGenerate={handleStructureManuscript}
              onSuccess={() => {}}
              helpText="Detecta capítulos, introducciones, metodologías y anexos incluso si el borrador no tenía títulos en negrita."
            />
          }
        >
          {extractSummary && (
            <p className="text-[11px] text-[var(--ui-text-secondary)]">
              Cargado: {manuscriptText.length.toLocaleString('es-AR')} caracteres ·{' '}
              {extractSummary.digitalPages > 0 ? `${extractSummary.digitalPages} pág. digitales · ` : ''}
              {extractSummary.ocrPages > 0 ? `${extractSummary.ocrPages} lectura visual` : 'lectura directa'}
            </p>
          )}

          <Field
            as="textarea"
            rows={7}
            value={manuscriptText}
            onChange={(e: any) => setManuscriptText(e.target.value)}
            placeholder="Pegá aquí tu manuscrito completo (hasta libros o tesis largas sin recortar texto)..."
          />

          <div className="flex items-center justify-between gap-2">
            {isBusy && (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--color-status-danger-text)] text-[var(--color-status-danger-text)] cursor-pointer"
              >
                Detener
              </button>
            )}
            {onExportPDF && draft?.sections?.length > 0 && (
              <button
                type="button"
                onClick={onExportPDF}
                className="ml-auto px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-card)] cursor-pointer"
              >
                Exportar PDF
              </button>
            )}
          </div>
        </PanelSection>
      )}
    </div>
  );
};

export default EditorialImportAiPanel;
