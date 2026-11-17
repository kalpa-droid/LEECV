import React, { useMemo } from 'react';
import { BookOpen, Home, Printer, Check, Palette, Ruler } from 'lucide-react';
import { button, input, typeScale, selectableCard, radius } from '../../shared/core/uiDesignSystem';
import { BookImpositionOptions } from '../../shared/core/book-engine/impositionEngine';
import { computeBookFinalPageCount } from '../../shared/core/book-engine/bookPageCount';
import { calculateSpineWidth } from '../../shared/core/book-engine/impositionPlanner';
import { COVER_PRESETS } from '../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';
import { useText } from '../../shared/i18n/useText';

interface BookImpositionStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  /** El PDF origen está protegido contra edición: la salida forzada es imágenes (sin elección). */
  sourceProtected?: boolean;
  /** Necesario para estimar el lomo en vivo: páginas efectivas del PDF ya subido. */
  pdfPageCount?: number;
  onNextStep: () => void;
  onPrevStep: () => void;
}

interface SwitchCardProps {
  label: string;
  help: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Tarjeta con interruptor (creep / guías / ZIP): título + ayuda + switch. */
const SwitchCard: React.FC<SwitchCardProps> = ({ label, help, checked, onChange }) => (
  <div className={`flex items-center justify-between gap-3 p-3 rounded-[${radius.control}] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)]`}>
    <span className="flex flex-col min-w-0">
      <span className={typeScale.fieldLabel}>{label}</span>
      <span className="text-xs text-[var(--ui-text-secondary)] leading-snug">{help}</span>
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 shrink-0 rounded-full transition-colors cursor-pointer ${
        checked ? 'bg-[var(--color-accent-base)]' : 'bg-[var(--ui-bg-panel)] border border-[var(--ui-border)]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

export const BookImpositionStep: React.FC<BookImpositionStepProps> = ({
  options,
  setOptions,
  sourceProtected = false,
  pdfPageCount = 0,
  onNextStep,
  onPrevStep,
}) => {
  const dest = options.destination || 'A';
  const paperThickness = options.paperThicknessMm ?? 0;
  const applyCreep = options.applyCreep ?? true;
  const exportMode = sourceProtected ? 'raster' : options.exportMode || 'vector';
  const coverStyle = options.coverStyle ?? '';
  const showGuides = options.showGuides ?? false;
  const zipByBooklet = options.zipByBooklet ?? false;
  const readingDirection = options.readingDirection ?? 'ltr';
  const t = useText();

  // Lomo estimado EN VIVO: mismo conteo exacto que usa el motor (computeBookFinalPageCount).
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

  const applyHomeProfile = () =>
    setOptions((prev) => ({ ...prev, destination: 'A', paperThicknessMm: 0.10, unprintableMarginMm: 5 }));
  const applyImprentaProfile = () =>
    setOptions((prev) => ({ ...prev, destination: 'C', paperThicknessMm: 0.12, unprintableMarginMm: 0 }));

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

  return (
    <div className="flex flex-col gap-6 p-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <BookOpen className="w-6 h-6" />
        <span>{t.bookStudio.impositionStep.title}</span>
      </h2>

      <p className="text-sm text-[var(--ui-text-secondary)] leading-relaxed">
        {t.bookStudio.impositionStep.description}
      </p>

      <div className="space-y-5">
        {/* Botones rápidos: ¿En mi casa? / ¿En imprenta? */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={applyHomeProfile}
            className={`${selectableCard.base} ${selectableCard.unselected} flex flex-col items-start gap-1 p-4 text-left`}
          >
            <span className="flex items-center gap-2 text-base font-bold text-[var(--ui-text-primary)]">
              <Home className="w-5 h-5 text-[var(--color-accent-text)] shrink-0" />
              {t.bookStudio.impositionStep.quickHomeLabel}
            </span>
            <span className="text-xs text-[var(--ui-text-secondary)] leading-snug">
              {t.bookStudio.impositionStep.quickHomeHint}
            </span>
          </button>
          <button
            type="button"
            onClick={applyImprentaProfile}
            className={`${selectableCard.base} ${selectableCard.unselected} flex flex-col items-start gap-1 p-4 text-left`}
          >
            <span className="flex items-center gap-2 text-base font-bold text-[var(--ui-text-primary)]">
              <Printer className="w-5 h-5 text-[var(--color-accent-text)] shrink-0" />
              {t.bookStudio.impositionStep.quickImprentaLabel}
            </span>
            <span className="text-xs text-[var(--ui-text-secondary)] leading-snug">
              {t.bookStudio.impositionStep.quickImprentaHint}
            </span>
          </button>
        </div>
        <p className="text-xs text-[var(--color-accent-text)] font-semibold leading-snug">
          {t.bookStudio.impositionStep.quickDoubleSideHint}
        </p>

        {/* Destino de la cubierta: tarjetas A / B / C con mini-diagrama */}
        <div>
          <span className={typeScale.fieldLabel}>{t.bookStudio.impositionStep.destinationLabel}</span>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {destinationCards.map(({ id, sub, svg }) => {
              const selected = dest === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setOptions((prev) => ({ ...prev, destination: id }))}
                  aria-pressed={selected}
                  className={`${selectableCard.base} ${selected ? selectableCard.selected : selectableCard.unselected} flex flex-col items-center gap-1.5 p-3 text-center`}
                >
                  <span className="text-[var(--ui-text-secondary)]">{svg}</span>
                  <span className="text-sm font-bold text-[var(--ui-text-primary)]">{id}</span>
                  <span className="text-[11px] leading-snug text-[var(--ui-text-secondary)]">{sub}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-[var(--ui-text-secondary)]">{t.bookStudio.impositionStep.destinationHelp}</p>
        </div>

        {/* Grosor del papel: 4 tarjetas + pill de lomo en vivo */}
        <div>
          <span className={typeScale.fieldLabel}>{t.bookStudio.impositionStep.paperThicknessLabel}</span>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {thicknessOptions.map(({ value, label }) => {
              const selected = paperThickness === value && !isCustomThickness;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOptions((prev) => ({ ...prev, paperThicknessMm: value }))}
                  aria-pressed={selected}
                  className={`${selectableCard.base} ${selected ? selectableCard.selected : selectableCard.unselected} flex flex-col items-center justify-center gap-0.5 p-2 text-xs font-medium text-[var(--ui-text-primary)] text-center min-h-[52px]`}
                >
                  {label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setOptions((prev) => ({ ...prev, paperThicknessMm: 0.09 }))}
              aria-pressed={isCustomThickness}
              className={`${selectableCard.base} ${isCustomThickness ? selectableCard.selected : selectableCard.unselected} flex flex-col items-center justify-center gap-0.5 p-2 text-xs font-medium text-[var(--ui-text-primary)] min-h-[52px]`}
            >
              {t.bookStudio.impositionStep.thicknessOther}
            </button>
          </div>
          {isCustomThickness && (
            <input
              type="number"
              value={paperThickness}
              onChange={(e) => setOptions((prev) => ({ ...prev, paperThicknessMm: Number(e.target.value) || 0 }))}
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

        {/* Switches: creep / guías / ZIP por cuadernillo */}
        <SwitchCard
          label={t.bookStudio.impositionStep.creepCheckbox}
          help={t.bookStudio.impositionStep.creepHelp}
          checked={applyCreep}
          onChange={(v) => setOptions((prev) => ({ ...prev, applyCreep: v }))}
        />
        <SwitchCard
          label={t.bookStudio.impositionStep.guidesCheckbox}
          help={t.bookStudio.impositionStep.guidesHelp}
          checked={showGuides}
          onChange={(v) => setOptions((prev) => ({ ...prev, showGuides: v }))}
        />
        <SwitchCard
          label={t.bookStudio.impositionStep.zipByBookletLabel}
          help={t.bookStudio.impositionStep.zipByBookletHelp}
          checked={zipByBooklet}
          onChange={(v) => setOptions((prev) => ({ ...prev, zipByBooklet: v }))}
        />

        {/* Calidad de salida: botones segmentados (bloqueado si PDF protegido) */}
        <div>
          <span className={typeScale.fieldLabel}>{t.bookStudio.impositionStep.exportModeLabel}</span>
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
          {sourceProtected ? (
            <p className="mt-1 text-xs font-semibold text-[var(--color-accent-text)]">
              {t.bookStudio.impositionStep.protectionAutoRaster}
            </p>
          ) : (
            <p className="mt-1 text-xs text-[var(--ui-text-secondary)]">{t.bookStudio.impositionStep.exportModeHelp}</p>
          )}
        </div>

        {/* Dirección de lectura: botones segmentados */}
        <div>
          <span className={typeScale.fieldLabel}>{t.bookStudio.impositionStep.readingDirectionLabel}</span>
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
          <p className="mt-1 text-xs text-[var(--ui-text-secondary)]">{t.bookStudio.impositionStep.readingDirectionHelp}</p>
        </div>

        {/* Estilo de cubierta: selector de presets (mismo catálogo del Paso 3) */}
        <div>
          <span className={typeScale.fieldLabel}>{t.bookStudio.impositionStep.coverStyleLabel}</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOptions((prev) => ({ ...prev, coverStyle: '' }))}
              aria-pressed={coverStyle === ''}
              className={`${selectableCard.base} ${coverStyle === '' ? selectableCard.selected : selectableCard.unselected} flex items-center justify-between gap-2 p-2.5 text-xs text-left`}
            >
              <span className="flex items-center gap-2 overflow-hidden">
                <Palette className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
                <span className="truncate font-medium text-[var(--ui-text-primary)]">
                  {t.bookStudio.impositionStep.coverStyleFromEditor}
                </span>
              </span>
              {coverStyle === '' && <Check className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />}
            </button>
            {COVER_PRESETS.map((preset) => {
              const selected = coverStyle === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setOptions((prev) => ({ ...prev, coverStyle: preset.id }))}
                  aria-pressed={selected}
                  className={`${selectableCard.base} ${selected ? selectableCard.selected : selectableCard.unselected} flex items-center justify-between gap-2 p-2.5 text-xs text-left`}
                >
                  <span className="flex items-center gap-2 overflow-hidden">
                    <span className="w-4 h-4 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: preset.badgeBg }} />
                    <span className="truncate font-medium text-[var(--ui-text-primary)]">{preset.name}</span>
                  </span>
                  {selected && <Check className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

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
    </div>
  );
};
