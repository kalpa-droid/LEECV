import React from 'react';
import { BookOpen, CheckCircle, AlertTriangle, ArrowLeft, Printer, Sparkles } from 'lucide-react';
import { BookImpositionOptions } from '../../shared/core/book-engine/impositionEngine';
import { calculateFinalBookPageCount } from '../../shared/core/book-engine/bookPageCount';

interface BookPreviewStepProps {
  options: BookImpositionOptions;
  selectedFile: File | null;
  pdfPageCount: number;
  onBack: () => void;
  onConfirm: () => void;
}

export const BookPreviewStep: React.FC<BookPreviewStepProps> = ({
  options,
  selectedFile,
  pdfPageCount,
  onBack,
  onConfirm,
}) => {
  const hasCover = options.hasCover || (options.customCover && options.customCover.type !== 'none');
  const hasBackCover = options.hasBackCover || (options.customBackCover && options.customBackCover.type !== 'none');

  const finalPageCount = calculateFinalBookPageCount(
    pdfPageCount,
    Boolean(options.customCover && options.customCover.type !== 'none'),
    Boolean(options.customBackCover && options.customBackCover.type !== 'none')
  );

  const totalSheetsToPrint = finalPageCount / 2; // 2 caras por pliego impreso doble faz

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Paso 3: Previsualización y Confirmación de Imposición
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Revisa el cálculo definitivo de pliegos y hojas físicas de imprenta antes de generar tu archivo PDF final.
        </p>
      </div>

      {/* Tarjeta Informativa Principal */}
      <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-8 border border-slate-200 dark:border-slate-700/60 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedFile?.name || 'Documento PDF'}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Formato origen: {options.mode === 'fotocopia' ? 'Escaneo 2 págs./hoja' : 'PDF 1 pág./hoja'} • Papel imprenta: {options.paperSize || 'A4'}
              </p>
            </div>
          </div>
          <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs tracking-wider uppercase">
            Listo para Imprimir
          </span>
        </div>

        {/* Grilla de Métricas de Imprenta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/50">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block uppercase">
              Páginas Originales PDF
            </span>
            <span className="text-3xl font-black text-slate-900 dark:text-white mt-1 block">
              {pdfPageCount}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/50">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block uppercase">
              Páginas Libro Final (Mult. 4)
            </span>
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
              {finalPageCount}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/50">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block uppercase">
              Pliegos Físicos A4/A3
            </span>
            <span className="text-3xl font-black text-teal-600 dark:text-teal-400 mt-1 block">
              {totalSheetsToPrint} <span className="text-sm font-normal text-slate-500">hojas</span>
            </span>
          </div>
        </div>

        {/* Resumen de Ajustes de Tapas */}
        <div className="space-y-3 pt-2">
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Detalle de Armado de Pliegos:
          </h4>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Tapa: <strong>{hasCover ? (options.customCover ? 'Tapa Tipográfica Custom' : 'Página 1 del PDF') : 'Sin Tapa'}</strong></span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Contratapa: <strong>{hasBackCover ? (options.customBackCover ? 'Contratapa Custom' : 'Última página del PDF') : 'Sin Contratapa'}</strong></span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Alineación de Foliado: <strong>Automática para abrochar en caballete</strong></span>
            </li>
          </ul>
        </div>

        {/* Aviso de Exclusividad para Imprenta */}
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-800 dark:text-amber-300 text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Documento Exclusivo para Imprenta y Doblado</span>
            <span className="text-xs opacity-90 block mt-0.5">
              Este PDF rasteriza cada página a alta resolución e impone las hojas en pares inversos (caballete). Está diseñado únicamente para imprimirse en doble faz, doblarse por la mitad y abrocharse. No debe usarse para lectura digital continua ni OCR.
            </span>
          </div>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex justify-between items-center pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Volver al Paso 2</span>
        </button>

        <button
          type="button"
          onClick={onConfirm}
          className="flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-white bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 shadow-xl shadow-emerald-500/30 transition-all cursor-pointer hover:scale-[1.03] text-lg"
        >
          <Printer className="w-6 h-6" />
          <span>Generar PDF Imprenta ({totalSheetsToPrint} pliegos)</span>
          <Sparkles className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
