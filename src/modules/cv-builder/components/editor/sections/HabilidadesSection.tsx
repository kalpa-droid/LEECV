import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { RepeatableSection } from '../../../../../shared/core/ui/RepeatableSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';
import { Field } from '../../../../../shared/core/ui/Field';
import { ContextualGuideBox } from '../../../../../shared/core/ui/ContextualGuideBox';
import { LidioHelpTrigger } from '../../../../../shared/core/ui/LidioHelpTrigger';
import { DomSectionIcon } from '../../../../../shared/core/pdf-engine/layers/icons/DomSectionIcon';
import { UI_ICON_IDS } from '../../../../../shared/core/ui/iconCatalog';
import { executeAiTask } from '../../../../../shared/core/ai/aiClient';
import { useToast } from '../../../../../shared/core/ui/Toast';

interface HabilidadesSectionProps {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export const HabilidadesSection: React.FC<HabilidadesSectionProps> = ({ cvData, setCvData }) => {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { showSuccess, showError, showWarning } = useToast();

  const handleSuggestSkill = async () => {
    setIsSuggesting(true);
    try {
      const res = await executeAiTask<{ records: Array<Record<string, any>>; missingInfo?: string | null }>({
        taskId: 'suggest_records',
        payload: {
          sectionKind: 'skills',
          existingRecords: Array.isArray(cvData?.hardSkills) ? cvData.hardSkills : []
        },
        cvData,
        maxTokens: 600,
        temperature: 0.4
      });
      const drafts = Array.isArray(res.data?.records)
        ? res.data.records.filter(r => r && typeof r === 'object' && String(r.name || r.skill || r.habilidad || r.title || '').trim())
        : [];
      if (!drafts.length) {
        showWarning(res.data?.missingInfo || 'La IA no pudo sugerir habilidades nuevas con los datos actuales del CV.');
        return;
      }
      const now = Date.now();
      const normalized = drafts.map((d, i) => ({
        id: `rec_ai_hab_${now}_${i}_${Math.random().toString(36).substr(2, 4)}`,
        name: String(d.name || d.skill || d.habilidad || d.title || '').trim(),
        level: String(d.level || d.nivel || d.nivelDominio || '').trim()
      }));
      setCvData((prev: any) => ({ ...prev, hardSkills: [...(Array.isArray(prev?.hardSkills) ? prev.hardSkills : []), ...normalized] }));
      showSuccess(`Agregamos ${normalized.length} habilidad${normalized.length > 1 ? 'es' : ''} sugerida${normalized.length > 1 ? 's' : ''} por IA. Revisá y ajustá lo que haga falta.`);
    } catch (err) {
      console.error(err);
      showError('No pudimos generar la sugerencia. Intentá de nuevo.');
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <ContextualGuideBox title="Qué cargar en Habilidades Técnicas" className="flex-1">
          Incluye conocimientos técnicos específicos, herramientas informáticas, tecnologías, lenguajes o metodologías aplicadas.
        </ContextualGuideBox>
        <div className="flex items-center gap-1 pt-1 shrink-0">
          <button
            type="button"
            onClick={handleSuggestSkill}
            disabled={isSuggesting}
            aria-label="Sugerir habilidades técnicas con IA"
            title="Sugerir habilidades técnicas con IA"
            className="w-8 h-8 rounded-full inline-flex items-center justify-center bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/45 text-[var(--color-accent-text)] hover:bg-[var(--color-accent-base)] hover:text-[var(--color-accent-on-base)] transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isSuggesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="ui-ai-sparkle-loop">
                <DomSectionIcon iconId={UI_ICON_IDS.ia} size={16} strokeWidth={2.1} />
              </span>
            )}
          </button>
          <LidioHelpTrigger
            size="xs"
            title="Sugerir con IA"
            text="La IA analiza tu formación y experiencia para sugerirte herramientas concretas. Nada se guarda sin que lo revises."
            groupKey="ai-suggest-habilidades"
          />
        </div>
      </div>
      <RepeatableSection
        sectionKey="habilidades"
        sectionTitle="Habilidades Técnicas (Hard Skills)"
        addLabel="Agregar Habilidad Técnica"
        cvData={cvData}
        setCvData={setCvData}
        fieldName="hardSkills"
        emptyItem={{ name: '', level: '' }}
        itemTitlePrefix="Habilidad"
        getItemName={(item: any, idx: number) => typeof item === 'string' ? item : (item?.name || item?.title || `Habilidad #${idx + 1}`)}
        renderItem={(item: any, idx: number) => {
          const name = typeof item === 'string' ? item : (item?.name || '');
          const level = typeof item === 'string' ? '' : (item?.level || '');
          return (
            <div className="flex gap-2 w-full">
              <div className="flex-1">
                <Field
                  label={`Habilidad Técnica #${idx + 1}`}
                  value={name}
                  onChange={(e: any) => {
                    const val = e.target.value;
                    setCvData((prev: any) => {
                      const current = [...(Array.isArray(prev.hardSkills) ? prev.hardSkills : [])];
                      const prevObj = typeof current[idx] === 'object' && current[idx] !== null ? current[idx] : {};
                      current[idx] = { ...prevObj, name: val, level };
                      return { ...prev, hardSkills: current };
                    });
                  }}
                  placeholder="Ej: React.js, AutoCAD, Excel..."
                />
              </div>
              <div className="w-1/3">
                <label className="block text-xs font-bold text-[var(--color-neutral-text-secondary)] mb-1">
                  Nivel (Opcional)
                </label>
                <select
                  value={level}
                  onChange={(e: any) => {
                    const val = e.target.value;
                    setCvData((prev: any) => {
                      const current = [...(Array.isArray(prev.hardSkills) ? prev.hardSkills : [])];
                      const prevObj = typeof current[idx] === 'object' && current[idx] !== null ? current[idx] : {};
                      current[idx] = { ...prevObj, name, level: val };
                      return { ...prev, hardSkills: current };
                    });
                  }}
                  className="w-full p-2 bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/50 rounded-[10px] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ui-text-primary)] text-[var(--ui-text-primary)]"
                >
                  <option value="">Sin nivel</option>
                  <option value="Básico">Básico</option>
                  <option value="Intermedio">Intermedio</option>
                  <option value="Avanzado">Avanzado</option>
                  <option value="Experto">Experto</option>
                </select>
              </div>
            </div>
          );
        }}
        manualAdjustment={<SectionManualAdjustment sectionId="habilidades" cvData={cvData} setCvData={setCvData} />}
      />
    </div>
  );
};
