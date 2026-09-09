import React, { useEffect, useState } from 'react';
import { ThumbnailCard } from './ThumbnailCard';
import { LightboxModal } from './LightboxModal';
import { CoverPreviewThumbnail } from './CoverPreviewThumbnail';
import { BookImpositionOptions } from '../../../shared/core/book-engine/impositionEngine';
import { radius } from '../../../shared/core/uiDesignSystem';
import { RefreshCw, FileText, Trash2 } from 'lucide-react';
import { ensurePdfjsWorkerConfigured } from '../../../shared/core/pdf-engine/pdfjsWorkerSetup';

export interface PdfPreviewStripProps {
  selectedFile: File | null;
  pdfPageCount: number;
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  zoomScale?: number;
  pdfDoc?: any;
}

export const PdfPreviewStrip: React.FC<PdfPreviewStripProps> = ({
  selectedFile,
  pdfPageCount,
  options,
  setOptions,
  zoomScale = 1.0,
  pdfDoc: pdfDocProp,
}) => {
  const [internalPdfDoc, setInternalPdfDoc] = useState<any>(null);
  const [isLoadingPdfDoc, setIsLoadingPdfDoc] = useState<boolean>(false);
  const [activeLightboxPage, setActiveLightboxPage] = useState<number | null>(null);

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
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdfjsLib = ensurePdfjsWorkerConfigured();
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        if (!isCancelled) {
          setInternalPdfDoc(doc);
          setIsLoadingPdfDoc(false);
        }
      } catch (err) {
        console.error('Error loading PDF document instance for thumbnails:', err);
        if (!isCancelled) setIsLoadingPdfDoc(false);
      }
    };

    loadPdfDocInstance();

    return () => {
      isCancelled = true;
    };
  }, [selectedFile, pdfDocProp]);

  if (!selectedFile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3 bg-[var(--ui-bg-card)] rounded-2xl border-2 border-dashed border-[var(--ui-border)] w-full">
        {/* check-contrast-ignore-next-line: ícono decorativo grande, no es texto de lectura */}
        <FileText className="w-12 h-12 text-[var(--ui-text-muted)]" />
        <h3 className="text-base font-bold text-[var(--ui-text-primary)]">Ningún PDF Cargado</h3>
        <p className="text-xs text-[var(--ui-text-secondary)] max-w-sm">
          Carga un archivo PDF en la pestaña "1. Origen" para ver y organizar las miniaturas de sus páginas.
        </p>
      </div>
    );
  }

  if (isLoadingPdfDoc) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 w-full">
        <div className="w-10 h-10 border-3 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-[var(--ui-text-secondary)]">
          Generando grilla de miniaturas para {selectedFile.name}...
        </p>
      </div>
    );
  }

  // Derive order array (1...pdfPageCount or custom pageOrder containing numeric or blank IDs)
  const displayPages =
    options.pageOrder && options.pageOrder.length > 0
      ? options.pageOrder
      : Array.from({ length: pdfPageCount }, (_, i) => i + 1);

  const deletedPagesSet = new Set((options.deletedPages || []).map((p) => String(p)));
  const pageRotations = options.pageRotations || {};

  const handleRemoveBlankPage = (itemKey: string | number) => {
    setOptions((prev) => {
      const currentOrder =
        prev.pageOrder && prev.pageOrder.length > 0
          ? [...prev.pageOrder]
          : Array.from({ length: pdfPageCount }, (_, i) => i + 1);
      return {
        ...prev,
        pageOrder: currentOrder.filter((p) => String(p) !== String(itemKey)),
      };
    });
  };

  const handleRotatePage = (pageNum: number) => {
    setOptions((prev) => {
      const currentRot = prev.pageRotations?.[pageNum] || 0;
      const nextRot = (currentRot + 90) % 360;
      return {
        ...prev,
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

  const handleMovePage = (pageNum: number, direction: 'left' | 'right') => {
    setOptions((prev) => {
      const currentOrder =
        prev.pageOrder && prev.pageOrder.length > 0
          ? [...prev.pageOrder]
          : Array.from({ length: pdfPageCount }, (_, i) => i + 1);

      const idx = currentOrder.indexOf(pageNum);
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

  const handleSaveReference = (refPdfPage: number, refBookPage: number, refPageSide: 'derecha' | 'izquierda') => {
    setOptions((prev) => ({
      ...prev,
      refPdfPage,
      refBookPage,
      refPageSide,
    }));
  };

  return (
    <div className="w-full space-y-4">
      {/* Barra de Herramientas de Miniaturas */}
      <div className={`p-3 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[${radius.card}] flex flex-wrap items-center justify-between gap-3 text-xs`}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-[var(--ui-text-primary)]">
            Organizador de Páginas
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[var(--color-accent-light)]/20 text-[var(--color-accent-text)] font-bold text-[10px]">
            {displayPages.length - deletedPagesSet.size} activas / {deletedPagesSet.size} eliminadas
          </span>
        </div>

        {options.refBookPage ? (
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-status-success-bright)] font-semibold">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Ref: Pág. {options.refPdfPage} PDF → Impresa {options.refBookPage} ({options.refPageSide})</span>
          </div>
        ) : null}
      </div>

      {/* Grilla de Miniaturas Responsive con Escala Zoom */}
      <div
        className="grid gap-3 transition-transform duration-200 origin-top-left"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(140 * zoomScale, 110)}px, 1fr))`,
        }}
      >
        {/* Tarjeta de Tapa / Portada */}
        {(options.hasCover || options.customCover) && (
          <div className="p-3 bg-[var(--ui-bg-surface)] border-2 border-[var(--color-accent-base)] rounded-xl flex flex-col items-center justify-between text-center min-h-[200px] space-y-2 relative shadow-md select-none">
            <span className="px-2 py-0.5 rounded bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] font-bold text-[10px] uppercase tracking-wider">
              Portada / Tapa
            </span>
            {options.customCover?.imageUri ? (
              <img src={options.customCover.imageUri} alt="Tapa" className="w-full h-28 object-cover rounded border border-[var(--ui-border)]" />
            ) : options.customCover?.type === 'template' ? (
              <CoverPreviewThumbnail
                config={options.customCover}
                kind="cover"
                paperSize={options.paperSize}
                className="w-full h-28 object-contain rounded border border-[var(--ui-border)]"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-2 rounded bg-[var(--ui-bg-card)] border border-[var(--ui-border)] w-full">
                <span className="text-[11px] font-bold text-[var(--ui-text-primary)] line-clamp-2">
                  {options.customCover?.title || 'Tapa del PDF (Página 1)'}
                </span>
                {options.customCover?.author && (
                  <span className="text-[9px] text-[var(--ui-text-secondary)] mt-1">{options.customCover.author}</span>
                )}
              </div>
            )}
            {/* check-contrast-ignore-next-line: texto de pie sobre fondo ui-bg-surface */}
            <span className="text-[9px] text-[var(--ui-text-primary)] font-semibold">
              Retiro en blanco: {options.blankBehindCover !== false ? 'Sí' : 'No'}
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
                className="p-3 bg-[var(--ui-bg-surface)] border-2 border-dashed border-[var(--ui-border)] rounded-xl flex flex-col items-center justify-between text-center min-h-[200px] space-y-2 relative select-none"
              >
                <span className="px-2 py-0.5 rounded bg-[var(--color-secondary-muted)] text-[var(--color-secondary-bright)] font-bold text-[10px]">
                  HOJA EN BLANCO
                </span>
                <div className="flex-1 flex flex-col items-center justify-center text-[10px] text-[var(--ui-text-secondary)]">
                  Página insertada en blanco
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveBlankPage(itemStr)}
                  className="px-2 py-1 rounded bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] text-[10px] font-bold flex items-center gap-1 hover:opacity-80 transition cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Eliminar</span>
                </button>
              </div>
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
              canMoveLeft={idx > 0}
              canMoveRight={idx < displayPages.length - 1}
              splitOffset={pageSplitOffsets[pageNum] !== undefined ? pageSplitOffsets[pageNum] : 50}
              isFotocopiaMode={isFotocopiaMode}
              onRotate={handleRotatePage}
              onToggleDelete={handleToggleDelete}
              onMoveLeft={(p) => handleMovePage(p, 'left')}
              onMoveRight={(p) => handleMovePage(p, 'right')}
              onSplitOffsetChange={isFotocopiaMode ? handleSplitOffsetChange : undefined}
              onOpenLightbox={(p) => setActiveLightboxPage(p)}
            />
          );
        })}

        {/* Tarjeta de Contratapa */}
        {(options.hasBackCover || options.customBackCover) && (
          <div className="p-3 bg-[var(--ui-bg-surface)] border-2 border-[var(--color-secondary-base)] rounded-xl flex flex-col items-center justify-between text-center min-h-[200px] space-y-2 relative shadow-md select-none">
            <span className="px-2 py-0.5 rounded bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] font-bold text-[10px] uppercase tracking-wider">
              Contratapa
            </span>
            {options.customBackCover?.imageUri ? (
              <img src={options.customBackCover.imageUri} alt="Contratapa" className="w-full h-28 object-cover rounded border border-[var(--ui-border)]" />
            ) : options.customBackCover?.type === 'template' ? (
              <CoverPreviewThumbnail
                config={options.customBackCover}
                kind="backCover"
                paperSize={options.paperSize}
                className="w-full h-28 object-contain rounded border border-[var(--ui-border)]"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-2 rounded bg-[var(--ui-bg-card)] border border-[var(--ui-border)] w-full">
                <span className="text-[11px] font-bold text-[var(--ui-text-primary)] line-clamp-2">
                  {options.customBackCover?.synopsis || 'Contratapa del PDF'}
                </span>
              </div>
            )}
            {/* check-contrast-ignore-next-line: texto de pie sobre fondo ui-bg-surface */}
            <span className="text-[9px] text-[var(--ui-text-primary)] font-semibold">
              Retiro en blanco: {options.blankInFrontBackCover !== false ? 'Sí' : 'No'}
            </span>
          </div>
        )}
      </div>

      {/* Modal Lightbox */}
      {activeLightboxPage !== null && (
        <LightboxModal
          isOpen={activeLightboxPage !== null}
          onClose={() => setActiveLightboxPage(null)}
          pageNum={activeLightboxPage}
          pdfDoc={pdfDoc}
          rotation={pageRotations[activeLightboxPage] || 0}
          refPdfPage={options.refPdfPage}
          refBookPage={options.refBookPage}
          refPageSide={options.refPageSide}
          splitOffset={pageSplitOffsets[activeLightboxPage] !== undefined ? pageSplitOffsets[activeLightboxPage] : 50}
          isFotocopiaMode={isFotocopiaMode}
          onSaveReferencePage={handleSaveReference}
          onSaveSplitOffset={isFotocopiaMode ? handleSplitOffsetChange : undefined}
        />
      )}
    </div>
  );
};
