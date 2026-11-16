import React from 'react';
import { BookOpen } from 'lucide-react';
import { button, input, typeScale } from '../../shared/core/uiDesignSystem';
import { BookImpositionOptions } from '../../shared/core/book-engine/impositionEngine';

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

  return (
    <div className="flex flex-col gap-6 p-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <BookOpen className="w-6 h-6" />
        <span>6. Armado y Guías</span>
      </h2>

      <p className="text-sm text-[var(--ui-text-secondary)] leading-relaxed">
        Selecciona el destino de la cubierta (tapa) y el grosor del papel para el lomo. Si seleccionas "Sin grosor", el lomo será 0 (para encuadernación con anillado o guillotina). El modo de máxima calidad conserva el archivo original sin pérdida.
      </p>

      <div className="space-y-4">
        <label className="block">
          <span className={typeScale.fieldLabel}>Destino de la Cubierta</span>
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
            A = mismo papel que el documento, B = archivo de cubierta separado, C = cubierta envolvente (contratapa|lomo|tapa continua)
          </p>
        </label>

        <label className="block">
          <span className={typeScale.fieldLabel}>Grosor de Papel para Lomo (mm)</span>
          <input
            type="number"
            value={paperThickness}
            onChange={(e) => setOptions((prev) => ({ ...prev, paperThicknessMm: Number(e.target.value) || 0 }))}
            className={`${input.base} mt-2 w-32`}
            placeholder="0 (sin grosor)"
            step="0.01"
          />
          <div className="mt-2 flex gap-2 text-xs text-[var(--ui-text-secondary)]">
            <button
              type="button"
              onClick={() => setOptions((prev) => ({ ...prev, paperThicknessMm: 0.10 }))}
              className="underline cursor-pointer"
            >
              Común (0.10)
            </button>
            <button
              type="button"
              onClick={() => setOptions((prev) => ({ ...prev, paperThicknessMm: 0.12 }))}
              className="underline cursor-pointer"
            >
              Ahuesado (0.12)
            </button>
            <button
              type="button"
              onClick={() => setOptions((prev) => ({ ...prev, paperThicknessMm: 0 }))}
              className="underline cursor-pointer"
            >
              Sin grosor (guillotina/anillado)
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
          <span className={typeScale.fieldLabel}>Aplicar compensación de creep (Adobe)</span>
          <p className="text-xs text-[var(--ui-text-secondary)]">
            Calcula desplazamiento hacia el lomo para hojas internas. Si el papel no tiene grosor (0), no aplica.
          </p>
        </label>

        <label className="block">
          <span className={typeScale.fieldLabel}>Modo de Exportación</span>
          <select
            value={exportMode}
            onChange={(e) => setOptions((prev) => ({ ...prev, exportMode: e.target.value as 'vector' | 'raster' }))}
            className={`${input.base} mt-2`}
          >
            <option value="vector">Máxima calidad (sin pérdida, embedPage/copyPages)</option>
            <option value="raster">Rasterizado (JPEG por página, para impresión doméstica)</option>
          </select>
        </label>

        <label className="block">
          <span className={typeScale.fieldLabel}>Estilo de Cubierta (opcional)</span>
          <input
            type="text"
            value={coverStyle}
            onChange={(e) => setOptions((prev) => ({ ...prev, coverStyle: e.target.value }))}
            className={`${input.base} mt-2`}
            placeholder="Ej: monica-classic, o vacío para usar el preset del editor de CV"
          />
        </label>

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onPrevStep}
            className={`${button.base} bg-[var(--ui-bg-card)] border border-[var(--ui-border)] text-[var(--ui-text-secondary)]`}
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={onNextStep}
            className={`${button.base} bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]`}
          >
            Siguiente → Vista Previa
          </button>
        </div>
      </div>
    </div>
  );
};