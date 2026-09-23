import React, { useState } from 'react';
import { Bot, Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { colorSystem, typeScale, elevationSystem, button } from '../../../../shared/core/uiDesignSystem';
import { Modal } from '../../../../shared/core/ui/Modal';
import { isTextLayerCoherent } from '../../../../shared/core/cv-import/textCoherenceHeuristic';
import { ensurePdfjsWorkerConfigured } from '../../../../shared/core/pdf-engine/pdfjsWorkerSetup';
import { clampCanvasSize, encodeCanvasWithinBudget, encodeImageFileWithinBudget } from '../../../../shared/core/cv-import/pageImageEncoder';

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setErrorMsg('');
    }
  };

  const startImport = async () => {
    if (!file) return;
    setStatus('analyzing');
    
    try {
      let pagesToProcess: Array<{ kind: 'text'|'image', content: string }> = [];
      
      if (file.type.startsWith('image/')) {
        // Una foto de cámara sin procesar puede pesar varios MB — se reduce y comprime ANTES
        // de mandarla, o el pedido supera el límite de tamaño de Vercel y la función se cae.
        const base64 = await encodeImageFileWithinBudget(file);
        pagesToProcess.push({ kind: 'image', content: base64 });
      } else if (file.type === 'application/pdf') {
        pagesToProcess = await processPdfPages(file);
      } else {
        throw new Error('Formato no soportado. Usa PDF o imágenes (JPG, PNG).');
      }

      setTotal(pagesToProcess.length);
      setProgress(0);
      setStatus('processing');

      // 1. Start Job
      const startRes = await fetch('/api/cv-import-api?action=start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalPages: pagesToProcess.length })
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error || 'Error al iniciar importación.');
      const jobId = startData.jobId;

      // 2. Process each page sequentially
      for (let i = 0; i < pagesToProcess.length; i++) {
        const page = pagesToProcess[i];
        const pRes = await fetch('/api/cv-import-api?action=process-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            pageIndex: i,
            kind: page.kind,
            content: page.content
          })
        });
        const pData = await pRes.json();
        if (!pRes.ok) throw new Error(pData.error || `Error en página ${i+1}`);
        setProgress(i + 1);
      }

      // 3. Finalize
      const finRes = await fetch('/api/cv-import-api?action=finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      });
      const finData = await finRes.json();
      if (!finRes.ok) throw new Error(finData.error || 'Error al finalizar importación.');

      setStatus('done');
      onImportComplete(finData.cvData);
      
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Error desconocido.');
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
              Subí tu CV en PDF o una foto clara para que nuestra IA extraiga toda tu información automáticamente.
            </p>
            <label className={`${button.base} ${button.primary} cursor-pointer inline-flex items-center gap-2`}>
              <Upload size={18} />
              Seleccionar Archivo
              <input type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={handleFileChange} />
            </label>
            {file && (
              <div className="text-sm font-medium mt-2 flex items-center gap-2" style={{ color: colorSystem.neutral.textPrimary }}>
                <FileText size={16} /> {file.name}
              </div>
            )}
            {file && (
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
              {status === 'analyzing' ? 'Analizando archivo...' : `Procesando página ${progress} de ${total}`}
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
            <button className={`${button.base} ${button.secondary}`} onClick={() => setStatus('idle')}>
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
