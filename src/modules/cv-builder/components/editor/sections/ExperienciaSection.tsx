import React, { useState } from 'react';
import { RecordFormSection } from '../../../../../shared/core/ui/RecordFormSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';
import { ClassifyItemModal } from '../../modals/ClassifyItemModal';
import { FirstJobHelpModal } from '../../modals/FirstJobHelpModal';
import { Sparkles, Briefcase, Wand2 } from 'lucide-react';
import { button } from '../../../../../shared/core/uiDesignSystem';
import { apiFetch } from '../../../../../shared/core/utils/apiClient';

export const ExperienciaSection = ({ cvData, setCvData }: any) => {
  const [isClassifyOpen, setIsClassifyOpen] = useState(false);
  const [isFirstJobOpen, setIsFirstJobOpen] = useState(false);
  const [acrResponse, setAcrResponse] = useState<string | null>(null);
  const [acrLoading, setAcrLoading] = useState(false);

  const guide = (
    <div className="space-y-2 mt-1">
      <p className="font-bold text-[var(--color-primary-base)]">¿Qué mira un reclutador acá?</p>
      <p>Busca resultados concretos, no un listado de responsabilidades genéricas. Usá la fórmula: <span className="font-medium">"Hice [tarea] usando [herramienta] logrando [resultado]"</span>.</p>
      <div className="bg-[var(--ui-bg-page)] p-2 rounded text-xs border border-[var(--color-neutral-border)]">
        <p className="text-[var(--color-danger-base)] font-medium">❌ Antes:</p>
        <p className="mb-2 italic text-[var(--color-neutral-text-secondary)]">"Me encargaba de las ventas y atención al cliente."</p>
        <p className="text-[var(--color-success-base)] font-medium">✅ Después:</p>
        <p className="italic text-[var(--color-neutral-text-secondary)]">"Aumenté las ventas un 15% mensual liderando la atención de una cartera de 50+ clientes VIP."</p>
      </div>
      <p>Usá el botón <strong>"Sugerir Logros"</strong> en cada campo de descripción para que la IA te ayude a redactar viñetas de impacto.</p>
    </div>
  );

  return (
    <>
      <RecordFormSection
        sectionKey="experiencia"
        sectionTitle="Experiencia Laboral"
        kindKey="experience"
        addLabel="Agregar Experiencia"
        cvData={cvData}
        setCvData={setCvData}
        fieldName="experience"
        itemTitlePrefix="Experiencia Laboral"
        helpText={guide}
        manualAdjustment={
          <div className="space-y-3">
            <SectionManualAdjustment sectionId="experiencia" cvData={cvData} setCvData={setCvData} />
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--ui-border)]/50">
              <button
                type="button"
                onClick={() => setIsClassifyOpen(true)}
                className={`${button.secondary} text-xs py-1.5 px-3 flex items-center gap-1.5`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary-base)]" />
                Extraer desde texto (IA)
              </button>
              <button
                type="button"
                onClick={async () => {
                  setAcrLoading(true); setAcrResponse(null);
                  try {
                    const res = await apiFetch('/api/ai-generate', { method: 'POST', body: JSON.stringify({ prompt: 'Redactá un logro en formato ACR (Acción + Contexto + Resultado cuantitativo) para experiencia laboral en marketing digital:', context: 'Experiencia Laboral' }) });
                    setAcrResponse(res.data?.text || res.data?.response || 'Sugerencia generada por IA.');
                  } catch { setAcrResponse('No se pudo conectar con el asistente ACR. Intentá de nuevo.'); }
                  setAcrLoading(false);
                }}
                className={`${button.secondary} text-xs py-1.5 px-3 flex items-center gap-1.5`}
              >
                <Wand2 className="w-3.5 h-3.5 text-[var(--color-primary-base)]" />
                Sugerir Logros (ACR)
              </button>
              <button
                type="button"
                onClick={() => setIsFirstJobOpen(true)}
                className={`${button.secondary} text-xs py-1.5 px-3 flex items-center gap-1.5`}
              >
                <Briefcase className="w-3.5 h-3.5 text-[var(--color-primary-base)]" />
                Ayuda Primer Empleo
              </button>
            </div>
            {acrLoading && <p className="text-xs text-[var(--ui-text-secondary)]">Generando fórmula ACR con IA...</p>}
            {acrResponse && (
              <div className="bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-lg p-3 text-sm text-[var(--ui-text-primary)]">
                <p className="font-bold mb-1 text-[var(--color-primary-base)]">Sugerencia ACR (Acción + Contexto + Resultado):</p>
                <p className="italic">{acrResponse}</p>
              </div>
            )}
          </div>
        }
      />

      <ClassifyItemModal
        isOpen={isClassifyOpen}
        onClose={() => setIsClassifyOpen(false)}
        cvData={cvData}
        setCvData={setCvData}
      />
      <FirstJobHelpModal
        isOpen={isFirstJobOpen}
        onClose={() => setIsFirstJobOpen(false)}
        cvData={cvData}
        setCvData={setCvData}
      />
    </>
  );
};
