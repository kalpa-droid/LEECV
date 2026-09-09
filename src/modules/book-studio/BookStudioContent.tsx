import React, { useState, useEffect, useRef } from 'react';
import { AppShell } from '../../shared/core/ui/AppShell';
import Navbar from '../cv-builder/components/Navbar';
import CanvaIconDock from '../cv-builder/components/CanvaIconDock';
import { BookImpositionOptions } from '../../shared/core/book-engine/impositionEngine';
import { BookSourceTypeStep } from './BookSourceTypeStep';
import { BookOrganizeStep } from './BookOrganizeStep';
import { BookFoliadoStep } from './BookFoliadoStep';
import { BookPaperStep } from './BookPaperStep';
import { BookCoverStep } from './BookCoverStep';
import { BookBackCoverStep } from './BookBackCoverStep';
import { BookPreviewExportStep } from './BookPreviewExportStep';
import { BookPreviewStep } from './BookPreviewStep';
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
  onTabsChanged?: (tabs: OpenTabItem[]) => void;
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
  onTabsChanged = () => {},
}) => {
  const [activeStepTab, setActiveStepTab] = useState<string>('book_source_type');
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);
  const [bookId, setBookId] = useState<string>(() => (activeTabId && activeTabId.startsWith('book-') ? activeTabId : 'book-main'));
  const [bookZoom, setBookZoom] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Garantizar que la pestaña activa sea "Mi Libro / Folleto" desde la carga inicial
  useEffect(() => {
    const currentId = bookId || 'book-main';
    const name = selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'Mi Libro / Folleto';
    const updatedTabs = addOpenTab(currentId, name, undefined, 'book');
    onTabsChanged(updatedTabs);
  }, [bookId]);

  const persistBookState = (file: File | null, opts: BookImpositionOptions) => {
    const id = bookId || `book-${Date.now()}`;
    const name = file ? file.name.replace(/\.[^/.]+$/, '') : 'Mi Libro / Folleto';
    if (!bookId) {
      setBookId(id);
    }
    const updatedTabs = addOpenTab(id, name, undefined, 'book');
    onTabsChanged(updatedTabs);
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
    if (!file) setPdfDoc(null);
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

  const handleNavigateNextStep = (currentStep: string) => {
    const sequence = [
      'book_source_type',
      'book_organize',
      'book_foliado',
      'book_paper',
      'book_cover',
      'book_back_cover',
      'book_preview_export',
    ];
    const currentIndex = sequence.indexOf(currentStep);
    if (currentIndex >= 0 && currentIndex < sequence.length - 1) {
      setActiveStepTab(sequence[currentIndex + 1]);
    }
  };

  const handleNavigatePrevStep = (currentStep: string) => {
    const sequence = [
      'book_source_type',
      'book_organize',
      'book_foliado',
      'book_paper',
      'book_cover',
      'book_back_cover',
      'book_preview_export',
    ];
    const currentIndex = sequence.indexOf(currentStep);
    if (currentIndex > 0) {
      setActiveStepTab(sequence[currentIndex - 1]);
    }
  };

  const handleTriggerFileInput = () => {
    setActiveStepTab('book_source_type');
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  return (
    <AppShell
      docType="book"
      isPanelOpen={isPanelOpen}
      navbarSlot={
        <Navbar
          docType="book"
          currentCvData={{ uiTheme: 'day' }}
          onOpenSavedCVsModal={() => {}}
          onSaveCVClick={() => persistBookState(selectedFile, options)}
          onOpenSaveAsModal={() => {}}
          onOpenJsonDownloadModal={() => {}}
          onPrint={() => setActiveStepTab('book_preview_export')}
          onOpenShareAppModal={() => {}}
          onOpenCloudStatus={() => {}}
          zoomLevel={bookZoom}
          setZoomLevel={setBookZoom}
          triggerAutoFit={() => setBookZoom(1)}
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
          {activeStepTab === 'book_source_type' && (
            <BookSourceTypeStep
              options={options}
              setOptions={handleOptionsChange}
              selectedFile={selectedFile}
              setSelectedFile={handleFileSelect}
              pdfPageCount={pdfPageCount}
              setPdfPageCount={setPdfPageCount}
              onPdfLoaded={(doc) => setPdfDoc(doc)}
              onNextStep={() => handleNavigateNextStep('book_source_type')}
              fileInputRef={fileInputRef}
            />
          )}

          {activeStepTab === 'book_organize' && (
            <BookOrganizeStep
              pdfPageCount={pdfPageCount}
              options={options}
              setOptions={handleOptionsChange}
              onNextStep={() => handleNavigateNextStep('book_organize')}
              onPrevStep={() => handleNavigatePrevStep('book_organize')}
            />
          )}

          {activeStepTab === 'book_foliado' && (
            <BookFoliadoStep
              pdfPageCount={pdfPageCount}
              options={options}
              setOptions={handleOptionsChange}
              onNextStep={() => handleNavigateNextStep('book_foliado')}
              onPrevStep={() => handleNavigatePrevStep('book_foliado')}
            />
          )}

          {activeStepTab === 'book_paper' && (
            <BookPaperStep
              options={options}
              setOptions={handleOptionsChange}
              onNextStep={() => handleNavigateNextStep('book_paper')}
              onPrevStep={() => handleNavigatePrevStep('book_paper')}
            />
          )}

          {activeStepTab === 'book_cover' && (
            <BookCoverStep
              options={options}
              setOptions={handleOptionsChange}
              onNextStep={() => handleNavigateNextStep('book_cover')}
              onPrevStep={() => handleNavigatePrevStep('book_cover')}
            />
          )}

          {activeStepTab === 'book_back_cover' && (
            <BookBackCoverStep
              options={options}
              setOptions={handleOptionsChange}
              onNextStep={() => handleNavigateNextStep('book_back_cover')}
              onPrevStep={() => handleNavigatePrevStep('book_back_cover')}
            />
          )}

          {activeStepTab === 'book_preview_export' && (
            <BookPreviewExportStep
              options={options}
              selectedFile={selectedFile}
              pdfPageCount={pdfPageCount}
              onPrevStep={() => handleNavigatePrevStep('book_preview_export')}
            />
          )}
        </div>
      }
      mainSlot={
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
          {selectedFile ? (
            <BookPreviewStep
              options={options}
              setOptions={handleOptionsChange}
              selectedFile={selectedFile}
              pdfPageCount={pdfPageCount}
              zoomScale={bookZoom}
              pdfDoc={pdfDoc}
              onConfirm={() => setActiveStepTab('book_preview_export')}
            />
          ) : (
            <div className="text-center p-10 bg-[var(--ui-bg-card)] rounded-2xl border-2 border-dashed border-[var(--ui-border)] max-w-md space-y-3">
              <h3 className="text-base font-bold text-[var(--ui-text-primary)]">Ningún PDF cargado aún</h3>
              <p className="text-xs text-[var(--ui-text-secondary)]">
                Carga un archivo PDF en la pestaña lateral para comenzar el montaje en caballete o imprenta.
              </p>
              <button
                type="button"
                onClick={handleTriggerFileInput}
                className="px-5 py-2.5 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] font-bold text-xs rounded-xl hover:opacity-90 transition cursor-pointer"
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
