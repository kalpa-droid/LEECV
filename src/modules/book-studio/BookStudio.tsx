import React, { useState } from 'react';
import { BookOpen, Check, FileUp, Settings, Eye, Printer, ArrowLeft } from 'lucide-react';
import { BookImpositionOptions } from '../../shared/core/book-engine/impositionEngine';
import { BookUploadStep } from './BookUploadStep';
import { BookConfigStep } from './BookConfigStep';
import { BookPreviewStep } from './BookPreviewStep';
import { BookExportStep } from './BookExportStep';

interface BookStudioProps {
  onBackToHome?: () => void;
}

export const BookStudio: React.FC<BookStudioProps> = ({ onBackToHome }) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);

  const [options, setOptions] = useState<BookImpositionOptions>({
    mode: 'normal',
    paperSize: 'A4',
    hasCover: false,
    coverSide: 'derecha',
    hasBackCover: false,
    backCoverSide: 'izquierda',
    refPdfPage: 0,
    refBookPage: 0,
    refPageSide: 'derecha',
    pageRotations: {},
    pageSplitOffsets: {},
    customCover: null,
    customBackCover: null,
    deletedPages: [],
    pageOrder: [],
    blankBehindCover: true,
    blankInFrontBackCover: true,
  });

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedFile(null);
    setPdfPageCount(0);
  };

  const steps = [
    { number: 1, title: 'Cargar PDF', icon: FileUp },
    { number: 2, title: 'Tapas y Imprenta', icon: Settings },
    { number: 3, title: 'Previsualizar', icon: Eye },
    { number: 4, title: 'Exportar PDF', icon: Printer },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-emerald-500 selection:text-white pb-20">
      {/* Navbar Superior */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Volver a Inicio"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl text-slate-950 font-black">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-lg text-white tracking-tight">
                Studio Libros & Folletos <span className="text-emerald-400 text-xs font-normal">Imprenta Pro</span>
              </span>
            </div>
          </div>

          <div className="text-xs font-semibold px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full">
            PDF para Caballete / Imprenta
          </div>
        </div>
      </header>

      {/* Stepper Visual */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between relative">
          {/* Línea conectora */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />
          <div
            className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 -translate-y-1/2 z-0 transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />

          {steps.map((step) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.number;
            const isCurrent = currentStep === step.number;

            return (
              <div key={step.number} className="relative z-10 flex flex-col items-center gap-2">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 scale-100'
                      : isCurrent
                      ? 'bg-slate-800 border-2 border-emerald-400 text-emerald-400 shadow-lg shadow-emerald-400/20 scale-110'
                      : 'bg-slate-800/80 border border-slate-700 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-6 h-6 stroke-[3]" /> : <Icon className="w-5 h-5" />}
                </div>
                <span
                  className={`text-xs font-bold tracking-tight hidden sm:block ${
                    isCurrent ? 'text-emerald-400' : isCompleted ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Paso Activo */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {currentStep === 1 && (
          <BookUploadStep
            options={options}
            setOptions={setOptions}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            pdfPageCount={pdfPageCount}
            setPdfPageCount={setPdfPageCount}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <BookConfigStep
            options={options}
            setOptions={setOptions}
            pdfPageCount={pdfPageCount}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 3 && (
          <BookPreviewStep
            options={options}
            selectedFile={selectedFile}
            pdfPageCount={pdfPageCount}
            onBack={() => setCurrentStep(2)}
            onConfirm={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 4 && selectedFile && (
          <BookExportStep selectedFile={selectedFile} options={options} onReset={handleReset} />
        )}
      </main>
    </div>
  );
};
