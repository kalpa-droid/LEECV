import React, { useState, useEffect, useRef } from 'react';
import { Bot, Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { colorSystem, typeScale, button } from '../../../../shared/core/uiDesignSystem';
import { Modal } from '../../../../shared/core/ui/Modal';
import { isTextLayerCoherent } from '../../../../shared/core/cv-import/textCoherenceHeuristic';
import { ensurePdfjsWorkerConfigured } from '../../../../shared/core/pdf-engine/pdfjsWorkerSetup';
import { clampCanvasSize, encodeCanvasWithinBudget, encodeImageFileWithinBudget } from '../../../../shared/core/cv-import/pageImageEncoder';
import { mergePageFragments, type CVFragment } from '../../../../shared/core/cv-import/mergeFragments';
import { apiClient } from '../../../../shared/core/utils/apiClient';

interface ImportCvAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (cvData: any) => void;
}

export default function ImportCvAiModal({ isOpen, onClose, onImportComplete }: ImportCvAiModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentReadingPage, setCurrentReadingPage] = useState(1);
  const [retryNotice, setRetryNotice] = useState('');
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'processing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [jobErrorCode, setJobErrorCode] = useState<string | null>(null);
  const [failedPages, setFailedPages] = useState<number[]>([]);
  const fragmentsByPageRef = useRef<Map<number, CVFragment>>(new Map());

  // Helper: arma el payload de una página del PDF (texto si la capa es coherente, imagen renderizada si no)
  const buildPagePayload = async (pdf: any, pageNumber: number) => {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const rawText = textContent.items.map((item: any) => item.str).join(' ');

    if (isTextLayerCoherent(rawText)) {
      return { kind: 'text' as const, content: rawText };
    }

    const unscaledViewport = page.getViewport({ scale: 1 });
    const targetScale = Math.max(1.2, Math.min(2.0, 1400 / (unscaledViewport.height || 1000)));
    const viewport = page.getViewport({ scale: targetScale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no soportado en este navegador.');
    await page.render({ canvasContext: ctx, viewport }).promise;
    const content = encodeCanvasWithinBudget(clampCanvasSize(canvas));
    // Liberar memoria gráfica inmediatamente
    canvas.width = 0;
    canvas.height = 0;
    return { kind: 'image' as const, content, auxiliaryText: rawText };
  };

  // Helper: save draft to localStorage
  const saveDraft = (draftData: any) => {
    try {
      localStorage.setItem('leecv_last_imported_draft', JSON.stringify({
        timestamp: Date.now(),
        sourceName: file?.name || 'Texto pegado',
        data: draftData
      }));
    } catch (e) {
      console.warn('No se pudo guardar el borrador en localStorage', e);
    }
  };

  // Helper: extract with retry (now used for PDF pages and reintento selectivo)
  const extractWithRetry = async (payload: { kind: 'text' | 'image'; content: string; auxiliaryText?: string }, 
                                 pageNumber: number, 
                                 maxRetries = 2) => {
    let lastError: any = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        setRetryNotice(`Reintentando página ${pageNumber} (intento ${attempt + 1})...`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      }
      try {
        const pDataPage = await apiClient.post<{ fragmentJson?: any; message?: string }>(
          '/api/cv-import-api?action=extract-page',
          payload,
          { requiresAuth: false }
        );
        if (pDataPage.ok && pDataPage.data?.fragmentJson) {
          setRetryNotice('');
          return pDataPage.data.fragmentJson;
        }
        throw new Error(pDataPage.error || `Error en página ${pageNumber}`);
      } catch (err: any) {
        lastError = err;
        console.warn(`Error en extracción página ${pageNumber}:`, err.message || err);
      }
    }
    setRetryNotice('');
    throw lastError;
  };

  // Helper: consolidate fragments (for multi-page PDFs)
  const consolidateFragments = async (fragments: CVFragment[]): Promise<any> => {
    if (fragments.length === 0) return null;
    if (fragments.length === 1) return fragments[0];

    // Try ATS consolidation first
    const consResp = await apiClient.post<{ consolidatedJson?: any }>(
      '/api/cv-import-api?action=consolidate-ats',
      { fragments }
    );
    if (consResp.ok && consResp.data?.consolidatedJson) {
      return consResp.data.consolidatedJson;
    }
    return mergePageFragments(fragments);
  };

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setPastedText('');
      setStatus('idle');
      setErrorMsg('');
      setRetryNotice('');
      setProgress(0);
      setTotal(0);
      setCurrentReadingPage(1);
      setJobErrorCode(null);
      setFailedPages([]);
      // El mapa se resetea para que el reintento selectivo re-extraiga solo páginas fallidas
      fragmentsByPageRef.current = new Map();
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPastedText('');
      setStatus('idle');
      setErrorMsg('');
      setRetryNotice('');
    }
  };

  const startImport = async () => {
    if (!file && !pastedText.trim()) return;
    
    setStatus('analyzing');
    setJobErrorCode(null);
    setErrorMsg('');
    
    try {
      const fragments: CVFragment[] = [];
      let totalPages = 1;

      if (!file) {
        setTotal(1);
        setStatus('processing');
        const pData = await apiClient.post<{ fragmentJson?: any }>('/api/cv-import-api?action=extract-page', {
          kind: 'text',
          content: pastedText.trim()
        }, { requiresAuth: false });
        if (!pData.ok || !pData.data?.fragmentJson) {
          throw new Error(pData.error || 'No se pudo procesar el texto.');
        }
        fragments.push(pData.data.fragmentJson);
        setProgress(1);
      } else if (file.type.startsWith('image/')) {
        setTotal(1);
        setStatus('processing');
        const base64 = await encodeImageFileWithinBudget(file);
        // Fotos directas usan la misma cascada de modelos con reintentos que los PDFs
        const fragment = await extractWithRetry({ kind: 'image', content: base64 }, 1, 2);
        fragments.push(fragment);
        setProgress(1);
      } else if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
        setTotal(1);
        setStatus('processing');
        const text = await file.text();
        if (!text.trim()) throw new Error('El archivo de texto está vacío.');
        const pData = await apiClient.post<{ fragmentJson?: any }>('/api/cv-import-api?action=extract-page', {
          kind: 'text',
          content: text
        }, { requiresAuth: false });
        if (!pData.ok || !pData.data?.fragmentJson) {
          throw new Error(pData.error || 'No se pudo procesar el archivo de texto.');
        }
        fragments.push(pData.data.fragmentJson);
        setProgress(1);
      } else if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = ensurePdfjsWorkerConfigured();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        totalPages = Math.min(pdf.numPages, 30);
        setTotal(totalPages);
        setStatus('processing');
        setProgress(0);
        setCurrentReadingPage(1);

        for (let i = 1; i <= totalPages; i++) {
          setCurrentReadingPage(i);
          try {
            const payload = await buildPagePayload(pdf, i);
            const fragment = await extractWithRetry(payload, i, 2);
            fragments.push(fragment);
            fragmentsByPageRef.current.set(i, fragment);
            // Guardado progresivo por página: si se corta la conexión, páginas ya leídas quedan resguardadas
            saveDraft(mergePageFragments(Array.from(fragmentsByPageRef.current.entries()).sort((a, b) => a[0] - b[0]).map(([, f]) => f)));
          } catch (pageErr: any) {
            console.warn(`Página ${i} falló tras reintentos:`, pageErr);
            setFailedPages(prev => [...prev, i]);
          }
          setProgress(i);
        }

        if (fragments.length === 0) {
          throw new Error('No se pudo extraer ninguna página del archivo.');
        }
      } else {
        throw new Error('Formato no soportado. Usa PDF, una imagen o texto (.txt).');
      }

      // Consolidar y optimizar con ATS (Groq) si hay múltiples fragmentos/páginas
      let finalCv: any = null;
      const orderedFragments = Array.from(fragmentsByPageRef.current.entries()).sort((a, b) => a[0] - b[0]).map(([, f]) => f);
      if (orderedFragments.length > 1) {
        finalCv = await consolidateFragments(orderedFragments);
      } else if (orderedFragments.length === 1) {
        finalCv = orderedFragments[0];
      } else if (fragments.length > 1) {
        finalCv = await consolidateFragments(fragments);
      } else if (fragments.length === 1) {
        finalCv = fragments[0];
      }

      if (finalCv) {
        saveDraft(finalCv);
      }

      setStatus('done');
      onImportComplete(finalCv);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      const msg = err.message || '';
      if (msg.includes('ai_not_configured')) {
        setErrorMsg('No hay claves de IA configuradas en el servidor (GEMINI / GROQ). Intentá pegar el texto del CV en el campo de abajo como alternativa.');
      } else if (msg.includes('ai_rate_limited')) {
        setErrorMsg('Los proveedores de IA están temporalmente limitados (rate limit). Intentá de nuevo en unos minutos, o pegá el texto del CV como alternativa.');
      } else if (msg.includes('ai_provider_error')) {
        setErrorMsg('El proveedor de IA falló (error técnico). Intentá con texto pegado como alternativa mientras se resuelve.');
      } else if (msg.includes('pages_limit_exceeded')) {
        setErrorMsg('PDF largo: se procesaron las primeras páginas.');
        setStatus('done');
        onImportComplete(null);
      } else {
        setErrorMsg(msg || 'Error desconocido. Intentá pegar el contenido como texto alternativo.');
      }
    }
  };

  const retrySelectivePages = async () => {
    if (!file || failedPages.length === 0) return;
    setStatus('processing');
    setProgress(0);
    setCurrentReadingPage(1);

    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = ensurePdfjsWorkerConfigured();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const totalPages = Math.min(pdf.numPages, 30);
    setTotal(totalPages);

    const mergedFragments = () => Array.from(fragmentsByPageRef.current.entries()).sort((a, b) => a[0] - b[0]).map(([, f]) => f);

    // Re-extraer solo las páginas que siguen fallidas
    for (let i = 1; i <= totalPages; i++) {
      if (!failedPages.includes(i)) continue;
      setCurrentReadingPage(i);
      try {
        const payload = await buildPagePayload(pdf, i);
        const fragment = await extractWithRetry(payload, i, 2);
        fragmentsByPageRef.current.set(i, fragment);
      } catch (pageErr: any) {
        console.warn(`Página ${i} sigue fallando tras reintento selectivo:`, pageErr);
      }
      // Guardado progresivo por página
      saveDraft(mergePageFragments(mergedFragments()));
      setProgress(i);
    }

    // Construir lista ordenada de fragmentos por página y consolidar
    const finalCv = await consolidateFragments(mergedFragments());
    if (finalCv) saveDraft(finalCv);

    setFailedPages([]);
    setStatus('done');
    onImportComplete(finalCv);
  };

  return (
    <Modal isOpen={isOpen} onClose={status === 'processing' ? () => {} : onClose} title="Importar CV con IA">
      <div className="space-y-4">
        {status === 'idle' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Bot size={48} color={colorSystem.accent.base} />
            <p className={`${typeScale.body} text-center`} style={{ color: colorSystem.neutral.textSecondary }}>
              Importá desde un PDF, una foto o texto. También podés pegar el contenido de tu CV.
            </p>
            <label className={`${button.base} ${button.primary} cursor-pointer inline-flex items-center gap-2`}>
              <Upload size={18} />
              Seleccionar PDF, foto o texto
              <input type="file" accept="application/pdf,image/png,image/jpeg,text/plain,.txt" className="hidden" onChange={handleFileChange} />
            </label>
            {file && (
              <div className="text-sm font-medium mt-2 flex items-center gap-2" style={{ color: colorSystem.neutral.textPrimary }}>
                <FileText size={16} /> {file.name}
              </div>
            )}
            <label className="w-full text-left space-y-1">
              <span className="block text-sm font-semibold text-[var(--ui-text-primary)]">O pegá el texto de tu CV</span>
              <textarea
                value={pastedText}
                onChange={(event) => {
                  setPastedText(event.target.value);
                  if (event.target.value.trim()) setFile(null);
                }}
                rows={6}
                placeholder="Pegá acá la información de tu experiencia, formación y habilidades..."
                className="w-full rounded-[var(--ui-radius-control)] border border-[var(--ui-border)] bg-[var(--ui-bg-input)] text-[var(--ui-text-primary)] p-3 text-sm"
              />
            </label>
            {(file || pastedText.trim()) && (
              <button className={`${button.base} ${button.secondary} mt-4`} onClick={startImport}>
                Comenzar Extracción
              </button>
            )}
          </div>
        )}

        {(status === 'analyzing' || status === 'processing') && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 size={48} className="animate-spin" color={colorSystem.accent.base} />
            <h3 className={typeScale.sectionTitle}>
              {status === 'analyzing'
                ? 'Analizando archivo...'
                : total > 1
                  ? `Leyendo página ${currentReadingPage} de ${total}...`
                  : 'Procesando...'}
            </h3>
            {retryNotice && (
              <p className={typeScale.helper} style={{ color: colorSystem.accent.base }}>
                {retryNotice}
              </p>
            )}
            <div className="w-full bg-[var(--ui-border)] rounded-full h-2.5 mt-4">
              <div 
                className="bg-[var(--color-accent-base)] h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${total > 0 ? (progress / total) * 100 : 0}%` }}
              ></div>
            </div>
            <p className={typeScale.helper} style={{ color: colorSystem.neutral.textMuted }}>
              No cierres esta ventana.
            </p>
          </div>
        )}

        {status === 'done' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle size={48} color={colorSystem.status.success.base} />
            <h3 className={typeScale.sectionTitle} style={{ color: colorSystem.status.success.base }}>
              ¡Extracción Exitosa!
            </h3>
            <p className={`${typeScale.body} text-center`} style={{ color: colorSystem.neutral.textSecondary }}>
              Tus datos han sido importados. Revisá la información en el editor para asegurarte de que todo está correcto.
            </p>
            {failedPages.length > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] w-full max-w-md">
                <AlertTriangle size={20} color={colorSystem.status.warning.base} />
                <span className="text-sm" style={{ color: colorSystem.status.warning.text }}>
                  Se omitieron {failedPages.length} página{failedPages.length > 1 ? 's' : ''} que no pudieron leerse (páginas: {failedPages.join(', ')}).
                </span>
              </div>
            )}
            {failedPages.length > 0 && (
              <button
                className={`${button.base} ${button.secondary}`}
                onClick={retrySelectivePages}
                disabled={false}>
                Reintentar páginas fallidas
              </button>
            )}
            <button className={`${button.base} ${button.primary}`} onClick={onClose}>
              Cerrar y Ver Resultados
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <AlertTriangle size={48} color={colorSystem.status.danger.base} />
            <h3 className={typeScale.sectionTitle} style={{ color: colorSystem.status.danger.base }}>
              Ocurrió un error
            </h3>
            <p className={`${typeScale.body} text-center`} style={{ color: colorSystem.status.danger.text }}>
              {errorMsg}
            </p>
            {jobErrorCode && (
              <div className="flex items-start gap-2">
                <AlertTriangle size={24} color={colorSystem.status.danger.base} />
                <span className="text-sm font-medium">
                  Error {jobErrorCode === 'ai_not_configured' ? 'de configuración de IA' : 
                         jobErrorCode === 'ai_rate_limited' ? 'de tasa de IA' : 
                         jobErrorCode === 'ai_provider_error' ? 'del proveedor' : 
                         'de procesamiento'}
                </span>
              </div>
            )}
            <button className={`${button.base} ${button.secondary}`} onClick={() => setStatus('idle')}>
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
