import React, { useCallback, useState } from 'react';
import { Download, Edit3, FileText, Sparkles } from 'lucide-react';
import { executeAiTask } from '../../../shared/core/ai/aiClient';
import { apiFetch } from '../../../shared/core/utils/apiClient';
import { withErrorHandling } from '../../../shared/core/utils/errorHandler';
import { downloadBlob } from '../../../shared/core/utils/downloadUtils';

interface EditorialImportAiPanelProps {
  draft: any;
  updateDraft: (updater: (prev: any) => any) => void;
  notify: { success: (msg: string) => void; error: (msg: string) => void };
  onExportPDF?: () => void;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export const EditorialImportAiPanel: React.FC<EditorialImportAiPanelProps> = ({
  draft,
  updateDraft,
  notify,
  onExportPDF,
}) => {
  const showSuccess = notify?.success ?? (() => {});
  const showError = notify?.error ?? (() => {});
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultText, setResultText] = useState<string>('');

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setInputFile(file);
  }, []);

  const MAX_FILE_SIZE_MB = 10;

  const handleParseDocx = useCallback(async () => {
    if (!inputFile) return;
    if (inputFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      showError(`El archivo supera los ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }
    setIsProcessing(true);
    await withErrorHandling(
      async () => {
        const base64 = await readFileAsBase64(inputFile);
        const res = await apiFetch<{ text: string }>('/api/editorial/parse-docx', {
          method: 'POST',
          body: { base64, filename: inputFile.name },
        });

        if (!res.ok || !res.data?.text) {
          throw new Error(res.error || 'No se pudo leer el manuscrito');
        }

        setResultText(res.data.text.slice(0, 5000));
        showSuccess('Manuscrito leído. Revisá el contenido antes de estructurar.');
      },
      {
        context: 'Lectura de Manuscrito',
        errorMessage: 'Error al leer el archivo Word.',
        notify: (msg) => showError(msg),
      }
    );
    setIsProcessing(false);
  }, [inputFile, showError, showSuccess]);

  const handleStructureAi = useCallback(async () => {
    const textToStructure = resultText || inputFile?.name || '';
    if (!textToStructure) return;
    setIsProcessing(true);
    try {
      const res = await executeAiTask<{
        sections: Array<{ title: string; records: Array<{ type: string; content: string }> }>;
        metadata: any;
      }>({
        taskId: 'editorial_structure',
        payload: {
          manuscriptText: resultText || '',
          documentId: draft.id,
        },
      });
      if (res.data?.sections) {
        updateDraft((prev) => ({
          ...prev,
          sections: res.data.sections.map((s: any, i: number) => ({
            id: `ed_sec_${Date.now()}_${i}`,
            title: s.title || `Sección ${i + 1}`,
            visible: true,
            includeInToc: true,
            startNewPage: true,
            position: i,
            records: s.records.map((r: any) => ({
              id: `ed_rec_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
              type: r.type || 'paragraph',
              content: r.content || '',
            })),
          })),
          metadata: res.data.metadata
            ? { ...prev.metadata, ...res.data.metadata }
            : prev.metadata,
        }));
        showSuccess('Manuscrito estructurado en secciones.');
      } else {
        showError('La IA no devolvió secciones válidas.');
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error estructurando el manuscrito.');
    } finally {
      setIsProcessing(false);
    }
  }, [resultText, inputFile?.name, draft.id, updateDraft, showError, showSuccess]);

  const handleExportPdf = useCallback(() => {
    if (onExportPDF) {
      onExportPDF();
    } else {
      showSuccess('Usa el botón de imprimir o exportar en la barra superior.');
    }
  }, [onExportPDF, showSuccess]);

  const handleExportDocx = useCallback(async () => {
    if (!draft) return;
    setIsProcessing(true);
    await withErrorHandling(
      async () => {
        const response = await fetch('/api/editorial/export-docx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: draft.metadata?.title || 'Mi Obra Editorial',
            author: draft.metadata?.author || '',
            sections: draft.sections || [],
          }),
        });

        if (!response.ok) {
          throw new Error('No se pudo generar el documento Word.');
        }

        const blob = await response.blob();
        const safeTitle = (draft.metadata?.title || 'Obra-Editorial')
          .replace(/[^a-zA-Z0-9_\-]/g, '_')
          .slice(0, 50);
        downloadBlob(blob, `${safeTitle}.docx`);
        showSuccess('Documento Word descargado exitosamente.');
      },
      {
        context: 'Exportación a Word',
        errorMessage: 'Error al exportar a archivo Word.',
        notify: (msg) => showError(msg),
      }
    );
    setIsProcessing(false);
  }, [draft, showError, showSuccess]);

  return (
    <div className="p-4 space-y-6 text-[var(--ui-text-primary)]">
      <h2 className="text-xl font-bold">Importar y IA</h2>
      <p className="text-[var(--ui-text-secondary)]">
        Subí tu manuscrito (.docx, .txt o .md) o usá los flujos IA para estructurar, reescribir o pulir secciones.
      </p>

      {/* Carga de archivo */}
      <div className="space-y-2 p-3 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)]">
        <h3 className="text-sm font-semibold mb-2">Cargar manuscrito (máx. 3 MB)</h3>
        <input
          type="file"
          accept=".docx,.txt,.md"
          onChange={handleFileChange}
          className="w-full rounded border p-2 text-[12px]"
        />
        {inputFile && (
          <div className="flex items-center gap-2 mt-2">
            <FileText className="h-4 w-4" />
            <span className="text-[12px]">{inputFile.name}</span>
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isProcessing || !inputFile}
            onClick={handleParseDocx}
            className={`flex-1 py-2 px-3 rounded text-sm font-medium transition ${
              isProcessing || !inputFile
                ? 'bg-[var(--ui-bg-hover)] text-[var(--ui-text-secondary)] cursor-not-allowed'
                : 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
            }`}
          >
            {isProcessing ? 'Leyendo…' : 'Leer manuscrito'}
          </button>
        </div>
      </div>

      {/* Preview */}
      {resultText && (
        <div className="space-y-2 p-3 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)]">
          <h3 className="text-sm font-semibold mb-2">Vista previa (primeros 5.000 caracteres)</h3>
          <div className="overflow-y-auto max-h-48 text-[11px] font-mono p-2 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)]">
            {resultText}
          </div>
        </div>
      )}

      {/* Flujos IA */}
      <div className="space-y-2 p-3 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)]">
        <h3 className="text-sm font-semibold mb-2">Asistente IA (Lidio)</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isProcessing || !resultText}
            onClick={handleStructureAi}
            className={`flex-1 py-2 px-3 rounded text-sm font-medium transition ${
              isProcessing || !resultText
                ? 'bg-[var(--ui-bg-hover)] text-[var(--ui-text-secondary)] cursor-not-allowed'
                : 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
            }`}
          >
            <Sparkles className="mr-1 h-4 w-4" />
            Estructurar en secciones
          </button>
          <button
            type="button"
            onClick={() => {}}
            className="flex-1 py-2 px-3 rounded text-sm font-medium bg-[var(--ui-bg-hover)] text-[var(--ui-text-secondary)] cursor-not-allowed"
          >
            Reescribir sección
          </button>
          <button
            type="button"
            onClick={() => {}}
            className="flex-1 py-2 px-3 rounded text-sm font-medium bg-[var(--ui-bg-hover)] text-[var(--ui-text-secondary)] cursor-not-allowed"
          >
            Pulir registro
          </button>
        </div>
      </div>

      {/* Descargas */}
      <div className="space-y-2 p-3 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-card)]">
        <h3 className="text-sm font-semibold mb-2">Exportar</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleExportPdf}
            className="flex-1 py-2 px-3 rounded text-sm font-medium bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]"
          >
            <Download className="mr-1 h-4 w-4" />
            PDF Imprenta
          </button>
          <button
            type="button"
            onClick={handleExportDocx}
            className="flex-1 py-2 px-3 rounded text-sm font-medium bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)]"
          >
            <Edit3 className="mr-1 h-4 w-4" />
            Word Editable
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorialImportAiPanel;