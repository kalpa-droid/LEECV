import React, { useState } from 'react';
import { Sparkles, X, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { generateAiCompletion } from '../../../shared/core/ai/aiClient';
import { button, radius } from '../../../shared/core/uiDesignSystem';
import { useToast } from '../../../shared/core/ui/Toast';
import type { CoverLetterData } from '../../../shared/core/pdf-engine/layers/records/coverLetterDataAdapter';

interface CoverLetterOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CoverLetterData;
  onChangeData: (data: CoverLetterData) => void;
}

export const CoverLetterOnboardingModal: React.FC<CoverLetterOnboardingModalProps> = ({
  isOpen,
  onClose,
  data,
  onChangeData,
}) => {
  const [jobText, setJobText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { showError, showSuccess } = useToast();

  if (!isOpen) return null;

  const handleProcess = async () => {
    if (!jobText.trim()) {
      showError('Por favor pega el texto de la oferta de trabajo.');
      return;
    }

    setIsProcessing(true);
    try {
      const p = data.personalInfo || {};
      const roles: any[] = (data as any).roles || [];
      const expStr = roles.length > 0
        ? roles.map(r => `${r.role || r.title || 'Puesto'} en ${r.company || 'Empresa'}`).join(', ')
        : 'Candidato con perfil general';

      const systemPrompt = `Eres un asistente de selección de personal y redactor de cartas profesionales.
Analiza la siguiente oferta de trabajo y los datos del candidato para extraer los datos clave y redactar los 3 párrafos de la carta.
Devuelve ÚNICAMENTE un objeto JSON estricto sin marcado markdown:
{
  "jobTitle": "Título del puesto identificado",
  "companyName": "Nombre de la empresa",
  "recipientName": "Responsable de selección o Estimado/a Responsable",
  "salutation": "Estimado/a responsable de selección,",
  "hookParagraph": "Párrafo de gancho (primer párrafo) conectando el interés en la empresa y el puesto.",
  "evidenceParagraph": "Párrafo de evidencia (segundo párrafo) alineando la experiencia previa del candidato con los requisitos.",
  "closingParagraph": "Párrafo de cierre (tercer párrafo) solicitando entrevista.",
  "signoff": "Atentamente,"
}`;

      const userPrompt = `
OFERTA DE EMPLEO / AVISO:
${jobText}

CANDIDATO:
- Nombre: ${p.fullName || 'Candidato'}
- Experiencia: ${expStr}
`;

      const res = await generateAiCompletion({
        systemPrompt,
        userPrompt,
        temperature: 0.6
      });

      const jsonClean = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonClean);

      onChangeData({
        ...data,
        jobTarget: {
          ...(data.jobTarget || {}),
          jobTitle: parsed.jobTitle || data.jobTarget?.jobTitle || '',
          companyName: parsed.companyName || data.jobTarget?.companyName || '',
          recipientName: parsed.recipientName || data.jobTarget?.recipientName || '',
          jobDescription: jobText
        },
        body: {
          salutation: parsed.salutation || data.body?.salutation || 'Estimado/a responsable de selección,',
          hookParagraph: parsed.hookParagraph || data.body?.hookParagraph || '',
          evidenceParagraph: parsed.evidenceParagraph || data.body?.evidenceParagraph || '',
          closingParagraph: parsed.closingParagraph || data.body?.closingParagraph || '',
          signoff: parsed.signoff || data.body?.signoff || 'Atentamente,'
        }
      });

      showSuccess('¡Carta autocompletada a partir de la oferta de trabajo!');
      onClose();
    } catch (err: any) {
      console.error('Error al procesar la oferta:', err);
      showError(err?.message || 'Inconveniente al procesar el texto de la vacante.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] rounded-[var(--radius-modal)] shadow-2xl w-full max-w-xl p-6 relative flex flex-col gap-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--color-neutral-text-secondary)] hover:text-[var(--color-neutral-text-primary)] transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--color-neutral-text-primary)]">
              Asistente de Carta en 1-Clic
            </h3>
            <p className="text-xs text-[var(--color-neutral-text-secondary)]">
              Pega la descripción de la oferta de empleo para autocompletar la vacante y redactar la carta al instante.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)]">
            Descripción o aviso de empleo (Job Posting):
          </label>
          <textarea
            rows={8}
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            placeholder="Pega aquí el texto completo del aviso de trabajo, requisitos o funciones del puesto..."
            className="w-full text-xs p-3 rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] bg-[var(--ui-bg-app)] text-[var(--color-neutral-text-primary)] leading-relaxed outline-none focus:border-[var(--color-accent-base)] transition resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[var(--color-neutral-text-secondary)] hover:bg-[var(--color-neutral-surface)] rounded-[var(--radius-control)] transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleProcess}
            disabled={isProcessing || !jobText.trim()}
            className={`px-4 py-2 text-xs font-bold flex items-center gap-2 ${button.primary} cursor-pointer disabled:opacity-50`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analizando oferta...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Autocompletar Carta con IA</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
