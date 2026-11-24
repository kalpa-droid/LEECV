import React, { useRef, useState } from 'react';
import { Check, Pipette } from 'lucide-react';
import { COVER_PRESETS, getCoverPresetById } from '../../../shared/core/pdf-engine/layers/presets/coverPresetCatalog';
import { resolveCanvasColor, COVER_FALLBACK_BG } from '../../../shared/kits/print-imposition/canvasColors';
import { radius, selectableCard } from '../../../shared/core/uiDesignSystem';
import {
  BOOK_DEFAULT_CUSTOM_BG,
  BOOK_INK_DARK,
  BOOK_INK_LIGHT,
  getAutoContrastTextColor,
  toHex6,
} from '../domain/bookColorUtils';

/** `EyeDropper` todavía no está en lib.dom.d.ts de TypeScript. */
interface BrowserEyeDropper {
  open: () => Promise<{ sRGBHex: string }>;
}
type BrowserEyeDropperCtor = new () => BrowserEyeDropper;

export interface BookCoverColorPickerGridProps {
  selectedStyle: string;
  bgColor?: string;
  textColor?: string;
  /** Eligió uno de los diseños: limpia el color propio. */
  onSelectPreset: (presetId: string) => void;
  /** Eligió un color propio (selector o cuentagotas) + la tinta con buen contraste. */
  onSelectCustomColor: (bgColor: string, textColor: string) => void;
}

/**
 * Grilla de diseños de tapa/contratapa/separador. El botón "Canon Clásico" se
 * reemplaza por "Elegir color": selector de color y cuentagotas. El preset
 * `monica-classic` NO se toca en el catálogo (lo usan CV y EditorLee): solo se
 * oculta acá y se usa como base de diseño cuando hay color propio.
 */
export const BookCoverColorPickerGrid: React.FC<BookCoverColorPickerGridProps> = ({
  selectedStyle,
  bgColor,
  textColor,
  onSelectPreset,
  onSelectCustomColor,
}) => {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [dropperNote, setDropperNote] = useState<string | null>(null);

  const visiblePresets = COVER_PRESETS.filter((p) => p.id !== 'monica-classic');
  const isCustomActive = Boolean(bgColor) || selectedStyle === 'monica-classic';

  const presetBg = resolveCanvasColor(getCoverPresetById('monica-classic')?.badgeBg || '', COVER_FALLBACK_BG);
  const activeHex = toHex6(bgColor) ?? toHex6(presetBg) ?? BOOK_DEFAULT_CUSTOM_BG;
  const activeInk = textColor || getAutoContrastTextColor(activeHex);

  const applyColor = (hex: string, ink?: string) => {
    const normalized = toHex6(hex) ?? BOOK_DEFAULT_CUSTOM_BG;
    onSelectCustomColor(normalized, ink || getAutoContrastTextColor(normalized));
  };

  const handleEyeDropper = async () => {
    const ctor =
      typeof window !== 'undefined' && 'EyeDropper' in window
        ? (window as unknown as { EyeDropper: BrowserEyeDropperCtor }).EyeDropper
        : null;
    if (!ctor) {
      setDropperNote('Tu navegador usa el selector de color directo.');
      colorInputRef.current?.click();
      return;
    }
    try {
      setDropperNote(null);
      const result = await new ctor().open();
      applyColor(result.sRGBHex);
    } catch (err) {
      // Cancelar con Esc no es un error.
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setDropperNote('No pudimos usar el cuentagotas. Probá con el selector de color.');
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {visiblePresets.map((preset) => {
          const isSelected = !bgColor && selectedStyle === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset.id)}
              aria-pressed={isSelected}
              className={`${selectableCard.base} ${
                isSelected ? selectableCard.selected : selectableCard.unselected
              } flex items-center justify-between p-2.5 text-xs cursor-pointer`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <div
                  className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                  style={{ backgroundColor: preset.badgeBg }}
                />
                <span className="truncate font-medium">{preset.name}</span>
              </div>
              {isSelected && <Check className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />}
            </button>
          );
        })}

        {/* Sexto botón: ocupa el lugar de "Canon Clásico" */}
        <button
          type="button"
          onClick={() => applyColor(activeHex, bgColor ? activeInk : undefined)}
          aria-pressed={isCustomActive}
          className={`${selectableCard.base} ${
            isCustomActive ? selectableCard.selected : selectableCard.unselected
          } flex items-center justify-between p-2.5 text-xs cursor-pointer`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <div
              className="w-4 h-4 rounded-full border border-black/20 shrink-0"
              style={{ backgroundColor: activeHex }}
            />
            <span className="truncate font-medium">Elegir color</span>
          </div>
          <Pipette className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
        </button>
      </div>

      {isCustomActive && (
        <div
          className="p-2.5 border border-[var(--ui-border)] bg-[var(--ui-bg-surface)] space-y-2"
          style={{ borderRadius: radius.control }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <label
              className="flex items-center gap-2 px-2.5 py-1.5 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-xs font-bold cursor-pointer"
              style={{ borderRadius: radius.control }}
            >
              <span
                className="w-5 h-5 rounded-full border border-black/20 shrink-0"
                style={{ backgroundColor: activeHex }}
              />
              <span>Selector de color</span>
              <input
                ref={colorInputRef}
                type="color"
                value={activeHex}
                onChange={(e) => applyColor(e.target.value)}
                className="sr-only"
                aria-label="Selector de color"
              />
            </label>

            <button
              type="button"
              onClick={() => void handleEyeDropper()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-xs font-bold cursor-pointer hover:border-[var(--color-accent-base)]"
              style={{ borderRadius: radius.control }}
              title="Tomar un color de cualquier lugar de la pantalla"
            >
              <Pipette className="w-3.5 h-3.5" />
              <span>Cuentagotas</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="font-semibold text-[var(--ui-text-secondary)]">Color del texto:</span>
            {[
              { label: 'Claro', value: BOOK_INK_LIGHT },
              { label: 'Oscuro', value: BOOK_INK_DARK },
            ].map((ink) => {
              const selected = activeInk.toUpperCase() === ink.value;
              return (
                <button
                  key={ink.value}
                  type="button"
                  onClick={() => applyColor(activeHex, ink.value)}
                  aria-pressed={selected}
                  className={`px-2 py-1 border font-bold cursor-pointer ${
                    selected
                      ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]'
                      : 'border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)]'
                  }`}
                  style={{ borderRadius: radius.control }}
                >
                  {ink.label}
                </button>
              );
            })}
          </div>

          {dropperNote && <p className="text-[11px] text-[var(--ui-text-secondary)]">{dropperNote}</p>}
        </div>
      )}
    </div>
  );
};
