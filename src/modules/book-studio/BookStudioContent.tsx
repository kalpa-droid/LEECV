import React, { useState } from 'react';
import { AppShell } from '../../shared/core/ui/AppShell';
import Navbar from '../cv-builder/components/Navbar';
import CanvaIconDock from '../cv-builder/components/CanvaIconDock';
import { BookImpositionOptions } from '../../shared/core/book-engine/impositionEngine';
import { BookUploadStep } from './BookUploadStep';
import { BookConfigStep } from './BookConfigStep';
import { BookPreviewStep } from './BookPreviewStep';
import { BookExportStep } from './BookExportStep';
import { saveBook } from '../../shared/core/storage/documentStorageService';
import { addOpenTab, OpenTabItem } from '../../shared/core/storage/documentTabEngine';

interface BookStudioContentProps {
  documentTabs: OpenTabItem[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNavigateToDocument: (targetDocType: 'cv' | 'business_card' | 'book', id: string) => void;
  onNewCV?: () => void;
  onNewBook?: () => void;
  cycleUITheme: () => void;
}

export const BookStudioContent: React.FC<BookStudioContentProps> = ({
  documentTabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNavigateToDocument,
  onNewCV: _onNewCV,
  onNewBook,
  cycleUITheme,
}) => {
  const [activeStepTab, setActiveStepTab] = useState<string>('book_upload');
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);
  const [bookId, setBookId] = useState<string | null>(activeTabId !== 'book' ? activeTabId : null);

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

  const persistBookState = (file: File | null, opts: BookImpositionOptions) => {
    const id = bookId || `book-${Date.now()}`;
    const name = file ? file.name.replace(/\.[^/.]+$/, '') : 'Nuevo Libro';
    if (!bookId) {
      setBookId(id);
      addOpenTab(id, name, undefined, 'book');
    }
    saveBook({
      id,
      name,
      fileName: file?.name,
      pdfPageCount,
      options: opts,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      persistBookState(file, options);
    }
  };

  const handleOptionsChange: React.Dispatch<React.SetStateAction<BookImpositionOptions>> = (action) => {
    setOptions((prev) => {
      const nextOpts = typeof action === 'function' ? action(prev) : action;
      persistBookState(selectedFile, nextOpts);
      return nextOpts;
    });
  };

  const handleReset = () => {
    setActiveStepTab('book_upload');
    setSelectedFile(null);
    setPdfPageCount(0);
  };

  return (
    <AppShell
      docType="book"
      isPanelOpen={isPanelOpen}
      navbarSlot={
        <Navbar
          currentCvData={{ uiTheme: 'day' }}
          onOpenSavedCVsModal={() => {}}
          onSaveCVClick={() => persistBookState(selectedFile, options)}
          onOpenSaveAsModal={() => {}}
          onOpenJsonDownloadModal={() => {}}
          onPrint={() => setActiveStepTab('book_export')}
          onOpenShareAppModal={() => {}}
          onOpenCloudStatus={() => {}}
          zoomLevel={100}
          setZoomLevel={() => {}}
          triggerAutoFit={() => {}}
          cycleUITheme={cycleUITheme}
        />
      }
      dockSlot={
        <CanvaIconDock
          docType="book"
          activeTab={activeStepTab}
          setActiveTab={setActiveStepTab}
          isPanelOpen={isPanelOpen}
          setIsPanelOpen={setIsPanelOpen}
        />
      }
      panelSlot={
        <div className="p-4 space-y-6 overflow-y-auto max-h-full text-[var(--ui-text-primary)]">
          {activeStepTab === 'book_upload' && (
            <BookUploadStep
              options={options}
              setOptions={handleOptionsChange}
              selectedFile={selectedFile}
              setSelectedFile={handleFileSelect}
              pdfPageCount={pdfPageCount}
              setPdfPageCount={setPdfPageCount}
              onNext={() => setActiveStepTab('book_config')}
            />
          )}

          {activeStepTab === 'book_config' && (
            <BookConfigStep
              options={options}
              setOptions={handleOptionsChange}
              pdfPageCount={pdfPageCount}
              onBack={() => setActiveStepTab('book_upload')}
              onNext={() => setActiveStepTab('book_preview')}
            />
          )}

          {activeStepTab === 'book_preview' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold">Resumen de Previsualización</h3>
              <p className="text-xs text-[var(--ui-text-secondary)]">
                Revisa el montaje final antes de generar el PDF para imprenta.
              </p>
              <button
                type="button"
                onClick={() => setActiveStepTab('book_export')}
                className="w-full py-2.5 rounded-xl font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] hover:opacity-90 transition"
              >
                Ir a Exportar PDF
              </button>
            </div>
          )}

          {activeStepTab === 'book_export' && selectedFile && (
            <BookExportStep selectedFile={selectedFile} options={options} onReset={handleReset} />
          )}
        </div>
      }
      mainSlot={
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
          {selectedFile ? (
            <BookPreviewStep
              options={options}
              selectedFile={selectedFile}
              pdfPageCount={pdfPageCount}
              onBack={() => setActiveStepTab('book_config')}
              onConfirm={() => setActiveStepTab('book_export')}
            />
          ) : (
            <div className="text-center p-12 bg-[var(--ui-bg-card)] rounded-2xl border-2 border-dashed border-[var(--ui-border)] max-w-md">
              <h3 className="text-lg font-bold mb-2">Ningún PDF cargado aún</h3>
              <p className="text-sm text-[var(--ui-text-secondary)] mb-4">
                Carga un archivo PDF en el panel lateral para comenzar el montaje en caballete o imprenta.
              </p>
              <button
                type="button"
                onClick={() => setActiveStepTab('book_upload')}
                className="px-6 py-2.5 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] font-bold rounded-xl hover:opacity-90 transition"
              >
                Cargar PDF Ahora
              </button>
            </div>
          )}
        </div>
      }
      tabsBarProps={{
        tabs: documentTabs,
        activeId: activeTabId,
        docType: 'book',
        onSwitch: onSelectTab,
        onNavigateToDocument: (targetType, id) => onNavigateToDocument(targetType, id),
        onAdd: onNewBook || (() => {}),
        onClose: (e, id) => onCloseTab(id),
      }}
    />
  );
};
