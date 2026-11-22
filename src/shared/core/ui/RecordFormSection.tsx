import React, { useState } from 'react';
import { RepeatableSection } from './RepeatableSection';
import { Field } from './Field';
import { FIELD_CATALOG, BUILTIN_RECORD_KINDS } from '../pdf-engine/layers/records/fieldCatalog';
import { elevationSystem, button, radius } from '../uiDesignSystem';
import { resolveLegacyFieldKey } from '../pdf-engine/layers/records/fieldAliasCatalog';
import { getFieldLabelOptions } from '../pdf-engine/layers/records/fieldLabelOptions';
import { Info, Loader2, X } from 'lucide-react';
import { ContextualGuideBox } from './ContextualGuideBox';
import { LidioHelpTrigger } from './LidioHelpTrigger';
import { DomSectionIcon } from '../pdf-engine/layers/icons/DomSectionIcon';
import { UI_ICON_IDS } from './iconCatalog';
import { SectionPositionControl } from './SectionPositionControl';
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
 * Campos de texto libre que la IA puede reescribir (cualquier sección).
 * Se normaliza (NFD + sin diacríticos) antes de comparar (Regla 8 del repo).
 */
export const IMPROVABLE_FIELD_IDS = ['descripcion', 'description', 'resumen'];

export function isAiRewritableField(fieldId: string): boolean {
  const normalized = String(fieldId)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return IMPROVABLE_FIELD_IDS.includes(normalized);
}

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

  // Revisión inline de sugerencias de IA (vista previa antes de aplicar)
  const [fieldReview, setFieldReview] = useState<{ fieldId: string; legacyKey: string; text: string; note: string | null } | null>(null);
  const [fieldBusy, setFieldBusy] = useState(false);
  const [recordReview, setRecordReview] = useState<{ fields: Record<string, string>; note: string | null } | null>(null);
  const [recordBusy, setRecordBusy] = useState(false);
  const [recordFocus, setRecordFocus] = useState<'claridad' | 'ats' | 'breve'>('claridad');

  const jobTargetStr = (() => {
    const jt = cvData?.jobTarget || {};
    const parts = [jt.jobTitle, jt.companyName, jt.jobDescription].filter((v: any) => typeof v === 'string' && v.trim());
    return parts.length > 0 ? parts.join(' · ') : undefined;
  })();

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
      {(helpText || aiSuggestInfo) && (
        <div className="flex items-start justify-between gap-2">
          {helpText ? (
            <ContextualGuideBox title="Cómo completar esta sección" className="flex-1">
              {helpText}
            </ContextualGuideBox>
          ) : (
            <div className="flex-1" />
          )}
          {aiSuggestInfo && (
            <div className="flex items-center gap-1 pt-1 shrink-0">
              <button
                type="button"
                onClick={handleAiSuggest}
                disabled={isSuggesting}
                aria-label="Sugerir registros con IA"
                title="Sugerir registros con IA"
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
                text="La IA propone registros nuevos según los datos de tu CV. Nada se guarda sin tu confirmación."
                groupKey={`ai-suggest-${sectionKey}`}
              />
            </div>
          )}
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

              // Acción de IA por campo de texto libre: reescribe SOLO este campo
              // con rewrite_record (respeta sección/kind y vacante) y abre
              // revisión inline — nunca aplica sin que la persona elija.
              const fieldAiAction = (fDef.type === 'textarea' && isAiRewritableField(fieldId)) ? (
                <button
                  type="button"
                  disabled={fieldBusy}
                  onClick={async () => {
                    setFieldBusy(true);
                    try {
                      const cleanItem: Record<string, any> = {};
                      Object.entries(item).forEach(([k, v]) => {
                        if (k !== 'id' && k !== 'fieldLabelOverrides') cleanItem[k] = v;
                      });
                      const res = await executeAiTask<{ improvedFields: Record<string, string>; missingDataNote?: string | null }>({
                        taskId: 'rewrite_record',
                        payload: {
                          sectionKind: aiSuggestInfo?.sectionKind || kindKey,
                          sectionTitle,
                          jobTarget: jobTargetStr,
                          focus: 'claridad',
                          currentRecord: cleanItem
                        },
                        cvData,
                        maxTokens: 400,
                        temperature: 0.3
                      });
                      const improved = res.data?.improvedFields || {};
                      // El modelo responde con claves del esquema (canónicas);
                      // si el campo de la sección usa un alias, se traduce.
                      const canonical = AI_FIELD_ALIASES[fieldId] || AI_FIELD_ALIASES[String(fieldId).toLowerCase()] || fieldId;
                      const text = typeof improved[canonical] === 'string' ? improved[canonical]
                        : typeof improved[fieldId] === 'string' ? improved[fieldId] : '';
                      if (!text || !text.trim()) {
                        showWarning('La IA no devolvió texto para este campo. Probá de nuevo.');
                        return;
                      }
                      setFieldReview({ fieldId, legacyKey, text, note: res.data?.missingDataNote || null });
                    } catch (err: any) {
                      console.error(err);
                      showError(err?.message || 'No pudimos mejorar el texto. Intentá de nuevo.');
                    } finally {
                      setFieldBusy(false);
                    }
                  }}
                  aria-label="Mejorar texto con IA"
                  title="Mejorar texto con IA"
                  className="w-7 h-7 rounded-full inline-flex items-center justify-center bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/40 text-[var(--color-accent-text)] hover:bg-[var(--color-accent-base)] hover:text-[var(--color-accent-on-base)] transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {fieldBusy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span className="ui-ai-sparkle-loop">
                      <DomSectionIcon iconId={UI_ICON_IDS.ia} size={13} strokeWidth={2.1} />
                    </span>
                  )}
                </button>
              ) : undefined;

              let finalHeaderAction = fieldAiAction;
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
                    {fieldAiAction}
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

              const defaultField = (
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
              if (!(fieldReview && fieldReview.fieldId === fieldId)) return defaultField;
              return (
                <div key={fieldId} className={`space-y-2 p-3 bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/40 rounded-[${radius.card}]`}>
                  {defaultField}
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black text-[var(--color-accent-text)]">Vista previa de la IA</p>
                    <button
                      type="button"
                      onClick={() => setFieldReview(null)}
                      aria-label="Descartar sugerencia"
                      className="p-0.5 rounded text-[var(--color-neutral-text-secondary)] hover:text-[var(--color-neutral-text-primary)] transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] rounded-[var(--ui-radius-card)] p-2 max-h-48 overflow-y-auto">
                    {fieldReview.text}
                  </p>
                  {fieldReview.note && (
                    <p className="text-[11px] text-[var(--color-neutral-text-secondary)] leading-snug">
                      <span className="font-bold">Datos recomendados:</span> {fieldReview.note}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        updateField(fieldId, fieldReview.text);
                        if (legacyKey !== fieldId) updateField(legacyKey, fieldReview.text);
                        setFieldReview(null);
                        showSuccess('Texto actualizado con la sugerencia de IA.');
                      }}
                      className="px-2.5 py-1 text-[11px] font-black rounded-md bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] hover:opacity-90 transition cursor-pointer"
                    >
                      Reemplazar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newValue = currentValue ? `${currentValue}\n\n${fieldReview.text}` : fieldReview.text;
                        updateField(fieldId, newValue);
                        if (legacyKey !== fieldId) updateField(legacyKey, newValue);
                        setFieldReview(null);
                        showSuccess('Texto agregado debajo del anterior.');
                      }}
                      className="px-2.5 py-1 text-[11px] font-black rounded-md bg-[var(--ui-bg-card)] border border-[var(--color-accent-base)]/40 text-[var(--color-accent-text)] hover:bg-[var(--color-accent-muted)] transition cursor-pointer"
                    >
                      Agregar debajo
                    </button>
                    <button
                      type="button"
                      onClick={() => setFieldReview(null)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-md border border-[var(--color-neutral-border)] text-[var(--color-neutral-text-secondary)] hover:bg-[var(--color-neutral-surface-muted)] transition cursor-pointer"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Mejora del registro completo con IA (rewrite_record + revisión inline) */}
            <div className="pt-2 space-y-2 border-t border-[var(--color-neutral-border)]/60">
              <div className="flex flex-wrap items-center gap-2">
                {(['claridad', 'ats', 'breve'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setRecordFocus(f)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black transition cursor-pointer ${
                      recordFocus === f
                        ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]'
                        : 'bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] text-[var(--color-neutral-text-secondary)] hover:bg-[var(--color-neutral-surface-muted)]'
                    }`}
                  >
                    {{ claridad: 'Claridad', ats: 'Impacto ATS', breve: 'Más breve' }[f]}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={recordBusy}
                  onClick={async () => {
                    setRecordBusy(true);
                    try {
                      const cleanItem: Record<string, any> = {};
                      Object.entries(item).forEach(([k, v]) => {
                        if (k !== 'id' && k !== 'fieldLabelOverrides') cleanItem[k] = v;
                      });
                      const res = await executeAiTask<{ improvedFields: Record<string, string>; missingDataNote?: string | null }>({
                        taskId: 'rewrite_record',
                        payload: {
                          sectionKind: aiSuggestInfo?.sectionKind || kindKey,
                          sectionTitle,
                          jobTarget: jobTargetStr,
                          focus: recordFocus,
                          currentRecord: cleanItem
                        },
                        cvData,
                        maxTokens: 800,
                        temperature: 0.3
                      });
                      const normalized = normalizeAiDraftRecord(res.data?.improvedFields || {}, fieldList);
                      if (!Object.keys(normalized).length) {
                        showWarning('La IA no devolvió cambios útiles para este registro.');
                        return;
                      }
                      setRecordReview({ fields: normalized, note: res.data?.missingDataNote || null });
                    } catch (err: any) {
                      console.error(err);
                      showError(err?.message || 'No pudimos mejorar el registro. Intentá de nuevo.');
                    } finally {
                      setRecordBusy(false);
                    }
                  }}
                  aria-label="Mejorar registro con IA"
                  title="Mejorar registro con IA"
                  className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/40 text-[var(--color-accent-text)] hover:bg-[var(--color-accent-base)] hover:text-[var(--color-accent-on-base)] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {recordBusy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span className="ui-ai-sparkle-loop">
                      <DomSectionIcon iconId={UI_ICON_IDS.ia} size={14} strokeWidth={2.1} />
                    </span>
                  )}
                  <span>{recordBusy ? 'Mejorando…' : 'IA'}</span>
                </button>
              </div>

              {recordReview && (
                <div className={`p-3 bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/40 rounded-[${radius.card}] space-y-2`}>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black text-[var(--color-accent-text)]">Vista previa del registro mejorado</p>
                    <button
                      type="button"
                      onClick={() => setRecordReview(null)}
                      aria-label="Descartar sugerencia"
                      className="p-0.5 rounded text-[var(--color-neutral-text-secondary)] hover:text-[var(--color-neutral-text-primary)] transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ul className="space-y-1 max-h-48 overflow-y-auto bg-[var(--ui-bg-card)] border border-[var(--color-neutral-border)] rounded-[var(--ui-radius-card)] p-2">
                    {Object.entries(recordReview.fields).map(([k, v]) => (
                      <li key={k} className="text-[11px] leading-snug break-words">
                        <span className="font-bold">{k}: </span>
                        {v}
                      </li>
                    ))}
                  </ul>
                  {recordReview.note && (
                    <p className="text-[11px] text-[var(--color-neutral-text-secondary)] leading-snug">
                      <span className="font-bold">Datos recomendados:</span> {recordReview.note}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        Object.entries(recordReview.fields).forEach(([k, v]) => {
                          updateField(k, v);
                          const legacy = resolveLegacyFieldKey(k, fieldName);
                          if (legacy !== k) updateField(legacy, v);
                        });
                        setRecordReview(null);
                        showSuccess('Registro actualizado con la sugerencia de IA.');
                      }}
                      className="px-2.5 py-1 text-[11px] font-black rounded-md bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] hover:opacity-90 transition cursor-pointer"
                    >
                      Aplicar cambios
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecordReview(null)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-md border border-[var(--color-neutral-border)] text-[var(--color-neutral-text-secondary)] hover:bg-[var(--color-neutral-surface-muted)] transition cursor-pointer"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      />
    </div>
  );
}
