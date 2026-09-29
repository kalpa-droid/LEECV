import React, { useState } from 'react';
import { Modal } from '../../../../shared/core/ui/Modal';
import { Sparkles, CheckCircle2, Briefcase } from 'lucide-react';
import { button, radius, elevationSystem } from '../../../../shared/core/uiDesignSystem';
import { executeAiTask } from '../../../../shared/core/ai/aiClient';
import { useToast } from '../../../../shared/core/ui/Toast';

export interface FirstJobHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export function FirstJobHelpModal({
  isOpen,
  onClose,
  cvData,
  setCvData
}: FirstJobHelpModalProps) {
  const { showSuccess, showError } = useToast();
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ professionalTitle: string; description: string } | null>(null);

  const handleProcess = async () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    setResult(null);

    try {
      const res = await executeAiTask({
        taskId: 'first_job_interview',
        payload: { rawActivity: rawText },
        maxTokens: 300,
        temperature: 0.7
      });

      setResult(res.data);
      showSuccess('Experiencia traducida correctamente.');
    } catch (err) {
      showError('Error al procesar la experiencia.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (!result) return;

    setCvData((prev: any) => {
      const newItem = {
        id: `rec_${Date.now()}`,
        cargo: result.professionalTitle,
        institucion: 'Actividad / Proyecto Independiente',
        periodo: new Date().getFullYear().toString(),
        descripcion: result.description
      };
      
      const currentList = Array.isArray(prev.experience) ? prev.experience : [];
      return { ...prev, experience: [...currentList, newItem] };
    });

    showSuccess('Experiencia añadida al currículum.');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Asistente para Primer Empleo"
      icon={<Briefcase className="w-5 h-5 text-[var(--color-primary-base)]" />}
      size="md"
      footer={
        <div className="w-full flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className={`${button.secondary} px-4 py-2 font-bold text-xs`}
          >
            Cancelar
          </button>
          
          {result ? (
            <button
              onClick={handleApply}
              className={`${button.primary} px-4 py-2 font-black text-xs flex items-center gap-1.5`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Añadir a Experiencia</span>
            </button>
          ) : (
            <button
              onClick={handleProcess}
              disabled={isProcessing || !rawText.trim()}
              className={`${button.primary} px-4 py-2 font-black text-xs flex items-center gap-1.5 disabled:opacity-50`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isProcessing ? 'Procesando...' : 'Traducir a Profesional'}</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className={`p-3 bg-[var(--color-primary-muted)] border border-[var(--color-primary-base)]/30 rounded-[${radius.card}] text-xs text-[var(--color-primary-text)] leading-relaxed`}>
          <p>
            <strong>¿No tenés experiencia formal?</strong> No importa. 
            Contanos qué hacés en tu día a día (ayudar en un negocio familiar, organizar eventos, proyectos de la facultad, voluntariados, etc.) y la IA lo traducirá a habilidades profesionales.
          </p>
        </div>

        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Ej: Todos los fines de semana ayudo en el almacén de mi tío, cobro en la caja y ordeno la mercadería..."
          className="w-full h-24 p-3 text-sm rounded-md border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] focus:ring-2 focus:ring-[var(--color-accent-base)] outline-none resize-none"
        />

        {result && (
          <div className="p-4 rounded-md border border-[var(--color-status-success-base)] bg-[var(--color-status-success-muted)] space-y-3">
            <p className="text-sm font-black text-[var(--color-status-success-text)] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Traducción lista:
            </p>
            <div className="text-xs text-[var(--ui-text-secondary)] space-y-2 bg-[var(--ui-bg-card)] p-3 rounded border border-[var(--ui-border)]">
              <p><strong>Cargo sugerido:</strong> {result.professionalTitle}</p>
              <p><strong>Descripción:</strong> {result.description}</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
