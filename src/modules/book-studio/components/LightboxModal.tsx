import React, { useEffect, useRef, useState } from 'react';
import { X, Check, Bookmark, Scissors, AlertCircle } from 'lucide-react';
import { radius, elevationSystem } from '../../../shared/core/uiDesignSystem';

export interface LightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageNum: number;
  pdfDoc: any;
  rotation?: number;
  refPdfPage?: number;
  refBookPage?: number;
  refPageSide?: 'derecha' | 'izquierda';
  splitOffset?: number;
  onSaveReferencePage: (refPdfPage: number, refBookPage: number, refPageSide: 'derecha' | 'izquierda') => void;
  onSaveSplitOffset?: (pageNum: number, newOffset: number) => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  isOpen,
  onClose,
  pageNum,
  pdfDoc,
  rotation = 0,
  refPdfPage = 0,
  refBookPage = 0,
  refPageSide = 'derecha',
  splitOffset = 50,
  onSaveReferencePage,
  onSaveSplitOffset,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Form states for reference page and split offset
  const [inputBookPage, setInputBookPage] = useState<number>(refBookPage || pageNum);
  const [inputPageSide, setInputPageSide] = useState<'derecha' | 'izquierda'>(refPageSide);
  const [localSplitOffset, setLocalSplitOffset] = useState<number>(splitOffset);
  const [isSavedNotice, setIsSavedNotice] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setInputBookPage(refBookPage || pageNum);
    setInputPageSide(refPageSide);
    setLocalSplitOffset(splitOffset);
  }, [isOpen, pageNum, refBookPage, refPageSide, splitOffset]);

  useEffect(() => {
    if (!isOpen || !pdfDoc || !canvasRef.current) return;

    let isCancelled = false;

    const renderHighRes = async () => {
      try {
        setIsLoading(true);
        const page = await pdfDoc.getPage(pageNum);
        if (isCancelled) return;

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const targetWidth = 600; // High quality preview
        const scale = targetWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale, rotation });

        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport }).promise;

        // Draw red dashed split line overlay at localSplitOffset
        if (!isCancelled && ctx) {
          const splitX = Math.round(canvas.width * (localSplitOffset / 100));
          ctx.save();
          ctx.strokeStyle = '#FF2E63';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(splitX, 0);
          ctx.lineTo(splitX, canvas.height);
          ctx.stroke();

          // Draw scissors badge at top of line
          ctx.fillStyle = '#FF2E63';
          ctx.fillRect(splitX - 16, 4, 32, 18);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`✂ ${localSplitOffset}%`, splitX, 17);
          ctx.restore();
        }

        if (!isCancelled) setIsLoading(false);
      } catch (err) {
        console.error(`Error rendering high-res lightbox page ${pageNum}:`, err);
        if (!isCancelled) setIsLoading(false);
      }
    };

    renderHighRes();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, pdfDoc, pageNum, rotation, localSplitOffset]);

  if (!isOpen) return null;

  const handleApplyReference = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveReferencePage(pageNum, Number(inputBookPage), inputPageSide);
    if (onSaveSplitOffset) {
      onSaveSplitOffset(pageNum, localSplitOffset);
    }
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  const handleSplitOffsetChangeLocal = (val: number) => {
    setLocalSplitOffset(val);
    if (onSaveSplitOffset) {
      onSaveSplitOffset(pageNum, val);
    }
  };

  const isCurrentReference = refPdfPage === pageNum && refBookPage > 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div
        className={`relative w-full max-w-4xl max-h-[90vh] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[${radius.modal}] ${elevationSystem.overlay} overflow-hidden flex flex-col md:flex-row text-[var(--ui-text-primary)]`}
      >
        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-border)] text-[var(--ui-text-primary)] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lado Izquierdo: Renderizado de la Imagen en Alta Res con línea de corte */}
        <div className="flex-1 bg-[var(--ui-bg-panel)] p-6 flex flex-col items-center justify-center overflow-auto min-h-[320px] md:min-h-[480px] relative">
          {isLoading && (
            <div className="flex flex-col items-center gap-2 text-[var(--ui-text-secondary)]">
              <div className="w-8 h-8 border-3 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Cargando vista previa en alta resolución...</span>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className={`max-w-full max-h-[70vh] object-contain shadow-2xl rounded-sm ${isLoading ? 'hidden' : 'block'}`}
          />
        </div>

        {/* Lado Derecho: Formulario de Configuración y Corte Central */}
        <div className="w-full md:w-80 p-5 bg-[var(--ui-bg-panel)] border-t md:border-t-0 md:border-l border-[var(--ui-border)] flex flex-col justify-between space-y-4 overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="px-2.5 py-1 rounded-full bg-[var(--color-accent-light)]/20 text-[var(--color-secondary-bright)] font-bold text-[10px] uppercase">
                Página {pageNum} del PDF
              </span>
              <h3 className="text-base font-bold text-[var(--ui-text-primary)] flex items-center gap-1.5 pt-1">
                <Bookmark className="w-4 h-4 text-[var(--color-secondary-bright)]" />
                <span>Página de Referencia & Corte</span>
              </h3>
              <p className="text-xs text-[var(--ui-text-secondary)] leading-relaxed">
                Especifica la página impresa y ajusta la posición del corte central para escaneos dobles.
              </p>
            </div>

            {isCurrentReference && (
              <div className={`p-3 bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/30 rounded-[${radius.control}] flex items-center gap-2 text-xs text-[var(--color-status-success-text)] font-semibold`}>
                <Check className="w-4 h-4 text-[var(--color-status-success-bright)] shrink-0" />
                <span>Referencia activa (Pág. Impresa {refBookPage}, lado {refPageSide}).</span>
              </div>
            )}

            {/* Ajuste de Corte Central Manual (splitOffset) */}
            <div className="p-3 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[${radius.card}] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--ui-text-primary)]">
                <span className="flex items-center gap-1">
                  <Scissors className="w-4 h-4 text-[var(--color-secondary-bright)]" />
                  <span>Corte Central Manual</span>
                </span>
                <span className="font-mono text-[var(--color-secondary-bright)]">{localSplitOffset}%</span>
              </div>

              <input
                type="range"
                min={30}
                max={70}
                value={localSplitOffset}
                onChange={(e) => handleSplitOffsetChangeLocal(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-[var(--ui-bg-panel)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent-base)]"
              />

              <div className="flex items-center justify-between text-[10px] text-[var(--ui-text-secondary)]">
                <span>Izquierda 30%</span>
                <span>Centro 50%</span>
                <span>Derecha 70%</span>
              </div>
            </div>

            <form onSubmit={handleApplyReference} className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--ui-text-primary)] block">
                  Número Impreso en esta Hoja
                </label>
                <input
                  type="number"
                  min={1}
                  value={inputBookPage}
                  onChange={(e) => setInputBookPage(parseInt(e.target.value, 10) || 1)}
                  className={`w-full px-3 py-2 text-xs font-bold rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] focus:border-[var(--color-accent-base)] outline-hidden text-[var(--ui-text-primary)]`}
                  placeholder="Ej: 15"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--ui-text-primary)] block">
                  Ubicación Impresa
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInputPageSide('derecha')}
                    className={`py-2 px-3 text-xs font-bold rounded-[${radius.control}] border transition cursor-pointer ${
                      inputPageSide === 'derecha'
                        ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
                        : 'border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-panel)]'
                    }`}
                  >
                    Derecha (Impar)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputPageSide('izquierda')}
                    className={`py-2 px-3 text-xs font-bold rounded-[${radius.control}] border transition cursor-pointer ${
                      inputPageSide === 'izquierda'
                        ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
                        : 'border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-panel)]'
                    }`}
                  >
                    Izquierda (Par)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-2.5 px-4 rounded-[${radius.control}] font-bold text-xs bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] hover:opacity-90 transition flex items-center justify-center gap-1.5 cursor-pointer mt-2`}
              >
                <Check className="w-4 h-4" />
                <span>{isSavedNotice ? '¡Ajustes Guardados!' : 'Guardar Ajustes de Página'}</span>
              </button>
            </form>
          </div>

          <div className="pt-3 border-t border-[var(--ui-border)] flex items-center gap-2 text-[11px] text-[var(--ui-text-secondary)]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[var(--color-secondary-bright)]" />
            <span>La línea roja punteada ✂ indica por dónde cortará el motor.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
