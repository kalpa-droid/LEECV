import React, { useState } from 'react';
import { Modal } from '../../../../shared/core/ui/Modal';
import { Sparkles, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import { button, radius, elevationSystem } from '../../../../shared/core/uiDesignSystem';
import { executeAiTask } from '../../../../shared/core/ai/aiClient';
import { useToast } from '../../../../shared/core/ui/Toast';
import { BUILTIN_RECORD_KINDS } from '../../../../shared/core/pdf-engine/layers/records/fieldCatalog';

export interface ClassifyItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export function ClassifyItemModal({
  isOpen,
  onClose,
  cvData,
  setCvData
}: ClassifyItemModalProps) {
  const { showSuccess, showError } = useToast();
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleProcess = async () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    setResult(null);

    try {
      const res = await executeAiTask({
        taskId: 'classify_raw_data',
        payload: { rawData: rawText },
        maxTokens: 500,
        temperature: 0.2
      });

      setResult(res.data);
      showSuccess('Texto procesado correctamente.');
    } catch (err) {
      showError('Error al procesar el texto.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (!result || !result.type || result.type === 'unknown') {
      showError('No se puede clasificar automáticamente. Intenta ajustar el texto.');
      return;
    }

    const { type, extractedFields } = result;

    setCvData((prev: any) => {
      // Map AI types to our CVData arrays
      let targetArrayName = 'experience';
      let newItem: any = { id: `rec_${Date.now()}` };

      if (type === 'experience') {
        targetArrayName = 'experience';
        newItem = {
          ...newItem,
          cargo: extractedFields.title || '',
          institucion: extractedFields.subtitle || '',
          periodo: extractedFields.dateRange || '',
          descripcion: extractedFields.description || ''
        };
      } else if (type === 'education') {
        targetArrayName = 'education';
        newItem = {
          ...newItem,
          tituloOGrado: extractedFields.title || '',
          institucion: extractedFields.subtitle || '',
          periodo: extractedFields.dateRange || '',
          descripcion: extractedFields.description || ''
        };
      } else if (type === 'skill') {
        targetArrayName = 'skills';
        // For skills, we usually just push strings if it's simple
        const skillName = extractedFields.title || extractedFields.description;
        if (skillName) {
          const currentList = Array.isArray(prev.skills) ? prev.skills : [];
          return { ...prev, skills: [...currentList, skillName] };
        }
      } else if (type === 'language') {
        targetArrayName = 'languages';
        newItem = {
          ...newItem,
          idioma: extractedFields.title || '',
          nivelDominio: extractedFields.subtitle || '',
          descripcion: extractedFields.description || ''
        };
      } else if (type === 'project') {
        targetArrayName = 'projects';
        newItem = {
          ...newItem,
          tituloOGrado: extractedFields.title || '',
          institucion: extractedFields.subtitle || '',
          periodo: extractedFields.dateRange || '',
          descripcion: extractedFields.description || ''
        };
      }

      if (targetArrayName === 'skills') return prev; // already handled

      const currentList = Array.isArray(prev[targetArrayName]) ? prev[targetArrayName] : [];
      return { ...prev, [targetArrayName]: [...currentList, newItem] };
    });

    showSuccess('Registro añadido al CV.');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Añadir desde Texto Suelto (IA)"
      icon={<Sparkles className="w-5 h-5 text-[var(--color-primary-base)]" />}
      size="md"
      footer={
        <div className="w-full flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className={`${button.secondary} px-4 py-2 font-bold text-xs`}
          >
            Cancelar
          </button>
          
          {result && result.type !== 'unknown' ? (
            <button
              onClick={handleApply}
              className={`${button.primary} px-4 py-2 font-black text-xs flex items-center gap-1.5`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Añadir al Currículum</span>
            </button>
          ) : (
            <button
              onClick={handleProcess}
              disabled={isProcessing || !rawText.trim()}
              className={`${button.primary} px-4 py-2 font-black text-xs flex items-center gap-1.5 disabled:opacity-50`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isProcessing ? 'Procesando...' : 'Clasificar y Extraer'}</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--ui-text-secondary)]">
          Pega un fragmento de texto (por ejemplo, una experiencia laboral copiada de LinkedIn) y la IA detectará a qué sección pertenece y rellenará los campos por ti.
        </p>

        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Ej: Desarrollador Frontend senior en Mercado Libre desde enero 2021 hasta la actualidad. Lideré un equipo de 5 personas..."
          className="w-full h-32 p-3 text-sm rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] focus:ring-2 focus:ring-[var(--color-accent-base)] outline-none resize-none"
        />

        {result && (
          <div className={`p-4 rounded-md border ${result.type === 'unknown' ? 'border-[var(--color-status-danger-base)] bg-[var(--color-status-danger-muted)]' : 'border-[var(--color-status-success-base)] bg-[var(--color-status-success-muted)]'}`}>
            {result.type === 'unknown' ? (
              <p className="text-sm font-medium text-[var(--color-status-danger-text)]">
                No pudimos determinar a qué sección pertenece este texto. Intenta proporcionar más contexto.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-black text-[var(--color-status-success-text)] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Detectado como: <span className="uppercase">{result.type}</span>
                </p>
                <div className="text-xs text-[var(--ui-text-secondary)] space-y-1 bg-[var(--ui-bg-card)] p-3 rounded border border-[var(--ui-border)]">
                  {result.extractedFields.title && <p><strong>Título:</strong> {result.extractedFields.title}</p>}
                  {result.extractedFields.subtitle && <p><strong>Subtítulo/Institución:</strong> {result.extractedFields.subtitle}</p>}
                  {result.extractedFields.dateRange && <p><strong>Fechas:</strong> {result.extractedFields.dateRange}</p>}
                  {result.extractedFields.description && <p><strong>Descripción:</strong> {result.extractedFields.description}</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
