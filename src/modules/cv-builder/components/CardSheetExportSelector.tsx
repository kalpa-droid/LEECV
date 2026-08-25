import React, { useMemo, useState } from 'react';
import { PAGE_SIZES, getPageSize, makeCustomCardSize, PageSize } from '../../../shared/core/pdf-engine/layers/page/pageSizes';
import { calculateCardsPerSheetPreview, exportBusinessCardSheetToPDF, CardExportOptions } from '../../../shared/core/pdf-engine/cardSheetExporter';
import { Preset } from '../../../shared/core/pdf-engine/layers/presets/presetSchema';
import { BusinessCardData } from '../../../shared/core/pdf-engine/layers/records/cardDataAdapter';
import { Printer, AlertTriangle, Download } from 'lucide-react';
import { useToast } from '../../../shared/core/ui/Toast';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';

const CARD_SIZE_OPTIONS = [
  { id: 'tarjeta_estandar', label: 'Estándar AR/US (89 × 51 mm)' },
  { id: 'tarjeta_europea', label: 'Europea (85 × 54 mm)' },
  { id: 'tarjeta_cuadrada', label: 'Cuadrada (65 × 65 mm)' },
  { id: 'tarjeta_mini', label: 'Mini (70 × 28 mm)' },
  { id: 'personalizado', label: 'Personalizado…' },
];

const SHEET_SIZE_OPTIONS = Object.values(PAGE_SIZES).filter(p => p.category === 'documento');

interface CardSheetExportSelectorProps {
  preset: Preset;
  cardData: BusinessCardData;
  onExported?: () => void;
}

export function CardSheetExportSelector({ preset, cardData, onExported }: CardSheetExportSelectorProps) {
  const { showError, showSuccess } = useToast();
  const [cardSizeId, setCardSizeId] = useState('tarjeta_estandar');
  const [customWidthMm, setCustomWidthMm] = useState(85);
  const [customHeightMm, setCustomHeightMm] = useState(55);
  const [sheetSizeId, setSheetSizeId] = useState(preset.print?.defaultSheetPageSizeId || 'a4');
  const [printerMode, setPrinterMode] = useState<'impresora_oficina' | 'sin_margen_borderless'>('impresora_oficina');
  const [isExporting, setIsExporting] = useState(false);

  const trimSize: PageSize = useMemo(() => {
    return cardSizeId === 'personalizado'
      ? makeCustomCardSize(customWidthMm, customHeightMm)
      : getPageSize(cardSizeId);
  }, [cardSizeId, customWidthMm, customHeightMm]);

  const sheetSize = getPageSize(sheetSizeId);

  const preview = useMemo(() => {
    return calculateCardsPerSheetPreview(
      trimSize,
      sheetSize,
      preset.print?.bleedPresetId || 'estandar_tarjeta',
      printerMode
    );
  }, [trimSize, sheetSize, printerMode, preset.print]);

  const handleExport = async () => {
    setIsExporting(true);
    await withErrorHandling(
      async () => {
        const options: CardExportOptions = {
          sheetPageSizeIdOverride: sheetSizeId,
          trimSizeOverride: trimSize,
          impositionPresetIdOverride: printerMode,
        };
        await exportBusinessCardSheetToPDF(cardData, preset, options);
        showSuccess('Hoja de tarjetas generada con éxito.');
        onExported?.();
      },
      {
        context: 'Exportación de Hoja de Tarjetas',
        errorMessage: 'Error al exportar la hoja de tarjetas.',
        notify: (msg) => showError(msg)
      }
    );
    setIsExporting(false);
  };

  return (
    <div className="space-y-5 p-5 bg-[var(--color-neutral-surface-muted)] rounded-2xl border border-[var(--color-neutral-border)]">
      {/* Tamaño de tarjeta */}
      <div>
        <label className="block text-xs font-extrabold text-[var(--color-neutral-text-primary)] mb-1.5 uppercase tracking-wide">
          Tamaño de la tarjeta
        </label>
        <select
          value={cardSizeId}
          onChange={(e) => setCardSizeId(e.target.value)}
          className="w-full p-2.5 rounded-xl border border-[var(--color-neutral-border)] font-semibold text-[var(--color-neutral-text-primary)] outline-none focus:border-[var(--color-accent-base)] bg-white cursor-pointer"
        >
          {CARD_SIZE_OPTIONS.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>

        {cardSizeId === 'personalizado' && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className="block text-[10px] font-bold text-[var(--color-neutral-text-secondary)] mb-1">Ancho (mm)</label>
              <input
                type="number" min={20} max={200} value={customWidthMm}
                onChange={(e) => setCustomWidthMm(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-[var(--color-neutral-border)] font-bold text-[var(--color-neutral-text-primary)] bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[var(--color-neutral-text-secondary)] mb-1">Alto (mm)</label>
              <input
                type="number" min={20} max={200} value={customHeightMm}
                onChange={(e) => setCustomHeightMm(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-[var(--color-neutral-border)] font-bold text-[var(--color-neutral-text-primary)] bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Hoja física donde se auto-repite */}
      <div>
        <label className="block text-xs font-extrabold text-[var(--color-neutral-text-primary)] mb-1.5 uppercase tracking-wide">
          Hoja donde se va a imprimir
        </label>
        <select
          value={sheetSizeId}
          onChange={(e) => setSheetSizeId(e.target.value)}
          className="w-full p-2.5 rounded-xl border border-[var(--color-neutral-border)] font-semibold text-[var(--color-neutral-text-primary)] outline-none focus:border-[var(--color-accent-base)] bg-white cursor-pointer"
        >
          {SHEET_SIZE_OPTIONS.map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Modo de margen de impresora — la pregunta clave que evita bordes cortados */}
      <div>
        <label className="block text-xs font-extrabold text-[var(--color-neutral-text-primary)] mb-1.5 uppercase tracking-wide">
          ¿Tu impresora imprime hasta el borde sin margen blanco?
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPrinterMode('impresora_oficina')}
            className={`p-3 rounded-xl border-2 text-left transition cursor-pointer ${
              printerMode === 'impresora_oficina'
                ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-rose-muted)]/30'
                : 'border-[var(--color-neutral-border)] bg-white hover:border-[var(--color-accent-base)]'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Printer className="w-4 h-4 text-[var(--color-neutral-text-primary)]" />
              <span className="text-xs font-black text-[var(--color-neutral-text-primary)]">No / no sé</span>
            </div>
            <p className="text-[10px] text-[var(--color-neutral-text-secondary)] font-medium">
              La mayoría de las impresoras hogareñas y de oficina — recomendado si tenés dudas.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setPrinterMode('sin_margen_borderless')}
            className={`p-3 rounded-xl border-2 text-left transition cursor-pointer ${
              printerMode === 'sin_margen_borderless'
                ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-rose-muted)]/30'
                : 'border-[var(--color-neutral-border)] bg-white hover:border-[var(--color-accent-base)]'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Printer className="w-4 h-4 text-[var(--color-neutral-text-primary)]" />
              <span className="text-xs font-black text-[var(--color-neutral-text-primary)]">Sí, es borderless</span>
            </div>
            <p className="text-[10px] text-[var(--color-neutral-text-secondary)] font-medium">
              Solo si tu impresora lo indica explícitamente en sus opciones de impresión.
            </p>
          </button>
        </div>
      </div>

      {/* Preview en vivo */}
      <div className="bg-[var(--ui-bg-dock)] border border-white/10 rounded-2xl p-4 space-y-3">
        {preview.warning ? (
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--color-accent-amber-bright)] flex-shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-[var(--color-accent-amber-bright)]">{preview.warning}</p>
          </div>
        ) : (
          <p className="text-xs font-bold text-[var(--color-secondary-bright)]">
            Entran <span className="font-black text-white">{preview.totalPerSheet} tarjetas</span> por hoja
            ({preview.cols} columnas × {preview.rows} filas), con sangrado y marcas de corte incluidas.
          </p>
        )}
      </div>

      <button
        onClick={handleExport}
        disabled={isExporting || preview.totalPerSheet === 0}
        className="w-full p-3 bg-[var(--color-accent-purple)] hover:opacity-90 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
      >
        <Download className="w-4 h-4" />
        {isExporting ? 'Generando PDF...' : 'Exportar hoja de tarjetas (frente + dorso)'}
      </button>
    </div>
  );
}
