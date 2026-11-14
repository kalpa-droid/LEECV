import React, { useState } from 'react';
import { RepeatableSection } from './RepeatableSection';
import { Field } from './Field';
import { FIELD_CATALOG, BUILTIN_RECORD_KINDS } from '../pdf-engine/layers/records/fieldCatalog';
import { elevationSystem, button, radius } from '../uiDesignSystem';
import { resolveLegacyFieldKey } from '../pdf-engine/layers/records/fieldAliasCatalog';
import { getFieldLabelOptions } from '../pdf-engine/layers/records/fieldLabelOptions';
import { Info, Sparkles } from 'lucide-react';
import { SectionPositionControl } from './SectionPositionControl';
import { AIButton } from './AIButton';
import { executeAiTask } from '../ai/aiClient';
import { useToast } from './Toast';

interface RecordFormSectionProps {
  sectionKey: string;
  sectionTitle: string;
  kindKey: string;
  addLabel: string;
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
  fieldName: string;
  itemTitlePrefix: string;
  helpText?: React.ReactNode;

  /**
   * Para secciones creadas por la persona desde "Nueva Sección": la lista de
   * campos la eligió el usuario, no viene de BUILTIN_RECORD_KINDS. Cuando
   * se pasa esto, tiene prioridad sobre kindKey — mismo componente, mismo
   * render, cero código nuevo por cada sección personalizada que se cree.
   */
  customFields?: string[];
  manualAdjustment?: React.ReactNode;
  onDeleteSection?: () => void;
  renderTrailingSlot?: (sectionKey: string) => React.ReactNode;
}

const AI_SUGGESTABLE_KINDS: Record<string, { sectionKind: string; labelSingular: string }> = {
  course: { sectionKind: 'course', labelSingular: 'curso' },
  education: { sectionKind: 'education', labelSingular: 'título' },
  profession: { sectionKind: 'profession', labelSingular: 'título profesional' },
  languages: { sectionKind: 'languages', labelSingular: 'idioma' },
  projects: { sectionKind: 'projects', labelSingular: 'proyecto' },
  publications: { sectionKind: 'publications', labelSingular: 'publicación' },
  references: { sectionKind: 'references', labelSingular: 'referencia' },
  informatics: { sectionKind: 'informatics', labelSingular: 'herramienta' },
  redes: { sectionKind: 'redes', labelSingular: 'enlace' },
  achievements: { sectionKind: 'achievements', labelSingular: 'logro' },
  portfolio: { sectionKind: 'projects', labelSingular: 'trabajo' }
};

/**
 * Alias de campos que la IA devuelve con frecuencia → id canónico del catálogo.
 * Se aplican SOLO si el campo canónico pertenece a la sección (o si la
 * sección no declara el original pero sí el destino).
 */
const AI_FIELD_ALIASES: Record<string, string> = {
  titulo: 'tituloOGrado',
  title: 'tituloOGrado',
  degree: 'tituloOGrado',
  nombre: 'tituloOGrado',
  proyecto: 'tituloOGrado',
  nivel: 'nivelDominio',
  level: 'nivelDominio',
  dominio: 'nivelDominio',
  persona: 'personaReferencia',
  referencia: 'personaReferencia',
  contacto: 'contactoReferencia',
  email: 'contactoReferencia',
  telefono: 'contactoReferencia',
  empresa: 'institucion',
  company: 'institucion',
  organizacion: 'institucion',
  fecha: 'periodo',
  fechas: 'periodo',
  description: 'descripcion',
  resumen: 'descripcion',
  metricas: 'logros'
};

/**
 * Normaliza un borrador devuelto por la IA al esquema real de la sección:
 * conserva claves válidas tal cual, traduce alias conocidos y descarta el
 * resto (no inventa campos, no mete texto libre en claves desconocidas).
 */
export function normalizeAiDraftRecord(raw: any, validFields: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== 'object') return out;
  const put = (target: string, value: any) => {
    if (value === undefined || value === null) return;
    const text = String(value).trim();
    if (text) out[target] = text;
  };

  // 1) Claves que ya coinciden con un campo válido de la sección
  for (const [key, value] of Object.entries(raw)) {
    const clean = String(key).trim();
    if (validFields.includes(clean)) put(clean, value);
  }
  // 2) Alias conocidos (p. ej. nivel → nivelDominio si la sección usa nivelDominio)
  for (const [key, value] of Object.entries(raw)) {
    const clean = String(key).trim();
    const lower = clean.toLowerCase();
    if (validFields.includes(clean)) continue; // ya quedó en el paso 1
    const aliased = AI_FIELD_ALIASES[clean] || AI_FIELD_ALIASES[lower];
    if (aliased && validFields.includes(aliased) && out[aliased] === undefined) put(aliased, value);
  }
  return out;
}

export function RecordFormSection({
  sectionKey,
  sectionTitle,
  kindKey,
  addLabel,
  cvData,
  setCvData,
  fieldName,
  itemTitlePrefix,
  helpText,
  customFields,
  manualAdjustment,
  onDeleteSection,
  renderTrailingSlot
}: RecordFormSectionProps) {
  const schema = BUILTIN_RECORD_KINDS[kindKey] || BUILTIN_RECORD_KINDS['education'];
  const fieldList = customFields && customFields.length > 0 ? customFields : (schema.defaultFields || ['tituloOGrado', 'institucion']);

  // Secciones con IA de sugerencia de registro (Fase F del plan de secciones).
  // Para secciones personalizadas la sugerencia también está disponible: se
  // envían los campos elegidos por la persona para que la IA rellene solo esos.
  const aiSuggestInfo = AI_SUGGESTABLE_KINDS[kindKey] || (customFields && customFields.length > 0
    ? { sectionKind: 'custom', labelSingular: 'registro' }
    : undefined);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { showSuccess, showError, showWarning } = useToast();

  const handleAiSuggest = async () => {
    if (!aiSuggestInfo) return;
    setIsSuggesting(true);
    try {
      const res = await executeAiTask<{ records: Record<string, string>[]; missingInfo?: string | null }>({
        taskId: 'suggest_records',
        payload: {
          sectionKind: aiSuggestInfo.sectionKind,
          sectionTitle,
          customFields: fieldList,
          existingRecords: Array.isArray(cvData?.[fieldName]) ? cvData[fieldName] : []
        },
        cvData,
        maxTokens: 600,
        temperature: 0.4
      });
      const drafts = Array.isArray(res.data?.records) ? res.data.records.filter(r => r && typeof r === 'object') : [];
      if (!drafts.length) {
        showWarning(res.data?.missingInfo || 'La IA no pudo sugerir un registro nuevo con los datos actuales del CV.');
        return;
      }
      const now = Date.now();
      const normalized: Record<string, string>[] = [];
      drafts.forEach((draft, i) => {
        const clean = normalizeAiDraftRecord(draft, fieldList);
        if (Object.keys(clean).length === 0) return;
        normalized.push({ ...clean, id: `rec_ai_${now}_${i}_${Math.random().toString(36).substr(2, 4)}` });
      });
      if (!normalized.length) {
        showWarning('La IA devolvió campos que no encajan con esta sección. Probá de nuevo con más contexto en el CV.');
        return;
      }
      setCvData((prev: any) => ({
        ...prev,
        [fieldName]: [...(Array.isArray(prev?.[fieldName]) ? prev[fieldName] : []), ...normalized]
      }));
      showSuccess(`Agregamos ${normalized.length} ${aiSuggestInfo.labelSingular}${normalized.length > 1 ? 's' : ''} sugerida${normalized.length > 1 ? 's' : ''} por IA. Revisá y ajustá lo que haga falta.`);
    } catch (err) {
      console.error(err);
      showError('No pudimos generar la sugerencia. Intentá de nuevo.');
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="space-y-3">
      {helpText && (
        <div className={`p-3 bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/30 rounded-[${radius.card}] text-xs text-[var(--color-secondary-text)] flex items-start gap-2 leading-relaxed`}>
          <Info className="w-4 h-4 text-[var(--color-secondary-text)] flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Ayuda contextual:</span>
            <span>{helpText}</span>
          </div>
        </div>
      )}

      {aiSuggestInfo && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAiSuggest}
            disabled={isSuggesting}
            className={`${button.secondary} flex items-center gap-1.5 text-xs py-1.5 px-3 ${isSuggesting ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent-text)]" />
            {isSuggesting ? 'Generando sugerencia...' : 'Sugerir con IA'}
          </button>
        </div>
      )}

      <RepeatableSection
        sectionKey={sectionKey}
        sectionTitle={sectionTitle}
        addLabel={addLabel}
        cvData={cvData}
        setCvData={setCvData}
        fieldName={fieldName}
        designKey={kindKey}
        itemTitlePrefix={itemTitlePrefix}
        onDeleteSection={onDeleteSection}
        manualAdjustment={manualAdjustment || <SectionPositionControl sectionKey={sectionKey} cvData={cvData} setCvData={setCvData} />}
        renderTrailingSlot={renderTrailingSlot}
        renderItem={(item: any, idx: number, updateField: (field: string, val: any) => void) => (
          <div className="space-y-3">
            {fieldList.map((fieldId: string) => {
              const fDef = FIELD_CATALOG[fieldId];
              if (!fDef) return null;

              // Translate legacy field names for backwards compatibility if needed
              const legacyKey = resolveLegacyFieldKey(fieldId, fieldName);
              const currentValue = item[fieldId] !== undefined ? item[fieldId] : (item[legacyKey] || '');

              const labelOptions = getFieldLabelOptions(fDef);
              const currentOverride = item.fieldLabelOverrides?.[fieldId] || labelOptions[0];
              const labelIsEverShownInPdf = fDef.pdfRole !== 'title' && fDef.pdfRole !== 'description';

              const labelElement = labelOptions.length > 1 && labelIsEverShownInPdf ? (
                <select
                  value={currentOverride}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    updateField('fieldLabelOverrides', {
                      ...(item.fieldLabelOverrides || {}),
                      [fieldId]: selectedVal
                    });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className={`text-xs font-black py-1 px-2 rounded-md bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent-base)]/40 cursor-pointer ${elevationSystem.raised} transition`}
                >
                  {labelOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                fDef.label
              );

              const headerAiAction = (fDef.type === 'textarea' && (kindKey === 'experience' || fieldId === 'description')) ? (
                <AIButton
                  label="Sugerir Logros"
                  onGenerate={async () => {
                    const title = item.tituloOGrado || item.title || item.cargo || 'Profesional';
                    const company = item.institucion || item.company || item.empresa || '';
                    const res = await executeAiTask<{ improvedBullet: string; missingMetrics: string | null }>({
                      taskId: 'improve_bullet',
                      payload: { role: title, company: company, bulletText: currentValue || '' },
                      maxTokens: 250,
                      temperature: 0.4
                    });
                    
                    if (res.data.missingMetrics) {
                      // Se podría mostrar un toast o alerta, pero por ahora lo inyectamos o devolvemos el texto mejorado
                      console.info('Métricas faltantes sugeridas por IA:', res.data.missingMetrics);
                    }
                    return res.data.improvedBullet;
                  }}
                  onSuccess={(generatedText) => {
                    const newValue = currentValue ? `${currentValue}\n\n${generatedText}` : generatedText;
                    updateField(fieldId, newValue);
                    if (legacyKey !== fieldId) {
                      updateField(legacyKey, newValue);
                    }
                  }}
                />
              ) : undefined;

              let finalHeaderAction = headerAiAction;
              if (fieldId === 'periodo') {
                finalHeaderAction = (
                  <div className="flex gap-2 items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentValue) return;
                        const matches = currentValue.match(/\d{4}/g);
                        if (matches && matches.length > 0) {
                          const newValue = matches.length > 1 ? `${matches[0]} - ${matches[matches.length - 1]}` : matches[0];
                          updateField(fieldId, newValue);
                          if (legacyKey !== fieldId) updateField(legacyKey, newValue);
                        }
                      }}
                      className="text-xs px-2 py-0.5 font-bold rounded-md bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--color-neutral-text-secondary)] hover:bg-[var(--color-neutral-muted)] transition-colors"
                    >
                      Solo Año
                    </button>
                    {headerAiAction}
                  </div>
                ) as any;
              }

              if (fDef.type === 'select' && fDef.options && fDef.options.length > 0) {
                return (
                  <Field
                    key={fieldId}
                    label={labelElement}
                    headerAction={finalHeaderAction}
                    as="select"
                    value={currentValue || fDef.options[0]}
                    onChange={(e: any) => {
                      const val = e.target.value;
                      updateField(fieldId, val);
                      if (legacyKey !== fieldId) {
                        updateField(legacyKey, val);
                      }
                    }}
                  >
                    {fDef.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Field>
                );
              }

              return (
                <Field
                  key={fieldId}
                  label={labelElement}
                  headerAction={finalHeaderAction}
                  value={currentValue}
                  onChange={(e: any) => {
                    const val = e.target.value;
                    updateField(fieldId, val);
                    if (legacyKey !== fieldId) {
                      updateField(legacyKey, val);
                    }
                  }}
                  placeholder={fDef.placeholder}
                  isTextArea={fDef.type === 'textarea'}
                />
              );
            })}
          </div>
        )}
      />
    </div>
  );
}
