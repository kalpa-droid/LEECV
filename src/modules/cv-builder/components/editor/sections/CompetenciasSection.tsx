import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { RepeatableSection } from '../../../../../shared/core/ui/RepeatableSection';
import { SectionManualAdjustment } from '../SectionManualAdjustment';
import { Field } from '../../../../../shared/core/ui/Field';
import { button, radius } from '../../../../../shared/core/uiDesignSystem';
import { AIButton } from '../../../../../shared/core/ui/AIButton';
import { executeAiTask } from '../../../../../shared/core/ai/aiClient';

interface CompetencySuggestion {
  skill: string;
  evidence: string;
  relevance: string;
}

interface CompetenciasSectionProps {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export const CompetenciasSection: React.FC<CompetenciasSectionProps> = ({ cvData, setCvData }) => {
  const [suggestions, setSuggestions] = useState<CompetencySuggestion[]>([]);

  const handleSuggestCompetencies = async () => {
    const jobTargetText = [
      cvData.jobTarget?.jobTitle,
      cvData.jobTarget?.companyName,
      cvData.jobTarget?.jobDescription
    ].filter(Boolean).join('\n');
    const result = await executeAiTask<{ suggestions: CompetencySuggestion[] }>({
      taskId: 'suggest_competencies',
      payload: {
        jobTargetText,
        currentSkills: cvData.skills || []
      },
      cvData,
      temperature: 0.2
    });
    return JSON.stringify(result.data.suggestions || []);
  };

  const handleShowSuggestions = (rawSuggestions: string) => {
    try {
      const parsed: unknown = JSON.parse(rawSuggestions);
      if (!Array.isArray(parsed)) throw new Error('La respuesta de IA no tiene una lista de competencias válida.');
      setSuggestions(parsed.filter((item): item is CompetencySuggestion =>
        !!item
        && typeof item.skill === 'string'
        && typeof item.evidence === 'string'
        && typeof item.relevance === 'string'
      ));
    } catch (error) {
      setSuggestions([]);
      throw error;
    }
  };

  const addSuggestion = (suggestion: CompetencySuggestion) => {
    setCvData((prev: any) => {
      const skills = Array.isArray(prev.skills) ? [...prev.skills] : [];
      const normalizedSuggestion = suggestion.skill.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase();
      const exists = skills.some((skill: any) => {
        const value = typeof skill === 'string' ? skill : skill?.name || skill?.title || '';
        return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase() === normalizedSuggestion;
      });
      return exists ? prev : { ...prev, skills: [...skills, suggestion.skill] };
    });
    setSuggestions((previous) => previous.filter((item) => item !== suggestion));
  };

  return (
    <div className="space-y-3">
      <div className={`p-3 bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/30 rounded-[${radius.card}] text-xs text-[var(--color-secondary-text)] flex items-start gap-2 leading-relaxed`}>
        <Info className="w-4 h-4 text-[var(--color-secondary-text)] flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">💡 Ayuda Contextual — Competencias Clave (Soft Skills):</span>
          <span>Incluye aptitudes interpersonales, liderazgo, trabajo en equipo, capacidad analítica, resolución de conflictos y competencias conductuales.</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--color-neutral-text-secondary)]">
          Las propuestas de IA requieren evidencia en tu CV y sólo se agregan cuando las aceptás.
        </p>
        <AIButton
          label="Revisar con la vacante"
          onGenerate={handleSuggestCompetencies}
          onSuccess={handleShowSuggestions}
        />
      </div>
      {suggestions.length > 0 && (
        <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] p-3">
          <h3 className="text-sm font-semibold text-[var(--color-neutral-text-primary)]">Competencias sugeridas para revisar</h3>
          {suggestions.map((suggestion, index) => (
            <article key={`${suggestion.skill}-${index}`} className="space-y-1 border-t border-[var(--color-neutral-border)] pt-3 first:border-t-0 first:pt-0">
              <h4 className="text-sm font-medium text-[var(--color-neutral-text-primary)]">{suggestion.skill}</h4>
              <p className="text-xs text-[var(--color-neutral-text-secondary)]"><strong>Evidencia en tu CV:</strong> {suggestion.evidence}</p>
              <p className="text-xs text-[var(--color-neutral-text-secondary)]"><strong>Relación con la vacante:</strong> {suggestion.relevance}</p>
              <button type="button" className={button.secondary} onClick={() => addSuggestion(suggestion)}>
                Agregar esta competencia
              </button>
            </article>
          ))}
        </div>
      )}
      <RepeatableSection
        sectionKey="competencias"
        sectionTitle="Competencias Clave (Soft Skills)"
        addLabel="Agregar Competencia"
        cvData={cvData}
        setCvData={setCvData}
        fieldName="skills"
        emptyItem="Nueva Competencia"
        itemTitlePrefix="Competencia"
        getItemName={(item: any, idx: number) => typeof item === 'string' ? item : (item?.name || item?.title || `Competencia #${idx + 1}`)}
        renderItem={(item: any, idx: number, updateField: (field: string, val: any) => void) => {
          const val = typeof item === 'string' ? item : (item?.name || '');
          const isTooLong = val.trim().split(/\s+/).length > 2;

          return (
            <div className="space-y-1">
              <Field
                label={`Competencia Clave #${idx + 1}`}
                value={val}
                onChange={(e: any) => {
                  const newVal = e.target.value;
                  setCvData((prev: any) => {
                    const currentSkills = [...(Array.isArray(prev.skills) ? prev.skills : [])];
                    currentSkills[idx] = newVal;
                    return { ...prev, skills: currentSkills };
                  });
                }}
                placeholder="Ej: Liderazgo, Proactividad, Negociación..."
              />
              {isTooLong && val.trim().length > 0 && (
                <p className="text-[10px] text-[var(--color-danger-base)] mt-1 font-medium">
                  💡 Los ATS prefieren competencias de 1 o 2 palabras máximo. Evitá frases largas.
                </p>
              )}
            </div>
          );
        }}
        manualAdjustment={<SectionManualAdjustment sectionId="competencias" cvData={cvData} setCvData={setCvData} />}
      />
    </div>
  );
};
