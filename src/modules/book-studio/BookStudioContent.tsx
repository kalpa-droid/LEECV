import React, { useState, useEffect, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { AppShell } from '../../shared/core/ui/AppShell';
import StudioNavbar from '../../shared/core/studio-host/StudioNavbar';
import StudioDock from '../../shared/core/studio-host/StudioDock';
import { BookImpositionOptions, DEFAULT_BOOK_IMPOSITION_OPTIONS } from './domain/impositionEngine';
import { PdfSourceError, PdfSourceErrorCode, isPdfSourceError, pdfSourceErrorFromUnknown, isPdfLikeFile } from '../../shared/core/pdf-engine/pdfSourceClassifier';
import { BookSourceTypeStep } from './BookSourceTypeStep';
import { BookOrganizeStep } from './BookOrganizeStep';
import { BookFoliadoStep } from './BookFoliadoStep';
import { BookImpositionStep } from './BookImpositionStep';
import { BookCoverStep } from './BookCoverStep';
import { BookBackCoverStep } from './BookBackCoverStep';
import { BookPreviewExportStep } from './BookPreviewExportStep';
import { BookPreviewStep } from './BookPreviewStep';
import { getNextBookStepId, getPrevBookStepId } from './domain/bookStepSequence';
import { bookAssetManager, STORAGE_WARN_BYTES } from './domain/bookAssetManager';
import { loadPdfDocumentWithCmaps } from '../../shared/core/pdf-engine/pdfjsWorkerSetup';
import { loadBookById } from '../../shared/core/storage/documentStorageService';
import { saveBook } from '../../shared/core/storage/documentStorageService';
import { openTab, OpenTab } from '../../shared/core/documents/tabStore';
import { useRegisterDocumentTab, resolveDocumentIdWithHandoff, generateDocumentId } from '../../shared/core/documents/documentEngine';
import { radius, button } from '../../shared/core/uiDesignSystem';
import { useDocumentViewport, useViewportGestures } from '../../shared/core/viewport';
import { DocumentTypeId } from '../../types/document';
import { FloatingAssistant } from '../../shared/core/studio-host/FloatingAssistant';
import { useText } from '../../shared/i18n/useText';

interface BookStudioContentProps {
  currentUiTheme?: string;
  documentTabs: OpenTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNavigateToDocument: (targetDocType: DocumentTypeId, id: string) => void;
  onNewDocument?: (docType: DocumentTypeId) => void;
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
  onNewDocument,
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
  const t = useText();
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
  // PDFs problemáticos: contraseña de apertura (challenge en pantalla) y
  // protección contra edición (rescate automático a imágenes de alta nitidez).
  const [passwordChallenge, setPasswordChallenge] = useState<{ fileName: string; wrongPassword: boolean } | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const pendingPasswordFileRef = useRef<File | null>(null);
  const [pdfPassword, setPdfPassword] = useState<string | null>(null);
  const [pdfProtection, setPdfProtection] = useState<'none' | 'protected'>('none');
  /** Código de error de la carga (flujo de restauración automática, sin paso 1 abierto). */
  const [pdfLoadErrorCode, setPdfLoadErrorCode] = useState<PdfSourceErrorCode | null>(null);
  /** Nombre guardado del libro (de "Mis Libros Guardados") cuando aún no hay PDF cargado. */
  const [savedBookName, setSavedBookName] = useState<string | null>(null);
  /** Error de elección manual de archivo (en el gesto del clic, panel principal). */
  const [filePickError, setFilePickError] = useState<string | null>(null);
  /** "Reabrir mi PDF" no devolvió el archivo (permiso denegado/no soportado). */
  const [reopenFailed, setReopenFailed] = useState<boolean>(false);

  // Refs espejo: loadSourcePdf se define una sola vez y siempre lee el estado
  // fresco (modo/opciones) sin depender del closure del primer render.
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; }, [options]);
  const pdfDocRef = useRef<any>(null);
  useEffect(() => {
    return () => {
      pdfDocRef.current?.destroy?.();
      pdfDocRef.current = null;
    };
  }, []);

  /**
   * Instancia ÚNICA de PDF.js para todo el estudio: lee el arrayBuffer una
   * sola vez, crea el pdfDoc, cuenta páginas, aplica auto-rotación en modo
   * fotocopia y persiste el conteo REAL recién leído. El doc se comparte con
   * BookPreviewStep / PdfPreviewStrip (nada vuelve a parsear el archivo).
   *
   * PDFs problemáticos (lenguaje sencillo, aviso por código):
   * - 0 bytes / dañado / sin páginas → PdfSourceError tipado (ver pdfSourceClassifier).
   * - Contraseña de apertura → PdfSourceError('password'): el paso 1 muestra
   *   el cuadro inline y se reintenta con la clave (solo en memoria de sesión).
   * - Protegido contra edición → detección con pdf-lib (ignoreEncryption):
   *   se conmuta SOLO a exportMode 'raster' (páginas como imágenes de alta
   *   nitidez, pdf.js sí puede abrirlas) y se avisa en los pasos 1, 6 y 7.
   */
  const loadSourcePdf = async (file: File, password?: string): Promise<any> => {
    setPdfNotice(null);
    setFilePickError(null);
    setReopenFailed(false);
    if (file.size === 0) {
      throw new PdfSourceError('empty-file');
    }
    const arrayBuffer = await file.arrayBuffer();
    // Una sola lectura compartida: pdf.js abre con cMaps (helper del motor);
    // el probe de pdf-lib recibe una copia para que la transferencia del
    // worker al hilo de pdf.js nunca invalide el buffer del otro consumidor.
    let doc: any;
    try {
      doc = await loadPdfDocumentWithCmaps(arrayBuffer, password);
    } catch (err) {
      throw pdfSourceErrorFromUnknown(err, file.size);
    }
    const numPages = doc.numPages;
    if (!Number.isFinite(numPages) || numPages <= 0) {
      throw new PdfSourceError('empty-pdf');
    }

    // Detección de protección contra edición: pdf-lib con ignoreEncryption
    // carga la estructura sin lanzar y deja isEncrypted=true. El camino
    // vectorial no puede copiar páginas de un PDF encriptado (saldrían
    // corruptas), así que el rescate es SIEMPRE el modo imágenes.
    let isEncrypted = false;
    try {
      const probe = await PDFDocument.load(arrayBuffer.slice(0), { ignoreEncryption: true });
      isEncrypted = Boolean((probe as { isEncrypted?: boolean }).isEncrypted);
    } catch {
      // Si hasta el diagnóstico estructural falla, lo tratamos como protegido.
      isEncrypted = true;
    }

    // Auto-detección: modo fotocopia + página vertical (alto > ancho) → 90° global.
    // Se computa sobre el estado fresco (optionsRef) y viaja dentro de
    // effectiveOpts: un solo setOptions al final (sin updaters que se pisen).
    let effectiveOpts: BookImpositionOptions = { ...optionsRef.current };
    try {
      const firstPage = await doc.getPage(1);
      const vp = firstPage.getViewport({ scale: 1.0 });
      if (optionsRef.current.mode === 'fotocopia' && vp.height > vp.width) {
        const autoRotations: Record<number, number> = {};
        for (let i = 1; i <= numPages; i++) autoRotations[i] = 90;
        effectiveOpts = { ...effectiveOpts, pageRotations: autoRotations };
      }
    } catch {
      // la rotación automática es un plus: no bloquea la carga del PDF
    }

    setPdfPageCount(numPages);
    pdfDocRef.current?.destroy?.();
    pdfDocRef.current = doc;
    setPdfDoc(doc);
    setSelectedFile(file);
    if (password) setPdfPassword(password);
    pendingPasswordFileRef.current = null;
    setPasswordChallenge(null);
    setPdfLoadErrorCode(null);
    setPdfProtection(isEncrypted ? 'protected' : 'none');
    effectiveOpts = { ...effectiveOpts, exportMode: isEncrypted ? 'raster' : effectiveOpts.exportMode };
    setOptions(effectiveOpts);
    persistBookState(file, effectiveOpts, numPages);
    return doc;
  };

  /**
   * Puerta de entrada única para los archivos elegidos/restaurados: atrapa el
   * challenge de contraseña (paso 1 muestra el cuadro inline) y clasifica el
   * resto de los errores con su código para el aviso correspondiente.
   */
  const confirmSourceFile = async (file: File, password?: string): Promise<any> => {
    try {
      return await loadSourcePdf(file, password);
    } catch (err) {
      if (isPdfSourceError(err)) {
        if (err.code === 'password') {
          pendingPasswordFileRef.current = file;
          setPasswordChallenge({ fileName: file.name, wrongPassword: Boolean(password) });
        } else {
          pendingPasswordFileRef.current = null;
          setPdfLoadErrorCode(err.code);
        }
        throw err;
      }
      setPdfLoadErrorCode('unknown');
      throw err;
    }
  };

  // Wrapper defensivo para flujos automáticos (restaurar al entrar, permiso).
  const attachSourcePdf = (file: File) => {
    confirmSourceFile(file).catch(() => {
      // Sin contraseña pendiente ni PDF cargado: el aviso tipado ya quedó
      // en pantalla (pdfLoadErrorCode); el conteo previo deja de valer.
      if (!pendingPasswordFileRef.current && !pdfDocRef.current) setPdfPageCount(0);
    });
  };

  const handlePasswordSubmit = (password: string) => {
    const file = pendingPasswordFileRef.current;
    if (!file) return;
    attachSourcePdfWithPassword(file, password);
  };

  // Igual que attachSourcePdf pero conservando el challenge si la clave falla.
  const attachSourcePdfWithPassword = (file: File, password: string) => {
    confirmSourceFile(file, password).catch(() => {
      // wrongPassword ya quedó seteado por confirmSourceFile.
    });
  };

  // Restaurar la referencia local del PDF original (sin duplicar el archivo).
  useEffect(() => {
    let alive = true;
    bookAssetManager.restoreSourcePdf(bookId || undefined).then((result) => {
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

  // Hidratación de libro guardado al cambiar de pestaña ("Mis Libros Guardados"
  // o conmutar tabs): mismas opciones y conteo exacto; si hay handle por bookId
  // se reabre el PDF sin duplicar (solo permiso de lectura), si no, aviso de
  // "volvelo a elegir" y el proyecto queda abierto con sus opciones.
  useEffect(() => {
    if (!activeTabId || activeTabId === bookId) return;
    let alive = true;
    (async () => {
      const loaded = await loadBookById(activeTabId);
      if (!alive || !loaded || !loaded.options) return;
      const id = loaded.id || activeTabId;
      setBookId(id);
      setOptions({ ...DEFAULT_BOOK_IMPOSITION_OPTIONS, ...loaded.options });
      if (Number.isFinite(loaded.pdfPageCount)) setPdfPageCount(loaded.pdfPageCount);
      if (loaded.name) setSavedBookName(loaded.name);
      const restored = await bookAssetManager.restoreSourcePdf(id);
      if (!alive) return;
      if (restored.status === 'restored') {
        attachSourcePdf(restored.file);
      } else if (restored.status === 'moved') {
        setPdfNotice('moved');
      } else {
        // 'denied' o 'no-handle': el PDF sigue en el disco de la persona;
        // el proyecto del libro ya quedó abierto con sus opciones guardadas.
        setPdfNotice('restore-available');
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId]);

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

  const bookTitle = selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : (savedBookName || 'Mi Libro / Folleto');

  // Garantizar que la pestaña activa sea "Mi Libro / Folleto" desde la carga inicial
  useRegisterDocumentTab({
    id: bookId,
    docType: 'book',
    title: bookTitle,
    documentTabs,
    onTabsChanged
  });

  const persistBookState = (file: File | null, opts: BookImpositionOptions, pageCount: number) => {
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
      pdfPageCount: pageCount,
      options: opts,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleOptionsChange: React.Dispatch<React.SetStateAction<BookImpositionOptions>> = (action) => {
    setOptions((prev) => {
      const nextOpts = typeof action === 'function' ? action(prev) : action;
      persistBookState(selectedFile, nextOpts, pdfPageCount);
      return nextOpts;
    });
  };

  const handleNavigateNextStep = (currentStep: string) => {
    setActiveStepTab(getNextBookStepId(currentStep, options.mode));
  };

  const handleNavigatePrevStep = (currentStep: string) => {
    setActiveStepTab(getPrevBookStepId(currentStep, options.mode));
  };

  /** Elige un archivo desde el <input> persistente (fuera de cualquier paso montado). */
  const handlePersistentFileChosen = (file: File) => {
    setFilePickError(null);
    if (!isPdfLikeFile(file)) {
      setFilePickError(t.bookStudio.sourceStep.errorInvalidFile);
      setIsPanelOpen(true);
      return;
    }
    confirmSourceFile(file).catch(() => {
      // El aviso tipado (pdfLoadErrorCode) ya quedó en pantalla;
      // garantizamos que el panel esté abierto para verlo.
      setIsPanelOpen(true);
    });
  };

  // Sin setTimeout ni await antes de abrir el diálogo: el clic debe nacer
  // dentro del gesto del usuario. El <input> persistente siempre está montado.
  const handleTriggerFileInput = () => {
    setFilePickError(null);
    setActiveStepTab('book_source_type');
    setIsPanelOpen(true);
    const pick = sourcePdfPickerRef.current;
    if (pick) {
      // El picker nativo arranca dentro del mismo gesto de clic.
      void pick();
      return;
    }
    fileInputRef.current?.click();
  };

  /** Texto visible por código tipado de error de carga (lenguaje sencillo). */
  const PDF_LOAD_ERROR_TEXT: Record<PdfSourceErrorCode, string> = {
    'empty-file': t.bookStudio.sourceStep.errorEmptyFile,
    password: t.bookStudio.sourceStep.passwordRequiredTitle,
    corrupt: t.bookStudio.sourceStep.errorCorrupt,
    missing: t.bookStudio.sourceStep.errorMissing,
    'empty-pdf': t.bookStudio.sourceStep.errorEmptyPdf,
    unknown: t.bookStudio.sourceStep.errorUnknown,
  };

  return (
    <>
      {/* Input persistente: siempre montado, sin importar el paso activo.
          El clic programático nace en el gesto del usuario (handleTriggerFileInput). */}
      <input
        id="book-source-pdf-input"
        type="file"
        accept=".pdf,application/pdf"
        ref={fileInputRef}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // permite volver a elegir el mismo archivo
          if (file) handlePersistentFileChosen(file);
        }}
      />
      <AppShell
        docType="book"
      isPanelOpen={isPanelOpen}
      containerRef={viewport.containerRef}
      navbarSlot={
        <StudioNavbar
          docType="book"
          currentCvData={{}}
          currentUiTheme={currentUiTheme}
          onOpenSavedCVsModal={onOpenSavedCVsModal || (() => {})}
          onSaveCVClick={() => persistBookState(selectedFile, options, pdfPageCount)}
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
        <StudioDock
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
                  const result = await bookAssetManager.pickSourcePdf(bookId || undefined);
                  if (result.status === 'picked') {
                    attachSourcePdf(result.file);
                  } else if (result.status === 'fallback-required') {
                    handleTriggerFileInput();
                  }
                  // 'cancelled' = el usuario cerró el diálogo: nada que hacer.
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
                  const file = await bookAssetManager.requestSourcePdfPermission(bookId || undefined);
                  if (file) {
                    setReopenFailed(false);
                    attachSourcePdf(file);
                    return;
                  }
                  // Permiso denegado o no soportado: avisar y caer al selector nativo.
                  setReopenFailed(true);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-[${radius.control}] bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] cursor-pointer`}
              >
                Reabrir mi PDF
              </button>
              {reopenFailed && (
                <>
                  <p role="alert" className="text-xs font-semibold text-[var(--color-status-danger-text)]">
                    {t.bookStudio.sourceStep.reopenFailedNotice}
                  </p>
                  <label
                    htmlFor="book-source-pdf-input"
                    className={`inline-block px-3 py-1.5 text-xs font-bold rounded-[${radius.control}] bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] cursor-pointer`}
                  >
                    {t.bookStudio.sourceStep.reopenFallbackButton}
                  </label>
                </>
              )}
            </div>
          )}

          {passwordChallenge && (
            <div className={`p-3 bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/30 rounded-[${radius.control}] space-y-2`}>
              <p className="text-xs font-bold text-[var(--color-status-danger-text)]">
                {t.bookStudio.sourceStep.passwordRequiredTitle}
              </p>
              <p className="text-xs text-[var(--color-status-danger-text)]">
                {t.bookStudio.sourceStep.passwordRequiredHint}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!passwordInput.trim()) return;
                  handlePasswordSubmit(passwordInput);
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={t.bookStudio.sourceStep.passwordPlaceholder}
                  aria-label={t.bookStudio.sourceStep.passwordLabel}
                  autoFocus
                  className="min-w-0 flex-1 px-2.5 py-1.5 text-xs rounded-[10px] border border-[var(--color-status-danger-base)]/40 bg-[var(--ui-bg-input)] text-[var(--ui-text-primary)] focus:outline-none focus:border-[var(--color-accent-base)]"
                />
                <button
                  type="submit"
                  disabled={!passwordInput.trim()}
                  className={`px-3 py-1.5 text-xs font-bold rounded-[${radius.control}] bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {t.bookStudio.sourceStep.passwordSubmit}
                </button>
              </form>
              {passwordChallenge.wrongPassword && (
                <p className="text-[11px] font-bold text-[var(--color-status-danger-text)]">
                  {t.bookStudio.sourceStep.passwordWrong}
                </p>
              )}
            </div>
          )}

          {pdfLoadErrorCode && !passwordChallenge && (
            <div className={`p-3 bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/30 rounded-[${radius.control}] space-y-2`}>
              <p className="text-xs font-semibold text-[var(--color-status-danger-text)]">
                {PDF_LOAD_ERROR_TEXT[pdfLoadErrorCode]}
              </p>
              <button
                type="button"
                onClick={handleTriggerFileInput}
                className={`px-3 py-1.5 text-xs font-bold rounded-[${radius.control}] bg-[var(--color-status-danger-base)] text-[var(--color-status-on-base)] cursor-pointer`}
              >
                {t.bookStudio.pdfStrip.tryAnotherPdf}
              </button>
            </div>
          )}

          {pdfProtection === 'protected' && (
            <div className={`p-3 bg-[var(--color-accent-light)]/20 border border-[var(--color-accent-base)]/30 rounded-[${radius.control}]`}>
              <p className="text-xs font-semibold text-[var(--color-accent-text)]">
                {pdfPassword
                  ? t.bookStudio.sourceStep.protectionNoticeUnlocked
                  : t.bookStudio.sourceStep.protectionNotice}
              </p>
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
              pdfPageCount={pdfPageCount}
              onFileConfirmed={confirmSourceFile}
              onNextStep={() => handleNavigateNextStep('book_source_type')}
              pickerRef={sourcePdfPickerRef}
              bookId={bookId}
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
              sourceProtected={pdfProtection === 'protected'}
              pdfPageCount={pdfPageCount}
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
              pdfPassword={pdfPassword}
              sourceProtected={pdfProtection === 'protected'}
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
                onRequestAnotherPdf={handleTriggerFileInput}
              />
            </div>
          ) : (
            <div className={`text-center p-10 bg-[var(--ui-bg-card)] rounded-[${radius.modal}] border-2 border-dashed border-[var(--ui-border)] max-w-md space-y-3`}>
              {(filePickError || pdfLoadErrorCode) && (
                <p role="alert" className="text-xs font-semibold text-[var(--color-status-danger-text)]">
                  {filePickError || (pdfLoadErrorCode ? PDF_LOAD_ERROR_TEXT[pdfLoadErrorCode] : null)}
                </p>
              )}
              <h3 className="text-base font-bold text-[var(--ui-text-primary)]">{t.bookStudio.previewExportStep.emptyTitle}</h3>
              <p className="text-xs text-[var(--ui-text-secondary)]">
                {t.bookStudio.studioShell.emptyBody}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-4">
                <button
                  type="button"
                  onClick={handleTriggerFileInput}
                  className={`px-5 py-2.5 font-bold text-xs rounded-[${radius.card}] transition cursor-pointer ${button.primary}`}
                >
                  {t.bookStudio.studioShell.loadPdfNow}
                </button>
                {onOpenSavedCVsModal && (
                  <button
                    type="button"
                    onClick={onOpenSavedCVsModal}
                    className={`px-5 py-2.5 font-bold text-xs rounded-[${radius.card}] transition cursor-pointer ${button.secondary}`}
                  >
                    {t.bookStudio.studioShell.mySavedBooks}
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
        onNewDocument,
        onNewCV: _onNewCV,
        onNewCard: onNewCard,
        onNewBook: onNewBook,
        onClose: (e, id) => onCloseTab(id),
      }}
      />
      <FloatingAssistant
        docType="book"
        activeTab={activeStepTab}
        onNavigate={setActiveStepTab}
        bookOptions={options}
      />
    </>
  );
};
