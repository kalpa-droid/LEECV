import React, { useEffect, useState } from 'react';
import { ThumbnailCard } from './ThumbnailCard';
import { LightboxModal } from './LightboxModal';
import { BookImpositionOptions } from '../../../shared/core/book-engine/impositionEngine';
import { radius } from '../../../shared/core/uiDesignSystem';
import { RefreshCw, FileText } from 'lucide-react';
import { ensurePdfjsWorkerConfigured } from '../../../shared/core/pdf-engine/pdfjsWorkerSetup';

export interface PdfPreviewStripProps {
  selectedFile: File | null;
  pdfPageCount: number;
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  zoomScale?: number;
}

export const PdfPreviewStrip: React.FC<PdfPreviewStripProps> = ({
  selectedFile,
  pdfPageCount,
  options,
  setOptions,
  zoomScale = 1.0,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isLoadingPdfDoc, setIsLoadingPdfDoc] = useState<boolean>(false);
  const [activeLightboxPage, setActiveLightboxPage] = useState<number | null>(null);

  // Load PDF Document instance with pdfjs-dist
  useEffect(() => {
    if (!selectedFile) {
      setPdfDoc(null);
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
          setPdfDoc(doc);
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
  }, [selectedFile]);

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

  // Derive order array (1...pdfPageCount or custom pageOrder)
  const displayPages =
    options.pageOrder && options.pageOrder.length > 0
      ? options.pageOrder.map((p) => Number(p)).filter((n) => !isNaN(n))
      : Array.from({ length: pdfPageCount }, (_, i) => i + 1);

  const deletedPagesSet = new Set((options.deletedPages || []).map((p) => Number(p)));
  const pageRotations = options.pageRotations || {};

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
        {displayPages.map((pageNum, idx) => (
          <ThumbnailCard
            key={pageNum}
            pageNum={pageNum}
            pdfDoc={pdfDoc}
            rotation={pageRotations[pageNum] || 0}
            isDeleted={deletedPagesSet.has(pageNum)}
            canMoveLeft={idx > 0}
            canMoveRight={idx < displayPages.length - 1}
            onRotate={handleRotatePage}
            onToggleDelete={handleToggleDelete}
            onMoveLeft={(p) => handleMovePage(p, 'left')}
            onMoveRight={(p) => handleMovePage(p, 'right')}
            onOpenLightbox={(p) => setActiveLightboxPage(p)}
          />
        ))}
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
          onSaveReferencePage={handleSaveReference}
        />
      )}
    </div>
  );
};
