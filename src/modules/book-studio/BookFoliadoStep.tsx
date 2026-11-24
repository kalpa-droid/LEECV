import React, { useEffect, useRef, useState } from 'react';
import {
  Hash,
  CheckCircle2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  Edit3,
  BookmarkCheck,
  Info,
} from 'lucide-react';
import { BookImpositionOptions } from './domain/impositionEngine';
import {
  DeducedFirstPageResult,
  findBookFirstPageWithAi,
} from './domain/bookFoliadoAi';
import { resolveNaturalPdfPageSide } from '../../shared/kits/print-imposition/impositionMath';
import { PanelSection } from '../../shared/core/ui/PanelSection';
import { ContextualGuideBox } from '../../shared/core/ui/ContextualGuideBox';
import { AIButton } from '../../shared/core/ui/AIButton';
import { emitLidioMessage } from '../../shared/core/assistant/lidioBus';
import { radius, elevationSystem, button, input } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

interface BookFoliadoStepProps {
  pdfPageCount: number;
  pdfDoc?: any;
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  onNextStep?: () => void;
  onPrevStep?: () => void;
}

export const BookFoliadoStep: React.FC<BookFoliadoStepProps> = ({
  pdfPageCount,
  pdfDoc,
  options,
  setOptions,
  onNextStep,
  onPrevStep,
}) => {
  const t = useText();
  const refPdfPage = options.refPdfPage || 0;
  const refBookPage = options.refBookPage || 0;
  const isCalibrated = refPdfPage > 0 && refBookPage > 0;
  const isFotocopia = options.mode === 'fotocopia';
  const dividers = options.sectionDividers || [];
  const dividersWithBlank = dividers.filter((d) => d.blankBehind !== false);
  const dividersWithoutBlank = dividers.filter((d) => d.blankBehind === false);
  const firstDividerWithBlank = dividersWithBlank[0] || null;

  const [aiStatusMsg, setAiStatusMsg] = useState<string>('');
  const [deduction, setDeduction] = useState<DeducedFirstPageResult | null>(null);
  const [candidatePdfPage, setCandidatePdfPage] = useState<number>(1);
  const [candidateBookPage, setCandidateBookPage] = useState<number>(1);
  const [candidateHalf, setCandidateHalf] = useState<'izquierda' | 'derecha'>('derecha');
  const [showManualForm, setShowManualForm] = useState<boolean>(false);
  const [manualPdfPage, setManualPdfPage] = useState<number>(refPdfPage || 1);
  const [manualBookPage, setManualBookPage] = useState<number>(refBookPage || 1);
  const [manualHalf, setManualHalf] = useState<'izquierda' | 'derecha'>(
    options.refPdfHalf || 'derecha',
  );

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isRenderingPreview, setIsRenderingPreview] = useState<boolean>(false);

  // Renderizar la vista previa de la página DEDUCIDA como Página 1 (solo cuando el usuario tocó el botón de IA).
  useEffect(() => {
    if (!deduction || !pdfDoc || !previewCanvasRef.current) return;
    let cancelled = false;

    const renderCandidatePage = async () => {
      try {
        setIsRenderingPreview(true);
        const targetP = Math.max(1, Math.min(pdfPageCount || 1, candidatePdfPage));
        const page = await pdfDoc.getPage(targetP);
        if (cancelled) {
          try { page.cleanup?.(); } catch { /* ignore */ }
          return;
        }
        const unscaled = page.getViewport({ scale: 1.0 });
        const isVertical = unscaled.height > unscaled.width;
        const userRot = options.pageRotations?.[targetP] || 0;
        const autoAngle = isFotocopia && isVertical && userRot === 0 ? 90 : 0;
        const totalAngle = ((autoAngle + userRot) % 360 + 360) % 360;

        const targetW = 360;
        const scale = targetW / Math.max(1, unscaled.width);
        const vp = page.getViewport({ scale, rotation: totalAngle });

        const canvas = previewCanvasRef.current;
        if (!canvas) return;
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'rgb(255, 255, 255)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
        }
        try { page.cleanup?.(); } catch { /* ignore */ }
      } catch {
        // ignore render error
      } finally {
        if (!cancelled) setIsRenderingPreview(false);
      }
    };

    void renderCandidatePage();
    return () => {
      cancelled = true;
    };
  }, [deduction, pdfDoc, candidatePdfPage, pdfPageCount, options.pageRotations, isFotocopia]);

  const handleRunAiDetect = async (): Promise<string> => {
    if (!pdfDoc || pdfPageCount <= 0) {
      throw new Error('Subí primero un archivo PDF en el Paso 1 para buscar la numeración.');
    }
    setAiStatusMsg('Inspeccionando primeras páginas (2, 5, 10, 15)...');
    try {
      const res = await findBookFirstPageWithAi({
        pdfDoc,
        totalPages: pdfPageCount,
        mode: options.mode || 'normal',
        deletedPages: options.deletedPages || [],
        pageRotations: options.pageRotations || {},
        pageSplitOffsets: options.pageSplitOffsets || {},
        onStatus: (msg) => setAiStatusMsg(msg),
      });

      if (!res || !res.found) {
        setShowManualForm(true);
        throw new Error(
          'No vimos un número impreso claro en las páginas de muestra. Podés indicarlo manualmente abajo.',
        );
      }

      setDeduction(res);
      setCandidatePdfPage(res.deducedPdfPage);
      setCandidateBookPage(res.deducedBookPage);
      setCandidateHalf(res.deducedHalf || 'derecha');
      setShowManualForm(false);
      return res.explanationText;
    } finally {
      setAiStatusMsg('');
    }
  };

  const applyCalibration = (
    targetPdfPage: number,
    targetBookPage: number,
    targetHalf?: 'izquierda' | 'derecha',
  ) => {
    const side = resolveNaturalPdfPageSide(
      targetPdfPage,
      isFotocopia ? 'fotocopia' : 'normal',
      targetHalf,
    );
    setOptions((prev) => ({
      ...prev,
      refPdfPage: targetPdfPage,
      refBookPage: targetBookPage,
      refPageSide: side,
      refPdfHalf: isFotocopia ? targetHalf : undefined,
    }));
    setDeduction(null);
    setShowManualForm(false);
    emitLidioMessage({
      kind: 'state',
      groupKey: 'book-foliado',
      title: `Página ${targetBookPage} confirmada`,
      body: `Alineamos el libro tomando la pág. ${targetPdfPage} del PDF como página impresa ${targetBookPage}.`,
    });
  };

  const handleShiftCandidate = (delta: -1 | 1) => {
    if (isFotocopia) {
      if (delta === -1) {
        if (candidateHalf === 'derecha') {
          setCandidateHalf('izquierda');
        } else if (candidatePdfPage > 1) {
          setCandidatePdfPage((p) => Math.max(1, p - 1));
          setCandidateHalf('derecha');
        }
      } else {
        if (candidateHalf === 'izquierda') {
          setCandidateHalf('derecha');
        } else if (candidatePdfPage < pdfPageCount) {
          setCandidatePdfPage((p) => Math.min(pdfPageCount, p + 1));
          setCandidateHalf('izquierda');
        }
      }
      return;
    }
    setCandidatePdfPage((p) => Math.max(1, Math.min(pdfPageCount || 1, p + delta)));
  };

  const handleReset = () => {
    setOptions((prev) => ({
      ...prev,
      refPdfPage: 0,
      refBookPage: 0,
      refPageSide: 'derecha',
      refPdfHalf: undefined,
    }));
    setDeduction(null);
    emitLidioMessage({
      kind: 'state',
      groupKey: 'book-foliado',
      title: 'Calibración eliminada',
      body: 'Las páginas se emparejan por orden directo desde la primera hoja.',
    });
  };

  return (
    <div className="space-y-5 text-[var(--ui-text-primary)]">
      <PanelSection
        icon={<Hash className="w-4 h-4" />}
        title={t.bookStudio.foliadoStep.title}
        helpTitle="Para qué sirve calibrar un número"
        helpText={t.bookStudio.foliadoStep.description}
        headerRight={
          <AIButton
            iconOnly={false}
            label="Buscar pág. 1 con IA"
            disabled={!pdfDoc || pdfPageCount <= 0}
            onGenerate={handleRunAiDetect}
            onSuccess={() => {}}
            helpText="La IA revisa las primeras páginas (2, 5, 10, 15...), encuentra cualquier número impreso (por ej. el 10), deduce cuál es la Página 1 y te la muestra para que confirmes."
          />
        }
      >
        <ContextualGuideBox title={t.bookStudio.foliadoStep.howToTitle}>
          Este paso es <strong>opcional</strong>: si no elegís ningún número ni tocás el botón de IA, no hace nada y el libro se arma en orden directo. Si querés alinear páginas impares a la derecha, tocá el botón de IA o hacé clic en una miniatura.
        </ContextualGuideBox>

        {firstDividerWithBlank && !isCalibrated && !deduction && (
          <div
            className="p-3.5 border border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)] space-y-2.5"
            style={{ borderRadius: radius.control }}
          >
            <div className="flex items-start gap-2 text-xs">
              <BookmarkCheck className="w-4 h-4 text-[var(--color-accent-text)] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-[var(--ui-text-primary)]">
                  Separador detectado con hoja detrás
                </p>
                <p className="text-[var(--ui-text-secondary)]">
                  Pusiste &ldquo;{firstDividerWithBlank.title}&rdquo; antes de la Pág. {firstDividerWithBlank.insertBeforePage} del PDF. ¿Querés confirmar que esa página arranque a la derecha (impar)?
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => applyCalibration(firstDividerWithBlank.insertBeforePage, 1, 'derecha')}
              className={`${button.base} ${button.primary} w-full text-xs font-bold flex items-center justify-center gap-1.5`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirmar Pág. {firstDividerWithBlank.insertBeforePage} a la derecha (sin usar IA)</span>
            </button>
          </div>
        )}

        {dividersWithoutBlank.length > 0 && (
          <div
            className="p-3 border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] flex items-start gap-2 text-xs text-[var(--ui-text-secondary)]"
            style={{ borderRadius: radius.control }}
          >
            <Info className="w-4 h-4 text-[var(--color-accent-text)] shrink-0 mt-0.5" />
            <p>
              Tenés {dividersWithoutBlank.length} separador(es) de 1 sola página (sin hoja detrás). Cada uno corre en 1 lugar el lado derecha/izquierda a partir de esa sección; si calibrás un número después de ese separador, el motor ya descuenta ese desplazamiento automáticamente.
            </p>
          </div>
        )}

        {aiStatusMsg && (
          <div
            className="p-3 border border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)] text-xs font-semibold text-[var(--color-accent-text)] flex items-center gap-2"
            style={{ borderRadius: radius.control }}
          >
            <div className="w-4 h-4 border-2 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin shrink-0" />
            <span>{aiStatusMsg}</span>
          </div>
        )}

        {deduction && (
          <div
            className={`p-3.5 border-2 border-[var(--color-accent-base)] bg-[var(--ui-bg-surface)] space-y-3 ${elevationSystem.raised}`}
            style={{ borderRadius: radius.card }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] text-[10px] font-bold uppercase">
                  <Sparkles className="w-3 h-3" />
                  Página {candidateBookPage} deducida por IA
                </span>
                <p className="text-xs text-[var(--ui-text-primary)] leading-relaxed font-medium">
                  {deduction.explanationText}
                </p>
              </div>
            </div>

            <div className="p-2.5 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] flex flex-col items-center space-y-2" style={{ borderRadius: radius.control }}>
              <div className="flex items-center justify-between w-full text-[11px] font-bold">
                <span className="px-2 py-0.5 rounded bg-[var(--ui-bg-card)] border border-[var(--ui-border)]">
                  Mostrando Pág. #{candidatePdfPage} de tu PDF
                  {isFotocopia ? ` (mitad ${candidateHalf})` : ''}
                </span>
                <span className="text-[var(--color-accent-text)]">
                  ➔ Página impresa #{candidateBookPage}
                </span>
              </div>

              <div className="relative inline-flex max-w-full justify-center overflow-hidden rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)]">
                <canvas
                  ref={previewCanvasRef}
                  className={`max-h-56 w-auto object-contain ${isRenderingPreview ? 'opacity-40' : 'opacity-100'}`}
                />
                {isFotocopia && (
                  <div
                    className="absolute inset-y-0 border-2 border-[var(--color-accent-base)] bg-[var(--color-accent-base)]/10 pointer-events-none"
                    style={{
                      left: candidateHalf === 'izquierda' ? '0%' : '50%',
                      width: '50%',
                    }}
                  />
                )}
              </div>

              <div className="flex items-center justify-between w-full gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleShiftCandidate(-1)}
                  disabled={candidatePdfPage <= 1 && (!isFotocopia || candidateHalf === 'izquierda')}
                  className="px-2.5 py-1 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[11px] font-bold disabled:opacity-40 cursor-pointer"
                >
                  ◀ Es la anterior
                </button>
                <span className="text-[10px] text-[var(--ui-text-secondary)] text-center">
                  ¿Es esta la página {candidateBookPage}?
                </span>
                <button
                  type="button"
                  onClick={() => handleShiftCandidate(1)}
                  disabled={
                    candidatePdfPage >= pdfPageCount &&
                    (!isFotocopia || candidateHalf === 'derecha')
                  }
                  className="px-2.5 py-1 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[11px] font-bold disabled:opacity-40 cursor-pointer"
                >
                  Es la siguiente ▶
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() =>
                  applyCalibration(
                    candidatePdfPage,
                    candidateBookPage,
                    isFotocopia ? candidateHalf : undefined,
                  )
                }
                className={`${button.base} ${button.primary} flex-1 flex items-center justify-center gap-1.5 text-xs font-bold`}
              >
                <Check className="w-4 h-4" />
                <span>Sí, confirmar Pág. {candidatePdfPage} como #{candidateBookPage}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualPdfPage(candidatePdfPage);
                  setManualBookPage(candidateBookPage);
                  setManualHalf(candidateHalf);
                  setShowManualForm(true);
                }}
                className={`${button.base} ${button.secondary} flex items-center justify-center gap-1.5 text-xs font-bold`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Especificar manual</span>
              </button>
            </div>
          </div>
        )}

        {!showManualForm ? (
          <button
            type="button"
            onClick={() => {
              setManualPdfPage(refPdfPage || 1);
              setManualBookPage(refBookPage || 1);
              setShowManualForm(true);
            }}
            className="w-full py-2 px-3 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-card)] hover:border-[var(--color-accent-base)] text-xs font-bold text-[var(--ui-text-primary)] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-[var(--color-accent-text)]" />
            <span>Indicar número de página manualmente</span>
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyCalibration(
                Math.max(1, Math.min(pdfPageCount || 1, Number(manualPdfPage) || 1)),
                Math.max(1, Number(manualBookPage) || 1),
                isFotocopia ? manualHalf : undefined,
              );
            }}
            className="p-3.5 border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] space-y-3"
            style={{ borderRadius: radius.card }}
          >
            <span className="text-xs font-bold text-[var(--ui-text-primary)] block">
              Calibración manual de página:
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[var(--ui-text-secondary)] block mb-1">
                  En la pág. del PDF #:
                </label>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, pdfPageCount || 1)}
                  value={manualPdfPage}
                  onChange={(e) =>
                    setManualPdfPage(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className={`${input.base} ${input.focus} w-full font-bold text-xs`}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[var(--ui-text-secondary)] block mb-1">
                  Veo impreso el número:
                </label>
                <input
                  type="number"
                  min={1}
                  value={manualBookPage}
                  onChange={(e) =>
                    setManualBookPage(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className={`${input.base} ${input.focus} w-full font-bold text-xs`}
                />
              </div>
            </div>

            {isFotocopia && (
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {(['izquierda', 'derecha'] as const).map((half) => (
                  <button
                    key={half}
                    type="button"
                    onClick={() => setManualHalf(half)}
                    className={`py-1.5 px-2 rounded-lg border font-bold cursor-pointer ${
                      manualHalf === half
                        ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--color-accent-base)]'
                        : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] border-[var(--ui-border)]'
                    }`}
                  >
                    Mitad {half}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className={`${button.base} ${button.primary} flex-1 text-xs font-bold`}
              >
                Guardar referencia
              </button>
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className={`${button.base} ${button.secondary} text-xs font-bold`}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {isCalibrated && (
          <div
            className={`p-4 bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/40 text-[var(--color-status-success-text)] ${elevationSystem.raised} space-y-2`}
            style={{ borderRadius: radius.card }}
          >
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[var(--color-status-success-bright)] shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <h3 className="font-bold text-sm">{t.bookStudio.foliadoStep.calibratedTitle}</h3>
                <p>
                  {t.bookStudio.foliadoStep.calibratedLine
                    .replace('{pdf}', String(refPdfPage))
                    .replace('{book}', String(refBookPage))}
                  {isFotocopia && options.refPdfHalf ? ` (mitad ${options.refPdfHalf})` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className={`${button.base} ${button.ghost} w-full flex items-center justify-center gap-1.5 text-xs text-[var(--color-status-danger-text)] mt-2`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.bookStudio.foliadoStep.removeCalibration}</span>
            </button>
          </div>
        )}
      </PanelSection>

      <div className="pt-4 border-t border-[var(--ui-border)] flex items-center justify-between gap-3">
        {onPrevStep ? (
          <button
            type="button"
            onClick={onPrevStep}
            className={`${button.base} ${button.secondary} flex items-center gap-1.5 text-xs font-bold`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{t.bookStudio.backStep}</span>
          </button>
        ) : <div />}

        {onNextStep && (
          <button
            type="button"
            onClick={onNextStep}
            className={`${button.base} ${button.primary} flex items-center gap-1.5 text-xs font-bold`}
          >
            <span>{t.bookStudio.foliadoStep.nextStep}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
