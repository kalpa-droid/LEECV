import React, { useState } from 'react';
import { Layers, BookOpen, Copy, Upload, CheckCircle2 } from 'lucide-react';
import { BookImpositionOptions } from '../../shared/core/book-engine/impositionEngine';
import { ensurePdfjsWorkerConfigured } from '../../shared/core/pdf-engine/pdfjsWorkerSetup';
import { radius } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

interface BookSourceTypeStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  pdfPageCount: number;
  setPdfPageCount: (count: number) => void;
  onPdfLoaded?: (doc: any) => void;
}

export const BookSourceTypeStep: React.FC<BookSourceTypeStepProps> = ({
  options,
  setOptions,
  selectedFile,
  setSelectedFile,
  pdfPageCount,
  setPdfPageCount,
  onPdfLoaded,
}) => {
  const t = useText();
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
      const pdfjsLib = ensurePdfjsWorkerConfigured();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      setPdfPageCount(pdf.numPages);
      onPdfLoaded?.(pdf);
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
          <Layers className="w-5 h-5 text-[var(--color-accent-text)]" />
          <span>{t.bookStudio.sourceStep.title}</span>
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)]">
          {t.bookStudio.sourceStep.description}
        </p>
      </div>

      <div className="space-y-3">
        <label
          onClick={() => setOptions((prev) => ({ ...prev, mode: 'normal' }))}
          className={`flex items-start p-4 rounded-[${radius.card}] border-2 cursor-pointer transition-all ${
            options.mode !== 'fotocopia'
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/10 shadow-sm'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] hover:border-[var(--ui-dock-border)]'
          }`}
        >
          <input
            type="radio"
            name="bookMode"
            checked={options.mode !== 'fotocopia'}
            onChange={() => {}}
            className="mt-1 text-[var(--color-accent-text)]"
          />
          <div className="ml-3 space-y-1">
            <span className="font-bold block text-sm text-[var(--ui-text-primary)] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--color-accent-text)]" />
              PDF Estándar (1 pág. por hoja)
            </span>
            <span className="text-xs text-[var(--ui-text-secondary)] block">
              Ideal para documentos digitales creados en Word, Canva o InDesign exportados directamente a PDF.
            </span>
          </div>
        </label>

        <label
          onClick={() => setOptions((prev) => ({ ...prev, mode: 'fotocopia' }))}
          className={`flex items-start p-4 rounded-[${radius.card}] border-2 cursor-pointer transition-all ${
            options.mode === 'fotocopia'
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/10 shadow-sm'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] hover:border-[var(--ui-dock-border)]'
          }`}
        >
          <input
            type="radio"
            name="bookMode"
            checked={options.mode === 'fotocopia'}
            onChange={() => {}}
            className="mt-1 text-[var(--color-accent-text)]"
          />
          <div className="ml-3 space-y-1">
            <span className="font-bold block text-sm text-[var(--ui-text-primary)] flex items-center gap-2">
              <Copy className="w-4 h-4 text-[var(--color-accent-text)]" />
              Fotocopia / Escaneo (2 págs. por hoja)
            </span>
            <span className="text-xs text-[var(--ui-text-secondary)] block">
              Para PDF con 2 páginas escaneadas lado a lado en cada hoja. El motor las dividirá automáticamente al centro.
            </span>
          </div>
        </label>
      </div>

      {/* Zona de Drop Carga PDF */}
      <div className="pt-2 border-t border-[var(--ui-border)] space-y-2">
        <label className="text-xs font-bold text-[var(--ui-text-primary)] block">
          Archivo PDF Fuente
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`relative border-2 border-dashed rounded-[${radius.card}] p-6 text-center transition-all cursor-pointer ${
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
            <div className="flex flex-col items-center justify-center space-y-2 py-2">
              <div className="w-8 h-8 border-3 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-[var(--ui-text-secondary)] font-medium">Analizando páginas del PDF...</p>
            </div>
          ) : selectedFile ? (
            <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
              <CheckCircle2 className="w-10 h-10 text-[var(--color-accent-text)]" />
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-[var(--ui-text-primary)]">{selectedFile.name}</h3>
                <p className="text-[11px] text-[var(--ui-text-secondary)]">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {pdfPageCount} páginas detectadas
                </p>
              </div>
              <button
                type="button"
                className="mt-1 text-[11px] font-semibold text-[var(--color-accent-text)] underline hover:opacity-80"
              >
                Reemplazar archivo PDF
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2 py-2">
              <div className="p-2.5 bg-[var(--color-accent-light)]/20 rounded-full text-[var(--color-accent-text)]">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--ui-text-primary)]">
                  Arrastra tu PDF aquí o haz clic para examinar
                </p>
                <p className="text-[11px] text-[var(--ui-text-secondary)] mt-0.5">
                  Soporta libros, folletos, revistas o fotocopias en PDF
                </p>
              </div>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className={`p-2.5 bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/30 rounded-[${radius.control}] text-[var(--color-status-danger-text)] text-xs font-medium text-center`}>
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
};
