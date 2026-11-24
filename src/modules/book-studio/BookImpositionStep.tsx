import React, { useMemo } from 'react';
import { BookOpen, Home, Printer, Ruler, SlidersHorizontal, Sparkles } from 'lucide-react';
import { button, input, typeScale, selectableCard, radius } from '../../shared/core/uiDesignSystem';
import { BookImpositionOptions, resolveSeparateCoverPlan } from './domain/impositionEngine';
import { computeBookPageBreakdown } from './domain/bookPageCount';
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
} from './domain/bookPrintProfileEngine';

interface BookImpositionStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  sourceProtected?: boolean;
  pdfPageCount?: number;
  onOpenPrintTargetModal?: () => void;
  onOpenPaperModal?: () => void;
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
  onGoToCoverStep,
  onNextStep,
  onPrevStep,
}) => {
  const activePrintTarget = inferBookPrintTarget(options);
  const isHome = activePrintTarget === 'home';
  const isPrintShop = activePrintTarget === 'print_shop';
  const activeProfile = BOOK_PRINT_PROFILES[activePrintTarget];
  const rawDest = options.destination || 'A';
  const dest: 'A' | 'B' | 'C' = isHome && rawDest === 'C' ? 'B' : rawDest;
  const paperThickness = isHome ? 0 : (options.paperThicknessMm ?? 0);
  const applyCreep = isHome ? false : (options.applyCreep ?? true);
  const exportMode = sourceProtected ? 'raster' : options.exportMode || 'vector';
  const showGuides = options.showGuides ?? false;
  const zipByBooklet = options.zipByBooklet ?? false;
  const readingDirection = options.readingDirection ?? 'ltr';
  const paddingPlacement = options.paddingPlacement ?? 'before-back-cover';
  const isNormalMode = options.mode !== 'fotocopia';
  const t = useText();

  const breakdown = useMemo(() => computeBookPageBreakdown(options, pdfPageCount), [options, pdfPageCount]);
  const separatePlan = useMemo(
    () => resolveSeparateCoverPlan(options, breakdown.activePdfPages),
    [options, breakdown.activePdfPages],
  );
  const finalPageCount = breakdown.totalBookPages;
  const spineMm = calculateSpineWidth(finalPageCount, { paperThicknessMm: paperThickness });
  const spinePill =
    paperThickness > 0
      ? t.bookStudio.impositionStep.spinePill.replace('{mm}', spineMm.toFixed(1))
      : t.bookStudio.impositionStep.spinePillNone;

  const hasConfiguredFront =
    Boolean(options.hasCover) || Boolean(options.customCover && options.customCover.type !== 'none');
  const hasConfiguredBack =
    Boolean(options.hasBackCover) || Boolean(options.customBackCover && options.customBackCover.type !== 'none');
  const missingAnyCover = !hasConfiguredFront || !hasConfiguredBack;
  const hasEmbeddedBackCover = !separatePlan.isSeparate && hasConfiguredBack;

  const thicknessOptions: Array<{ value: number; label: string }> = [
    { value: 0, label: t.bookStudio.impositionStep.thicknessNone },
    { value: 0.10, label: t.bookStudio.impositionStep.thicknessCommon },
    { value: 0.12, label: t.bookStudio.impositionStep.thicknessLight },
  ];
  const isCustomThickness = paperThickness !== 0 && paperThickness !== 0.10 && paperThickness !== 0.12;

  const destinationCards: Array<{ id: 'A' | 'B' | 'C'; title: string; sub: string; svg: React.ReactNode }> = isHome
    ? [
        {
          id: 'A',
          title: 'A · En el mismo archivo',
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
          title: 'B · Hoja aparte (guillotina)',
          sub: t.bookStudio.impositionStep.destinationBSubHome,
          svg: (
            <svg viewBox="0 0 88 56" className="w-full h-14" aria-hidden="true">
              <rect x="3" y="8" width="40" height="40" rx="4" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="2" />
              <rect x="8" y="17" width="8" height="22" fill="currentColor" fillOpacity="0.18" />
              <rect x="19" y="17" width="8" height="22" fill="currentColor" fillOpacity="0.18" />
              <rect x="30" y="17" width="8" height="22" fill="currentColor" fillOpacity="0.18" />
              <rect x="48" y="8" width="37" height="40" rx="4" fill="none" stroke="var(--color-accent-base)" strokeWidth="2" />
              <line x1="66.5" y1="8" x2="66.5" y2="48" stroke="var(--color-accent-base)" strokeDasharray="3 2" strokeWidth="1.5" />
              <rect x="52" y="14" width="12" height="28" fill="currentColor" fillOpacity="0.18" />
              <rect x="69" y="14" width="12" height="28" fill="var(--color-accent-base)" fillOpacity="0.85" />
            </svg>
          ),
        },
      ]
    : [
        {
          id: 'A',
          title: 'A · Mismo archivo',
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
          title: 'B · Cubierta aparte',
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
          title: 'C · Cubierta con lomo',
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

  const handleSelectDestination = (id: 'A' | 'B' | 'C') => {
    setOptions((prev) => {
      const autoEnableExtract =
        id !== 'A' &&
        missingAnyCover &&
        prev.extractPdfCoversWhenSeparate === undefined;
      const updated: BookImpositionOptions = {
        ...prev,
        destination: id,
        ...(autoEnableExtract ? { extractPdfCoversWhenSeparate: true } : {}),
      };
      return id === activeProfile.defaults.destination
        ? clearBookFieldManual(updated, 'destination')
        : markBookFieldManual(updated, 'destination');
    });
    emitLidioMessage({
      kind: 'state',
      groupKey: 'book-destination',
      title: `Destino ${id} seleccionado`,
      body:
        id === 'A'
          ? 'Tapa y contratapa van dentro del mismo archivo.'
          : isHome
          ? 'Sale una hoja aparte para guillotinar: contratapa a la izquierda y tapa a la derecha.'
          : 'La cubierta se arma con contratapa, lomo y tapa.',
    });
  };

  const activeCoverStyleId = options.customCover?.coverStyle || options.coverStyle || '';
  const activeCoverPreset = activeCoverStyleId ? getCoverPresetById(activeCoverStyleId) : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Barra de respeto a la Configuración Global (En casa vs Imprenta) */}
      <div
        className="p-3 border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] flex items-center justify-between gap-2 text-xs"
        style={{ borderRadius: radius.control }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isHome ? (
            <Home className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
          ) : (
            <Printer className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
          )}
          <div className="min-w-0">
            <span className="font-bold text-[var(--ui-text-primary)] block truncate">
              Perfil global: {activeProfile.shortName}
            </span>
            <span className="text-[11px] text-[var(--ui-text-secondary)] block">
              {isHome
                ? 'Opciones adaptadas a impresora de casa (lomo de imprenta apagado).'
                : 'Opciones completas de imprenta habilitadas (lomo y cubierta continua).'}
            </span>
          </div>
        </div>
        {onOpenPrintTargetModal && (
          <button
            type="button"
            onClick={onOpenPrintTargetModal}
            className="px-2.5 py-1 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[11px] font-bold text-[var(--color-accent-text)] cursor-pointer shrink-0"
          >
            Cambiar arriba
          </button>
        )}
      </div>

      <PanelSection
        icon={<BookOpen className="w-4 h-4" />}
        title={t.bookStudio.impositionStep.title}
        helpTitle="Qué configurás en Armado y Guías"
        helpText={t.bookStudio.impositionStep.description}
      >
        <ContextualGuideBox title="Recordatorio de impresión">
          {t.bookStudio.impositionStep.quickDoubleSideHint}
        </ContextualGuideBox>

        {/* Destino de tapa y contratapa */}
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={typeScale.fieldLabel}>{t.bookStudio.impositionStep.destinationLabel}</span>
            <LidioHelpTrigger
              title={t.bookStudio.impositionStep.destinationLabel}
              text={
                isHome
                  ? 'En casa podés imprimir todo en un mismo archivo (A) o separar tapa y contratapa en una hoja aparte lista para guillotinar: contratapa a la izquierda y tapa a la derecha (B).'
                  : t.bookStudio.impositionStep.destinationHelp
              }
              groupKey="book-destination"
            />
            <ManualOverrideBadge
              isOverridden={isManuallyOverridden(options, 'destination')}
              globalLabel={activeProfile.shortName}
              onReset={() => setOptions((prev) => clearBookFieldManual(prev, 'destination'))}
            />
          </div>
          <div className={`mt-2 grid grid-cols-1 ${isHome ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-2`}>
            {destinationCards.map(({ id, title, sub, svg }) => {
              const selected = dest === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelectDestination(id)}
                  aria-pressed={selected}
                  className={`${selectableCard.base} ${selected ? selectableCard.selected : selectableCard.unselected} flex flex-col items-center gap-1.5 p-3 text-center cursor-pointer`}
                >
                  <span className="text-[var(--ui-text-secondary)]">{svg}</span>
                  <span className="text-xs font-bold text-[var(--ui-text-primary)]">{title}</span>
                  <span className="text-[11px] leading-snug text-[var(--ui-text-secondary)]">{sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Extracción automática si eligió destino separado B/C pero no creó tapa o contratapa */}
        {dest !== 'A' && missingAnyCover && (
          <div
            className="p-3 border border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)] space-y-2"
            style={{ borderRadius: radius.control }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-bold text-[var(--ui-text-primary)]">
                  {t.bookStudio.impositionStep.extractPdfCoversLabel}
                </span>
                <LidioHelpTrigger
                  size="xs"
                  title="Separar tapa y contratapa del PDF"
                  text={t.bookStudio.impositionStep.extractPdfCoversHelp}
                  groupKey="book-extract-covers"
                />
              </div>
              <SectionSwitch
                size="sm"
                checked={options.extractPdfCoversWhenSeparate === true}
                onChange={(checked) => {
                  setOptions((prev) => ({ ...prev, extractPdfCoversWhenSeparate: checked }));
                  emitLidioMessage({
                    kind: 'state',
                    groupKey: 'book-extract-covers',
                    title: checked ? 'Extraemos 1ª y última página del PDF' : 'Sin extracción automática de tapas',
                    body: checked
                      ? 'La primera página del PDF sale como Tapa (derecha) y la última como Contratapa (izquierda), fuera del interior.'
                      : 'Si no hay tapa ni contratapa creada, todo viaja dentro del mismo archivo.',
                  });
                }}
                label={t.bookStudio.impositionStep.extractPdfCoversLabel}
              />
            </div>
            <p className="text-[11px] text-[var(--ui-text-secondary)] leading-relaxed">
              {breakdown.activePdfPages > 0 && breakdown.activePdfPages < 3
                ? 'Tu PDF necesita al menos 3 páginas para sacar primera y última aparte dejando contenido en el interior.'
                : 'Aunque hayas marcado Sin tapa o Sin contratapa, esto toma la primera página como Tapa (derecha) y la última como Contratapa (izquierda) y las quita del interior.'}
            </p>
          </div>
        )}

        {/* Grosor del papel y Lomo: SOLO visible en perfil Imprenta */}
        {isPrintShop && (
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={typeScale.fieldLabel}>{t.bookStudio.impositionStep.paperThicknessLabel}</span>
              <ManualOverrideBadge
                isOverridden={isManuallyOverridden(options, 'paperThicknessMm')}
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
        )}
      </PanelSection>

      <PanelSection
        icon={<SlidersHorizontal className="w-4 h-4" />}
        title="Opciones de armado"
        helpTitle="Guías, cuadernillos y conteo"
        helpText="Cada opción tiene su signo ? con el detalle exacto."
        manualAdjustment={
          <div className="space-y-4">
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

            {hasEmbeddedBackCover && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={typeScale.fieldLabel}>Dónde ubicar las hojas en blanco de relleno</span>
                  <LidioHelpTrigger
                    size="xs"
                    title="Ubicación de hojas blancas de relleno"
                    text="Para doblar sin que sobren hojas, el total debe ser múltiplo de 4. Por defecto las hojas blancas de relleno van antes de la contratapa para que la contratapa quede siempre en la cara de afuera."
                    groupKey="book-padding-placement"
                  />
                </div>
                <div className="grid grid-cols-1 gap-1.5 text-xs">
                  {[
                    {
                      id: 'before-back-cover' as const,
                      label: 'Antes de la contratapa (recomendado: cierra el libro por fuera)',
                    },
                    {
                      id: 'after-back-cover' as const,
                      label: 'Después de la contratapa (al final del archivo)',
                    },
                  ].map((opt) => {
                    const selected = paddingPlacement === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setOptions((prev) => ({ ...prev, paddingPlacement: opt.id }))}
                        aria-pressed={selected}
                        className={`${selectableCard.base} ${selected ? selectableCard.selected : selectableCard.unselected} p-2 text-left text-xs font-semibold cursor-pointer`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        }
      >
        <div className="space-y-2.5">
          {isPrintShop && (
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
                  isOverridden={isManuallyOverridden(options, 'applyCreep')}
                  globalLabel={activeProfile.shortName}
                  onReset={() => setOptions((prev) => clearBookFieldManual(prev, 'applyCreep'))}
                />
              }
            />
          )}

          <SwitchRow
            label={t.bookStudio.impositionStep.guidesCheckbox}
            help={
              isHome
                ? 'Dibuja una línea suave al centro para saber exactamente por dónde doblar o pasar la guillotina.'
                : t.bookStudio.impositionStep.guidesHelp
            }
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
                  ? 'Verás líneas suaves de doblez y corte en cada hoja.'
                  : 'Las hojas salen limpias sin marcas.',
              });
            }}
            overrideBadge={
              <ManualOverrideBadge
                isOverridden={isManuallyOverridden(options, 'showGuides')}
                globalLabel={activeProfile.shortName}
                onReset={() => setOptions((prev) => clearBookFieldManual(prev, 'showGuides'))}
              />
            }
          />

          {isNormalMode && (!isHome || dest === 'A') && (
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
          )}
        </div>

        {/* Desglose transparente de páginas y relleno múltiplo de 4 */}
        {pdfPageCount > 0 && (
          <div
            className="p-3 border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] text-xs space-y-1"
            style={{ borderRadius: radius.control }}
          >
            <span className="font-bold text-[var(--ui-text-primary)] block">
              Resumen de páginas del armado ({breakdown.totalBookPages} págs. = {breakdown.interiorSheets} hojas)
            </span>
            <p className="text-[11px] text-[var(--ui-text-secondary)]">
              Contenido: {breakdown.activePdfPages} · Separadores: {breakdown.dividerPages} · En blanco/relleno múltiplo de 4: {breakdown.manualBlankPages + breakdown.frontRetreatBlanks + breakdown.backRetreatBlanks + breakdown.paddingBlanks}
            </p>
            {separatePlan.isSeparate && (
              <p className="text-[11px] font-semibold text-[var(--color-accent-text)]">
                + 1 hoja aparte de tapa y contratapa ({isHome ? 'Contratapa a la izquierda | Tapa a la derecha' : 'Contratapa | Lomo | Tapa'}).
              </p>
            )}
          </div>
        )}
      </PanelSection>

      <PanelSection
        icon={<Sparkles className="w-4 h-4" />}
        title="Calidad del archivo"
        helpTitle="Calidad de salida"
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

          {onGoToCoverStep && (
            <div
              className="p-2.5 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] flex items-center justify-between gap-2"
              style={{ borderRadius: radius.control }}
            >
              <span className="text-[11px] font-semibold text-[var(--ui-text-secondary)] truncate">
                Diseño de cubierta: <strong className="text-[var(--ui-text-primary)]">{options.customCover?.bgColor ? 'Color propio' : (activeCoverPreset?.name || 'Personalizado')}</strong>
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
