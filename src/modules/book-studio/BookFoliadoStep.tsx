import React from 'react';
import { Hash, CheckCircle2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { BookImpositionOptions } from './domain/impositionEngine';
import { PanelSection } from '../../shared/core/ui/PanelSection';
import { ContextualGuideBox } from '../../shared/core/ui/ContextualGuideBox';
import { emitLidioMessage } from '../../shared/core/assistant/lidioBus';
import { radius, elevationSystem, button } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

interface BookFoliadoStepProps {
  pdfPageCount: number;
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  onNextStep?: () => void;
  onPrevStep?: () => void;
}

export const BookFoliadoStep: React.FC<BookFoliadoStepProps> = ({
  options,
  setOptions,
  onNextStep,
  onPrevStep,
}) => {
  const t = useText();
  const refPdfPage = options.refPdfPage || 0;
  const refBookPage = options.refBookPage || 0;
  const isCalibrated = refPdfPage > 0 && refBookPage > 0;

  const handleReset = () => {
    setOptions((prev) => ({
      ...prev,
      refPdfPage: 0,
      refBookPage: 0,
      refPageSide: 'derecha',
    }));
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
      >
        <ContextualGuideBox title={t.bookStudio.foliadoStep.howToTitle}>
          {t.bookStudio.foliadoStep.howToIntro} <strong>{t.bookStudio.foliadoStep.foundButton}</strong>.
        </ContextualGuideBox>

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
