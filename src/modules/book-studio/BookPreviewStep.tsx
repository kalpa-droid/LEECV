import React from 'react';
import { BookImpositionOptions } from '../../shared/core/book-engine/impositionEngine';
import { PdfPreviewStrip } from './components/PdfPreviewStrip';

interface BookPreviewStepProps {
  options: BookImpositionOptions;
  setOptions: React.Dispatch<React.SetStateAction<BookImpositionOptions>>;
  selectedFile: File | null;
  pdfPageCount: number;
  zoomScale?: number;
  pdfDoc?: any;
  onConfirm: () => void;
}

export const BookPreviewStep: React.FC<BookPreviewStepProps> = ({
  options,
  setOptions,
  selectedFile,
  pdfPageCount,
  zoomScale = 1.0,
  pdfDoc,
}) => {
  return (
    <div className="w-full h-full flex flex-col space-y-4 overflow-y-auto p-4 text-[var(--ui-text-primary)]">
      {/* Visor Central de Miniaturas */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <PdfPreviewStrip
          selectedFile={selectedFile}
          pdfPageCount={pdfPageCount}
          options={options}
          setOptions={setOptions}
          zoomScale={zoomScale}
          pdfDoc={pdfDoc}
        />
      </div>
    </div>
  );
};


