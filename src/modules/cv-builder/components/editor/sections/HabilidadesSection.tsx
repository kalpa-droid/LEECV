import React, { useState } from 'react';
import { Info, Sparkles } from 'lucide-react';
import { RepeatableSection } from '../../../../../shared/core/ui/RepeatableSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';
import { Field } from '../../../../../shared/core/ui/Field';
import { radius, button } from '../../../../../shared/core/uiDesignSystem';
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
      const res = await executeAiTask<{ records: Array<{ name?: string; level?: string }>; missingInfo?: string | null }>({
        taskId: 'suggest_records',
        payload: {
          sectionKind: 'skills',
          existingRecords: Array.isArray(cvData?.hardSkills) ? cvData.hardSkills : []
        },
        cvData,
        maxTokens: 600,
        temperature: 0.4
      });
      const drafts = Array.isArray(res.data?.records) ? res.data.records.filter(r => r && typeof r.name === 'string' && r.name.trim()) : [];
      if (!drafts.length) {
        showWarning(res.data?.missingInfo || 'La IA no pudo sugerir habilidades nuevas con los datos actuales del CV.');
        return;
      }
      const normalized = drafts.map(d => ({ name: d.name.trim(), level: typeof d.level === 'string' ? d.level : '' }));
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
      <div className={`p-3 bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/30 rounded-[${radius.card}] text-xs text-[var(--color-secondary-text)] flex items-start gap-2 leading-relaxed`}>
        <Info className="w-4 h-4 text-[var(--color-secondary-text)] flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">💡 Ayuda Contextual — Habilidades Técnicas (Hard Skills):</span>
          <span>Incluye conocimientos técnicos específicos, herramientas informáticas, tecnologías, lenguajes o metodologías aplicadas.</span>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSuggestSkill}
          disabled={isSuggesting}
          className={`${button.secondary} flex items-center gap-1.5 text-xs py-1.5 px-3 ${isSuggesting ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-text)]" />
          {isSuggesting ? 'Generando sugerencia...' : 'Sugerir con IA'}
        </button>
      </div>
      <RepeatableSection
        sectionKey="habilidades"
        sectionTitle="Habilidades Técnicas (Hard Skills)"
        addLabel="Agregar Habilidad Técnica"
        cvData={cvData}
        setCvData={setCvData}
        fieldName="hardSkills"
        emptyItem="Nueva Habilidad Técnica"
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
                      current[idx] = { ...current[idx], name: val, level };
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
                      current[idx] = { ...current[idx], name, level: val };
                      return { ...prev, hardSkills: current };
                    });
                  }}
                  className={`w-full p-2 bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/50 rounded-[${radius.control}] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ui-text-primary)] text-[var(--ui-text-primary)]`}
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
