import React, { useState } from 'react';
import { RecordFormSection } from '../../../../../shared/core/ui/RecordFormSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';
import { ClassifyItemModal } from '../../modals/ClassifyItemModal';
import { FirstJobHelpModal } from '../../modals/FirstJobHelpModal';
import { Briefcase } from 'lucide-react';
import { button } from '../../../../../shared/core/uiDesignSystem';
import { LidioHelpTrigger } from '../../../../../shared/core/ui/LidioHelpTrigger';
import { DomSectionIcon } from '../../../../../shared/core/pdf-engine/layers/icons/DomSectionIcon';
import { UI_ICON_IDS } from '../../../../../shared/core/ui/iconCatalog';
import { executeAiTask } from '../../../../../shared/core/ai/aiClient';
import { useToast } from '../../../../../shared/core/ui/Toast';

export const ExperienciaSection = ({ cvData, setCvData }: any) => {
  const [isClassifyOpen, setIsClassifyOpen] = useState(false);
  const [isFirstJobOpen, setIsFirstJobOpen] = useState(false);
  const [acrResponse, setAcrResponse] = useState<string | null>(null);
  const [acrLoading, setAcrLoading] = useState(false);
  // Experiencia destino de la sugerencia ACR: por defecto la última cargada.
  const [acrTargetIdx, setAcrTargetIdx] = useState<number | undefined>(undefined);
  const { showSuccess } = useToast();

  const experienceList = Array.isArray(cvData?.experience) ? cvData.experience : [];
  const acrCurrentIdx = acrTargetIdx !== undefined && acrTargetIdx >= 0 && acrTargetIdx < experienceList.length
    ? acrTargetIdx
    : Math.max(0, experienceList.length - 1);

  const applyAcrToSelected = () => {
    if (!acrResponse) return;
    setCvData((prev: any) => {
      const list = Array.isArray(prev?.experience) ? [...prev.experience] : [];
      const idx = Math.min(acrCurrentIdx, list.length - 1);
      if (idx < 0 || !list[idx]) return prev;
      const item = list[idx];
      list[idx] = { ...item, descripcion: item.descripcion ? `${item.descripcion}\n\n${acrResponse}` : acrResponse };
      return { ...prev, experience: list };
    });
    setAcrResponse(null);
    showSuccess('Listo — logro ACR aplicado a la experiencia elegida. Revisá el texto y ajustá lo que haga falta.');
  };

  const guide = (
    <div className="space-y-2 mt-1">
      <p className="font-bold text-[var(--color-accent-text)]">¿Qué mira un reclutador acá?</p>
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
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--ui-border)]/50">
              <button
                type="button"
                onClick={() => setIsClassifyOpen(true)}
                className={`${button.secondary} text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer`}
              >
                <span className="ui-ai-sparkle-loop">
                  <DomSectionIcon iconId={UI_ICON_IDS.ia} size={14} strokeWidth={2.1} />
                </span>
                Extraer desde texto
              </button>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  disabled={acrLoading || !experienceList.length}
                  onClick={async () => {
                    if (!experienceList.length) return;
                    setAcrLoading(true); setAcrResponse(null);
                    try {
                      const target = experienceList[acrCurrentIdx] || {};
                      const res = await executeAiTask<{ acrBullet: string; missingMetrics: string | null }>({
                        taskId: 'suggest_achievement_acr',
                        payload: {
                          role: target.cargo || experienceList[0]?.cargo || 'Profesional',
                          company: target.institucion || target.empresa || '',
                          currentDescription: target.descripcion || ''
                        },
                        cvData,
                        maxTokens: 300,
                        temperature: 0.4
                      });
                      const bullet = res.data.acrBullet || 'Sugerencia generada por IA.';
                      const metricsNote = res.data.missingMetrics ? ` (Dato a sumar para cuantificar: ${res.data.missingMetrics})` : '';
                      setAcrResponse(`${bullet}${metricsNote}`);
                    } catch { setAcrResponse('No se pudo conectar con el asistente ACR. Intentá de nuevo.'); }
                    setAcrLoading(false);
                  }}
                  className={`${button.secondary} text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer ${(acrLoading || !experienceList.length) ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span className="ui-ai-sparkle-loop">
                    <DomSectionIcon iconId={UI_ICON_IDS.ia} size={14} strokeWidth={2.1} />
                  </span>
                  Logros ACR
                </button>
                <LidioHelpTrigger
                  size="xs"
                  title="Logros ACR"
                  text="Redacta tus logros con la fórmula Acción + Contexto + Resultado usando la experiencia seleccionada."
                  groupKey="exp-acr-help"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsFirstJobOpen(true)}
                className={`${button.secondary} text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer`}
              >
                <Briefcase className="w-3.5 h-3.5 text-[var(--color-accent-text)]" />
                Primer Empleo
              </button>
            </div>
            {acrLoading && <p className="text-xs text-[var(--ui-text-secondary)]">Generando fórmula ACR con IA...</p>}
            {acrResponse && (
              <div className="bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-lg p-3 text-sm text-[var(--ui-text-primary)]">
                <p className="font-bold mb-1 text-[var(--color-accent-text)]">Sugerencia ACR (Acción + Contexto + Resultado):</p>
                <p className="italic">{acrResponse}</p>
              </div>
            )}
            {experienceList.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-bold text-[var(--ui-text-secondary)]" htmlFor="acr-target">
                  Experiencia destino:
                </label>
                <select
                  id="acr-target"
                  value={acrCurrentIdx}
                  onChange={(e) => setAcrTargetIdx(Number(e.target.value))}
                  disabled={acrLoading}
                  className="text-xs px-2 py-1 rounded-md bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] outline-none cursor-pointer"
                >
                  {experienceList.map((exp: any, idx: number) => (
                    <option key={exp.id || idx} value={idx}>
                      {exp.cargo || exp.tituloOGrado || `Experiencia #${idx + 1}`} — {exp.institucion || exp.empresa || 'sin empresa'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!acrResponse || acrLoading}
                  onClick={applyAcrToSelected}
                  className={`${button.secondary} text-xs py-1.5 px-3 flex items-center gap-1.5 ${(!acrResponse || acrLoading) ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  Aplicar a esta experiencia
                </button>
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
