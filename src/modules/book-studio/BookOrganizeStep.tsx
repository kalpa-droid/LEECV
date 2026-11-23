import React, { useRef, useState } from 'react';
import {
  LayoutGrid,
  RotateCcw,
  RotateCw,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Layers,
  BookMarked,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { BookImpositionOptions } from './domain/impositionEngine';
import { computeBookFinalPageCount } from './domain/bookPageCount';
import {
  analyzeFullBookOrientationWithAi,
  analyzeSampleOrientationWithAi,
  OrientationConsensusResult,
} from './domain/bookOrientationAi';
import {
  BookSectionDivider,
  makeDividerPageToken,
  resolveBookOrderedItems,
} from './domain/bookDividerCanvas';
import { BookSectionDividerModal } from './components/BookSectionDividerModal';
import { PanelSection } from '../../shared/core/ui/PanelSection';
import { ContextualGuideBox } from '../../shared/core/ui/ContextualGuideBox';
import { ActionGrid } from '../../shared/core/ui/ActionGrid';
import { ActionTileButton } from '../../shared/core/ui/ActionTileButton';
import { AIButton } from '../../shared/core/ui/AIButton';
import { emitLidioMessage } from '../../shared/core/assistant/lidioBus';
import { radius, elevationSystem, button } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

interface BookOrganizeStepProps {
  pdfPageCount: number;
  pdfDoc?: any;
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  onNextStep?: () => void;
  onPrevStep?: () => void;
}

export const BookOrganizeStep: React.FC<BookOrganizeStepProps> = ({
  pdfPageCount,
  pdfDoc,
  options,
  setOptions,
  onNextStep,
  onPrevStep,
}) => {
  const t = useText();
  const deletedCount = (options.deletedPages || []).length;
  const rotatedCount = Object.values(options.pageRotations || {}).filter((r) => r > 0).length;
  const dividers = options.sectionDividers || [];

  const finalPageCount = computeBookFinalPageCount(options, pdfPageCount);
  const totalSheetsToPrint = finalPageCount / 2;

  const [mixedConsensus, setMixedConsensus] = useState<OrientationConsensusResult | null>(null);
  const [fullScanProgress, setFullScanProgress] = useState<{ done: number; total: number } | null>(null);
  const [isDividerModalOpen, setIsDividerModalOpen] = useState<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);

  const applyBatchRotationDelta = (deltaDeg: number, label: string) => {
    setOptions((prev) => {
      const nextRotations = { ...(prev.pageRotations || {}) };
      for (let i = 1; i <= pdfPageCount; i++) {
        nextRotations[i] = (((nextRotations[i] || 0) + deltaDeg) % 360 + 360) % 360;
      }
      return { ...prev, pageRotations: nextRotations, lowConfidenceRotationPages: [] };
    });
    emitLidioMessage({
      kind: 'state',
      groupKey: 'book-organize',
      title: `Documento girado ${label}`,
      body: 'Se rotaron todas las páginas juntas para corregir la orientación.',
    });
  };

  const handleRunOrientationAi = async (): Promise<string> => {
    if (!pdfDoc || pdfPageCount <= 0) {
      throw new Error('Cargá primero un PDF en el Paso 1.');
    }
    setMixedConsensus(null);
    const consensus = await analyzeSampleOrientationWithAi({
      pdfDoc,
      totalPages: pdfPageCount,
      deletedPages: options.deletedPages || [],
    });

    if (consensus.status === 'uniform' && consensus.uniformRotationDeg !== null) {
      const angle = consensus.uniformRotationDeg;
      setOptions((prev) => {
        const nextRot: Record<number, number> = {};
        for (let i = 1; i <= pdfPageCount; i++) nextRot[i] = angle;
        return { ...prev, pageRotations: nextRot, lowConfidenceRotationPages: [] };
      });
      emitLidioMessage({
        kind: 'state',
        groupKey: 'book-orientation-ai',
        title: 'Orientación uniforme aplicada',
        body: consensus.summaryText,
      });
      return consensus.summaryText;
    }

    if (consensus.status === 'mixed') {
      setMixedConsensus(consensus);
      return consensus.summaryText;
    }

    throw new Error(consensus.summaryText);
  };

  const handleRunFullBookScan = async () => {
    if (!pdfDoc || pdfPageCount <= 0) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setFullScanProgress({ done: 0, total: pdfPageCount });

    try {
      const res = await analyzeFullBookOrientationWithAi({
        pdfDoc,
        totalPages: pdfPageCount,
        deletedPages: options.deletedPages || [],
        knownSamples: mixedConsensus?.samples || [],
        signal: controller.signal,
        onProgress: (done, total) => setFullScanProgress({ done, total }),
      });

      setOptions((prev) => ({
        ...prev,
        pageRotations: res.rotations,
        lowConfidenceRotationPages: res.lowConfidencePages,
      }));
      setMixedConsensus(null);
      emitLidioMessage({
        kind: 'state',
        groupKey: 'book-orientation-ai',
        title: 'Orientación página por página completada',
        body:
          res.lowConfidencePages.length > 0
            ? `Se orientaron las páginas con IA. Revisá ${res.lowConfidencePages.length} página(s) marcadas.`
            : 'Todas las páginas quedaron orientadas automáticamente.',
      });
    } catch {
      // cancelado o error
    } finally {
      setFullScanProgress(null);
    }
  };

  const handleSaveDivider = (divider: BookSectionDivider) => {
    setOptions((prev) => {
      const existing = prev.sectionDividers || [];
      const nextDividers = [...existing, divider];
      const token = makeDividerPageToken(divider.id);
      const baseOrder = resolveBookOrderedItems({
        pdfPageCount,
        pageOrder: prev.pageOrder,
        sectionDividers: existing,
      });
      const targetPage = Math.max(1, Number(divider.insertBeforePage) || 1);
      const idx = baseOrder.findIndex((it) => typeof it === 'number' && it >= targetPage);
      if (idx === -1) baseOrder.push(token);
      else baseOrder.splice(idx, 0, token);
      return {
        ...prev,
        sectionDividers: nextDividers,
        pageOrder: baseOrder,
      };
    });
  };

  const handleRemoveDivider = (id: string) => {
    setOptions((prev) => {
      const token = makeDividerPageToken(id);
      return {
        ...prev,
        sectionDividers: (prev.sectionDividers || []).filter((d) => d.id !== id),
        pageOrder: (prev.pageOrder || []).filter((it) => String(it) !== token),
      };
    });
  };

  return (
    <div className="space-y-5 text-[var(--ui-text-primary)]">
      <PanelSection
        icon={<LayoutGrid className="w-4 h-4" />}
        title={t.bookStudio.organizeStep.title}
        helpTitle="Cómo organizar páginas"
        helpText={t.bookStudio.organizeStep.description}
        headerRight={
          <AIButton
            iconOnly={false}
            label="Orientar con IA"
            disabled={!pdfDoc || pdfPageCount <= 0 || Boolean(fullScanProgress)}
            onGenerate={handleRunOrientationAi}
            onSuccess={() => {}}
            helpText="Envía las páginas 2, 5, 10 y 15 para detectar hacia qué lado giran sin dejarlas patas para arriba."
          />
        }
      >
        <ContextualGuideBox title="Qué revisar acá">
          Tocá cualquier miniatura en el visor de la derecha para girarla, moverla, ajustarle el corte o insertar carátulas separadoras.
        </ContextualGuideBox>

        {mixedConsensus && !fullScanProgress && (
          <div
            className="p-3.5 border-2 border-[var(--color-status-warning-base)] bg-[var(--color-status-warning-muted)] space-y-2.5"
            style={{ borderRadius: radius.card }}
          >
            <p className="text-xs font-bold text-[var(--color-status-warning-text)]">
              {mixedConsensus.summaryText}
            </p>
            <p className="text-[11px] text-[var(--color-status-warning-text)]">
              ¿Querés girarlas manualmente en la grilla o que la IA revise una imagen muy comprimida de cada página para girarlas una por una?
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => void handleRunFullBookScan()}
                className={`${button.base} ${button.primary} flex-1 flex items-center justify-center gap-1.5 text-xs font-bold`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Que la IA revise cada página</span>
              </button>
              <button
                type="button"
                onClick={() => setMixedConsensus(null)}
                className={`${button.base} ${button.secondary} text-xs font-bold`}
              >
                Girar manualmente
              </button>
            </div>
          </div>
        )}

        {fullScanProgress && (
          <div
            className="p-3 border border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)] space-y-2"
            style={{ borderRadius: radius.card }}
          >
            <div className="flex items-center justify-between text-xs font-bold text-[var(--color-accent-text)]">
              <span>
                Analizando orientación ({fullScanProgress.done} de {fullScanProgress.total} págs.)...
              </span>
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="underline text-[var(--color-status-danger-text)] cursor-pointer"
              >
                Detener
              </button>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--ui-bg-card)] overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent-base)] transition-all"
                style={{
                  width: `${Math.min(100, Math.round((fullScanProgress.done / Math.max(1, fullScanProgress.total)) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}

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
            label="Girar todas -90° (↺)"
            helpText="Gira todas las páginas 90° hacia la izquierda."
            helpGroupKey="book-organize-rotate-left"
            onClick={() => applyBatchRotationDelta(-90, '-90°')}
          />
          <ActionTileButton
            role="record"
            icon={<RotateCw className="w-5 h-5" />}
            label="Girar todas +90° (↻)"
            helpText="Gira todas las páginas 90° hacia la derecha."
            helpGroupKey="book-organize-rotate-right"
            onClick={() => applyBatchRotationDelta(90, '+90°')}
          />
          <ActionTileButton
            role="record"
            icon={<RefreshCw className="w-5 h-5" />}
            label="Girar todas 180°"
            helpText="Da media vuelta a todas las páginas si quedaron patas para arriba."
            helpGroupKey="book-organize-rotate-180"
            onClick={() => applyBatchRotationDelta(180, '180°')}
          />
          <ActionTileButton
            role="preset"
            icon={<BookMarked className="w-5 h-5" />}
            label="＋ Separador capítulo"
            helpText="Inserta una carátula separadora (con o sin hoja blanca detrás) antes de cualquier página."
            helpGroupKey="book-organize-add-divider"
            onClick={() => setIsDividerModalOpen(true)}
          />
          {deletedCount > 0 && (
            <ActionTileButton
              role="record"
              icon={<RefreshCw className="w-5 h-5" />}
              label={t.bookStudio.organizeStep.restoreDeletedPages.replace('{count}', String(deletedCount))}
              helpText="Recupera todas las páginas que marcaste como eliminadas."
              helpGroupKey="book-organize-restore-del"
              onClick={() => setOptions((prev) => ({ ...prev, deletedPages: [] }))}
            />
          )}
          {rotatedCount > 0 && (
            <ActionTileButton
              role="destructive"
              icon={<RefreshCw className="w-5 h-5" />}
              label={t.bookStudio.organizeStep.resetAllRotations}
              helpText="Deja todas las páginas sin giro."
              helpGroupKey="book-organize-reset-rot"
              onClick={() => setOptions((prev) => ({ ...prev, pageRotations: {}, lowConfidenceRotationPages: [] }))}
            />
          )}
        </ActionGrid>

        {dividers.length > 0 && (
          <div className="space-y-1.5 pt-2">
            <span className="text-[11px] font-bold text-[var(--ui-text-secondary)] block">
              Separadores insertados ({dividers.length}):
            </span>
            {dividers.map((div) => (
              <div
                key={div.id}
                className="p-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-card)] flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-bold text-[var(--ui-text-primary)] truncate block">
                    {div.kicker ? `${div.kicker}: ` : ''}{div.title}
                  </span>
                  <span className="text-[10px] text-[var(--ui-text-secondary)]">
                    Antes de Pág. {div.insertBeforePage} · {div.blankBehind ? 'Con hoja blanca detrás (2 págs.)' : 'Solo 1 página'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveDivider(div.id)}
                  className="p-1 text-[var(--color-status-danger-text)] hover:opacity-80 cursor-pointer"
                  title="Eliminar separador"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
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

      <BookSectionDividerModal
        isOpen={isDividerModalOpen}
        onClose={() => setIsDividerModalOpen(false)}
        pdfPageCount={pdfPageCount}
        defaultCoverStyle={options.customCover?.coverStyle || options.coverStyle || 'monica-classic'}
        paperSize={options.paperSize}
        onSaveDivider={handleSaveDivider}
      />
    </div>
  );
};
