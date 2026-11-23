import React from 'react';
import { LayoutGrid, RotateCcw, RefreshCw, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { BookImpositionOptions } from './domain/impositionEngine';
import { calculateFinalBookPageCount, effectiveSourcePageCount, hasCustomCoverConfig } from './domain/bookPageCount';
import { PanelSection } from '../../shared/core/ui/PanelSection';
import { ContextualGuideBox } from '../../shared/core/ui/ContextualGuideBox';
import { ActionGrid } from '../../shared/core/ui/ActionGrid';
import { ActionTileButton } from '../../shared/core/ui/ActionTileButton';
import { emitLidioMessage } from '../../shared/core/assistant/lidioBus';
import { radius, elevationSystem, button } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

interface BookOrganizeStepProps {
  pdfPageCount: number;
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  onNextStep?: () => void;
  onPrevStep?: () => void;
}

export const BookOrganizeStep: React.FC<BookOrganizeStepProps> = ({
  pdfPageCount,
  options,
  setOptions,
  onNextStep,
  onPrevStep,
}) => {
  const t = useText();
  const deletedCount = (options.deletedPages || []).length;
  const rotatedCount = Object.values(options.pageRotations || {}).filter((r) => r > 0).length;

  const sourcePages = effectiveSourcePageCount(pdfPageCount, options.deletedPages, options.pageOrder);
  const separateCover =
    (options.destination ?? 'A') !== 'A' &&
    (hasCustomCoverConfig(options.customCover) || hasCustomCoverConfig(options.customBackCover));
  const finalPageCount = calculateFinalBookPageCount({
    sourcePageCount: sourcePages,
    hasSourceCover: options.hasCover,
    hasCustomCover: hasCustomCoverConfig(options.customCover),
    hasCustomBackCover: hasCustomCoverConfig(options.customBackCover),
    hasSourceBackCover: options.hasBackCover,
    blankBehindCover: options.blankBehindCover,
    blankInFrontBackCover: options.blankInFrontBackCover,
    separateCover,
    refPdfPage: options.refPdfPage,
    refBookPage: options.refBookPage,
    refPageSide: options.refPageSide,
  });
  const totalSheetsToPrint = finalPageCount / 2;

  const handleRotateAllLeft90 = () => {
    setOptions((prev) => {
      const nextRotations = { ...(prev.pageRotations || {}) };
      for (let i = 1; i <= pdfPageCount; i++) {
        nextRotations[i] = ((nextRotations[i] || 0) - 90 + 360) % 360;
      }
      return { ...prev, pageRotations: nextRotations };
    });
    emitLidioMessage({
      kind: 'state',
      groupKey: 'book-organize',
      title: 'Documento girado -90°',
      body: 'Se rotaron todas las páginas juntas para corregir la orientación.',
    });
  };

  const handleResetRotations = () => {
    setOptions((prev) => ({ ...prev, pageRotations: {} }));
    emitLidioMessage({
      kind: 'state',
      groupKey: 'book-organize',
      title: 'Rotaciones restablecidas',
      body: 'Todas las páginas volvieron a 0°.',
    });
  };

  const handleRestoreAllDeleted = () => {
    setOptions((prev) => ({ ...prev, deletedPages: [] }));
    emitLidioMessage({
      kind: 'state',
      groupKey: 'book-organize',
      title: 'Páginas restauradas',
      body: 'Volvieron a aparecer todas las páginas que habías ocultado.',
    });
  };

  const handleResetOrder = () => {
    setOptions((prev) => ({ ...prev, pageOrder: [] }));
    emitLidioMessage({
      kind: 'state',
      groupKey: 'book-organize',
      title: 'Orden original restaurado',
      body: 'Se restauró la secuencia original del archivo PDF.',
    });
  };

  return (
    <div className="space-y-5 text-[var(--ui-text-primary)]">
      <PanelSection
        icon={<LayoutGrid className="w-4 h-4" />}
        title={t.bookStudio.organizeStep.title}
        helpTitle="Cómo organizar páginas"
        helpText={t.bookStudio.organizeStep.description}
      >
        <ContextualGuideBox title="Qué revisar acá">
          Tocá cualquier miniatura en el visor de la derecha para girarla, moverla, ajustarle el corte o quitar hojas que sobren.
        </ContextualGuideBox>

        <div
          className={`p-3.5 bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] space-y-2.5 ${elevationSystem.raised}`}
          style={{ borderRadius: radius.card }}
        >
          <span className="text-[11px] font-bold text-[var(--ui-text-primary)] uppercase tracking-wider block">
            {t.bookStudio.organizeStep.stateHeading}
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-[var(--ui-bg-card)] border border-[var(--ui-border)]" style={{ borderRadius: radius.control }}>
              <span className="text-[10px] text-[var(--ui-text-secondary)] block uppercase">{t.bookStudio.organizeStep.metricPdfPages}</span>
              <span className="text-base font-bold text-[var(--ui-text-primary)] mt-0.5 block">{pdfPageCount}</span>
            </div>
            <div className="p-2 bg-[var(--ui-bg-card)] border border-[var(--ui-border)]" style={{ borderRadius: radius.control }}>
              <span className="text-[10px] text-[var(--ui-text-secondary)] block uppercase">{t.bookStudio.organizeStep.metricBookPages}</span>
              <span className="text-base font-bold text-[var(--color-secondary-bright)] mt-0.5 block">{finalPageCount}</span>
            </div>
            <div className="p-2 bg-[var(--ui-bg-card)] border border-[var(--ui-border)]" style={{ borderRadius: radius.control }}>
              <span className="text-[10px] text-[var(--ui-text-secondary)] block uppercase">{t.bookStudio.organizeStep.metricSheets}</span>
              <span className="text-base font-bold text-[var(--color-secondary-bright)] mt-0.5 block">{totalSheetsToPrint}</span>
            </div>
            <div className="p-2 bg-[var(--ui-bg-card)] border border-[var(--ui-border)]" style={{ borderRadius: radius.control }}>
              <span className="text-[10px] text-[var(--ui-text-secondary)] block uppercase">{t.bookStudio.organizeStep.metricRotations}</span>
              <span className="text-base font-bold text-[var(--color-secondary-bright)] mt-0.5 block">
                {rotatedCount} {t.bookStudio.organizeStep.pagesUnit}
              </span>
            </div>
            <div className="p-2 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] col-span-2 sm:col-span-1" style={{ borderRadius: radius.control }}>
              <span className="text-[10px] text-[var(--ui-text-secondary)] block uppercase">{t.bookStudio.organizeStep.metricDeleted}</span>
              <span className="text-base font-bold text-[var(--color-status-danger-text)] mt-0.5 block">
                {deletedCount} {t.bookStudio.organizeStep.pagesUnit}
              </span>
            </div>
          </div>
        </div>
      </PanelSection>

      <PanelSection
        icon={<Layers className="w-4 h-4" />}
        title={t.bookStudio.organizeStep.batchRotationHeading}
        helpTitle="Acciones sobre todas las páginas"
        helpText="Útil cuando escaneaste un libro completo de costado o querés revertir cambios rápidos."
      >
        <ActionGrid columns={2}>
          <ActionTileButton
            role="record"
            icon={<RotateCcw className="w-5 h-5" />}
            label={t.bookStudio.organizeStep.rotateAllLeft90}
            helpText={t.bookStudio.organizeStep.rotateAllHint}
            helpGroupKey="book-organize-rotate"
            onClick={handleRotateAllLeft90}
          />
          {deletedCount > 0 && (
            <ActionTileButton
              role="record"
              icon={<RefreshCw className="w-5 h-5" />}
              label={t.bookStudio.organizeStep.restoreDeletedPages.replace('{count}', String(deletedCount))}
              helpText="Recupera todas las páginas que marcaste como eliminadas."
              helpGroupKey="book-organize-restore-del"
              onClick={handleRestoreAllDeleted}
            />
          )}
          {rotatedCount > 0 && (
            <ActionTileButton
              role="destructive"
              icon={<RefreshCw className="w-5 h-5" />}
              label={t.bookStudio.organizeStep.resetAllRotations}
              helpText="Deja todas las páginas sin giro."
              helpGroupKey="book-organize-reset-rot"
              onClick={handleResetRotations}
            />
          )}
          {(options.pageOrder || []).length > 0 && (
            <ActionTileButton
              role="destructive"
              icon={<RefreshCw className="w-5 h-5" />}
              label={t.bookStudio.organizeStep.resetOriginalOrder}
              helpText="Vuelve al orden original del PDF subido."
              helpGroupKey="book-organize-reset-order"
              onClick={handleResetOrder}
            />
          )}
        </ActionGrid>
      </PanelSection>

      <div className="pt-4 border-t border-[var(--ui-border)] flex items-center justify-between">
        {onPrevStep ? (
          <button
            type="button"
            onClick={onPrevStep}
            className={`${button.base} ${button.ghost} flex items-center gap-1.5`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{t.bookStudio.backStep}</span>
          </button>
        ) : <div />}

        {onNextStep && (
          <button
            type="button"
            onClick={onNextStep}
            className={`${button.base} ${button.primary} flex items-center gap-1.5`}
          >
            <span>{t.bookStudio.organizeStep.nextStep}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
