import React, { useState } from 'react';
import { Check, FileText } from 'lucide-react';
import { Modal } from '../../../../shared/core/ui/Modal';
import { Field } from '../../../../shared/core/ui/Field';
import { AIButton } from '../../../../shared/core/ui/AIButton';
import { button } from '../../../../shared/core/uiDesignSystem';
import { executeAiTask } from '../../../../shared/core/ai/aiClient';
import {
  findImportDuplicateIndex,
  IMPORTABLE_LIST_FIELDS,
  IMPORTABLE_SCALAR_FIELDS,
  SECTION_OPTIONS,
  reclassifyRecord,
  type ImportableListField,
  type ImportListSelection,
  type ImportReviewSelections
} from '../../utils/cvImportReview';

interface ImportReviewDiffModalProps {
  current: Record<string, any>;
  imported: Record<string, any>;
  onCancel: () => void;
  onConfirm: (selections: ImportReviewSelections, editedFragment: Record<string, any>) => void;
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
  coursesAndCertificates: 'Cursos y certificados',
  profession: 'Profesión',
  achievements: 'Logros',
  portfolio: 'Portafolio',
  projects: 'Proyectos',
  publications: 'Publicaciones',
  references: 'Referencias',
  hardSkills: 'Habilidades técnicas',
  informatics: 'Informática',
  redes: 'Redes profesionales'
};

type EditableFieldDef = { key: string; label: string; textarea?: boolean };

const editableRecordFields: Record<ImportableListField, EditableFieldDef[]> = {
  experience: [
    { key: 'role', label: 'Cargo / Rol' },
    { key: 'company', label: 'Empresa' },
    { key: 'description', label: 'Descripción', textarea: true }
  ],
  education: [
    { key: 'institution', label: 'Institución' },
    { key: 'degree', label: 'Título / Grado' }
  ],
  skills: [],
  languages: [
    { key: 'language', label: 'Idioma' },
    { key: 'proficiency', label: 'Nivel' }
  ],
  coursesAndCertificates: [
    { key: 'title', label: 'Curso / Certificado' },
    { key: 'institution', label: 'Institución / Entidad' }
  ],
  profession: [
    { key: 'degree', label: 'Título / Grado' },
    { key: 'institution', label: 'Institución' },
    { key: 'year', label: 'Año' }
  ],
  achievements: [
    { key: 'title', label: 'Logro / Título' },
    { key: 'institution', label: 'Institución' },
    { key: 'details', label: 'Descripción', textarea: true }
  ],
  portfolio: [
    { key: 'title', label: 'Proyecto / Título' },
    { key: 'institution', label: 'Institución' },
    { key: 'details', label: 'Descripción', textarea: true }
  ],
  projects: [
    { key: 'title', label: 'Proyecto / Título' },
    { key: 'institution', label: 'Institución' },
    { key: 'details', label: 'Descripción', textarea: true },
    { key: 'year', label: 'Año' }
  ],
  publications: [
    { key: 'title', label: 'Publicación / Título' },
    { key: 'autor', label: 'Autor' },
    { key: 'year', label: 'Año' }
  ],
  references: [
    { key: 'personaReferencia', label: 'Persona de referencia' },
    { key: 'cargo', label: 'Cargo' },
    { key: 'institution', label: 'Institución' }
  ],
  hardSkills: [
    { key: 'name', label: 'Habilidad' },
    { key: 'level', label: 'Nivel' }
  ],
  informatics: [
    { key: 'title', label: 'Curso / Tecnología' },
    { key: 'course', label: 'Curso' },
    { key: 'institution', label: 'Institución' }
  ],
  redes: [
    { key: 'plataforma', label: 'Plataforma' },
    { key: 'usuario', label: 'Usuario' },
    { key: 'url', label: 'URL' }
  ]
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const valueForPath = (data: Record<string, any>, path: string) =>
  path.split('.').reduce((value, key) => value?.[key], data);

const setValueForPath = (data: Record<string, any>, path: string, value: string) => {
  const parts = path.split('.');
  if (parts.length === 1) {
    data[parts[0]] = value;
    return;
  }
  const head = parts[0];
  const rest = parts.slice(1).join('.');
  if (!data[head] || typeof data[head] !== 'object') data[head] = {};
  setValueForPath(data[head], rest, value);
};

const recordLabel = (field: string, record: any) => {
  if (typeof record === 'string') return record;
  const title = record?.role || record?.degree || record?.title || record?.language || record?.name || 'Registro detectado';
  const organization = record?.company || record?.institution || record?.school || record?.authority;
  return [title, organization].filter(Boolean).join(' · ');
};

export default function ImportReviewDiffModal({
  current,
  imported,
  onCancel,
  onConfirm
}: ImportReviewDiffModalProps) {
  const [edited, setEdited] = useState<Record<string, any>>(() => clone(imported));
  const [scalarFields, setScalarFields] = useState<Record<string, 'keep' | 'replace'>>({});
  const [listItems, setListItems] = useState<Record<string, ImportListSelection>>({});

  const scalarEntries = IMPORTABLE_SCALAR_FIELDS
    .map((path) => ({ path, value: valueForPath(edited, path) }))
    .filter(({ value }) => typeof value === 'string' && value.trim());

  const listEntries = IMPORTABLE_LIST_FIELDS.flatMap((field) => {
    const editedItems = Array.isArray(edited[field]) ? edited[field] : [];
    const existingItems = Array.isArray(current[field]) ? current[field] : [];
    return editedItems.map((item: any, index: number) => ({
      field,
      index,
      item,
      existingItems,
      duplicateIndex: findImportDuplicateIndex(field, existingItems, item)
    }));
  });

  const updateEditedPath = (path: string, value: string) => {
    setEdited((prev) => {
      const next = clone(prev);
      setValueForPath(next, path, value);
      return next;
    });
  };

  const updateListItem = (field: ImportableListField, index: number, key: string | null, value: any) => {
    setEdited((prev) => {
      const next = clone(prev);
      const items = Array.isArray(next[field]) ? [...next[field]] : [];
      if (key === null) {
        items[index] = String(value ?? '');
      } else if (items[index] && typeof items[index] === 'object') {
        items[index] = { ...items[index], [key]: value };
      }
      next[field] = items;
      return next;
    });
  };

  const handleReclassify = (fromField: ImportableListField, index: number, toField: ImportableListField) => {
    if (fromField === toField) return;
    setEdited((prev) => {
      const next = clone(prev);
      const fromList = Array.isArray(next[fromField]) ? [...next[fromField]] : [];
      const itemToMove = fromList[index];
      if (!itemToMove) return prev;

      fromList.splice(index, 1);
      next[fromField] = fromList;

      const adaptedItem = reclassifyRecord(fromField, toField, itemToMove);
      const toList = Array.isArray(next[toField]) ? [...next[toField]] : [];
      toList.push(adaptedItem);
      next[toField] = toList;

      return next;
    });

    setListItems((prev) => {
      const next = { ...prev };
      delete next[`${fromField}:${index}`];
      return next;
    });
  };

  const mergedContext = { ...current, ...edited };

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
            onClick={() => onConfirm({ scalarFields, listItems }, edited)}
          >
            <Check className="w-4 h-4" />
            Aplicar selección
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <p className="text-sm text-[var(--ui-text-secondary)]">
          Revisá lo detectado y podés editar antes de guardar: cada dato es corregible. Lo que ya está en tu CV se conserva por defecto.
        </p>

        {scalarEntries.length > 0 && (
          <section className="space-y-3">
            <h3 className="font-semibold text-[var(--ui-text-primary)]">Datos individuales</h3>
            {scalarEntries.map(({ path, value }) => {
              const existingValue = valueForPath(current, path) || '';
              const defaultChoice = String(existingValue).trim() ? 'keep' : 'replace';
              const choice = scalarFields[path] || defaultChoice;
              const isLongText = path === 'summary' || path === 'objective';
              return (
                <div key={path} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 p-3 rounded-[var(--ui-radius-control)] border border-[var(--ui-border)] bg-[var(--ui-bg-panel)]">
                  <div className="min-w-0">
                    <span className="block text-xs font-semibold text-[var(--ui-text-secondary)]">{scalarLabels[path]} (actual)</span>
                    <span className="text-sm break-words text-[var(--ui-text-primary)]">{String(existingValue || 'Sin dato')}</span>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-end justify-between gap-2">
                      <label htmlFor={`review-scalar-${path}`} className="block text-xs font-semibold text-[var(--ui-text-secondary)]">
                        Detectado
                      </label>
                      {path === 'summary' && (
                        <AIButton
                          label="Mejorar redacción con IA"
                          onGenerate={async () => {
                            const res = await executeAiTask<{ summary: string }>({
                              taskId: 'generate_summary',
                              payload: {},
                              cvData: mergedContext as any
                            });
                            return res.data.summary;
                          }}
                          onSuccess={(text) => updateEditedPath('summary', text)}
                        />
                      )}
                      {path === 'objective' && (
                        <AIButton
                          label="Mejorar redacción con IA"
                          onGenerate={async () => {
                            const res = await executeAiTask<{ objective: string }>({
                              taskId: 'generate_objective',
                              payload: {},
                              cvData: mergedContext as any
                            });
                            return res.data.objective;
                          }}
                          onSuccess={(text) => updateEditedPath('objective', text)}
                        />
                      )}
                    </div>
                    {isLongText ? (
                      <textarea
                        id={`review-scalar-${path}`}
                        name={`review-scalar-${path}`}
                        value={String(value ?? '')}
                        onChange={(event) => updateEditedPath(path, event.target.value)}
                        rows={3}
                        className="w-full rounded-[var(--ui-radius-control)] border border-[var(--ui-border)] bg-[var(--ui-bg-input)] px-2 py-2 text-sm text-[var(--ui-text-primary)] outline-none focus:border-[var(--color-accent-base)]"
                      />
                    ) : (
                      <input
                        id={`review-scalar-${path}`}
                        name={`review-scalar-${path}`}
                        type="text"
                        value={String(value ?? '')}
                        onChange={(event) => updateEditedPath(path, event.target.value)}
                        className="w-full rounded-[var(--ui-radius-control)] border border-[var(--ui-border)] bg-[var(--ui-bg-input)] px-2 py-2 text-sm text-[var(--ui-text-primary)] outline-none focus:border-[var(--color-accent-base)]"
                      />
                    )}
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
              const fieldDefs = editableRecordFields[field];
              const isStringSkills = field === 'skills';
              return (
                <div key={key} className="grid grid-cols-1 gap-3 p-3 rounded-[var(--ui-radius-control)] border border-[var(--ui-border)] bg-[var(--ui-bg-panel)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
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
                      <div className="flex items-center gap-1.5">
                        <label htmlFor={`reclassify-${key}`} className="text-xs font-semibold text-[var(--ui-text-secondary)] whitespace-nowrap">
                          Sección:
                        </label>
                        <select
                          id={`reclassify-${key}`}
                          aria-label={`Sección de destino para ${recordLabel(field, item)}`}
                          value={field}
                          onChange={(event) => handleReclassify(field, index, event.target.value as ImportableListField)}
                          className="rounded-[var(--ui-radius-control)] border border-[var(--ui-border)] bg-[var(--ui-bg-input)] text-[var(--ui-text-primary)] px-2 py-2 text-sm font-medium"
                        >
                          {SECTION_OPTIONS.map((opt) => (
                            <option key={opt.fieldKey} value={opt.fieldKey}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {isStringSkills ? (
                      <input
                        id={`review-listitem-${field}-${index}`}
                        name={`review-listitem-${field}-${index}`}
                        type="text"
                        value={typeof item === 'string' ? item : String(item?.name || item?.title || '')}
                        onChange={(event) => updateListItem(field, index, null, event.target.value)}
                        className="rounded-[var(--ui-radius-control)] border border-[var(--ui-border)] bg-[var(--ui-bg-input)] px-2 py-2 text-sm text-[var(--ui-text-primary)] outline-none focus:border-[var(--color-accent-base)]"
                      />
                    ) : (
                      fieldDefs.map((def) => {
                        const raw = item?.[def.key];
                        const text = typeof raw === 'string' ? raw : String(raw ?? '');
                        const fieldId = `review-listitem-${field}-${index}-${def.key}`;
                        return (
                          <div key={def.key} className={def.textarea ? 'md:col-span-2 space-y-1' : 'space-y-1'}>
                            <div className="flex items-end justify-between gap-2">
                              <label htmlFor={fieldId} className="block text-xs font-semibold text-[var(--ui-text-secondary)]">
                                {def.label}
                              </label>
                              {field === 'experience' && def.key === 'description' && (
                                <AIButton
                                  label="Mejorar redacción con IA"
                                  onGenerate={async () => {
                                    const res = await executeAiTask<{ improvedBullet: string; missingMetrics: string | null }>({
                                      taskId: 'improve_bullet',
                                      payload: {
                                        role: item?.role || 'Profesional',
                                        company: item?.company || '',
                                        bulletText: text
                                      },
                                      cvData: mergedContext as any
                                    });
                                    return res.data.improvedBullet;
                                  }}
                                  onSuccess={(newText) => updateListItem('experience', index, 'description', newText)}
                                />
                              )}
                            </div>
                            {def.textarea ? (
                              <textarea
                                id={fieldId}
                                name={fieldId}
                                value={text}
                                rows={3}
                                onChange={(event) => updateListItem(field, index, def.key, event.target.value)}
                                className="w-full rounded-[var(--ui-radius-control)] border border-[var(--ui-border)] bg-[var(--ui-bg-input)] px-2 py-2 text-sm text-[var(--ui-text-primary)] outline-none focus:border-[var(--color-accent-base)]"
                              />
                            ) : (
                              <input
                                id={fieldId}
                                name={fieldId}
                                type="text"
                                value={text}
                                onChange={(event) => updateListItem(field, index, def.key, event.target.value)}
                                className="w-full rounded-[var(--ui-radius-control)] border border-[var(--ui-border)] bg-[var(--ui-bg-input)] px-2 py-2 text-sm text-[var(--ui-text-primary)] outline-none focus:border-[var(--color-accent-base)]"
                              />
                            )}
                          </div>
                        );
                      })
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
