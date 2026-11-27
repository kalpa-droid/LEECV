import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Camera,
  Copy,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  FolderSync,
  HardDriveDownload,
  History,
  Trash2,
  Upload,
} from 'lucide-react';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { ActionGrid } from '../../../shared/core/ui/ActionGrid';
import { ActionTileButton } from '../../../shared/core/ui/ActionTileButton';
import { Field } from '../../../shared/core/ui/Field';
import { AIButton } from '../../../shared/core/ui/AIButton';
import { useConfirm } from '../../../shared/core/ui/ConfirmDialog';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';
import {
  deleteEditorialById,
  getSavedEditorialsList,
} from '../../../shared/core/storage/documentStorageService';
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
import { EditorialImportReviewModal } from './EditorialImportReviewModal';
import type { DocumentAST, StructureAuditIssue } from '../../../shared/core/document-ast/documentAst';
import type { DocxExtractedRichBlock } from '../domain/docxClientExtractor';
import type { EditorialPresetId, EditorialSection } from '../domain/editorialTypes';
import { button, radius } from '../../../shared/core/uiDesignSystem';

export interface EditorialInicioArchivoPanelProps {
  docId: string;
  draft: any;
  updateDraft: (updater: (prev: any) => any) => void;
  notify: { success: (msg: string) => void; error: (msg: string) => void };
  setActiveStepTab: (tab: string) => void;
  boundFileName?: string | null;
  onNewDraft: () => void;
  onOpenSaved: (saved: any) => void;
  onDuplicateSaved: (saved: any) => void;
  onSaveToDisk: () => void;
  onOpenDiskFile: (file: File) => void;
  onOpenUniversalBackup?: () => void;
}

function coerceEditorialMetaString(val: unknown): string {
  if (typeof val === 'string') return val.trim();
  if (Array.isArray(val)) {
    return val
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .join(', ');
  }
  return '';
}

export const EditorialInicioArchivoPanel: React.FC<EditorialInicioArchivoPanelProps> = ({
  docId,
  draft,
  updateDraft,
  notify,
  setActiveStepTab,
  boundFileName,
  onNewDraft,
  onOpenSaved,
  onDuplicateSaved,
  onSaveToDisk,
  onOpenDiskFile,
  onOpenUniversalBackup,
}) => {
  const showSuccess = notify?.success ?? (() => {});
  const showError = notify?.error ?? (() => {});
  const { confirm } = useConfirm();

  const [savedDocs, setSavedDocs] = useState<any[]>([]);
  const [showAllSaved, setShowAllSaved] = useState(false);

  const [manuscriptText, setManuscriptText] = useState('');
  const [richBlocks, setRichBlocks] = useState<DocxExtractedRichBlock[] | undefined>(undefined);
  const [sourceAst, setSourceAst] = useState<DocumentAST | undefined>(undefined);
  const [assetUrlMap, setAssetUrlMap] = useState<Record<string, string> | undefined>(undefined);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [losslessSummaryNote, setLosslessSummaryNote] = useState<string | null>(null);
  const [pendingReview, setPendingReview] = useState<{
    sections: EditorialSection[];
    metadata: { title: string; subtitle: string; author: string };
    legalFields?: Record<string, string>;
    auditIssues?: StructureAuditIssue[];
    losslessSummary?: {
      totalBlocks: number;
      recoveredBlocks: number;
      preservedTables: number;
      preservedImages: number;
    };
  } | null>(null);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteModeOnly, setPasteModeOnly] = useState(false);
  const [progress, setProgress] = useState<ImportProgressUpdate | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [presetRecommendation, setPresetRecommendation] =
    useState<EditorialPresetRecommendation | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const leedocInputRef = useRef<HTMLInputElement>(null);

  const loadSavedList = () => {
    void getSavedEditorialsList()
      .then((list) => setSavedDocs(Array.isArray(list) ? list : []))
      .catch(() => setSavedDocs([]));
  };

  useEffect(() => {
    loadSavedList();
  }, [docId, draft?.metadata?.title]);

  const currentPreset =
    getEditorialPreset(draft?.design?.presetId || '') || DEFAULT_EDITORIAL_PRESET;

  const runInstantPresetCheck = async (text: string, fileName?: string) => {
    try {
      const activePresetId = (draft?.design?.presetId as EditorialPresetId) || DEFAULT_EDITORIAL_PRESET.id;
      const rec = await detectEditorialPresetForText({
        fullText: text,
        currentPresetId: activePresetId,
        fileName,
      });
      if (rec && rec.recommendedPresetId !== activePresetId) {
        const safeLabel = coerceEditorialMetaString(rec.detectedLabel) || 'Obra detectada';
        const safeReason = coerceEditorialMetaString(rec.reason);
        setPresetRecommendation({ ...rec, detectedLabel: safeLabel, reason: safeReason });
        emitLidioMessage({
          kind: 'state',
          groupKey: 'editorial-preset-recommend',
          title: `Detectamos: ${safeLabel}`,
          body: `Tu editor está en "${currentPreset.shortLabel}". Podés cambiar a "${safeLabel}" desde este aviso o en el botón superior.`,
        });
      } else {
        setPresetRecommendation(null);
      }
    } catch {
      // Recomendación opcional silenciosa
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

  const buildPendingReviewFromResult = (
    result: Awaited<ReturnType<typeof structureManuscriptInChunks>>,
  ) => {
    if (result.sections.length === 0) {
      throw new Error('No encontramos secciones legibles en el texto.');
    }

    const normalizedSections: EditorialSection[] = result.sections.map((s) => {
      const { sectionKey, category } = resolveCanonicalEditorialKey(s);
      return { ...s, sectionKey, category };
    });

    const currentTitle = coerceEditorialMetaString(draft?.metadata?.title);
    const isDefaultTitle = !currentTitle || currentTitle === 'Mi obra' || currentTitle === 'Sin título';
    const aiTitle = coerceEditorialMetaString(result.metadata?.title);
    const aiSubtitle = coerceEditorialMetaString(result.metadata?.subtitle);
    const aiAuthor = coerceEditorialMetaString(result.metadata?.author);

    if (result.losslessSummary) {
      setLosslessSummaryNote(
        `Integridad 1:1 verificada (${result.losslessSummary.totalBlocks} bloques · ${result.losslessSummary.preservedTables} tablas · ${result.losslessSummary.preservedImages} figuras).`,
      );
    }

    setPendingReview({
      sections: normalizedSections,
      metadata: {
        title: isDefaultTitle && aiTitle ? aiTitle : aiTitle || currentTitle,
        subtitle: aiSubtitle || coerceEditorialMetaString(draft?.metadata?.subtitle),
        author: aiAuthor || coerceEditorialMetaString(draft?.metadata?.author),
      },
      legalFields: result.legalFields,
      auditIssues: result.auditIssues,
      losslessSummary: result.losslessSummary,
    });
    return normalizedSections;
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
        setRichBlocks(extracted.richBlocks);
        setSourceAst(extracted.ast);
        setAssetUrlMap(extracted.assetUrlMap);
        setImportWarnings(extracted.warnings || []);
        setPasteModeOnly(false);
        setShowPasteBox(false);

        const [presetRec, structured] = await Promise.all([
          detectEditorialPresetForText({
            fullText: extracted.text,
            currentPresetId:
              (draft?.design?.presetId as EditorialPresetId) || DEFAULT_EDITORIAL_PRESET.id,
            fileName: files[0]?.name,
          }).catch(() => null),
          structureManuscriptInChunks({
            fullText: extracted.text,
            sourceFormat: extracted.sourceFormat,
            richBlocks: extracted.richBlocks,
            importedTocEntries: extracted.importedTocEntries,
            ast: extracted.ast,
            assetUrlMap: extracted.assetUrlMap,
            presetId: draft?.design?.presetId as EditorialPresetId | undefined,
            signal: controller.signal,
            onProgress: (upd) => setProgress(upd),
          }),
        ]);

        if (presetRec && presetRec.recommendedPresetId !== (draft?.design?.presetId || DEFAULT_EDITORIAL_PRESET.id)) {
          setPresetRecommendation({
            ...presetRec,
            detectedLabel: coerceEditorialMetaString(presetRec.detectedLabel) || 'Obra detectada',
            reason: coerceEditorialMetaString(presetRec.reason),
          });
        } else {
          setPresetRecommendation(null);
        }

        const built = buildPendingReviewFromResult(structured);
        showSuccess(`${built.length} secciones detectadas listas para revisar.`);
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
        prev ? { ...prev, stage: 'done', message: 'Análisis completo.' } : null,
      );
    }
    setIsBusy(false);
  };

  const handleStructureManuscript = async (): Promise<string> => {
    const raw = manuscriptText.trim();
    if (!raw) {
      throw new Error('Pegá tu texto antes de estructurar.');
    }

    if (!presetRecommendation) {
      void runInstantPresetCheck(raw);
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsBusy(true);

    try {
      const result = await structureManuscriptInChunks({
        fullText: raw,
        richBlocks: pasteModeOnly ? undefined : richBlocks,
        ast: pasteModeOnly ? undefined : sourceAst,
        assetUrlMap: pasteModeOnly ? undefined : assetUrlMap,
        presetId: draft?.design?.presetId as EditorialPresetId | undefined,
        signal: controller.signal,
        onProgress: (upd) => setProgress(upd),
      });

      const built = buildPendingReviewFromResult(result);
      return `${built.length} secciones listas para revisar`;
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteSaved = async (saved: any) => {
    const ok = await confirm({
      title: `¿Eliminar el borrador "${saved?.title || 'Sin título'}"?`,
      message: 'Se borrará del almacenamiento local de este navegador.',
      confirmText: 'Sí, eliminar',
      cancelText: 'Conservar',
    });
    if (!ok || !saved?.id) return;
    await deleteEditorialById(saved.id);
    loadSavedList();
    showSuccess('Borrador eliminado.');
  };

  const visibleSaved = showAllSaved ? savedDocs : savedDocs.slice(0, 3);
  const progressPercent =
    progress && progress.total > 0 ? Math.min(100, Math.round((progress.current / progress.total) * 100)) : 0;

  return (
    <div className="space-y-5">
      <PanelSection
        icon={<BookOpen className="w-4 h-4" />}
        title="Obra activa y borradores"
        helpText="Cambiá el nombre de tu documento actual, iniciá uno nuevo o abrí cualquiera de tus borradores guardados en este dispositivo. El formato de publicación y modo de impresión se ajustan en los botones superiores."
        headerRight={
          <button
            type="button"
            onClick={onNewDraft}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold border border-[var(--color-accent-base)]/50 bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] cursor-pointer hover:opacity-90"
            style={{ borderRadius: radius.control }}
          >
            <FilePlus2 className="w-3.5 h-3.5" /> Nueva obra
          </button>
        }
      >
        <Field
          label="Nombre de esta obra"
          value={draft?.metadata?.title || ''}
          onChange={(e: any) =>
            updateDraft((prev) => ({
              ...prev,
              metadata: { ...(prev?.metadata || {}), title: e.target.value },
            }))
          }
          placeholder="Ej: Informe técnico anual o Mi libro"
        />

        {savedDocs.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--ui-text-secondary)]">
                <History className="w-3.5 h-3.5" /> Tus borradores ({savedDocs.length})
              </span>
              {savedDocs.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllSaved((v) => !v)}
                  className="text-[11px] font-bold text-[var(--color-accent-text)] cursor-pointer"
                >
                  {showAllSaved ? 'Ver menos' : `Ver todos (${savedDocs.length})`}
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {visibleSaved.map((doc) => (
                <div
                  key={doc.id}
                  className="px-2.5 py-2 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] flex items-center justify-between gap-2"
                  style={{ borderRadius: radius.control }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[var(--ui-text-primary)] truncate">
                      {doc.title || 'Obra sin título'}
                    </p>
                    <p className="text-[10px] text-[var(--ui-text-secondary)]">
                      {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : 'Reciente'}
                      {doc.id === docId ? ' · Activa' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {doc.id !== docId && (
                      <button
                        type="button"
                        onClick={() => onOpenSaved(doc)}
                        className="px-2 py-1 text-[11px] font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] cursor-pointer"
                        style={{ borderRadius: radius.control }}
                      >
                        Abrir
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDuplicateSaved(doc)}
                      title="Duplicar obra completa"
                      className="p-1.5 border border-[var(--ui-border)] text-[var(--ui-text-primary)] cursor-pointer hover:bg-[var(--ui-bg-panel)]"
                      style={{ borderRadius: radius.control }}
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {doc.id !== docId && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteSaved(doc)}
                        title="Eliminar borrador"
                        className="p-1.5 text-[var(--color-status-danger-text)] hover:bg-[var(--color-status-danger-muted)] cursor-pointer"
                        style={{ borderRadius: radius.control }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </PanelSection>

      <PanelSection
        icon={<Upload className="w-4 h-4" />}
        title="Importar manuscrito o apuntes"
        helpTitle="Importación sin pérdida de contenido"
        helpText="Leemos Word (.docx), LibreOffice (.odt), PDF, fotos o texto pegado conservando intactos párrafos, tablas, gráficos e imágenes sin que la IA reescriba tus palabras."
      >
        <ActionGrid columns={2}>
          <ActionTileButton
            label="Word / Textos"
            badge=".docx .odt"
            role="io"
            icon={<FileSpreadsheet className="w-4 h-4" />}
            disabled={isBusy}
            onClick={() => wordInputRef.current?.click()}
          />
          <ActionTileButton
            label="PDF o Escaneo"
            badge=".pdf"
            role="io"
            icon={<FileText className="w-4 h-4" />}
            disabled={isBusy}
            onClick={() => pdfInputRef.current?.click()}
          />
          <ActionTileButton
            label="Fotos de hojas"
            badge="OCR"
            role="io"
            icon={<Camera className="w-4 h-4" />}
            disabled={isBusy}
            onClick={() => photoInputRef.current?.click()}
          />
          <ActionTileButton
            label="Pegar texto"
            badge="Libre"
            role="io"
            active={showPasteBox && pasteModeOnly}
            icon={<Upload className="w-4 h-4" />}
            disabled={isBusy}
            onClick={() => {
              setPasteModeOnly(true);
              setShowPasteBox((v) => !v);
            }}
          />
        </ActionGrid>

        <input
          ref={wordInputRef}
          type="file"
          accept=".docx,.odt,.rtf,.txt,.md,.html,.htm"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFilesSelected(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={pdfInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            void handleFilesSelected(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={photoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFilesSelected(e.target.files);
            e.target.value = '';
          }}
        />

        {progress && (
          <div
            className="p-2.5 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] space-y-1.5"
            style={{ borderRadius: radius.control }}
          >
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="truncate">{progress.message}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--ui-bg-panel)] overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent-base)] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {presetRecommendation && (
          <div
            className="p-2.5 border border-[var(--color-accent-base)]/50 bg-[var(--color-accent-muted)] space-y-2"
            style={{ borderRadius: radius.control }}
          >
            <p className="text-xs font-extrabold text-[var(--color-accent-text)]">
              Detectamos: {presetRecommendation.detectedLabel}
            </p>
            {presetRecommendation.reason && (
              <p className="text-[11px] text-[var(--ui-text-primary)]">{presetRecommendation.reason}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleApplyRecommendation(presetRecommendation)}
                className="px-2.5 py-1 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-[11px] font-bold cursor-pointer"
                style={{ borderRadius: radius.control }}
              >
                Cambiar a {presetRecommendation.detectedLabel}
              </button>
              <button
                type="button"
                onClick={() => setPresetRecommendation(null)}
                className="px-2.5 py-1 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[11px] font-semibold cursor-pointer"
                style={{ borderRadius: radius.control }}
              >
                Seguir en {currentPreset.shortLabel}
              </button>
            </div>
          </div>
        )}

        {pasteModeOnly && showPasteBox && (
          <div className="space-y-2 pt-1">
            <Field
              as="textarea"
              rows={6}
              label="Texto del manuscrito"
              value={manuscriptText}
              onChange={(e: any) => setManuscriptText(e.target.value)}
              placeholder="Pegá acá tus apuntes o borrador completo y tocá Armar capítulos..."
            />
            <div className="flex flex-wrap items-center gap-2">
              <AIButton
                onGenerate={handleStructureManuscript}
                onSuccess={() => {}}
                iconOnly={false}
                label="Armar capítulos"
              />
              {isBusy && (
                <button
                  type="button"
                  onClick={() => {
                    abortRef.current?.abort();
                    setIsBusy(false);
                    setProgress(null);
                  }}
                  className={`${button.base} ${button.secondary} text-xs`}
                >
                  Detener
                </button>
              )}
            </div>
          </div>
        )}
      </PanelSection>

      <PanelSection
        icon={<FolderSync className="w-4 h-4" />}
        title="Carpeta Segura en PC y Drive"
        helpText="Guardá una copia portátil (.leedoc) en tu computadora, pendrive o en tu Google Drive personal para abrirla en otro equipo sin depender solo del navegador."
      >
        {boundFileName && (
          <div
            className="px-3 py-2 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] flex items-center gap-2 text-xs"
            style={{ borderRadius: radius.control }}
          >
            <FolderSync className="w-4 h-4 text-[var(--color-status-success-text)] shrink-0" />
            <span className="truncate font-semibold">{boundFileName}</span>
          </div>
        )}

        <ActionGrid columns={2}>
          <ActionTileButton
            label="Guardar copia PC"
            badge=".leedoc"
            role="io"
            icon={<HardDriveDownload className="w-4 h-4" />}
            onClick={onSaveToDisk}
          />
          <ActionTileButton
            label={onOpenUniversalBackup ? 'PC o Drive' : 'Abrir .leedoc'}
            badge="Respaldo"
            role="io"
            icon={<FolderOpen className="w-4 h-4" />}
            onClick={() =>
              onOpenUniversalBackup ? onOpenUniversalBackup() : leedocInputRef.current?.click()
            }
          />
        </ActionGrid>

        <input
          ref={leedocInputRef}
          type="file"
          accept=".leedoc,.leecv-editor,.json,.zip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) onOpenDiskFile(f);
          }}
        />
      </PanelSection>

      {pendingReview && (
        <EditorialImportReviewModal
          key={pendingReview.sections.map((s) => s.id).join(',')}
          isOpen={true}
          sourceChars={manuscriptText.replace(/\s+/g, '').length}
          initialMetadata={pendingReview.metadata}
          initialLegalFields={pendingReview.legalFields}
          initialSections={pendingReview.sections}
          existingSections={Array.isArray(draft?.sections) ? draft.sections : []}
          presetRecommendation={presetRecommendation}
          auditIssues={pendingReview.auditIssues}
          losslessSummary={pendingReview.losslessSummary}
          warnings={[
            ...(losslessSummaryNote ? [losslessSummaryNote] : []),
            ...importWarnings,
          ]}
          onCancel={() => setPendingReview(null)}
          onConfirm={({ metadata, legalFields, sections, applyMetadata, applyDetectedPreset }) => {
            updateDraft((prev) => {
              let next = {
                ...prev,
                ...(applyMetadata
                  ? {
                      metadata: {
                        ...(prev?.metadata || {}),
                        title: metadata.title || prev?.metadata?.title || 'Mi obra',
                        subtitle: metadata.subtitle,
                        author: metadata.author || prev?.metadata?.author || '',
                      },
                      ...(legalFields && Object.keys(legalFields).length > 0
                        ? { legalFields: { ...(prev?.legalFields || {}), ...legalFields } }
                        : {}),
                    }
                  : {}),
                sections,
              };
              if (applyDetectedPreset && presetRecommendation) {
                next = applyEditorialGlobalConfig(next, {
                  presetId: presetRecommendation.recommendedPresetId,
                  presetMode: 'apply-design',
                  structuralNormId: presetRecommendation.recommendedStructuralNormId,
                  bibliographyStyle: presetRecommendation.recommendedBibliographyStyle,
                  applyMode: 'preserve-manual',
                });
              }
              return next;
            });
            const firstId = sections[0]?.id;
            setPendingReview(null);
            setPresetRecommendation(null);
            showSuccess(`Listo: ${sections.length} secciones aplicadas con tu contenido intacto.`);
            if (firstId) setActiveStepTab(firstId);
          }}
        />
      )}
    </div>
  );
};
