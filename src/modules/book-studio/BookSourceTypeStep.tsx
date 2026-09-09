import React, { useState } from 'react';
import { BookOpen, Copy, Upload, CheckCircle2, ChevronRight, FileText } from 'lucide-react';
import { BookImpositionOptions } from '../../shared/core/book-engine/impositionEngine';
import { ensurePdfjsWorkerConfigured } from '../../shared/core/pdf-engine/pdfjsWorkerSetup';
import { button, selectableCard, radius } from '../../shared/core/uiDesignSystem';
import { useText } from '../../shared/i18n/useText';

interface BookSourceTypeStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  pdfPageCount: number;
  setPdfPageCount: (count: number) => void;
  onPdfLoaded?: (doc: any) => void;
  onNextStep?: () => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
}

export const BookSourceTypeStep: React.FC<BookSourceTypeStepProps> = ({
  options,
  setOptions,
  selectedFile,
  setSelectedFile,
  pdfPageCount,
  setPdfPageCount,
  onPdfLoaded,
  onNextStep,
  fileInputRef,
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

      // Auto-detección: Si es modo fotocopia y la página viene vertical (alto > ancho), aplicar 90° global
      try {
        const firstPage = await pdf.getPage(1);
        const vp = firstPage.getViewport({ scale: 1.0 });
        if (options.mode === 'fotocopia' && vp.height > vp.width) {
          const autoRotations: Record<number, number> = {};
          for (let i = 1; i <= pdf.numPages; i++) {
            autoRotations[i] = 90;
          }
          setOptions((prev) => ({ ...prev, pageRotations: autoRotations }));
        }
      } catch (e) {
        console.warn('Auto-detection orientation check:', e);
      }

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
      {/* 1. Selección de Modo de Documento */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-[var(--ui-text-primary)] block">
          1.a. Tu PDF es:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            onClick={() => setOptions((prev) => ({ ...prev, mode: 'normal' }))}
            className={`${selectableCard.base} ${
              options.mode !== 'fotocopia' ? selectableCard.selected : selectableCard.unselected
            } p-4 flex items-start space-x-3`}
          >
            <input
              type="radio"
              name="bookMode"
              checked={options.mode !== 'fotocopia'}
              onChange={() => {}}
              className="mt-1 text-[var(--color-accent-text)] cursor-pointer"
            />
            <div className="space-y-1">
              <span className="font-bold block text-sm text-[var(--ui-text-primary)] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
                PDF Estándar (1 pág/hoja)
              </span>
              <span className="text-xs text-[var(--ui-text-secondary)] block leading-normal">
                Ideal para documentos creados en Word, Canva o InDesign exportados directamente.
              </span>
            </div>
          </div>

          <div
            onClick={() => setOptions((prev) => ({ ...prev, mode: 'fotocopia' }))}
            className={`${selectableCard.base} ${
              options.mode === 'fotocopia' ? selectableCard.selected : selectableCard.unselected
            } p-4 flex items-start space-x-3`}
          >
            <input
              type="radio"
              name="bookMode"
              checked={options.mode === 'fotocopia'}
              onChange={() => {}}
              className="mt-1 text-[var(--color-accent-text)] cursor-pointer"
            />
            <div className="space-y-1">
              <span className="font-bold block text-sm text-[var(--ui-text-primary)] flex items-center gap-2">
                <Copy className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
                Fotocopia / Escaneo (2 págs/hoja)
              </span>
              <span className="text-xs text-[var(--ui-text-secondary)] block leading-normal">
                Para PDFs con 2 páginas escaneadas lado a lado. Se dividen al centro automáticamente.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Selección de Tamaño de Papel Imprenta */}
      <div className="space-y-2 pt-2 border-t border-[var(--ui-border)]">
        <label className="text-xs font-bold text-[var(--ui-text-primary)] block">
          1.b. El tamaño que imprimiré será:
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            onClick={() => setOptions((prev) => ({ ...prev, paperSize: 'A4' }))}
            className={`${selectableCard.base} ${
              options.paperSize !== 'A3' ? selectableCard.selected : selectableCard.unselected
            } p-4 flex items-start space-x-3`}
          >
            <input
              type="radio"
              name="paperSize"
              checked={options.paperSize !== 'A3'}
              onChange={() => {}}
              className="mt-1 text-[var(--color-accent-text)] cursor-pointer"
            />
            <div className="space-y-1">
              <span className="font-bold block text-sm text-[var(--ui-text-primary)] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
                Hoja A4 (Libro Final A5)
              </span>
              <span className="text-xs text-[var(--ui-text-secondary)] block leading-normal">
                Imprime en hojas A4 y dobla al medio. Formato estándar o de bolsillo A5.
              </span>
            </div>
          </div>

          <div
            onClick={() => setOptions((prev) => ({ ...prev, paperSize: 'A3' }))}
            className={`${selectableCard.base} ${
              options.paperSize === 'A3' ? selectableCard.selected : selectableCard.unselected
            } p-4 flex items-start space-x-3`}
          >
            <input
              type="radio"
              name="paperSize"
              checked={options.paperSize === 'A3'}
              onChange={() => {}}
              className="mt-1 text-[var(--color-accent-text)] cursor-pointer"
            />
            <div className="space-y-1">
              <span className="font-bold block text-sm text-[var(--ui-text-primary)] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
                Hoja A3 (Libro Final A4)
              </span>
              <span className="text-xs text-[var(--ui-text-secondary)] block leading-normal">
                Imprime en hojas grandes A3 y dobla al medio. Formato grande A4.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Carga de Archivo PDF */}
      <div className="pt-2 border-t border-[var(--ui-border)] space-y-2">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`relative border-2 border-dashed rounded-[${radius.card}] p-3 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-[var(--color-accent-base)] bg-[var(--color-accent-light)]/20 scale-[1.01]'
              : selectedFile
              ? 'border-[var(--color-accent-base)]/50 bg-[var(--color-accent-light)]/10'
              : 'border-[var(--ui-border)] bg-[var(--ui-bg-surface)] hover:border-[var(--color-accent-base)]/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          {isLoadingFile ? (
            <div className="flex items-center justify-center gap-2 py-1">
              <div className="w-4 h-4 border-2 border-[var(--color-accent-base)] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-[var(--ui-text-secondary)] font-medium">Analizando páginas del PDF...</p>
            </div>
          ) : selectedFile ? (
            <div className="flex items-center justify-between gap-2 px-1 py-0.5">
              <div className="flex items-center gap-2 text-left min-w-0">
                <CheckCircle2 className="w-5 h-5 text-[var(--color-accent-text)] shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-[var(--ui-text-primary)] truncate">{selectedFile.name}</h3>
                  <p className="text-[10px] text-[var(--ui-text-secondary)]">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {pdfPageCount} págs.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[var(--color-accent-text)] underline shrink-0">
                Cambiar PDF
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-1.5 text-[var(--color-accent-text)]">
              <Upload className="w-4.5 h-4.5 shrink-0" />
              <span className="text-xs font-bold text-[var(--ui-text-primary)]">
                Cargar o arrastrar archivo PDF aquí
              </span>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className={`p-2.5 bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/30 rounded-[${radius.control}] text-[var(--color-status-danger-text)] text-xs font-medium text-center`}>
            {errorMsg}
          </div>
        )}
      </div>

      {/* 4. Barra Inferior de Navegación Responsive */}
      {onNextStep && (
        <div className="pt-4 border-t border-[var(--ui-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-[var(--ui-text-secondary)] font-medium text-center sm:text-left">
            {selectedFile
              ? options.mode === 'fotocopia'
                ? 'PDF listo para organizar páginas'
                : 'PDF listo para configurar tapa'
              : options.mode === 'fotocopia'
              ? 'Siguiente paso: 2. Páginas'
              : 'Siguiente paso: 3. Tapa'}
          </span>
          <button
            type="button"
            onClick={onNextStep}
            className={`${button.base} ${button.primary} flex items-center justify-center gap-1.5 w-full sm:w-auto`}
          >
            <span>{options.mode === 'fotocopia' ? 'Siguiente: 2. Páginas' : 'Siguiente: 3. Tapa'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

