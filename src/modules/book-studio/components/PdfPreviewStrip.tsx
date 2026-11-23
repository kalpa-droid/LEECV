import React, { useEffect, useMemo, useState } from 'react';
import { ThumbnailCard } from './ThumbnailCard';
import { LightboxModal } from './LightboxModal';
import { CoverPreviewThumbnail } from './CoverPreviewThumbnail';
import { BookSectionDividerModal } from './BookSectionDividerModal';
import { BookImpositionOptions } from '../domain/impositionEngine';
import {
  BookSectionDivider,
  extractDividerIdFromToken,
  isDividerPageToken,
  makeDividerPageToken,
  resolveBookOrderedItems,
} from '../domain/bookDividerCanvas';
import { computeBookFinalPageCount } from '../domain/bookPageCount';
import { planBookletSignatures, getSignatureSheetPairs } from '../../../shared/kits/print-imposition/impositionPlanner';
import { bookAssetManager } from '../domain/bookAssetManager';
import { radius } from '../../../shared/core/uiDesignSystem';
import { RefreshCw, FileText, Trash2, AlertTriangle, BookMarked, Edit3, ArrowLeft, ArrowRight } from 'lucide-react';
import { loadPdfDocumentWithCmaps } from '../../../shared/core/pdf-engine/pdfjsWorkerSetup';
import { useText } from '../../../shared/i18n/useText';

export interface PdfPreviewStripProps {
  selectedFile: File | null;
  pdfPageCount: number;
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  zoomScale?: number;
  pdfDoc?: any;
  activeStep?: string;
  /** Vuelve al paso "Origen" para elegir otro PDF (la instancia única la carga el contenedor). */
  onRequestAnotherPdf?: () => void;
}

export const PdfPreviewStrip: React.FC<PdfPreviewStripProps> = ({
  selectedFile,
  pdfPageCount,
  options,
  setOptions,
  zoomScale = 1.0,
  pdfDoc: pdfDocProp,
  activeStep = '',
  onRequestAnotherPdf,
}) => {
  const [internalPdfDoc, setInternalPdfDoc] = useState<any>(null);
  const [isLoadingPdfDoc, setIsLoadingPdfDoc] = useState<boolean>(false);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [activeLightboxPage, setActiveLightboxPage] = useState<number | null>(null);
  const [showDeletedPages, setShowDeletedPages] = useState<boolean>(false);
  const [dividerModalState, setDividerModalState] = useState<{
    isOpen: boolean;
    defaultBeforePage: number;
    editingDivider: BookSectionDivider | null;
  }>({
    isOpen: false,
    defaultBeforePage: 1,
    editingDivider: null,
  });
  const t = useText();

  // Vista del libro: orden lineal (grilla de miniaturas) vs pares de hoja
  // doblada (cómo salen las páginas impresas en cada hoja física).
  const [impositionView, setImpositionView] = useState<'lineal' | 'folded'>('lineal');

  // Mismo cálculo que el motor: ZIP por cuadernillo -> firmas multi-balanceadas;
  // si no, una sola firma con el total final (ya múltiplo de 4).
  const foldedPlan = useMemo(() => {
    if (impositionView !== 'folded') return null;
    const finalPageCount = computeBookFinalPageCount(options, pdfPageCount);
    if (finalPageCount <= 0) return [];
    const readingDirection = options.readingDirection ?? 'ltr';
    const useSignatures =
      options.zipByBooklet && (options.destination ?? 'A') === 'A' && options.mode !== 'fotocopia';
    const signatures = useSignatures
      ? planBookletSignatures(finalPageCount, 'multi-balanced', 4).signatures
      : [finalPageCount];
    let offset = 0;
    return signatures.map((sigLength, sigIdx) => {
      const pairs = getSignatureSheetPairs(sigLength, offset, readingDirection);
      offset += sigLength;
      return {
        index: sigIdx,
        sheets: pairs.map(([l, r], i) => ({ sheet: i + 1, front: i % 2 === 0, left: l + 1, right: r + 1 })),
      };
    });
  }, [impositionView, options, pdfPageCount]);

  // Miniaturas de tapa/contratapa: el assetId (referencia local) tiene prioridad
  // sobre imageUri (heredado). Igual que en CoverPreviewThumbnail.
  const [coverThumbUri, setCoverThumbUri] = useState<string | null>(null);
  const [backCoverThumbUri, setBackCoverThumbUri] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const id = options.customCover?.assetId;
    if (!id) { setCoverThumbUri(null); return; }
    bookAssetManager.getThumbUrl(id).then((url) => { if (alive) setCoverThumbUri(url); });
    return () => { alive = false; };
  }, [options.customCover?.assetId]);
  useEffect(() => {
    let alive = true;
    const id = options.customBackCover?.assetId;
    if (!id) { setBackCoverThumbUri(null); return; }
    bookAssetManager.getThumbUrl(id).then((url) => { if (alive) setBackCoverThumbUri(url); });
    return () => { alive = false; };
  }, [options.customBackCover?.assetId]);

  const coverImgSrc = coverThumbUri || options.customCover?.imageUri || null;
  const backCoverImgSrc = backCoverThumbUri || options.customBackCover?.imageUri || null;

  const pdfDoc = pdfDocProp || internalPdfDoc;

  // Load PDF Document instance with pdfjs-dist if not passed via prop
  useEffect(() => {
    if (pdfDocProp || !selectedFile) {
      if (!pdfDocProp) setInternalPdfDoc(null);
      return;
    }

    let isCancelled = false;

    const loadPdfDocInstance = async () => {
      try {
        setIsLoadingPdfDoc(true);
        setPdfLoadError(null);
        const arrayBuffer = await selectedFile.arrayBuffer();
        // Mismo camino de carga del motor (cMaps locales → CDN → sin cmaps)
        // y con copia interna: el arrayBuffer del archivo queda intacto.
        const doc = await loadPdfDocumentWithCmaps(arrayBuffer);
        if (!isCancelled) {
          setInternalPdfDoc(doc);
          setIsLoadingPdfDoc(false);
        }
      } catch (err) {
        // Error visible en UI (no solo consola): el PDF existe pero no se pudo
        // abrir/parsear. Se ofrece reintentar con otro archivo.
        console.error('Error loading PDF document instance for thumbnails:', err);
        if (!isCancelled) {
          setPdfLoadError(t.bookStudio.pdfStrip.loadError);
          setIsLoadingPdfDoc(false);
        }
      }
    };

    loadPdfDocInstance();

    return () => {
      isCancelled = true;
    };
  }, [selectedFile, pdfDocProp]);

  if (!selectedFile) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 px-4 text-center space-y-3 bg-[var(--ui-bg-card)] rounded-[${radius.modal}] border-2 border-dashed border-[var(--ui-border)] w-full`}>
        {/* check-contrast-ignore-next-line: ícono decorativo grande, no es texto de lectura */}
        <FileText className="w-12 h-12 text-[var(--ui-text-muted)]" />
        <h3 className="text-base font-bold text-[var(--ui-text-primary)]">{t.bookStudio.pdfStrip.emptyTitle}</h3>
        <p className="text-xs text-[var(--ui-text-secondary)] max-w-sm">
          {t.bookStudio.pdfStrip.emptyDescription}
        </p>
      </div>
    );
  }

  if (pdfLoadError) {
    return (
      <div className={`p-4 bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/30 rounded-[${radius.card}] space-y-3 w-full`}>
        <div className="flex items-start gap-2">
          {/* check-contrast-ignore-next-line: ícono decorativo grande, no es texto de lectura */}
          <AlertTriangle className="w-5 h-5 text-[var(--color-status-danger-text)] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[var(--color-status-danger-text)]">{t.bookStudio.pdfStrip.loadErrorTitle}</h3>
            <p className="text-xs text-[var(--color-status-danger-text)]">{pdfLoadError}</p>
          </div>
        </div>
        {onRequestAnotherPdf && (
          <button
            type="button"
            onClick={onRequestAnotherPdf}
            className={`px-3 py-1.5 text-xs font-bold rounded-[${radius.control}] bg-[var(--color-status-danger-base)] text-[var(--color-status-on-base)] cursor-pointer flex items-center gap-1.5`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t.bookStudio.pdfStrip.tryAnotherPdf}
          </button>
        )}
      </div>
    );
  }

  if (isLoadingPdfDoc) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 w-full">
        <div className="w-10 h-10 border-3 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-[var(--ui-text-secondary)]">
          {t.bookStudio.pdfStrip.generatingGrid.replace('{name}', selectedFile.name)}
        </p>
      </div>
    );
  }

  // Secuencia lineal efectiva con páginas, blancos y separadores de capítulo
  const sectionDividers = options.sectionDividers || [];
  const dividerMap = new Map(sectionDividers.map((d) => [d.id, d]));
  const displayPages = resolveBookOrderedItems({
    pdfPageCount,
    pageOrder: options.pageOrder,
    sectionDividers,
  });

  const deletedPagesSet = new Set((options.deletedPages || []).map((p) => String(p)));
  const lowConfidenceSet = new Set((options.lowConfidenceRotationPages || []).map(Number));
  const pageRotations = options.pageRotations || {};

  const handleRemoveBlankPage = (itemKey: string | number) => {
    setOptions((prev) => {
      const currentOrder = resolveBookOrderedItems({
        pdfPageCount,
        pageOrder: prev.pageOrder,
        sectionDividers: prev.sectionDividers,
      });
      return {
        ...prev,
        pageOrder: currentOrder.filter((p) => String(p) !== String(itemKey)),
      };
    });
  };

  const handleSaveDivider = (divider: BookSectionDivider) => {
    setOptions((prev) => {
      const existingList = prev.sectionDividers || [];
      const isEditing = existingList.some((d) => d.id === divider.id);
      const nextDividers = isEditing
        ? existingList.map((d) => (d.id === divider.id ? divider : d))
        : [...existingList, divider];

      const token = makeDividerPageToken(divider.id);
      const baseOrder = resolveBookOrderedItems({
        pdfPageCount,
        pageOrder: prev.pageOrder,
        sectionDividers: existingList,
      }).filter((it) => String(it) !== token);

      const targetPage = Math.max(1, Number(divider.insertBeforePage) || 1);
      const insertIdx = baseOrder.findIndex((it) => {
        if (typeof it === 'number') return it >= targetPage;
        const str = String(it);
        if (str.startsWith('blank') || isDividerPageToken(str)) return false;
        const num = Number(str.split('_')[0]);
        return Number.isFinite(num) && num >= targetPage;
      });

      if (insertIdx === -1) {
        baseOrder.push(token);
      } else {
        baseOrder.splice(insertIdx, 0, token);
      }

      return {
        ...prev,
        sectionDividers: nextDividers,
        pageOrder: baseOrder,
      };
    });
  };

  const handleRemoveDivider = (dividerId: string) => {
    setOptions((prev) => {
      const token = makeDividerPageToken(dividerId);
      const nextDividers = (prev.sectionDividers || []).filter((d) => d.id !== dividerId);
      const nextOrder = (prev.pageOrder || []).filter((it) => String(it) !== token);
      return {
        ...prev,
        sectionDividers: nextDividers,
        pageOrder: nextOrder,
      };
    });
  };

  const handleRotatePage = (pageNum: number, deltaDeg = 90) => {
    setOptions((prev) => {
      const currentRot = prev.pageRotations?.[pageNum] || 0;
      const nextRot = ((currentRot + deltaDeg) % 360 + 360) % 360;
      const nextLowConf = (prev.lowConfidenceRotationPages || []).filter((p) => p !== pageNum);
      return {
        ...prev,
        lowConfidenceRotationPages: nextLowConf,
        pageRotations: {
          ...(prev.pageRotations || {}),
          [pageNum]: nextRot,
        },
      };
    });
  };

  const handleToggleDelete = (pageNum: number) => {
    setOptions((prev) => {
      const currentDeleted = prev.deletedPages || [];
      const exists = currentDeleted.includes(pageNum);
      const nextDeleted = exists
        ? currentDeleted.filter((p) => Number(p) !== pageNum)
        : [...currentDeleted, pageNum];
      return {
        ...prev,
        deletedPages: nextDeleted,
      };
    });
  };

  const handleMoveItem = (itemKey: number | string, direction: 'left' | 'right') => {
    setOptions((prev) => {
      const currentOrder = resolveBookOrderedItems({
        pdfPageCount,
        pageOrder: prev.pageOrder,
        sectionDividers: prev.sectionDividers,
      });

      const idx = currentOrder.findIndex((it) => String(it) === String(itemKey));
      if (idx === -1) return prev;

      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= currentOrder.length) return prev;

      const temp = currentOrder[idx];
      currentOrder[idx] = currentOrder[targetIdx];
      currentOrder[targetIdx] = temp;

      return {
        ...prev,
        pageOrder: currentOrder,
      };
    });
  };

  const pageSplitOffsets = options.pageSplitOffsets || {};
  const isFotocopiaMode = options.mode === 'fotocopia';

  const handleSplitOffsetChange = (pageNum: number, newOffset: number) => {
    setOptions((prev) => ({
      ...prev,
      pageSplitOffsets: {
        ...(prev.pageSplitOffsets || {}),
        [pageNum]: newOffset,
      },
    }));
  };

  const handleSaveReference = (
    refPdfPage: number,
    refBookPage: number,
    refPageSide: 'derecha' | 'izquierda',
    refPdfHalf?: 'izquierda' | 'derecha',
  ) => {
    setOptions((prev) => ({
      ...prev,
      refPdfPage,
      refBookPage,
      refPageSide,
      refPdfHalf,
    }));
  };

  return (
    <div className="w-full space-y-4">
      {/* Barra de Herramientas de Miniaturas */}
      <div className={`p-3 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[${radius.card}] flex flex-wrap items-center justify-between gap-3 text-xs`}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-[var(--ui-text-primary)]">
            {t.bookStudio.pdfStrip.organizerHeading}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[var(--color-accent-light)]/20 text-[var(--color-accent-text)] font-bold text-[10px]">
            {t.bookStudio.pdfStrip.activeDeletedBadge
              .replace('{active}', String(displayPages.length - deletedPagesSet.size))
              .replace('{deleted}', String(deletedPagesSet.size))}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setDividerModalState({
                isOpen: true,
                defaultBeforePage: 1,
                editingDivider: null,
              })
            }
            className={`px-2.5 py-1 rounded-[${radius.control}] bg-[var(--color-accent-muted)] hover:opacity-90 border border-[var(--color-accent-base)]/40 text-xs font-bold text-[var(--color-accent-text)] transition cursor-pointer flex items-center gap-1.5`}
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>＋ Separador de capítulo</span>
          </button>

          {deletedPagesSet.size > 0 && (
            <button
              type="button"
              onClick={() => setShowDeletedPages(!showDeletedPages)}
              className={`px-2.5 py-1 rounded-[${radius.control}] bg-[var(--ui-bg-surface)] hover:bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-xs font-semibold text-[var(--ui-text-primary)] transition cursor-pointer flex items-center gap-1.5`}
            >
              {showDeletedPages ? t.bookStudio.pdfStrip.hideDeleted : t.bookStudio.pdfStrip.showDeleted}
            </button>
          )}

          {options.refBookPage ? (
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-status-success-bright)] font-semibold">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.bookStudio.pdfStrip.refBadge
                .replace('{pdf}', String(options.refPdfPage))
                .replace('{book}', String(options.refBookPage))
                .replace('{side}', options.refPageSide ?? 'derecha')}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Vista del libro: orden lineal vs pares de hoja doblada */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--ui-text-secondary)]">
          {t.bookStudio.pdfStrip.impositionViewLabel}
        </span>
        <div className="inline-flex rounded-[10px] border border-[var(--ui-border)] overflow-hidden">
          {(['lineal', 'folded'] as const).map((view) => {
            const selected = impositionView === view;
            return (
              <button
                key={view}
                type="button"
                onClick={() => setImpositionView(view)}
                aria-pressed={selected}
                className={`px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  selected
                    ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
                    : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-surface)]'
                }`}
              >
                {view === 'lineal'
                  ? t.bookStudio.pdfStrip.impositionLinear
                  : t.bookStudio.pdfStrip.impositionFolded}
              </button>
            );
          })}
        </div>
      </div>
      {impositionView === 'folded' && (
        <p className="text-[11px] text-[var(--ui-text-secondary)]">{t.bookStudio.pdfStrip.impositionFoldedHelp}</p>
      )}

      {impositionView === 'folded' ? (
        <div className="space-y-3">
          {(foldedPlan ?? []).map((sig) => (
            <div key={sig.index} className="space-y-2">
              {(foldedPlan?.length ?? 0) > 1 && (
                <span className="text-[11px] font-bold uppercase text-[var(--ui-text-secondary)]">
                  {t.bookStudio.pdfStrip.foldedBooklet.replace('{n}', String(sig.index + 1))}
                </span>
              )}
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(170 * zoomScale, 140)}px, 1fr))` }}
              >
                {sig.sheets.map((sheet) => (
                  <div
                    key={sheet.sheet}
                    className={`p-2 rounded-[${radius.card}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] space-y-1.5`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-[var(--ui-text-secondary)]">
                        {t.bookStudio.pdfStrip.foldedSheet.replace('{n}', String(sheet.sheet))}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                          sheet.front
                            ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]'
                            : 'bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)]'
                        }`}
                      >
                        {sheet.front ? t.bookStudio.pdfStrip.foldedFront : t.bookStudio.pdfStrip.foldedBack}
                      </span>
                    </div>
                    <div className="flex items-stretch">
                      <div className="flex-1 text-center py-2">
                        <div className="text-[9px] uppercase text-[var(--ui-text-secondary)]">{t.bookStudio.pdfStrip.foldedLeft}</div>
                        <div className="text-xl font-black text-[var(--ui-text-primary)]">{sheet.left}</div>
                      </div>
                      <div className="w-0 border-l border-dashed border-[var(--ui-border)]" />
                      <div className="flex-1 text-center py-2">
                        <div className="text-[9px] uppercase text-[var(--ui-text-secondary)]">{t.bookStudio.pdfStrip.foldedRight}</div>
                        <div className="text-xl font-black text-[var(--ui-text-primary)]">{sheet.right}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[10px] text-[var(--ui-text-secondary)]">{t.bookStudio.pdfStrip.foldedNote}</p>
        </div>
      ) : (
      <>
      {/* Grilla de Miniaturas Responsive con Escala Zoom */}
      <div
        className="grid gap-3 transition-transform duration-200 origin-top-left"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(140 * zoomScale, 110)}px, 1fr))`,
        }}
      >
        {/* Tarjeta de Tapa / Portada */}
        {(options.hasCover || options.customCover) && (
          <div className={`p-3 bg-[var(--ui-bg-surface)] border-2 border-[var(--color-accent-base)] rounded-[${radius.card}] flex flex-col items-center justify-between text-center min-h-[200px] space-y-2 relative shadow-[var(--shadow-raised)] select-none`}>
            <span className="px-2 py-0.5 rounded bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] font-bold text-[10px] uppercase tracking-wider">
              {t.bookStudio.pdfStrip.coverBadge}
            </span>
            {coverImgSrc ? (
              <img src={coverImgSrc} alt={t.bookStudio.pdfStrip.coverAlt} className={`w-full h-auto aspect-[1/1.41] rounded border border-[var(--ui-border)] ${options.customCover?.imageFit === 'stretch' ? '' : options.customCover?.imageFit === 'fit' ? 'object-contain bg-white' : 'object-cover'}`} />
            ) : options.customCover?.type === 'template' ? (
              <CoverPreviewThumbnail
                config={options.customCover}
                kind="cover"
                paperSize={options.paperSize}
                className="w-full h-auto aspect-[1/1.41] object-contain rounded border border-[var(--ui-border)]"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-2 rounded bg-[var(--ui-bg-card)] border border-[var(--ui-border)] w-full aspect-[1/1.41]">
                <span className="text-[11px] font-bold text-[var(--ui-text-primary)] line-clamp-2">
                  {options.customCover?.title || t.bookStudio.pdfStrip.coverPdfFallback}
                </span>
                {options.customCover?.author && (
                  <span className="text-[9px] text-[var(--ui-text-secondary)] mt-1">{options.customCover.author}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Hoja en blanco inyectada detrás de la portada (Retiro de tapa) */}
        {(options.hasCover || options.customCover) && options.blankBehindCover !== false && (
          <div className={`p-3 bg-[var(--ui-bg-surface)] border-2 border-dashed border-[var(--ui-border)] rounded-[${radius.card}] flex flex-col items-center justify-between text-center min-h-[200px] space-y-2 relative shadow-[var(--shadow-raised)] select-none opacity-80`}>
            <span className="px-2 py-0.5 rounded bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] font-bold text-[10px] tracking-wider border border-[var(--ui-border)]">
              {t.bookStudio.pdfStrip.blankSheetBadge}
            </span>
            <div className="flex-1 w-full aspect-[1/1.41] bg-white border border-dashed border-black/20 rounded opacity-50 flex items-center justify-center">
              <span className="text-[10px] text-black/70 rotate-[-45deg] font-bold">{t.bookStudio.pdfStrip.retiroCoverRotated}</span>
            </div>
            <span className="text-[9px] text-[var(--ui-text-secondary)] font-semibold">
              {t.bookStudio.pdfStrip.retiroCoverCaption}
            </span>
          </div>
        )}

        {/* Miniaturas de Páginas del Documento */}
        {displayPages.map((item, idx) => {
          const itemStr = String(item);
          const isBlank = itemStr.startsWith('blank');

          if (isBlank) {
            return (
              <div
                key={itemStr}
                className={`p-3 bg-[var(--ui-bg-surface)] border-2 border-dashed border-[var(--ui-border)] rounded-[${radius.card}] flex flex-col items-center justify-between text-center min-h-[200px] space-y-2 relative select-none`}
              >
                <span className="px-2 py-0.5 rounded bg-[var(--color-secondary-muted)] text-[var(--color-secondary-bright)] font-bold text-[10px]">
                  {t.bookStudio.pdfStrip.blankSheetBadge}
                </span>
                <div className="flex-1 flex flex-col items-center justify-center text-[10px] text-[var(--ui-text-secondary)]">
                  {t.bookStudio.pdfStrip.insertedBlankPage}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveBlankPage(itemStr)}
                  className="px-2 py-1 rounded bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] text-[10px] font-bold flex items-center gap-1 hover:opacity-80 transition cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{t.common.actions.delete}</span>
                </button>
              </div>
            );
          }

          if (isDividerPageToken(itemStr)) {
            const divId = extractDividerIdFromToken(itemStr);
            const divider = divId ? dividerMap.get(divId) : undefined;
            if (!divider) return null;
            return (
              <React.Fragment key={itemStr}>
                <div
                  className={`p-2.5 bg-[var(--ui-bg-surface)] border-2 border-[var(--color-accent-base)] rounded-[${radius.card}] flex flex-col items-center justify-between text-center min-h-[200px] space-y-1.5 relative shadow-[var(--shadow-raised)] select-none`}
                >
                  <div className="w-full flex items-center justify-between gap-1">
                    <span className="px-2 py-0.5 rounded bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] font-bold text-[9px] uppercase tracking-wider truncate">
                      {divider.kicker || 'Separador'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[var(--ui-bg-card)] text-[9px] font-bold text-[var(--color-accent-text)]">
                      {divider.blankBehind ? '2 págs.' : '1 pág.'}
                    </span>
                  </div>

                  <div
                    onClick={() =>
                      setDividerModalState({
                        isOpen: true,
                        defaultBeforePage: divider.insertBeforePage,
                        editingDivider: divider,
                      })
                    }
                    className="w-full cursor-pointer"
                  >
                    <CoverPreviewThumbnail
                      config={divider}
                      kind="divider"
                      paperSize={options.paperSize}
                      defaultCoverStyle={options.customCover?.coverStyle || options.coverStyle || 'monica-classic'}
                      className="w-full h-auto aspect-[1/1.41] object-contain rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)]"
                    />
                  </div>

                  <span className="text-[10px] font-bold text-[var(--ui-text-primary)] truncate w-full">
                    {divider.title}
                  </span>

                  <div className="flex items-center justify-around w-full pt-1 border-t border-[var(--ui-border)] gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveItem(itemStr, 'left')}
                      title="Mover separador a la izquierda"
                      className="p-1 rounded hover:bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDividerModalState({
                          isOpen: true,
                          defaultBeforePage: divider.insertBeforePage,
                          editingDivider: divider,
                        })
                      }
                      title="Editar separador"
                      className="p-1 rounded hover:bg-[var(--ui-bg-panel)] text-[var(--color-accent-text)] cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveDivider(divider.id)}
                      title="Eliminar separador"
                      className="p-1 rounded hover:bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === displayPages.length - 1}
                      onClick={() => handleMoveItem(itemStr, 'right')}
                      title="Mover separador a la derecha"
                      className="p-1 rounded hover:bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {divider.blankBehind && (
                  <div
                    className={`p-3 bg-[var(--ui-bg-surface)] border-2 border-dashed border-[var(--ui-border)] rounded-[${radius.card}] flex flex-col items-center justify-between text-center min-h-[200px] space-y-2 relative select-none opacity-80`}
                  >
                    <span className="px-2 py-0.5 rounded bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] font-bold text-[9px] tracking-wider border border-[var(--ui-border)]">
                      {t.bookStudio.pdfStrip.blankSheetBadge}
                    </span>
                    <div className="flex-1 w-full aspect-[1/1.41] bg-white border border-dashed border-black/20 rounded opacity-50 flex items-center justify-center">
                      <span className="text-[10px] text-black/70 rotate-[-45deg] font-bold">
                        Reverso Separador
                      </span>
                    </div>
                    <span className="text-[9px] text-[var(--ui-text-secondary)] font-semibold truncate w-full">
                      Detrás de {divider.title}
                    </span>
                  </div>
                )}
              </React.Fragment>
            );
          }

          const pageNum = Number(item);
          return (
            <ThumbnailCard
              key={pageNum}
              pageNum={pageNum}
              pdfDoc={pdfDoc}
              rotation={pageRotations[pageNum] || 0}
              isDeleted={deletedPagesSet.has(String(pageNum))}
              hasLowConfidenceRotation={lowConfidenceSet.has(pageNum)}
              canMoveLeft={idx > 0}
              canMoveRight={idx < displayPages.length - 1}
              splitOffset={pageSplitOffsets[pageNum] !== undefined ? pageSplitOffsets[pageNum] : 50}
              isFotocopiaMode={isFotocopiaMode}
              onRotate={(p) => handleRotatePage(p, 90)}
              onRotateLeft90={(p) => handleRotatePage(p, -90)}
              onToggleDelete={handleToggleDelete}
              onMoveLeft={(p) => handleMoveItem(p, 'left')}
              onMoveRight={(p) => handleMoveItem(p, 'right')}
              onSplitOffsetChange={isFotocopiaMode ? handleSplitOffsetChange : undefined}
              onOpenLightbox={(p) => setActiveLightboxPage(p)}
            />
          );
        })}

        {/* Hoja en blanco inyectada antes de la contratapa */}
        {(options.hasBackCover || options.customBackCover) && options.blankInFrontBackCover !== false && (
          <div className={`p-3 bg-[var(--ui-bg-surface)] border-2 border-dashed border-[var(--ui-border)] rounded-[${radius.card}] flex flex-col items-center justify-between text-center min-h-[200px] space-y-2 relative shadow-[var(--shadow-raised)] select-none opacity-80`}>
            <span className="px-2 py-0.5 rounded bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] font-bold text-[10px] tracking-wider border border-[var(--ui-border)]">
              {t.bookStudio.pdfStrip.blankSheetBadge}
            </span>
            <div className="flex-1 w-full aspect-[1/1.41] bg-white border border-dashed border-black/20 rounded opacity-50 flex items-center justify-center">
              <span className="text-[10px] text-black/70 rotate-[-45deg] font-bold">{t.bookStudio.pdfStrip.retiroBackCoverRotated}</span>
            </div>
            <span className="text-[9px] text-[var(--ui-text-secondary)] font-semibold">
              {t.bookStudio.pdfStrip.retiroBackCoverCaption}
            </span>
          </div>
        )}

        {/* Tarjeta de Contratapa */}
        {(options.hasBackCover || options.customBackCover) && (
          <div className={`p-3 bg-[var(--ui-bg-surface)] border-2 border-[var(--color-secondary-base)] rounded-[${radius.card}] flex flex-col items-center justify-between text-center min-h-[200px] space-y-2 relative shadow-[var(--shadow-raised)] select-none`}>
            <span className="px-2 py-0.5 rounded bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] font-bold text-[10px] uppercase tracking-wider">
              {t.bookStudio.pdfStrip.backCoverBadge}
            </span>
            {backCoverImgSrc ? (
              <img src={backCoverImgSrc} alt={t.bookStudio.pdfStrip.backCoverAlt} className={`w-full h-auto aspect-[1/1.41] rounded border border-[var(--ui-border)] ${options.customBackCover?.imageFit === 'stretch' ? '' : options.customBackCover?.imageFit === 'fit' ? 'object-contain bg-white' : 'object-cover'}`} />
            ) : options.customBackCover?.type === 'template' ? (
              <CoverPreviewThumbnail
                config={options.customBackCover}
                kind="backCover"
                paperSize={options.paperSize}
                className="w-full h-auto aspect-[1/1.41] object-contain rounded border border-[var(--ui-border)]"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-2 rounded bg-[var(--ui-bg-card)] border border-[var(--ui-border)] w-full aspect-[1/1.41]">
                <span className="text-[11px] font-bold text-[var(--ui-text-primary)] line-clamp-2">
                  {options.customBackCover?.synopsis || t.bookStudio.pdfStrip.backCoverPdfFallback}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      </>
      )}

      {/* Modal Lightbox */}
      {activeLightboxPage !== null && (
        <LightboxModal
          isOpen={activeLightboxPage !== null}
          onClose={() => setActiveLightboxPage(null)}
          pageNum={activeLightboxPage}
          pdfDoc={pdfDoc}
          totalPages={pdfPageCount}
          rotation={pageRotations[activeLightboxPage] || 0}
          refPdfPage={options.refPdfPage}
          refBookPage={options.refBookPage}
          refPageSide={options.refPageSide}
          refPdfHalf={options.refPdfHalf}
          splitOffset={pageSplitOffsets[activeLightboxPage] !== undefined ? pageSplitOffsets[activeLightboxPage] : 50}
          isFotocopiaMode={isFotocopiaMode}
          isDeleted={deletedPagesSet.has(String(activeLightboxPage))}
          deletedPages={options.deletedPages}
          showDeletedPages={showDeletedPages}
          activeStep={activeStep}
          onSaveReferencePage={handleSaveReference}
          onSaveSplitOffset={isFotocopiaMode ? handleSplitOffsetChange : undefined}
          onInsertDividerBeforePage={(pageNum) =>
            setDividerModalState({
              isOpen: true,
              defaultBeforePage: pageNum,
              editingDivider: null,
            })
          }
          onNavigate={(nextP) => setActiveLightboxPage(nextP)}
          onRotate={(p) => handleRotatePage(p, 90)}
          onRotateLeft90={(p) => handleRotatePage(p, -90)}
          onToggleDelete={handleToggleDelete}
          onMoveLeft={(p) => handleMoveItem(p, 'left')}
          onMoveRight={(p) => handleMoveItem(p, 'right')}
        />
      )}

      <BookSectionDividerModal
        isOpen={dividerModalState.isOpen}
        onClose={() =>
          setDividerModalState((prev) => ({ ...prev, isOpen: false, editingDivider: null }))
        }
        pdfPageCount={pdfPageCount}
        defaultInsertBeforePage={dividerModalState.defaultBeforePage}
        defaultCoverStyle={options.customCover?.coverStyle || options.coverStyle || 'monica-classic'}
        paperSize={options.paperSize}
        initialDivider={dividerModalState.editingDivider}
        onSaveDivider={handleSaveDivider}
      />
    </div>
  );
};

