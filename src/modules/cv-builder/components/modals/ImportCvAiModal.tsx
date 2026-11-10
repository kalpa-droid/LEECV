import React, { useState } from 'react';
import { Bot, Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { colorSystem, typeScale, elevationSystem, button } from '../../../../shared/core/uiDesignSystem';
import { Modal } from '../../../../shared/core/ui/Modal';
import { isTextLayerCoherent } from '../../../../shared/core/cv-import/textCoherenceHeuristic';
import { ensurePdfjsWorkerConfigured } from '../../../../shared/core/pdf-engine/pdfjsWorkerSetup';
import { clampCanvasSize, encodeCanvasWithinBudget, encodeImageFileWithinBudget } from '../../../../shared/core/cv-import/pageImageEncoder';
import { mergePageFragments, type CVFragment } from '../../../../shared/core/cv-import/mergeFragments';
import { apiClient } from '../../../../shared/core/utils/apiClient';
import { supabase } from '../../../../shared/core/lib/supabaseClient';

interface ImportCvAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (cvData: any) => void;
}

export default function ImportCvAiModal({ isOpen, onClose, onImportComplete }: ImportCvAiModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'processing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [jobErrorCode, setJobErrorCode] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPastedText('');
      setStatus('idle');
      setErrorMsg('');
    }
  };

  const startImport = async () => {
    if (!file && !pastedText.trim()) return;
    // La importación con IA es libre y utiliza rate limit por IP en backend
    
    setStatus('analyzing');
    setJobErrorCode(null);
    
    try {
      let pagesToProcess: Array<{ kind: 'text'|'image', content: string }> = [];
      
      if (!file) {
        pagesToProcess.push({ kind: 'text', content: pastedText.trim() });
      } else if (file.type.startsWith('image/')) {
        // Una foto de cámara sin procesar puede pesar varios MB — se reduce y comprime ANTES
        // de mandarla, o el pedido supera el límite de tamaño de Vercel y la función se cae.
        const base64 = await encodeImageFileWithinBudget(file);
        pagesToProcess.push({ kind: 'image', content: base64 });
      } else if (file.type === 'application/pdf') {
        pagesToProcess = await processPdfPages(file);
      } else if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
        const text = await file.text();
        if (!text.trim()) throw new Error('El archivo de texto está vacío.');
        pagesToProcess.push({ kind: 'text', content: text });
      } else {
        throw new Error('Formato no soportado. Usa PDF, una imagen o texto (.txt).');
      }

      const totalPages = pagesToProcess.length;
      setTotal(totalPages);
      setProgress(0);
      setStatus('processing');

      // NUEVO: Si hay más de 10 páginas, el backend ya devuelve jobId con frontPageLimit
      // Enviamos la primera página para crear el job inicial
      const firstPage = pagesToProcess[0];
      let contextSummary = '';
      const pData = await apiClient.post('/api/cv-import-api?action=extract-page', {
        kind: firstPage.kind,
        content: firstPage.content,
        contextSummary,
        auxiliaryText: (firstPage as any).auxiliaryText || ''
      }, { requiresAuth: false });

      if (!pData.ok) {
        throw new Error(pData.error || 'Error del servidor creando el job');
      }

      // Backend siempre crea ocr_jobs y devuelve jobId; el fallback sync es prácticamente nunca tomado.
      const pageJobId = pData.data.jobId as string;
      if (pageJobId) {
        setTotal(pData.data.pagesTotal ?? totalPages);

        const pollJob = async () => {
          try {
            const statusResp = await apiClient.get<{ job: any }>(
              `/api/cv-import-api?action=job-status&jobId=${pageJobId}`,
              { requiresAuth: false }
            );
            if (!statusResp.ok) throw new Error(statusResp.error || 'No se pudo consultar el estado del job');

            const parseFragment = (raw: any) => {
              if (!raw) return {};
              if (typeof raw === 'string') {
                try { return JSON.parse(raw); } catch { return {}; }
              }
              return raw;
            };

            const job = statusResp.data.job;
            if (job.status === 'completed') {
              setProgress(job.pagesTotal ?? totalPages);
              setStatus('done');
              onImportComplete({ ...parseFragment(job.result_json || pData.data.fragmentJson), _jobId: pageJobId });
              return;
            } else if (job.status === 'failed') {
              setJobErrorCode(job.error_message || 'ai_provider_error');
              setStatus('error');
              setErrorMsg('Error procesando el CV. Intentá con “Pegar texto” como alternativa.');
              return;
            } else if (job.status === 'pages_limit_exceeded') {
              setErrorMsg(job.message || 'PDF largo: se procesaron las primeras 10 páginas.');
              setStatus('done');
              onImportComplete({ ...parseFragment(job.result_json || pData.data.fragmentJson), _jobId: pageJobId });
              return;
            } else if (job.status === 'processing' || job.status === 'pending') {
              // Seguir haciendo polling cada 3 segundos
              setProgress(job.pagesProcessed ?? progress);
              setTimeout(pollJob, 3000);
            }
          } catch (err: any) {
            console.error('Polling error:', err);
            setErrorMsg('No se pudo consultar el estado del procesamiento.');
            setStatus('error');
          }
        };
        pollJob();
      } else if (pData.data?.fragmentJson) {
        // Modo sync (fallback): procesar una página a la vez (lógica original)
        const fragments: CVFragment[] = [pData.data.fragmentJson];
        setProgress(1);

        for (let i = 1; i < pagesToProcess.length; i++) {
          const page = pagesToProcess[i];
          let contextSummary = '';
          if (fragments.length > 0) {
            const summaries = fragments.map((f, idx) => `Página ${idx}: ${JSON.stringify(f)}`);
            contextSummary = `\nContexto previo extraido:\n${summaries.join('\n')}\n`;
          }

          const pDataPage = await apiClient.post('/api/cv-import-api?action=extract-page', {
            kind: page.kind,
            content: page.content,
            contextSummary,
            auxiliaryText: (page as any).auxiliaryText || ''
          }, { requiresAuth: false });

          if (!pDataPage.ok) {
            throw new Error(pDataPage.error || `Error del servidor procesando página ${i+1}`);
          }
          if (!pDataPage.data || !pDataPage.data.fragmentJson) {
            throw new Error(`Respuesta inesperada del servidor para página ${i+1}`);
          }
          fragments.push(pDataPage.data.fragmentJson);
          setProgress(i + 1);
        }

        const mergedCv = mergePageFragments(fragments);
        setStatus('done');
        onImportComplete(mergedCv);
      } else {
        throw new Error('Respuesta inesperada del servidor.');
      }

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
        setErrorMsg('PDF largo: se procesarán las primeras 10 páginas.');
        setStatus('done');
        onImportComplete(null);
      } else {
        setErrorMsg(msg || 'Error desconocido. Intentá pegar el contenido como texto alternativo.');
      }
    }
  };

  const processPdfPages = async (pdfFile: File) => {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfjsLib = ensurePdfjsWorkerConfigured();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const pages: Array<{ kind: 'text' | 'image', content: string }> = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const rawText = textContent.items.map((item: any) => item.str).join(' ');
      
      if (isTextLayerCoherent(rawText)) {
        pages.push({ kind: 'text', content: rawText });
      } else {
        // Render to canvas for image extraction
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          const base64 = encodeCanvasWithinBudget(clampCanvasSize(canvas));
          pages.push({ kind: 'image', content: base64 });
        } else {
          throw new Error('Canvas no soportado en este navegador.');
        }
      }
    }
    return pages;
  };

  if (!isOpen) return null;

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
              {status === 'analyzing' ? 'Analizando archivo...' : 'Procesando...'}
            </h3>
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
