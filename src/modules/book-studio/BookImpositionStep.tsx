import React, { useMemo } from 'react';
import { BookOpen, Ruler, Settings2, SlidersHorizontal, Sparkles } from 'lucide-react';
import { button, input, typeScale, selectableCard, radius } from '../../shared/core/uiDesignSystem';
import { BookImpositionOptions } from './domain/impositionEngine';
import { computeBookFinalPageCount } from './domain/bookPageCount';
import { calculateSpineWidth } from '../../shared/kits/print-imposition/impositionPlanner';
import { getCoverPresetById } from '../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';
import { useText } from '../../shared/i18n/useText';
import { PanelSection } from '../../shared/core/ui/PanelSection';
import { ContextualGuideBox } from '../../shared/core/ui/ContextualGuideBox';
import { SectionSwitch } from '../../shared/core/ui/SectionSwitch';
import { LidioHelpTrigger } from '../../shared/core/ui/LidioHelpTrigger';
import { ManualOverrideBadge } from '../../shared/core/ui/ManualOverrideBadge';
import { isManuallyOverridden } from '../../shared/core/presets/configCascadeEngine';
import { emitLidioMessage } from '../../shared/core/assistant/lidioBus';
import {
  BOOK_PRINT_PROFILES,
  clearBookFieldManual,
  inferBookPrintTarget,
  markBookFieldManual,
  resolveBookPaperSpec,
} from './domain/bookPrintProfileEngine';

interface BookImpositionStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  /** El PDF origen está protegido contra edición: la salida forzada es imágenes (sin elección). */
  sourceProtected?: boolean;
  /** Necesario para estimar el lomo en vivo: páginas efectivas del PDF ya subido. */
  pdfPageCount?: number;
  /** Permite abrir el modal de destino global si se quiere cambiar Casa vs Imprenta. */
  onOpenPrintTargetModal?: () => void;
  /** Permite abrir el modal de hoja física desde el resumen. */
  onOpenPaperModal?: () => void;
  /** Salta al paso de Tapa para editar estilo visual sin duplicar el selector. */
  onGoToCoverStep?: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
}

interface SwitchRowProps {
  label: string;
  help: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  overrideBadge?: React.ReactNode;
}

/** Fila con interruptor canónico (`SectionSwitch`), ayuda `?` de Lidio e insignia de ajuste manual. */
const SwitchRow: React.FC<SwitchRowProps> = ({ label, help, checked, onChange, overrideBadge }) => (
  <div
    className="flex items-center justify-between gap-3 p-3 bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]"
    style={{ borderRadius: radius.control }}
  >
    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
      <span className={typeScale.fieldLabel}>{label}</span>
      <LidioHelpTrigger title={label} text={help} groupKey={`book-switch-${label}`} />
      {overrideBadge}
    </div>
    <SectionSwitch
      checked={checked}
      onChange={onChange}
      label={label}
      helpText={help}
      size="sm"
    />
  </div>
);

export const BookImpositionStep: React.FC<BookImpositionStepProps> = ({
  options,
  setOptions,
  sourceProtected = false,
  pdfPageCount = 0,
  onOpenPrintTargetModal,
  onOpenPaperModal,
  onGoToCoverStep,
  onNextStep,
  onPrevStep,
}) => {
  const dest = options.destination || 'A';
  const paperThickness = options.paperThicknessMm ?? 0;
  const applyCreep = options.applyCreep ?? true;
  const exportMode = sourceProtected ? 'raster' : options.exportMode || 'vector';
  const showGuides = options.showGuides ?? false;
  const zipByBooklet = options.zipByBooklet ?? false;
  const readingDirection = options.readingDirection ?? 'ltr';
  const activePrintTarget = inferBookPrintTarget(options);
  const activeProfile = BOOK_PRINT_PROFILES[activePrintTarget];
  const paperSpec = resolveBookPaperSpec(options.paperSize);
  const t = useText();

  const finalPageCount = useMemo(() => computeBookFinalPageCount(options, pdfPageCount), [options, pdfPageCount]);
  const spineMm = calculateSpineWidth(finalPageCount, { paperThicknessMm: paperThickness });
  const spinePill =
    paperThickness > 0
      ? t.bookStudio.impositionStep.spinePill.replace('{mm}', spineMm.toFixed(1))
      : t.bookStudio.impositionStep.spinePillNone;

  const thicknessOptions: Array<{ value: number; label: string }> = [
    { value: 0, label: t.bookStudio.impositionStep.thicknessNone },
    { value: 0.10, label: t.bookStudio.impositionStep.thicknessCommon },
    { value: 0.12, label: t.bookStudio.impositionStep.thicknessLight },
  ];
  const isCustomThickness = paperThickness !== 0 && paperThickness !== 0.10 && paperThickness !== 0.12;

  const destinationCards: Array<{ id: 'A' | 'B' | 'C'; sub: string; svg: React.ReactNode }> = [
    {
      id: 'A',
      sub: t.bookStudio.impositionStep.destinationASub,
      svg: (
        <svg viewBox="0 0 88 56" className="w-full h-14" aria-hidden="true">
          <rect x="3" y="6" width="82" height="44" rx="4" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="2" />
          <rect x="10" y="15" width="10" height="26" fill="currentColor" fillOpacity="0.18" />
          <rect x="23" y="15" width="10" height="26" fill="currentColor" fillOpacity="0.18" />
          <rect x="36" y="15" width="10" height="26" fill="currentColor" fillOpacity="0.18" />
          <rect x="49" y="15" width="10" height="26" fill="currentColor" fillOpacity="0.18" />
          <rect x="62" y="15" width="10" height="26" fill="var(--color-accent-base)" fillOpacity="0.85" />
        </svg>
      ),
    },
    {
      id: 'B',
      sub: t.bookStudio.impositionStep.destinationBSub,
      svg: (
        <svg viewBox="0 0 88 56" className="w-full h-14" aria-hidden="true">
          <rect x="3" y="8" width="46" height="40" rx="4" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="2" />
          <rect x="9" y="17" width="9" height="22" fill="currentColor" fillOpacity="0.18" />
          <rect x="20" y="17" width="9" height="22" fill="currentColor" fillOpacity="0.18" />
          <rect x="31" y="17" width="9" height="22" fill="currentColor" fillOpacity="0.18" />
          <rect x="58" y="8" width="27" height="40" rx="4" fill="var(--color-accent-base)" fillOpacity="0.85" />
        </svg>
      ),
    },
    {
      id: 'C',
      sub: t.bookStudio.impositionStep.destinationCSub,
      svg: (
        <svg viewBox="0 0 88 44" className="w-full h-14" aria-hidden="true">
          <rect x="3" y="4" width="34" height="36" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="2" />
          <rect x="37" y="4" width="10" height="36" fill="var(--color-accent-base)" fillOpacity="0.85" />
          <rect x="47" y="4" width="34" height="36" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="2" />
        </svg>
      ),
    },
  ];

  const activeCoverStyleId = options.customCover?.coverStyle || options.coverStyle || '';
  const activeCoverPreset = activeCoverStyleId ? getCoverPresetById(activeCoverStyleId) : null;

  return (
    <div className="flex flex-col gap-5">
      <PanelSection
        icon={<BookOpen className="w-4 h-4" />}
        title={t.bookStudio.impositionStep.title}
        helpTitle="Qué configurás en Armado y Guías"
        helpText={t.bookStudio.impositionStep.description}
      >
        <ContextualGuideBox title="Recordatorio de impresión">
          {t.bookStudio.impositionStep.quickDoubleSideHint}
        </ContextualGuideBox>

        {/* Resumen enlazado con los 2 globales de barra superior (cero duplicación) */}
        <div
          className="p-3 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] flex flex-wrap items-center justify-between gap-2"
          style={{ borderRadius: radius.control }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Settings2 className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
            <span className="text-xs font-bold text-[var(--ui-text-primary)] truncate">
              {activeProfile.shortName} · Hoja ({paperSpec.pageSize.name})
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenPrintTargetModal && (
              <button
                type="button"
                onClick={onOpenPrintTargetModal}
                className="px-2.5 py-1 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-[11px] font-bold text-[var(--color-accent-text)] cursor-pointer hover:border-[var(--color-accent-base)]"
              >
                Destino
              </button>
            )}
            {onOpenPaperModal && (
              <button
                type="button"
                onClick={onOpenPaperModal}
                className="px-2.5 py-1 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-[11px] font-bold text-[var(--color-accent-text)] cursor-pointer hover:border-[var(--color-accent-base)]"
              >
                Hoja
              </button>
            )}
          </div>
        </div>

        {/* Destino de la cubierta: A / B / C */}
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={typeScale.fieldLabel}>{t.bookStudio.impositionStep.destinationLabel}</span>
            <LidioHelpTrigger
              title={t.bookStudio.impositionStep.destinationLabel}
              text={t.bookStudio.impositionStep.destinationHelp}
              groupKey="book-destination"
            />
            <ManualOverrideBadge
              isOverridden={isManuallyOverridden(options.manualOverrides, 'destination')}
              globalLabel={activeProfile.shortName}
              onReset={() => setOptions((prev) => clearBookFieldManual(prev, 'destination'))}
            />
          </div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {destinationCards.map(({ id, sub, svg }) => {
              const selected = dest === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setOptions((prev) => {
                      const updated = { ...prev, destination: id };
                      return id === activeProfile.defaults.destination
                        ? clearBookFieldManual(updated, 'destination')
                        : markBookFieldManual(updated, 'destination');
                    });
                    emitLidioMessage({
                      kind: 'state',
                      groupKey: 'book-destination',
                      title: `Cubierta modo ${id}`,
                      body: sub,
                    });
                  }}
                  aria-pressed={selected}
                  className={`${selectableCard.base} ${selected ? selectableCard.selected : selectableCard.unselected} flex flex-col items-center gap-1.5 p-3 text-center cursor-pointer`}
                >
                  <span className="text-[var(--ui-text-secondary)]">{svg}</span>
                  <span className="text-sm font-bold text-[var(--ui-text-primary)]">{id}</span>
                  <span className="text-[11px] leading-snug text-[var(--ui-text-secondary)]">{sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grosor del papel */}
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={typeScale.fieldLabel}>{t.bookStudio.impositionStep.paperThicknessLabel}</span>
            <ManualOverrideBadge
              isOverridden={isManuallyOverridden(options.manualOverrides, 'paperThicknessMm')}
              globalLabel={activeProfile.shortName}
              onReset={() => setOptions((prev) => clearBookFieldManual(prev, 'paperThicknessMm'))}
            />
          </div>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {thicknessOptions.map(({ value, label }) => {
              const selected = paperThickness === value && !isCustomThickness;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setOptions((prev) => {
                      const updated = { ...prev, paperThicknessMm: value };
                      return value === activeProfile.defaults.paperThicknessMm
                        ? clearBookFieldManual(updated, 'paperThicknessMm')
                        : markBookFieldManual(updated, 'paperThicknessMm');
                    })
                  }
                  aria-pressed={selected}
                  className={`${selectableCard.base} ${selected ? selectableCard.selected : selectableCard.unselected} flex flex-col items-center justify-center gap-0.5 p-2 text-xs font-medium text-[var(--ui-text-primary)] text-center min-h-[52px] cursor-pointer`}
                >
                  {label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setOptions((prev) => markBookFieldManual({ ...prev, paperThicknessMm: 0.09 }, 'paperThicknessMm'))}
              aria-pressed={isCustomThickness}
              className={`${selectableCard.base} ${isCustomThickness ? selectableCard.selected : selectableCard.unselected} flex flex-col items-center justify-center gap-0.5 p-2 text-xs font-medium text-[var(--ui-text-primary)] min-h-[52px] cursor-pointer`}
            >
              {t.bookStudio.impositionStep.thicknessOther}
            </button>
          </div>
          {isCustomThickness && (
            <input
              type="number"
              value={paperThickness}
              onChange={(e) => setOptions((prev) => markBookFieldManual({ ...prev, paperThicknessMm: Number(e.target.value) || 0 }, 'paperThicknessMm'))}
              className={`${input.base} mt-2 w-40`}
              placeholder={t.bookStudio.impositionStep.thicknessOtherPlaceholder}
              step="0.01"
              min={0}
            />
          )}
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] text-xs font-bold text-[var(--ui-text-primary)] w-fit">
            <Ruler className="w-3.5 h-3.5 text-[var(--color-accent-text)]" />
            {spinePill}
          </div>
        </div>
      </PanelSection>

      <PanelSection
        icon={<SlidersHorizontal className="w-4 h-4" />}
        title="Opciones de plegado"
        helpTitle="Compensación, guías y cuadernillos"
        helpText="Cada opción tiene su signo ? con el detalle exacto."
      >
        <div className="space-y-2.5">
          <SwitchRow
            label={t.bookStudio.impositionStep.creepCheckbox}
            help={t.bookStudio.impositionStep.creepHelp}
            checked={applyCreep}
            onChange={(v) => {
              setOptions((prev) => {
                const updated = { ...prev, applyCreep: v };
                return v === activeProfile.defaults.applyCreep
                  ? clearBookFieldManual(updated, 'applyCreep')
                  : markBookFieldManual(updated, 'applyCreep');
              });
              emitLidioMessage({
                kind: 'state',
                groupKey: 'book-creep',
                title: v ? 'Compensación interna activada' : 'Compensación interna desactivada',
                body: v
                  ? 'Las hojas centrales se ajustan para que el borde quede parejo al doblar.'
                  : 'Todas las hojas mantienen exactamente el mismo margen.',
              });
            }}
            overrideBadge={
              <ManualOverrideBadge
                isOverridden={isManuallyOverridden(options.manualOverrides, 'applyCreep')}
                globalLabel={activeProfile.shortName}
                onReset={() => setOptions((prev) => clearBookFieldManual(prev, 'applyCreep'))}
              />
            }
          />
          <SwitchRow
            label={t.bookStudio.impositionStep.guidesCheckbox}
            help={t.bookStudio.impositionStep.guidesHelp}
            checked={showGuides}
            onChange={(v) => {
              setOptions((prev) => {
                const updated = { ...prev, showGuides: v };
                return v === activeProfile.defaults.showGuides
                  ? clearBookFieldManual(updated, 'showGuides')
                  : markBookFieldManual(updated, 'showGuides');
              });
              emitLidioMessage({
                kind: 'state',
                groupKey: 'book-guides',
                title: v ? 'Guías de armado visibles' : 'Guías ocultas',
                body: v
                  ? 'Verás líneas suaves de doblez y recorte en cada hoja.'
                  : 'Las hojas salen limpias sin marcas de doblez.',
              });
            }}
            overrideBadge={
              <ManualOverrideBadge
                isOverridden={isManuallyOverridden(options.manualOverrides, 'showGuides')}
                globalLabel={activeProfile.shortName}
                onReset={() => setOptions((prev) => clearBookFieldManual(prev, 'showGuides'))}
              />
            }
          />
          <SwitchRow
            label={t.bookStudio.impositionStep.zipByBookletLabel}
            help={t.bookStudio.impositionStep.zipByBookletHelp}
            checked={zipByBooklet}
            onChange={(v) => {
              setOptions((prev) => ({ ...prev, zipByBooklet: v }));
              emitLidioMessage({
                kind: 'state',
                groupKey: 'book-zip-booklet',
                title: v ? 'Descarga dividida por cuadernillo' : 'Descarga en un solo PDF',
                body: v
                  ? 'Se generará un ZIP con un archivo separado por cada cuadernillo.'
                  : 'Todo el libro saldrá en un único archivo.',
              });
            }}
          />
        </div>
      </PanelSection>

      <PanelSection
        icon={<Sparkles className="w-4 h-4" />}
        title="Salida y lectura"
        helpTitle="Calidad y orden de lectura"
        helpText={sourceProtected ? t.bookStudio.impositionStep.protectionAutoRaster : t.bookStudio.impositionStep.exportModeHelp}
      >
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-1.5">
              <span className={typeScale.fieldLabel}>{t.bookStudio.impositionStep.exportModeLabel}</span>
              <LidioHelpTrigger
                title={t.bookStudio.impositionStep.exportModeLabel}
                text={t.bookStudio.impositionStep.exportModeHelp}
                groupKey="book-export-mode"
              />
            </div>
            <div className="mt-2 inline-flex rounded-[10px] border border-[var(--ui-border)] overflow-hidden">
              {(['vector', 'raster'] as const).map((mode) => {
                const selected = exportMode === mode;
                const label =
                  mode === 'vector'
                    ? t.bookStudio.impositionStep.exportModeVector
                    : t.bookStudio.impositionStep.exportModeRaster;
                return (
                  <button
                    key={mode}
                    type="button"
                    disabled={sourceProtected}
                    onClick={() => setOptions((prev) => ({ ...prev, exportMode: mode }))}
                    aria-pressed={selected}
                    className={`px-4 py-2 text-xs font-bold transition-colors ${
                      selected
                        ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
                        : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-surface)]'
                    } ${sourceProtected ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {sourceProtected && (
              <p className="mt-1 text-xs font-semibold text-[var(--color-accent-text)]">
                {t.bookStudio.impositionStep.protectionAutoRaster}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className={typeScale.fieldLabel}>{t.bookStudio.impositionStep.readingDirectionLabel}</span>
              <LidioHelpTrigger
                title={t.bookStudio.impositionStep.readingDirectionLabel}
                text={t.bookStudio.impositionStep.readingDirectionHelp}
                groupKey="book-reading-direction"
              />
            </div>
            <div className="mt-2 inline-flex rounded-[10px] border border-[var(--ui-border)] overflow-hidden">
              {(['ltr', 'rtl'] as const).map((dir) => {
                const selected = readingDirection === dir;
                return (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => setOptions((prev) => ({ ...prev, readingDirection: dir }))}
                    aria-pressed={selected}
                    className={`px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
                        : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-surface)]'
                    }`}
                  >
                    {dir === 'ltr'
                      ? t.bookStudio.impositionStep.readingDirectionLtrShort
                      : t.bookStudio.impositionStep.readingDirectionRtlShort}
                  </button>
                );
              })}
            </div>
          </div>

          {onGoToCoverStep && (
            <div
              className="p-2.5 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] flex items-center justify-between gap-2"
              style={{ borderRadius: radius.control }}
            >
              <span className="text-[11px] font-semibold text-[var(--ui-text-secondary)] truncate">
                Estilo de cubierta: <strong className="text-[var(--ui-text-primary)]">{activeCoverPreset?.name || 'Personalizado'}</strong>
              </span>
              <button
                type="button"
                onClick={onGoToCoverStep}
                className="px-2.5 py-1 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-[11px] font-bold text-[var(--color-accent-text)] cursor-pointer shrink-0"
              >
                Editar en 3. Tapa
              </button>
            </div>
          )}
        </div>
      </PanelSection>

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={onPrevStep}
          className={`${button.base} bg-[var(--ui-bg-card)] border border-[var(--ui-border)] text-[var(--ui-text-secondary)]`}
        >
          {t.bookStudio.previousStep}
        </button>
        <button
          type="button"
          onClick={onNextStep}
          className={`${button.base} bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]`}
        >
          {t.bookStudio.impositionStep.nextStep}
        </button>
      </div>
    </div>
  );
};
