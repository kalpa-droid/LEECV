import React, { useMemo, useState } from 'react';
import { PAGE_SIZES, getPageSize, makeCustomCardSize, PageSize } from '../../../shared/core/pdf-engine/layers/page/pageSizes';
import { calculateCardsPerSheetPreview, exportBusinessCardSheetToPDF, CardExportOptions } from '../../../shared/core/pdf-engine/cardSheetExporter';
import { Preset } from '../../../shared/core/pdf-engine/layers/presets/presetSchema';
import { BusinessCardData } from '../../../shared/core/pdf-engine/layers/records/cardDataAdapter';
import { Printer, AlertTriangle, Download } from 'lucide-react';

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
    try {
      const options: CardExportOptions = {
        sheetPageSizeIdOverride: sheetSizeId,
        trimSizeOverride: trimSize,
        impositionPresetIdOverride: printerMode,
      };
      await exportBusinessCardSheetToPDF(cardData, preset, options);
      onExported?.();
    } catch (err) {
      console.error('Error exportando hoja de tarjetas:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5 p-5 bg-white rounded-2xl border border-slate-200">
      {/* Tamaño de tarjeta */}
      <div>
        <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wide">
          Tamaño de la tarjeta
        </label>
        <select
          value={cardSizeId}
          onChange={(e) => setCardSizeId(e.target.value)}
          className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-900 outline-none focus:border-rose-400"
        >
          {CARD_SIZE_OPTIONS.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>

        {cardSizeId === 'personalizado' && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Ancho (mm)</label>
              <input
                type="number" min={20} max={200} value={customWidthMm}
                onChange={(e) => setCustomWidthMm(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Alto (mm)</label>
              <input
                type="number" min={20} max={200} value={customHeightMm}
                onChange={(e) => setCustomHeightMm(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-300 font-bold text-slate-900"
              />
            </div>
          </div>
        )}
      </div>

      {/* Hoja física donde se auto-repite */}
      <div>
        <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wide">
          Hoja donde se va a imprimir
        </label>
        <select
          value={sheetSizeId}
          onChange={(e) => setSheetSizeId(e.target.value)}
          className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-900 outline-none focus:border-rose-400"
        >
          {SHEET_SIZE_OPTIONS.map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Modo de margen de impresora — la pregunta clave que evita bordes cortados */}
      <div>
        <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wide">
          ¿Tu impresora imprime hasta el borde sin margen blanco?
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPrinterMode('impresora_oficina')}
            className={`p-3 rounded-xl border-2 text-left transition ${
              printerMode === 'impresora_oficina'
                ? 'border-rose-400 bg-rose-50'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Printer className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-black text-slate-900">No / no sé</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              La mayoría de las impresoras hogareñas y de oficina — recomendado si tenés dudas.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setPrinterMode('sin_margen_borderless')}
            className={`p-3 rounded-xl border-2 text-left transition ${
              printerMode === 'sin_margen_borderless'
                ? 'border-rose-400 bg-rose-50'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Printer className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-black text-slate-900">Sí, es borderless</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Solo si tu impresora lo indica explícitamente en sus opciones de impresión.
            </p>
          </button>
        </div>
      </div>

      {/* Preview en vivo */}
      <div className={`p-3.5 rounded-xl border ${preview.warning ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-200'}`}>
        {preview.warning ? (
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-amber-800">{preview.warning}</p>
          </div>
        ) : (
          <p className="text-xs font-bold text-emerald-800">
            Entran <span className="font-black">{preview.totalPerSheet} tarjetas</span> por hoja
            ({preview.cols} columnas × {preview.rows} filas), con sangrado y marcas de corte incluidas.
          </p>
        )}
      </div>

      <button
        onClick={handleExport}
        disabled={isExporting || preview.totalPerSheet === 0}
        className="w-full p-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 transition"
      >
        <Download className="w-4 h-4" />
        {isExporting ? 'Generando PDF...' : 'Exportar hoja de tarjetas (frente + dorso)'}
      </button>
    </div>
  );
}
