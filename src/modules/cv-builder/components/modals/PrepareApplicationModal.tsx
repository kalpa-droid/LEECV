import React, { useState, useEffect } from 'react';
import { Briefcase, Loader2 } from 'lucide-react';
import { Modal } from '../../../../shared/core/ui/Modal';
import { Field } from '../../../../shared/core/ui/Field';
import { SectionSwitch } from '../../../../shared/core/ui/SectionSwitch';
import { LidioHelpTrigger } from '../../../../shared/core/ui/LidioHelpTrigger';
import { DomSectionIcon } from '../../../../shared/core/pdf-engine/layers/icons/DomSectionIcon';
import { UI_ICON_IDS } from '../../../../shared/core/ui/iconCatalog';
import { button } from '../../../../shared/core/uiDesignSystem';
import { executeAiTask } from '../../../../shared/core/ai/aiClient';
import type { ApplicationTailoredPatch } from '../../../../shared/core/documents/applicationVariant';

export interface PrepareApplicationTarget {
  jobTitle: string;
  companyName: string;
  suggestedDescription: string;
}

interface PrepareApplicationModalProps {
  isOpen: boolean;
  initialTarget: PrepareApplicationTarget | null;
  cvData: any;
  onClose: () => void;
  onConfirmCreate: (args: {
    puesto: string;
    empresa: string;
    jobDescription: string;
    tailoredPatch?: ApplicationTailoredPatch;
  }) => Promise<void>;
}

export default function PrepareApplicationModal({
  isOpen,
  initialTarget,
  cvData,
  onClose,
  onConfirmCreate,
}: PrepareApplicationModalProps) {
  const [puesto, setPuesto] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [description, setDescription] = useState('');
  const [optimizeWithAi, setOptimizeWithAi] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && initialTarget) {
      const cleanPuesto = initialTarget.jobTitle.trim().toLowerCase() === 'ninguno' ? '' : initialTarget.jobTitle.trim();
      const cleanEmpresa = initialTarget.companyName.trim().toLowerCase() === 'ninguna' ? '' : initialTarget.companyName.trim();
      setPuesto(cleanPuesto);
      setEmpresa(cleanEmpresa);
      setDescription(initialTarget.suggestedDescription || '');
      setOptimizeWithAi(true);
      setIsProcessing(false);
      setErrorMsg('');
    }
  }, [isOpen, initialTarget]);

  const handleSubmit = async () => {
    const cleanPuesto = puesto.trim();
    const cleanEmpresa = empresa.trim();
    if (!cleanPuesto && !cleanEmpresa) {
      setErrorMsg('Indicá al menos el puesto o la empresa antes de crear la postulación.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    try {
      let tailoredPatch: ApplicationTailoredPatch | undefined;
      if (optimizeWithAi) {
        const res = await executeAiTask<ApplicationTailoredPatch>({
          taskId: 'tailor_cv_for_application',
          payload: {
            jobTitle: cleanPuesto,
            companyName: cleanEmpresa,
            jobDescription: description.trim(),
          },
          cvData,
          maxTokens: 3000,
          temperature: 0.25,
        });
        tailoredPatch = res.data;
      }

      await onConfirmCreate({
        puesto: cleanPuesto,
        empresa: cleanEmpresa,
        jobDescription: description.trim(),
        tailoredPatch,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'No pudimos completar la optimización con IA. Podés reintentar o desmarcar la optimización automática.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isProcessing) onClose();
      }}
      title="Revisar postulación"
      helpText="Podés revisar o modificar lo que busca la empresa antes de crear la nueva pestaña. Tu CV Base original quedará intacto."
      icon={<Briefcase className="w-5 h-5 text-[var(--color-accent-text)]" />}
      size="lg"
      footer={
        <div className="w-full flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className={`${button.base} ${button.secondary} text-xs px-4 py-2 cursor-pointer`}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleSubmit}
            className={`${button.base} ${button.primary} text-xs px-4 py-2 flex items-center gap-1.5 cursor-pointer`}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="ui-ai-sparkle-loop">
                <DomSectionIcon iconId={UI_ICON_IDS.ia} size={15} strokeWidth={2.1} />
              </span>
            )}
            {isProcessing
              ? 'Preparando postulación…'
              : optimizeWithAi
                ? 'Adaptar y crear postulación'
                : 'Crear postulación'}
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs text-[var(--ui-text-primary)]">
        {errorMsg && (
          <div className="p-3 rounded-[12px] border border-[var(--color-status-danger-base)] bg-[var(--color-status-danger-muted)] text-[var(--color-status-danger-text)] font-medium">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label="Puesto objetivo"
            value={puesto}
            disabled={isProcessing}
            onChange={(e: any) => setPuesto(e.target.value)}
            placeholder="Ej: Diseñadora Instruccional"
          />
          <Field
            label="Empresa / Institución"
            value={empresa}
            disabled={isProcessing}
            onChange={(e: any) => setEmpresa(e.target.value)}
            placeholder="Ej: EdTech.IA"
          />
        </div>

        <div>
          <label className="block text-xs font-bold mb-1">
            Descripción de la postulación (editable)
          </label>
          <textarea
            value={description}
            disabled={isProcessing}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Pegá acá el aviso completo o ajustá los requisitos para esta búsqueda..."
            className="w-full rounded-[10px] border border-[var(--ui-border)] bg-[var(--ui-bg-input)] text-[var(--ui-text-primary)] p-3 text-xs leading-relaxed focus:outline-none focus:border-[var(--color-accent-base)] resize-y min-h-[110px]"
          />
        </div>

        <div className="flex items-center justify-between gap-3 p-3 rounded-[12px] border border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-[var(--color-neutral-text-primary)] truncate">
              Adaptar con IA y etiquetas ATS
            </span>
            <LidioHelpTrigger
              size="xs"
              title="Optimizar con IA y etiquetas ATS"
              text="Antes de abrir la nueva pestaña, la IA lee tu CV Base completo (sin inventar datos) y alinea resumen, experiencias, habilidades y etiquetas ocultas del PDF para superar filtros automáticos de selección."
            />
          </div>
          <SectionSwitch
            checked={optimizeWithAi}
            disabled={isProcessing}
            label="Adaptar con IA"
            size="sm"
            announceOnChange={false}
            onChange={setOptimizeWithAi}
          />
        </div>
      </div>
    </Modal>
  );
}
