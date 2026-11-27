import React from 'react';
import { BookText, Palette } from 'lucide-react';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { Field } from '../../../shared/core/ui/Field';
import { ManualOverrideBadge } from '../../../shared/core/ui/ManualOverrideBadge';
import { useToast } from '../../../shared/core/ui/Toast';
import { isManuallyOverridden } from '../../../shared/core/presets/configCascadeEngine';
import { ACADEMIC_FONT_CATALOG } from '../../../shared/core/pdf-engine/layers/typography/academicFontCatalog';
import {
  ensureAcademicOrCustomFontRegistered,
  importWindowsLocalFonts,
  uploadCustomPdfFontFile,
} from '../../../shared/core/pdf-engine/layers/typography/pdfFontRegistry';
import { PRESET_COLORS } from '../../../shared/core/pdf-engine/layers/presets/presetRegistry';
import {
  clearEditorialFieldManual,
  EditorialDesignDefaultsFlat,
  markEditorialFieldManual,
  resolveStructuralNormFromDraft,
} from '../domain/editorialNormEngine';
import { radius } from '../../../shared/core/uiDesignSystem';

export interface EditorialStylePanelProps {
  draft: any;
  updateDraft: (updater: (prev: any) => any) => void;
  setActiveStepTab?: (tab: string) => void;
}

const CURATED_COVER_PALETTE_KEYS = [
  'sobrio',
  'marino',
  'clasico',
  'elegante',
  'borgona',
  'amatista',
  'navy-consul',
  'verde-oliva',
  'marron-tabaco',
  'gris-granito',
];

export const EditorialStylePanel: React.FC<EditorialStylePanelProps> = ({
  draft,
  updateDraft,
}) => {
  const { showInfo, showSuccess } = useToast() as any;
  const design = draft?.design || {};
  const cover = draft?.cover || {};
  const structuralNorm = resolveStructuralNormFromDraft(draft);
  const coverPaletteKey: string = cover.coverPaletteKey || design.coverPaletteKey || 'sobrio';

  const updateTypography = (field: 'fontFamily' | 'fontSize', val: any) => {
    updateDraft((prev) => {
      const updated = {
        ...prev,
        design: {
          ...(prev?.design || {}),
          typography: { ...(prev?.design?.typography || {}), [field]: val },
        },
      };
      return markEditorialFieldManual(updated, field);
    });
  };

  const handleSelectPalette = (key: string) => {
    updateDraft((prev) => ({
      ...prev,
      cover: { ...(prev?.cover || {}), coverPaletteKey: key },
      design: { ...(prev?.design || {}), coverPaletteKey: key },
    }));
  };

  const renderFieldOverrideBadge = (field: keyof EditorialDesignDefaultsFlat) => (
    <ManualOverrideBadge
      isOverridden={isManuallyOverridden(design, field)}
      globalLabel={structuralNorm.toUpperCase()}
      onReset={() => updateDraft((prev) => clearEditorialFieldManual(prev, field))}
    />
  );

  return (
    <div className="space-y-5">
      <PanelSection
        icon={<BookText className="w-4 h-4" />}
        title="Tipografía y tamaño de letra"
        helpText="Combiná letra clásica con remates (recomendada para lectura extensa) o moderna sin remates, y su tamaño base. También podés conectar fuentes de tu compu o subir archivos .ttf/.otf."
      >
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-3 sm:col-span-2">
            <div className="flex items-center gap-1 mb-1 flex-wrap">
              <label className="block text-xs font-bold text-[var(--ui-text-primary)]">
                Familia de letra
              </label>
              {renderFieldOverrideBadge('fontFamily')}
            </div>
            <select
              value={design.typography?.fontFamily || 'Times New Roman'}
              onChange={async (e) => {
                const fam = e.target.value;
                await ensureAcademicOrCustomFontRegistered(fam).catch(() => false);
                updateTypography('fontFamily', fam);
              }}
              className="w-full border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] px-2.5 py-2 text-xs"
              style={{ borderRadius: radius.control }}
            >
              <optgroup label="Fuentes universitarias y normas (APA / Chicago / MLA)">
                {ACADEMIC_FONT_CATALOG.map((f) => (
                  <option key={f.family} value={f.family}>
                    {f.family} — {f.badge}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Base clásica integrada (sin descarga)">
                <option value="Times-Roman">Clásica Serif</option>
                <option value="Helvetica">Moderna Sans</option>
              </optgroup>
            </select>
          </div>
          <div className="col-span-3 sm:col-span-1">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[10px] font-semibold text-[var(--ui-text-secondary)]">Cuerpo (pt)</span>
              {renderFieldOverrideBadge('fontSize')}
            </div>
            <Field
              label=""
              aria-label="Cuerpo (pt)"
              type="number"
              value={design.typography?.fontSize ?? 11}
              onChange={(e: any) => updateTypography('fontSize', Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={async () => {
              const res = await importWindowsLocalFonts();
              if (!res.supported) {
                try {
                  await navigator.clipboard?.writeText('C:\\Windows\\Fonts');
                } catch {
                  // noop
                }
                showInfo?.('Tu navegador no permite leer fuentes del sistema directo. Copiamos C:\\Windows\\Fonts: usá "Subir fuente" y pegá esa ruta.');
                return;
              }
              if (res.imported.length > 0) {
                showSuccess?.(`Conectadas de Windows: ${res.imported.join(', ')}`);
              } else {
                showInfo?.('No encontramos fuentes nuevas de Windows o cancelaste el permiso.');
              }
            }}
            className="px-2.5 py-1.5 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[11px] font-bold text-[var(--color-secondary-text)] hover:border-[var(--color-secondary-base)] cursor-pointer"
            style={{ borderRadius: radius.control }}
          >
            Conectar fuentes de mi Windows
          </button>

          <label
            className="px-2.5 py-1.5 border border-[var(--ui-border)] bg-[var(--ui-bg-card)] text-[11px] font-bold text-[var(--color-accent-text)] hover:border-[var(--color-accent-base)] cursor-pointer"
            style={{ borderRadius: radius.control }}
          >
            <span>Subir fuente (.ttf / .otf)</span>
            <input
              type="file"
              accept=".ttf,.otf"
              className="hidden"
              onChange={async (e) => {
                const picked = e.target.files?.[0];
                e.currentTarget.value = '';
                if (!picked) return;
                try {
                  const family = await uploadCustomPdfFontFile(picked);
                  updateTypography('fontFamily', family);
                  showSuccess?.(`Fuente "${family}" lista y guardada para tu PDF.`);
                } catch (err: any) {
                  showInfo?.(err?.message || 'Elegí un archivo de fuente .ttf u .otf válido.');
                }
              }}
            />
          </label>
        </div>
      </PanelSection>

      <PanelSection
        icon={<Palette className="w-4 h-4" />}
        title="Paleta de color de la obra"
        helpText="Colorea armónicamente portada, carátulas separadoras entre capítulos, acentos y detalles editoriales manteniendo alto contraste al imprimir."
      >
        <div className="flex flex-wrap gap-2">
          {CURATED_COVER_PALETTE_KEYS.map((key) => {
            const entry = PRESET_COLORS[key];
            if (!entry) return null;
            const isSelected = coverPaletteKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectPalette(key)}
                title={entry.name}
                aria-label={entry.name}
                aria-pressed={isSelected}
                className={`w-7 h-7 rounded-full border-2 transition cursor-pointer flex items-center justify-center ${
                  isSelected
                    ? 'scale-110 ring-2 ring-[var(--color-accent-base)] ring-offset-1 border-[var(--ui-bg-panel)]'
                    : 'border-[var(--ui-border)] hover:scale-105'
                }`}
                style={{ backgroundColor: entry.seedHex }}
              />
            );
          })}
        </div>
      </PanelSection>
    </div>
  );
};
