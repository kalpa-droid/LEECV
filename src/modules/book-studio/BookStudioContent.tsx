import React, { useState, useEffect, useRef } from 'react';
import { AppShell } from '../../shared/core/ui/AppShell';
import Navbar from '../cv-builder/components/Navbar';
import CanvaIconDock from '../cv-builder/components/CanvaIconDock';
import { BookImpositionOptions, DEFAULT_BOOK_IMPOSITION_OPTIONS } from '../../shared/core/book-engine/impositionEngine';
import { BookSourceTypeStep } from './BookSourceTypeStep';
import { BookOrganizeStep } from './BookOrganizeStep';
import { BookFoliadoStep } from './BookFoliadoStep';
import { BookImpositionStep } from './BookImpositionStep';
import { BookCoverStep } from './BookCoverStep';
import { BookBackCoverStep } from './BookBackCoverStep';
import { BookPreviewExportStep } from './BookPreviewExportStep';
import { BookPreviewStep } from './BookPreviewStep';
import { getNextBookStepId, getPrevBookStepId } from '../../shared/core/book-engine/bookStepSequence';
import { bookAssetManager, STORAGE_WARN_BYTES } from '../../shared/core/book-engine/bookAssetManager';
import { ensurePdfjsWorkerConfigured } from '../../shared/core/pdf-engine/pdfjsWorkerSetup';
import { saveBook } from '../../shared/core/storage/documentStorageService';
import { openTab, OpenTab } from '../../shared/core/documents/tabStore';
import { useRegisterDocumentTab, resolveDocumentIdWithHandoff, generateDocumentId } from '../../shared/core/documents/documentEngine';
import { radius, button } from '../../shared/core/uiDesignSystem';
import { useDocumentViewport, useViewportGestures } from '../../shared/core/viewport';
import { DocumentTypeId } from '../../types/document';

interface BookStudioContentProps {
  currentUiTheme?: string;
  documentTabs: OpenTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNavigateToDocument: (targetDocType: DocumentTypeId, id: string) => void;
  onNewCV?: () => void;
  onNewCard?: () => void;
  onNewBook?: () => void;
  cycleUITheme: () => void;
  onTabsChanged?: (tabs: any[]) => void;
  onOpenSavedCVsModal?: () => void;
  onOpenSaveAsModal?: () => void;
  onOpenJsonDownloadModal?: () => void;
  onOpenShareAppModal?: () => void;
  onOpenPrivacy?: () => void;
}

export const BookStudioContent: React.FC<BookStudioContentProps> = ({
  currentUiTheme = 'day',
  documentTabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNavigateToDocument,
  onNewCV: _onNewCV,
  onNewCard,
  onNewBook,
  cycleUITheme,
  onTabsChanged = () => {},
  onOpenSavedCVsModal,
  onOpenSaveAsModal,
  onOpenJsonDownloadModal,
  onOpenShareAppModal,
  onOpenPrivacy,
}) => {
  const [activeStepTab, setActiveStepTab] = useState<string>('book_source_type');
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);
  const [bookId, setBookId] = useState<string>(() => resolveDocumentIdWithHandoff(activeTabId, 'book'));
  const viewport = useDocumentViewport({
    pageSizeId: 'a5'
  });
  
  const sheetRef = useRef<HTMLDivElement>(null);

  useViewportGestures({
    containerRef: viewport.containerRef,
    sheetRef,
    onZoomChange: viewport.setZoomLevel,
    zoomLevel: viewport.zoomLevel
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourcePdfPickerRef = useRef<(() => Promise<void>) | null>(null);

  const [options, setOptions] = useState<BookImpositionOptions>(DEFAULT_BOOK_IMPOSITION_OPTIONS);
  const [storageUsage, setStorageUsage] = useState<{ bytes: number; count: number } | null>(null);
  const [pdfNotice, setPdfNotice] = useState<'moved' | 'restore-available' | null>(null);
  const [confirmClearAssets, setConfirmClearAssets] = useState(false);

  const attachSourcePdf = (file: File) => {
    setSelectedFile(file);
    setPdfNotice(null);
    file.arrayBuffer().then((buf) => {
      ensurePdfjsWorkerConfigured()
        .getDocument({ data: new Uint8Array(buf) }).promise
        .then((doc: any) => {
          setPdfPageCount(doc.numPages);
          doc.destroy();
        })
        .catch(() => setPdfPageCount(0));
    });
    persistBookState(file, options);
  };

  // Restaurar la referencia local del PDF original (sin duplicar el archivo).
  useEffect(() => {
    let alive = true;
    bookAssetManager.restoreSourcePdf().then((result) => {
      if (!alive) return;
      if (result.status === 'restored') {
        attachSourcePdf(result.file);
      } else if (result.status === 'moved') {
        setPdfNotice('moved');
      } else if (result.status === 'denied') {
        setPdfNotice('restore-available');
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aviso de almacenamiento local (~1 GB).
  useEffect(() => {
    let alive = true;
    bookAssetManager.estimateUsage().then((usage) => {
      if (alive) setStorageUsage(usage);
    });
    return () => {
      alive = false;
    };
  }, [options.customCover?.assetId, options.customBackCover?.assetId]);

  const bookTitle = selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'Mi Libro / Folleto';

  // Garantizar que la pestaña activa sea "Mi Libro / Folleto" desde la carga inicial
  useRegisterDocumentTab({
    id: bookId,
    docType: 'book',
    title: bookTitle,
    documentTabs,
    onTabsChanged
  });

  const persistBookState = (file: File | null, opts: BookImpositionOptions) => {
    const id = bookId || generateDocumentId('book');
    const name = file ? file.name.replace(/\.[^/.]+$/, '') : 'Mi Libro / Folleto';
    if (!bookId) {
      setBookId(id);
    }
    const updatedTabs = openTab(id, 'book', name);
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
    setActiveStepTab(getNextBookStepId(currentStep, options.mode));
  };

  const handleNavigatePrevStep = (currentStep: string) => {
    setActiveStepTab(getPrevBookStepId(currentStep, options.mode));
  };

  const handleTriggerFileInput = () => {
    setActiveStepTab('book_source_type');
    setTimeout(() => {
      if (bookAssetManager.isFileSystemAccessSupported() && sourcePdfPickerRef.current) {
        sourcePdfPickerRef.current();
      } else {
        fileInputRef.current?.click();
      }
    }, 100);
  };

  return (
    <AppShell
      docType="book"
      isPanelOpen={isPanelOpen}
      containerRef={viewport.containerRef}
      navbarSlot={
        <Navbar
          docType="book"
          currentCvData={{}}
          currentUiTheme={currentUiTheme}
          onOpenSavedCVsModal={onOpenSavedCVsModal || (() => {})}
          onSaveCVClick={() => persistBookState(selectedFile, options)}
          onOpenSaveAsModal={onOpenSaveAsModal || (() => {})}
          onOpenJsonDownloadModal={onOpenJsonDownloadModal || (() => {})}
          onPrint={() => setActiveStepTab('book_preview_export')}
          onOpenShareAppModal={onOpenShareAppModal || (() => {})}
          onOpenPrivacy={onOpenPrivacy || (() => {})}
          zoomLevel={viewport.zoomLevel}
          setZoomLevel={viewport.setZoomLevel}
          triggerAutoFit={viewport.fitAndCenter}
          isAutoFitMode={viewport.isAutoFitMode}
          cycleUITheme={cycleUITheme}
        />
      }
      dockSlot={
        <CanvaIconDock
          docType="book"
          bookMode={options.mode}
          activeTab={activeStepTab}
          setActiveTab={setActiveStepTab}
          isPanelOpen={isPanelOpen}
          setIsPanelOpen={setIsPanelOpen}
        />
      }
      panelSlot={
        <div className="p-4 pb-24 sm:pb-16 space-y-6 overflow-y-auto h-full max-h-full text-[var(--ui-text-primary)]">
          {pdfNotice === 'moved' && (
            <div className={`p-3 bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/30 rounded-[${radius.control}] space-y-2`}>
              <p className="text-xs font-semibold text-[var(--color-status-danger-text)]">
                No encontramos tu PDF en la ubicación de antes (lo moviste o lo borraste). El proyecto del libro sigue intacto.
              </p>
              <button
                type="button"
                onClick={async () => {
                  const file = await bookAssetManager.pickSourcePdf();
                  if (file) attachSourcePdf(file);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-[${radius.control}] bg-[var(--color-status-danger-base)] text-[var(--color-status-on-base)] cursor-pointer`}
              >
                Buscar el PDF de nuevo
              </button>
            </div>
          )}

          {pdfNotice === 'restore-available' && (
            <div className={`p-3 bg-[var(--color-accent-light)]/20 border border-[var(--color-accent-base)]/30 rounded-[${radius.control}] space-y-2`}>
              <p className="text-xs font-semibold text-[var(--color-accent-text)]">
                Recordamos dónde está tu PDF. No guardamos una copia: solo la ubicación.
              </p>
              <button
                type="button"
                onClick={async () => {
                  const file = await bookAssetManager.requestSourcePdfPermission();
                  if (file) attachSourcePdf(file);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-[${radius.control}] bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] cursor-pointer`}
              >
                Reabrir mi PDF
              </button>
            </div>
          )}

          {storageUsage && storageUsage.bytes > STORAGE_WARN_BYTES && (
            <div className={`p-3 bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)]/30 rounded-[${radius.control}] space-y-2`}>
              <p className="text-xs font-semibold text-[var(--color-status-warning-text)]">
                Las imágenes guardadas en la app ya pesan más de 1 GB en este navegador. Podés borrarlas para liberar lugar (tu PDF original nunca se toca).
              </p>
              {confirmClearAssets ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await bookAssetManager.clearAll();
                      setConfirmClearAssets(false);
                      const usage = await bookAssetManager.estimateUsage();
                      setStorageUsage(usage);
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-[${radius.control}] bg-[var(--color-status-danger-base)] text-[var(--color-status-on-base)] cursor-pointer`}
                  >
                    Sí, borrar imágenes guardadas
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAssets(false)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-[${radius.control}] bg-[var(--ui-bg-card)] border border-[var(--ui-border)] text-[var(--ui-text-secondary)] cursor-pointer`}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAssets(true)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-[${radius.control}] border border-[var(--color-status-warning-base)]/40 text-[var(--color-status-warning-text)] cursor-pointer`}
                >
                  Ver y liberar espacio
                </button>
              )}
            </div>
          )}

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
              pickerRef={sourcePdfPickerRef}
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

          {activeStepTab === 'book_foliado' && (
            <BookFoliadoStep
              pdfPageCount={pdfPageCount}
              options={options}
              setOptions={handleOptionsChange}
              onNextStep={() => handleNavigateNextStep('book_foliado')}
              onPrevStep={() => handleNavigatePrevStep('book_foliado')}
            />
          )}

          {activeStepTab === 'book_imposition' && (
            <BookImpositionStep
              options={options}
              setOptions={handleOptionsChange}
              onNextStep={() => handleNavigateNextStep('book_imposition')}
              onPrevStep={() => handleNavigatePrevStep('book_imposition')}
            />
          )}

          {activeStepTab === 'book_preview_export' && (
            <BookPreviewExportStep
              options={options}
              selectedFile={selectedFile}
              pdfPageCount={pdfPageCount}
              onPrevStep={() => handleNavigatePrevStep('book_preview_export')}
              assetResolver={(ref) => bookAssetManager.getBlobUrl(ref)}
              setOptions={handleOptionsChange}
            />
          )}
        </div>
      }
      mainSlot={
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
          {selectedFile ? (
            <div ref={sheetRef} className="w-full h-full flex flex-col items-center justify-center">
              <BookPreviewStep
                options={options}
                setOptions={handleOptionsChange}
                selectedFile={selectedFile}
                pdfPageCount={pdfPageCount}
                zoomScale={viewport.zoomLevel}
                pdfDoc={pdfDoc}
                onConfirm={() => setActiveStepTab('book_preview_export')}
                activeStep={activeStepTab}
              />
            </div>
          ) : (
            <div className={`text-center p-10 bg-[var(--ui-bg-card)] rounded-[${radius.modal}] border-2 border-dashed border-[var(--ui-border)] max-w-md space-y-3`}>
              <h3 className="text-base font-bold text-[var(--ui-text-primary)]">Ningún PDF cargado aún</h3>
              <p className="text-xs text-[var(--ui-text-secondary)]">
                Carga un archivo PDF en la pestaña lateral para comenzar el montaje en caballete o imprenta.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-4">
                <button
                  type="button"
                  onClick={handleTriggerFileInput}
                  className={`px-5 py-2.5 font-bold text-xs rounded-[${radius.card}] transition cursor-pointer ${button.primary}`}
                >
                  Cargar PDF Ahora
                </button>
                {onOpenSavedCVsModal && (
                  <button
                    type="button"
                    onClick={onOpenSavedCVsModal}
                    className={`px-5 py-2.5 font-bold text-xs rounded-[${radius.card}] transition cursor-pointer ${button.secondary}`}
                  >
                    Mis Libros Guardados
                  </button>
                )}
              </div>
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
        onNewCV: _onNewCV,
        onNewCard: onNewCard,
        onNewBook: onNewBook,
        onClose: (e, id) => onCloseTab(id),
      }}
    />
  );
};
