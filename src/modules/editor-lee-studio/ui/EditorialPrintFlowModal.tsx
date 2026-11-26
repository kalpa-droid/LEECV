import React, { useEffect, useState } from 'react';
import { BookOpenCheck, Check, Columns2, FileText, Info } from 'lucide-react';
import { Modal } from '../../../shared/core/ui/Modal';
import { SectionSwitch } from '../../../shared/core/ui/SectionSwitch';
import { button, radius, selectableCard } from '../../../shared/core/uiDesignSystem';
import { resolveEffectiveEditorialPagination } from '../domain/editorialPaginationEngine';
import type {
  EditorialChapterBreakMode,
  EditorialPrintSides,
} from '../domain/editorialTypes';

export interface EditorialPrintFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: any;
  onApplyPrintFlow: (params: {
    printSides: EditorialPrintSides;
    chapterBreakMode: EditorialChapterBreakMode;
    breakOnH2: boolean;
  }) => void;
}

export const EditorialPrintFlowModal: React.FC<EditorialPrintFlowModalProps> = ({
  isOpen,
  onClose,
  draft,
  onApplyPrintFlow,
}) => {
  const effective = resolveEffectiveEditorialPagination(draft);
  const [printSides, setPrintSides] = useState<EditorialPrintSides>(effective.printSides);
  const [chapterBreakMode, setChapterBreakMode] = useState<EditorialChapterBreakMode>(
    effective.effectiveChapterBreakMode,
  );
  const [breakOnH2, setBreakOnH2] = useState<boolean>(effective.breakOnH2);

  useEffect(() => {
    if (!isOpen) return;
    const current = resolveEffectiveEditorialPagination(draft);
    setPrintSides(current.printSides);
    setChapterBreakMode(current.effectiveChapterBreakMode);
    setBreakOnH2(current.breakOnH2);
  }, [isOpen, draft]);

  const handleSelectPrintSides = (nextSides: EditorialPrintSides) => {
    setPrintSides(nextSides);
    if (nextSides === 'simplex' && chapterBreakMode === 'odd_page') {
      setChapterBreakMode('next_page');
    }
  };

  const handleSubmit = () => {
    const normalizedBreak: EditorialChapterBreakMode =
      printSides === 'simplex' && chapterBreakMode === 'odd_page'
        ? 'next_page'
        : chapterBreakMode;
    onApplyPrintFlow({
      printSides,
      chapterBreakMode: normalizedBreak,
      breakOnH2,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      icon={<BookOpenCheck className="w-4.5 h-4.5 text-[var(--color-accent-text)]" />}
      title="Impresión y saltos de capítulo"
      helpTitle="Regla automática según cómo imprimís"
      helpText="Si imprimís en un solo lado, nunca insertamos hojas en blanco ni alternamos el margen de carpeta. Si imprimís en ambos lados, espejamos el lomo y podés hacer que cada capítulo arranque en página derecha (impar) recalculando el índice."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <span className="text-xs font-extrabold text-[var(--ui-text-primary)] block">
            1. ¿Cómo se va a imprimir o entregar el archivo?
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleSelectPrintSides('simplex')}
              aria-pressed={printSides === 'simplex'}
              className={`${selectableCard.base} ${
                printSides === 'simplex' ? selectableCard.selected : selectableCard.unselected
              } p-3 text-left cursor-pointer space-y-1`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--ui-text-primary)]">
                  <FileText className="w-3.5 h-3.5 text-[var(--color-accent-text)] shrink-0" />
                  <span>De un solo lado (simple faz)</span>
                </span>
                {printSides === 'simplex' && (
                  <Check className="w-3.5 h-3.5 text-[var(--color-accent-text)] shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-[var(--ui-text-secondary)] leading-snug">
                Ideal para informes, proyectos, tesis y entregas en impresora de casa. Margen de carpeta fijo a la izquierda y cero hojas blancas de relleno.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPrintSides('duplex')}
              aria-pressed={printSides === 'duplex'}
              className={`${selectableCard.base} ${
                printSides === 'duplex' ? selectableCard.selected : selectableCard.unselected
              } p-3 text-left cursor-pointer space-y-1`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--ui-text-primary)]">
                  <Columns2 className="w-3.5 h-3.5 text-[var(--color-accent-text)] shrink-0" />
                  <span>De ambos lados (doble faz)</span>
                </span>
                {printSides === 'duplex' && (
                  <Check className="w-3.5 h-3.5 text-[var(--color-accent-text)] shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-[var(--ui-text-secondary)] leading-snug">
                Ideal para libros, manuales y ensayos encuadernados. Espeja el lomo en páginas pares e impares en el PDF y en Word.
              </p>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-extrabold text-[var(--ui-text-primary)] block">
            2. ¿Dónde empieza cada capítulo o sección principal?
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (printSides === 'duplex') setChapterBreakMode('odd_page');
              }}
              disabled={printSides !== 'duplex'}
              aria-pressed={chapterBreakMode === 'odd_page' && printSides === 'duplex'}
              className={`${selectableCard.base} ${
                printSides !== 'duplex'
                  ? 'opacity-50 cursor-not-allowed border-[var(--ui-border)] bg-[var(--ui-bg-panel)]'
                  : chapterBreakMode === 'odd_page'
                    ? `${selectableCard.selected} cursor-pointer`
                    : `${selectableCard.unselected} cursor-pointer`
              } p-3 text-left space-y-1`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-bold text-[var(--ui-text-primary)]">
                  Siempre en página impar
                </span>
                {chapterBreakMode === 'odd_page' && printSides === 'duplex' && (
                  <Check className="w-3.5 h-3.5 text-[var(--color-accent-text)] shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-[var(--ui-text-secondary)] leading-snug">
                Cada capítulo abre en hoja derecha. Si el anterior termina en impar, agregamos una hoja blanca limpia y actualizamos el índice.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setChapterBreakMode('next_page')}
              aria-pressed={chapterBreakMode === 'next_page'}
              className={`${selectableCard.base} ${
                chapterBreakMode === 'next_page' ? selectableCard.selected : selectableCard.unselected
              } p-3 text-left cursor-pointer space-y-1`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-bold text-[var(--ui-text-primary)]">
                  En hoja aparte
                </span>
                {chapterBreakMode === 'next_page' && (
                  <Check className="w-3.5 h-3.5 text-[var(--color-accent-text)] shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-[var(--ui-text-secondary)] leading-snug">
                Cada capítulo o sección arranca en la hoja siguiente (par o impar) sin intercalar hojas en blanco.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setChapterBreakMode('continuous')}
              aria-pressed={chapterBreakMode === 'continuous'}
              className={`${selectableCard.base} ${
                chapterBreakMode === 'continuous' ? selectableCard.selected : selectableCard.unselected
              } p-3 text-left cursor-pointer space-y-1`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-bold text-[var(--ui-text-primary)]">
                  Seguido en la misma hoja
                </span>
                {chapterBreakMode === 'continuous' && (
                  <Check className="w-3.5 h-3.5 text-[var(--color-accent-text)] shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-[var(--ui-text-secondary)] leading-snug">
                Las secciones fluyen una debajo de la otra para aprovechar papel en apuntes o artículos breves.
              </p>
            </button>
          </div>

          {printSides === 'simplex' && (
            <div
              className="flex items-start gap-2 p-2.5 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[11px] text-[var(--ui-text-secondary)]"
              style={{ borderRadius: radius.control }}
            >
              <Info className="w-4 h-4 text-[var(--color-accent-text)] shrink-0 mt-0.5" />
              <span>
                En <strong>un solo lado (simple faz)</strong> todas las hojas quedan de frente; por eso no hace falta intercalar hojas blancas para forzar página impar. Si luego pasás a <strong>ambos lados</strong>, se habilita de inmediato.
              </span>
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-between gap-3 px-3 py-2.5 border border-[var(--ui-border)] bg-[var(--ui-bg-card)]"
          style={{ borderRadius: radius.control }}
        >
          <div className="min-w-0">
            <span className="text-xs font-bold text-[var(--ui-text-primary)] block">
              Saltar de hoja también en subtítulos principales (H2)
            </span>
            <span className="text-[11px] text-[var(--ui-text-secondary)] block">
              Útil en informes largos y proyectos donde cada subapartado principal debe empezar arriba de una hoja nueva.
            </span>
          </div>
          <SectionSwitch
            size="sm"
            checked={breakOnH2}
            onChange={setBreakOnH2}
            label="Saltar de hoja en subtítulos principales"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--ui-border)]">
          <button
            type="button"
            onClick={onClose}
            className={`${button.base} ${button.secondary}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`${button.base} ${button.primary}`}
          >
            Aplicar y actualizar índice
          </button>
        </div>
      </div>
    </Modal>
  );
};
