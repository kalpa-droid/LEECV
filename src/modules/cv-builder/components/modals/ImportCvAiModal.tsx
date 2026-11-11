import React, { useState } from 'react';
import { Bot, Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { colorSystem, typeScale, elevationSystem, button } from '../../../../shared/core/uiDesignSystem';
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
        const pData = await apiClient.post<{ fragmentJson?: any }>('/api/cv-import-api?action=extract-page', {
          kind: 'image',
          content: base64
        }, { requiresAuth: false });
        if (!pData.ok || !pData.data?.fragmentJson) {
          throw new Error(pData.error || 'No se pudo procesar la imagen.');
        }
        fragments.push(pData.data.fragmentJson);
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

        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const rawText = textContent.items.map((item: any) => item.str).join(' ');

          let pageKind: 'text' | 'image' = 'text';
          let pageContent = rawText;
          let auxiliaryText = '';

          if (!isTextLayerCoherent(rawText)) {
            pageKind = 'image';
            auxiliaryText = rawText;
            const unscaledViewport = page.getViewport({ scale: 1 });
            const targetScale = Math.max(1.5, Math.min(2.5, 1800 / (unscaledViewport.height || 1000)));
            const viewport = page.getViewport({ scale: targetScale });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              await page.render({ canvasContext: ctx, viewport }).promise;
              pageContent = encodeCanvasWithinBudget(clampCanvasSize(canvas));
              // Liberar memoria gráfica inmediatamente
              canvas.width = 0;
              canvas.height = 0;
            } else {
              throw new Error('Canvas no soportado en este navegador.');
            }
          }

          const pDataPage = await apiClient.post<{ fragmentJson?: any; message?: string }>('/api/cv-import-api?action=extract-page', {
            kind: pageKind,
            content: pageContent,
            auxiliaryText
          }, { requiresAuth: false });

          if (!pDataPage.ok) {
            throw new Error(pDataPage.error || `Error del servidor procesando página ${i}`);
          }
          if (!pDataPage.data || !pDataPage.data.fragmentJson) {
            throw new Error(`Respuesta inesperada para página ${i}`);
          }
          fragments.push(pDataPage.data.fragmentJson);
          setProgress(i);
        }
      } else {
        throw new Error('Formato no soportado. Usa PDF, una imagen o texto (.txt).');
      }

      // Consolidar y optimizar con ATS (Groq) si hay múltiples fragmentos/páginas
      let finalCv: any = null;
      if (fragments.length > 1) {
        const consResp = await apiClient.post<{ consolidatedJson?: any }>('/api/cv-import-api?action=consolidate-ats', {
          fragments
        }, { requiresAuth: false });
        if (consResp.ok && consResp.data?.consolidatedJson) {
          finalCv = consResp.data.consolidatedJson;
        } else {
          finalCv = mergePageFragments(fragments);
        }
      } else if (fragments.length === 1) {
        finalCv = fragments[0];
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
              {status === 'analyzing'
                ? 'Analizando archivo...'
                : total > 1
                  ? `Leyendo página ${progress} de ${total}...`
                  : 'Procesando...'}
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
