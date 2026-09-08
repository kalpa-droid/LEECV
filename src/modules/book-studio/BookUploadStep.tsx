import React, { useState } from 'react';
import { Upload, CheckCircle2, FileUp } from 'lucide-react';
import { radius, elevationSystem } from '../../shared/core/uiDesignSystem';

interface BookUploadStepProps {
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  pdfPageCount: number;
  setPdfPageCount: (count: number) => void;
  onNext?: () => void;
}

export const BookUploadStep: React.FC<BookUploadStepProps> = ({
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
    <div className="space-y-6 text-[var(--ui-text-primary)]">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-[var(--ui-text-primary)] flex items-center gap-2">
          <FileUp className="w-5 h-5 text-[var(--color-accent-base)]" />
          <span>Cargar Documento PDF</span>
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)]">
          Carga el archivo PDF que deseas convertir en pliegos de imprenta listos para doblar y encuadernar.
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
        className={`relative border-2 border-dashed rounded-[${radius.card}] p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/20 scale-[1.01]'
            : selectedFile
            ? 'border-[var(--color-accent-base)]/50 bg-[var(--color-accent-light)]/10'
            : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] hover:border-[var(--color-accent-base)]/50'
        }`}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {isLoadingFile ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-4">
            <div className="w-10 h-10 border-3 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-[var(--ui-text-secondary)] font-medium">Analizando páginas del PDF...</p>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center justify-center space-y-2 py-2">
            <CheckCircle2 className="w-12 h-12 text-[var(--color-accent-base)]" />
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-[var(--ui-text-primary)]">{selectedFile.name}</h3>
              <p className="text-xs text-[var(--ui-text-secondary)]">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {pdfPageCount} páginas detectadas
              </p>
            </div>
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-[var(--color-accent-base)] underline hover:opacity-80"
            >
              Reemplazar archivo PDF
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3 py-4">
            <div className="p-3 bg-[var(--color-accent-light)]/20 rounded-full text-[var(--color-accent-base)]">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--ui-text-primary)]">
                Arrastra tu PDF aquí o haz clic para examinar
              </p>
              <p className="text-xs text-[var(--ui-text-muted)] mt-1">
                Soporta libros, folletos, revistas o fotocopias en formato PDF
              </p>
            </div>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className={`p-3 bg-rose-500/10 border border-rose-500/30 rounded-[${radius.control}] text-rose-500 text-xs font-medium text-center`}>
          {errorMsg}
        </div>
      )}

      {selectedFile && onNext && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onNext}
            className={`px-5 py-2.5 rounded-[${radius.control}] text-xs font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] hover:opacity-90 transition ${elevationSystem.floating}`}
          >
            Continuar a Tipo de Origen
          </button>
        </div>
      )}
    </div>
  );
};
