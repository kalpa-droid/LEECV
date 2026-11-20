import React, { useCallback, useState } from 'react';
import { Download, Edit3, FileText, Sparkles } from 'lucide-react';
import { executeAiTask } from '../../../shared/core/ai/aiClient';
import { useToast } from '../../../shared/core/ui/Toast';

interface EditorialImportAiPanelProps {
  draft: any;
  updateDraft: (updater: (prev: any) => any) => void;
  notify: { success: (msg: string) => void; error: (msg: string) => void };
}

export const EditorialImportAiPanel: React.FC<EditorialImportAiPanelProps> = ({
  draft,
  updateDraft,
  notify,
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

  const MAX_FILE_SIZE_MB = 3;

  const handleParseDocx = useCallback(async () => {
    if (!inputFile) return;
    if (inputFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      showError(`El archivo supera los ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('action', 'parse-docx');
      formData.append('file', inputFile);

      const res = await fetch('/api/editorial/parse-docx', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('No se pudo leer el manuscrito');

      const data = await res.text();
      setResultText(data.slice(0, 5000)); // preview
      showSuccess('Manuscrito leído. Revisá el contenido antes de estructurar.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al leer el archivo.');
    } finally {
      setIsProcessing(false);
    }
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

  const handleExportPdf = useCallback(async () => {
    showSuccess('Exportación PDF desde la barra lateral.');
  }, [showSuccess]);

  const handleExportDocx = useCallback(async () => {
    showSuccess('Exportación Word desde la barra lateral.');
  }, [showSuccess]);

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