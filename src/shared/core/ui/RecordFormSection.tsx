import React from 'react';
import { RepeatableSection } from './RepeatableSection';
import { Field } from './Field';
import { FIELD_CATALOG, BUILTIN_RECORD_KINDS } from '../pdf-engine/layers/records/fieldCatalog';
import { Info } from 'lucide-react';
import { radius } from '../uiDesignSystem';
import { SectionPositionControl } from './SectionPositionControl';

interface RecordFormSectionProps {
  sectionKey: string;
  sectionTitle: string;
  kindKey: string;
  addLabel: string;
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
  fieldName: string;
  itemTitlePrefix: string;
  helpText?: string;
  /**
   * Para secciones creadas por la persona desde "Nueva Sección": la lista de
   * campos la eligió el usuario, no viene de BUILTIN_RECORD_KINDS. Cuando
   * se pasa esto, tiene prioridad sobre kindKey — mismo componente, mismo
   * render, cero código nuevo por cada sección personalizada que se cree.
   */
  customFields?: string[];
  manualAdjustment?: React.ReactNode;
  renderTrailingSlot?: (sectionKey: string) => React.ReactNode;
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
  renderTrailingSlot
}: RecordFormSectionProps) {
  const schema = BUILTIN_RECORD_KINDS[kindKey] || BUILTIN_RECORD_KINDS['education'];
  const fieldList = customFields && customFields.length > 0 ? customFields : (schema.defaultFields || ['tituloOGrado', 'institucion']);

  return (
    <div className="space-y-3">
      {helpText && (
        <div className={`p-3 bg-[var(--color-secondary-muted)] border border-[var(--color-secondary-base)]/30 rounded-[${radius.card}] text-xs text-[var(--color-secondary-text)] flex items-start gap-2 leading-relaxed`}>
          <Info className="w-4 h-4 text-[var(--color-secondary-text)] flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">💡 Ayuda Contextual:</span>
            <span>{helpText}</span>
          </div>
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
        manualAdjustment={manualAdjustment || <SectionPositionControl sectionKey={sectionKey} cvData={cvData} setCvData={setCvData} />}
        renderTrailingSlot={renderTrailingSlot}
        renderItem={(item: any, idx: number, updateField: (field: string, val: any) => void) => (
          <div className="space-y-3">
            {fieldList.map((fieldId: string) => {
              const fDef = FIELD_CATALOG[fieldId];
              if (!fDef) return null;

              // Translate legacy field names for backwards compatibility if needed
              let legacyKey = fieldId;
              if (fieldId === 'tituloOGrado') {
                if (fieldName === 'experience') legacyKey = 'role';
                else if (fieldName === 'coursesAndCertificates' || fieldName === 'informatics' || fieldName === 'ecology') legacyKey = 'title';
                else legacyKey = 'degree';
              } else if (fieldId === 'cargo') {
                legacyKey = 'role';
              } else if (fieldId === 'descripcion') {
                legacyKey = (fieldName === 'experience' || fieldName === 'ecology') ? 'details' : 'description';
              } else if (fieldId === 'periodo') {
                legacyKey = 'year';
              } else if (fieldId === 'cargaHoraria') {
                legacyKey = 'hours';
              }

              const currentValue = item[fieldId] !== undefined ? item[fieldId] : (item[legacyKey] || '');

              return (
                <Field
                  key={fieldId}
                  label={fDef.label}
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
