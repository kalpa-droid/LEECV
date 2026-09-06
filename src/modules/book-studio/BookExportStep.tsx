import React, { useEffect, useState, useRef } from 'react';
import { Download, CheckCircle2, AlertCircle, RefreshCw, Printer, Sparkles } from 'lucide-react';
import { BookImpositionOptions, processBookImposition } from '../../shared/core/book-engine/impositionEngine';

interface BookExportStepProps {
  selectedFile: File;
  options: BookImpositionOptions;
  onReset: () => void;
}

export const BookExportStep: React.FC<BookExportStepProps> = ({ selectedFile, options, onReset }) => {
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Iniciando motor de imposición...');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const startProcessing = async () => {
      try {
        setIsProcessing(true);
        setErrorMsg(null);

        const pdfBytes = await processBookImposition(selectedFile, {
          ...options,
          onProgress: (msg, pct) => {
            setStatusMessage(msg);
            setProgressPercent(pct);
          },
        });

        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);

        // Disparar descarga automática
        const a = document.createElement('a');
        a.href = url;
        const cleanName = selectedFile.name.replace(/\.pdf$/i, '');
        a.download = `${cleanName}_IMPRESION_LIBRO.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setIsProcessing(false);
      } catch (err) {
        console.error('Error al generar el libro imposicionado:', err);
        setErrorMsg(err instanceof Error ? err.message : 'Ocurrió un error inesperado al procesar el libro.');
        setIsProcessing(false);
      }
    };

    startProcessing();
  }, [selectedFile, options]);

  return (
    <div className="max-w-2xl mx-auto space-y-8 text-center animate-fade-in py-8">
      {isProcessing ? (
        <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-10 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-8">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-emerald-500">
              <Printer className="w-10 h-10 animate-pulse" />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              Generando PDF Imprenta...
            </h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
              {statusMessage}
            </p>
          </div>

          {/* Barra de progreso */}
          <div className="space-y-2">
            <div className="w-full h-4 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-600">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-slate-400 font-semibold px-1">
              <span>Rasterizando páginas</span>
              <span>{progressPercent}%</span>
            </div>
          </div>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-3xl p-8 space-y-6">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto" />
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400">Error al procesar el libro</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">{errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="px-6 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-all cursor-pointer"
          >
            Reintentar con otro archivo
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-10 border border-emerald-500/30 dark:border-emerald-500/20 shadow-2xl space-y-8">
          <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-500 w-20 h-20 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">
              ¡Tu libro ha sido generado con éxito!
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm max-w-md mx-auto">
              La descarga del archivo PDF para imprenta debió iniciarse automáticamente. Si no fue así, utiliza el botón a continuación.
            </p>
          </div>

          {pdfBlobUrl && (
            <div className="pt-2 flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={pdfBlobUrl}
                download={`${selectedFile.name.replace(/\.pdf$/i, '')}_IMPRESION_LIBRO.pdf`}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.03]"
              >
                <Download className="w-6 h-6" />
                <span>Descargar PDF Imprenta</span>
                <Sparkles className="w-5 h-5" />
              </a>

              <button
                type="button"
                onClick={onReset}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all cursor-pointer"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Procesar otro libro</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
