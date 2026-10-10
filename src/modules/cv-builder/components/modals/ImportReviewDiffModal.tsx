import React, { useState } from 'react';
import { Check, FileText } from 'lucide-react';
import { Modal } from '../../../../shared/core/ui/Modal';
import { button } from '../../../../shared/core/uiDesignSystem';
import {
  findImportDuplicateIndex,
  IMPORTABLE_LIST_FIELDS,
  IMPORTABLE_SCALAR_FIELDS,
  type ImportListSelection,
  type ImportReviewSelections
} from '../../utils/cvImportReview';

interface ImportReviewDiffModalProps {
  current: Record<string, any>;
  imported: Record<string, any>;
  onCancel: () => void;
  onConfirm: (selections: ImportReviewSelections) => void;
}

const scalarLabels: Record<string, string> = {
  'personalInfo.fullName': 'Nombre completo',
  'personalInfo.givenNames': 'Nombres',
  'personalInfo.surname': 'Apellido',
  'personalInfo.email': 'Correo electrónico',
  'personalInfo.phone': 'Teléfono',
  'personalInfo.address': 'Domicilio',
  'personalInfo.cityProvince': 'Ciudad / Provincia',
  'personalInfo.website': 'Sitio web',
  'personalInfo.quote': 'Frase / titular',
  summary: 'Resumen profesional',
  objective: 'Objetivo profesional'
};

const listLabels: Record<string, string> = {
  experience: 'Experiencia laboral',
  education: 'Formación',
  skills: 'Competencias',
  languages: 'Idiomas',
  coursesAndCertificates: 'Cursos y certificados'
};

const recordLabel = (field: string, record: any) => {
  if (typeof record === 'string') return record;
  const title = record?.role || record?.degree || record?.title || record?.language || record?.name || 'Registro detectado';
  const organization = record?.company || record?.institution || record?.school || record?.authority;
  return [title, organization].filter(Boolean).join(' · ');
};

const valueForPath = (data: Record<string, any>, path: string) =>
  path.split('.').reduce((value, key) => value?.[key], data);

export default function ImportReviewDiffModal({
  current,
  imported,
  onCancel,
  onConfirm
}: ImportReviewDiffModalProps) {
  const [scalarFields, setScalarFields] = useState<Record<string, 'keep' | 'replace'>>({});
  const [listItems, setListItems] = useState<Record<string, ImportListSelection>>({});
  const scalarEntries = IMPORTABLE_SCALAR_FIELDS
    .map((path) => ({ path, value: valueForPath(imported, path) }))
    .filter(({ value }) => typeof value === 'string' && value.trim());
  const listEntries = IMPORTABLE_LIST_FIELDS.flatMap((field) => {
    const importedItems = Array.isArray(imported[field]) ? imported[field] : [];
    const existingItems = Array.isArray(current[field]) ? current[field] : [];
    return importedItems.map((item: any, index: number) => ({
      field,
      index,
      item,
      existingItems,
      duplicateIndex: findImportDuplicateIndex(field, existingItems, item)
    }));
  });

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title="Revisar datos detectados"
      icon={<FileText className="w-4 h-4" />}
      size="4xl"
      footer={
        <>
          <button type="button" className={`${button.base} ${button.secondary}`} onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className={`${button.base} ${button.primary} inline-flex items-center gap-2`}
            onClick={() => onConfirm({ scalarFields, listItems })}
          >
            <Check className="w-4 h-4" />
            Aplicar selección
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <p className="text-sm text-[var(--ui-text-secondary)]">
          Lo que ya está en tu CV se conserva por defecto. Elegí qué datos querés completar o reemplazar; los elementos de las listas se revisan por separado.
        </p>

        {scalarEntries.length > 0 && (
          <section className="space-y-3">
            <h3 className="font-semibold text-[var(--ui-text-primary)]">Datos individuales</h3>
            {scalarEntries.map(({ path, value }) => {
              const existingValue = valueForPath(current, path) || '';
              const defaultChoice = String(existingValue).trim() ? 'keep' : 'replace';
              const choice = scalarFields[path] || defaultChoice;
              return (
                <div key={path} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 p-3 rounded-[var(--ui-radius-control)] border border-[var(--ui-border)] bg-[var(--ui-bg-panel)]">
                  <div>
                    <span className="block text-xs font-semibold text-[var(--ui-text-secondary)]">{scalarLabels[path]}</span>
                    <span className="text-sm break-words">{String(existingValue || 'Sin dato')}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-[var(--ui-text-secondary)]">Detectado</span>
                    <span className="text-sm break-words">{String(value)}</span>
                  </div>
                  <select
                    aria-label={`Acción para ${scalarLabels[path]}`}
                    value={choice}
                    onChange={(event) => setScalarFields((previous) => ({
                      ...previous,
                      [path]: event.target.value as 'keep' | 'replace'
                    }))}
                    className="self-center rounded-[var(--ui-radius-control)] border border-[var(--ui-border)] bg-[var(--ui-bg-input)] text-[var(--ui-text-primary)] px-2 py-2 text-sm"
                  >
                    <option value="keep">Conservar actual</option>
                    <option value="replace">Usar detectado</option>
                  </select>
                </div>
              );
            })}
          </section>
        )}

        {listEntries.length > 0 && (
          <section className="space-y-3">
            <h3 className="font-semibold text-[var(--ui-text-primary)]">Registros de listas</h3>
            {listEntries.map(({ field, index, item, existingItems, duplicateIndex }) => {
              const key = `${field}:${index}`;
              const selection = listItems[key] || { action: duplicateIndex >= 0 ? 'skip' : 'add' };
              return (
                <div key={key} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 p-3 rounded-[var(--ui-radius-control)] border border-[var(--ui-border)] bg-[var(--ui-bg-panel)]">
                  <div className="min-w-0">
                    <span className="block text-xs font-semibold text-[var(--ui-text-secondary)]">
                      {listLabels[field]} · {recordLabel(field, item)}
                    </span>
                    {duplicateIndex >= 0 && (
                      <span className="block mt-1 text-xs text-[var(--color-status-warning-text)]">
                        Posible coincidencia: {recordLabel(field, existingItems[duplicateIndex])}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label={`Acción para ${listLabels[field]} ${index + 1}`}
                      value={selection.action}
                      onChange={(event) => setListItems((previous) => ({
                        ...previous,
                        [key]: {
                          ...selection,
                          action: event.target.value as ImportListSelection['action']
                        }
                      }))}
                      className="rounded-[var(--ui-radius-control)] border border-[var(--ui-border)] bg-[var(--ui-bg-input)] text-[var(--ui-text-primary)] px-2 py-2 text-sm"
                    >
                      <option value="add">Agregar como nuevo</option>
                      <option value="skip">Ignorar</option>
                      <option value="replace">Reemplazar existente</option>
                    </select>
                    {selection.action === 'replace' && (
                      <select
                        aria-label={`Registro a reemplazar para ${listLabels[field]} ${index + 1}`}
                        value={selection.targetIndex ?? (duplicateIndex >= 0 ? duplicateIndex : 0)}
                        onChange={(event) => setListItems((previous) => ({
                          ...previous,
                          [key]: { ...selection, targetIndex: Number(event.target.value) }
                        }))}
                        className="max-w-48 rounded-[var(--ui-radius-control)] border border-[var(--ui-border)] bg-[var(--ui-bg-input)] text-[var(--ui-text-primary)] px-2 py-2 text-sm"
                      >
                        {existingItems.map((existing: any, targetIndex: number) => (
                          <option key={targetIndex} value={targetIndex}>
                            {recordLabel(field, existing) || `Registro ${targetIndex + 1}`}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {scalarEntries.length === 0 && listEntries.length === 0 && (
          <p className="text-sm text-[var(--color-status-warning-text)]">
            No se reconocieron datos compatibles para agregar. No se modificó el CV.
          </p>
        )}
      </div>
    </Modal>
  );
}
