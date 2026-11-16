import React from 'react';
import { BookOpen } from 'lucide-react';
import { button, input, typeScale } from '../../shared/core/uiDesignSystem';
import { BookImpositionOptions } from '../../shared/core/book-engine/impositionEngine';
import { useText } from '../../shared/i18n/useText';

interface BookImpositionStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  onNextStep: () => void;
  onPrevStep: () => void;
}

export const BookImpositionStep: React.FC<BookImpositionStepProps> = ({ options, setOptions, onNextStep, onPrevStep }) => {
  const dest = options.destination || 'A';
  const paperThickness = options.paperThicknessMm ?? 0;
  const applyCreep = options.applyCreep ?? true;
  const exportMode = options.exportMode || 'vector';
  const coverStyle = options.coverStyle || 'monica-classic';
  const showGuides = options.showGuides ?? false;
  const zipByBooklet = options.zipByBooklet ?? false;
  const readingDirection = options.readingDirection ?? 'ltr';
  const t = useText();

  return (
    <div dir={readingDirection === 'rtl' ? 'rtl' : 'ltr'} className="flex flex-col gap-6 p-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <BookOpen className="w-6 h-6" />
        <span>{t.bookStudio.impositionStep.title}</span>
      </h2>

      <p className="text-sm text-[var(--ui-text-secondary)] leading-relaxed">
        {t.bookStudio.impositionStep.description}
      </p>

      <div className="space-y-4">
        <label className="block">
          <span className={typeScale.fieldLabel}>{t.bookStudio.impositionStep.destinationLabel}</span>
          <div className="mt-2 flex gap-2">
            {(['A', 'B', 'C'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setOptions((prev) => ({ ...prev, destination: d }))}
                className={`${button.base} ${dest === d ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]' : 'bg-[var(--ui-bg-card)] border border-[var(--ui-border)] text-[var(--ui-text-primary)]'}`}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-[var(--ui-text-secondary)]">
            {t.bookStudio.impositionStep.destinationHelp}
          </p>
        </label>

        <label className="block">
          <span className={typeScale.fieldLabel}>{t.bookStudio.impositionStep.paperThicknessLabel}</span>
          <input
            type="number"
            value={paperThickness}
            onChange={(e) => setOptions((prev) => ({ ...prev, paperThicknessMm: Number(e.target.value) || 0 }))}
            className={`${input.base} mt-2 w-32`}
            placeholder={t.bookStudio.impositionStep.paperThicknessPlaceholder}
            step="0.01"
          />
          <div className="mt-2 flex gap-2 text-xs text-[var(--ui-text-secondary)]">
            <button
              type="button"
              onClick={() => setOptions((prev) => ({ ...prev, paperThicknessMm: 0.10 }))}
              className="underline cursor-pointer"
            >
              {t.bookStudio.impositionStep.thicknessCommon}
            </button>
            <button
              type="button"
              onClick={() => setOptions((prev) => ({ ...prev, paperThicknessMm: 0.12 }))}
              className="underline cursor-pointer"
            >
              {t.bookStudio.impositionStep.thicknessLight}
            </button>
            <button
              type="button"
              onClick={() => setOptions((prev) => ({ ...prev, paperThicknessMm: 0 }))}
              className="underline cursor-pointer"
            >
              {t.bookStudio.impositionStep.thicknessNone}
            </button>
          </div>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={applyCreep}
            onChange={(e) => setOptions((prev) => ({ ...prev, applyCreep: e.target.checked }))}
            className="h-4 w-4 accent-[var(--color-accent-base)]"
          />
          <span className={typeScale.fieldLabel}>{t.bookStudio.impositionStep.creepCheckbox}</span>
          <p className="text-xs text-[var(--ui-text-secondary)]">
            {t.bookStudio.impositionStep.creepHelp}
          </p>
        </label>

        <label className="block">
          <span className={typeScale.fieldLabel}>{t.bookStudio.impositionStep.exportModeLabel}</span>
          <select
            value={exportMode}
            onChange={(e) => setOptions((prev) => ({ ...prev, exportMode: e.target.value as 'vector' | 'raster' }))}
            className={`${input.base} mt-2`}
          >
            <option value="vector">{t.bookStudio.impositionStep.exportModeVector}</option>
            <option value="raster">{t.bookStudio.impositionStep.exportModeRaster}</option>
          </select>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showGuides}
            onChange={(e) => setOptions((prev) => ({ ...prev, showGuides: e.target.checked }))}
            className="h-4 w-4 accent-[var(--color-accent-base)]"
          />
          <span className={typeScale.fieldLabel}>{t.bookStudio.impositionStep.guidesCheckbox}</span>
          <p className="text-xs text-[var(--ui-text-secondary)]">
            {t.bookStudio.impositionStep.guidesHelp}
          </p>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={zipByBooklet}
            onChange={(e) => setOptions((prev) => ({ ...prev, zipByBooklet: e.target.checked }))}
            className="h-4 w-4 accent-[var(--color-accent-base)]"
          />
          <span className={typeScale.fieldLabel}>{t.bookStudio.impositionStep.zipByBookletLabel}</span>
          <p className="text-xs text-[var(--ui-text-secondary)]">
            {t.bookStudio.impositionStep.zipByBookletHelp}
          </p>
        </label>

        <label className="block">
          <span className={typeScale.fieldLabel}>{t.bookStudio.impositionStep.readingDirectionLabel}</span>
          <select
            value={readingDirection}
            onChange={(e) => setOptions((prev) => ({ ...prev, readingDirection: e.target.value as 'ltr' | 'rtl' }))}
            className={`${input.base} mt-2`}
          >
            <option value="ltr">{t.bookStudio.impositionStep.readingDirectionLtr}</option>
            <option value="rtl">{t.bookStudio.impositionStep.readingDirectionRtl}</option>
          </select>
          <p className="mt-1 text-xs text-[var(--ui-text-secondary)]">
            {t.bookStudio.impositionStep.readingDirectionHelp}
          </p>
        </label>

        <label className="block">
          <span className={typeScale.fieldLabel}>{t.bookStudio.impositionStep.coverStyleLabel}</span>
          <input
            type="text"
            value={coverStyle}
            onChange={(e) => setOptions((prev) => ({ ...prev, coverStyle: e.target.value }))}
            className={`${input.base} mt-2`}
            placeholder={t.bookStudio.impositionStep.coverStylePlaceholder}
          />
        </label>

        <div className="flex gap-2 mt-6">
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