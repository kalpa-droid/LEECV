import React, { useState } from 'react';
import { Upload, BookOpen, Copy, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import { BookImpositionOptions } from '../../shared/core/book-engine/impositionEngine';

interface BookUploadStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  pdfPageCount: number;
  setPdfPageCount: (count: number) => void;
  onNext: () => void;
}

export const BookUploadStep: React.FC<BookUploadStepProps> = ({
  options,
  setOptions,
  selectedFile,
  setSelectedFile,
  pdfPageCount,
  setPdfPageCount,
  onNext,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Por favor selecciona un archivo PDF válido.');
      return;
    }

    setErrorMsg(null);
    setIsLoadingFile(true);
    setSelectedFile(file);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await import('pdfjs-dist');
      if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
      }
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      setPdfPageCount(pdf.numPages);
    } catch (err) {
      console.error(err);
      setErrorMsg('No se pudo leer el archivo PDF. Verifica que no esté protegido o dañado.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Paso 1: Carga tu PDF y elige el formato de impresión
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Preparado exclusivamente para imposición física (caballete / doblado en el centro). Convierte tu documento en pliegos imprenta listos para abrochar.
        </p>
      </div>

      {/* Zona de Drop PDF */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
            : selectedFile
            ? 'border-emerald-500/50 bg-emerald-500/5'
            : 'border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:border-emerald-500/50'
        }`}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {isLoadingFile ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-600 dark:text-slate-300 font-medium">Analizando documento PDF...</p>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-bounce" />
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedFile.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {pdfPageCount} páginas detectadas
              </p>
            </div>
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 underline hover:text-emerald-700"
            >
              Cambiar archivo PDF
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-emerald-100 dark:bg-emerald-950/50 rounded-full text-emerald-600 dark:text-emerald-400">
              <Upload className="w-10 h-10" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                Arrastra tu PDF aquí o haz clic para examinar
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Soporta libros, manuales, folletos, revistas o fotocopias en PDF
              </p>
            </div>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm font-medium text-center">
          {errorMsg}
        </div>
      )}

      {/* Opciones de Modo e Imposición */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Modo de Impresión */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-500" />
            Tipo de PDF Origen
          </h3>

          <div className="space-y-3">
            <label
              onClick={() => setOptions((prev) => ({ ...prev, mode: 'normal' }))}
              className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                options.mode !== 'fotocopia'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="bookMode"
                checked={options.mode !== 'fotocopia'}
                onChange={() => {}}
                className="mt-1 text-emerald-600"
              />
              <div className="ml-3">
                <span className="font-bold block text-slate-900 dark:text-white">PDF Estándar (1 pág. por hoja)</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Ideal para documentos digitales, libros PDF originales, Word exportado a PDF.
                </span>
              </div>
            </label>

            <label
              onClick={() => setOptions((prev) => ({ ...prev, mode: 'fotocopia' }))}
              className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                options.mode === 'fotocopia'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="bookMode"
                checked={options.mode === 'fotocopia'}
                onChange={() => {}}
                className="mt-1 text-emerald-600"
              />
              <div className="ml-3">
                <span className="font-bold block text-slate-900 dark:text-white">Fotocopia / Escaneo (2 págs. por hoja)</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Para PDF con 2 páginas escaneadas lado a lado en cada hoja (división automática al centro).
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Tamaño de Papel de Imprenta */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" />
            Papel Físico de Imprenta
          </h3>

          <div className="space-y-3">
            <label
              onClick={() => setOptions((prev) => ({ ...prev, paperSize: 'A4' }))}
              className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                options.paperSize !== 'A3'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="paperSize"
                checked={options.paperSize !== 'A3'}
                onChange={() => {}}
                className="mt-1 text-emerald-600"
              />
              <div className="ml-3">
                <span className="font-bold block text-slate-900 dark:text-white">Hoja A4 (Libro final A5)</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Imprime en hojas A4 y dobla al medio. Formato bolsillo/estándar A5 (148 x 210 mm).
                </span>
              </div>
            </label>

            <label
              onClick={() => setOptions((prev) => ({ ...prev, paperSize: 'A3' }))}
              className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
                options.paperSize === 'A3'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="paperSize"
                checked={options.paperSize === 'A3'}
                onChange={() => {}}
                className="mt-1 text-emerald-600"
              />
              <div className="ml-3">
                <span className="font-bold block text-slate-900 dark:text-white">Hoja A3 (Libro final A4)</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Imprime en hojas grandes A3 y dobla al medio. Formato grande A4 (210 x 297 mm).
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Botón Siguiente */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          disabled={!selectedFile || isLoadingFile}
          onClick={onNext}
          className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white transition-all shadow-lg ${
            selectedFile && !isLoadingFile
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/25 cursor-pointer scale-100 hover:scale-[1.02]'
              : 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
          }`}
        >
          <span>Configurar Tapas y Foliado</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
