import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Sparkles, User } from 'lucide-react';
import { Field } from '../../../../shared/core/ui/Field';
import { AIButton } from '../../../../shared/core/ui/AIButton';
import {
  StructuredImportReviewModal,
  type ReviewFilterTab,
} from '../../../../shared/core/ui/StructuredImportReviewModal';
import { matchesSearchQuery } from '../../../../shared/core/ui/SearchFilterBar';
import { DomSectionIcon } from '../../../../shared/core/pdf-engine/layers/icons/DomSectionIcon';
import { resolveSectionIconId } from '../../../../shared/core/ui/iconCatalog';
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
  type ImportReviewSelections,
} from '../../utils/cvImportReview';

interface ImportReviewDiffModalProps {
  current: Record<string, any>;
  imported: Record<string, any>;
  onCancel: () => void;
  onConfirm: (selections: ImportReviewSelections, editedFragment: Record<string, any>) => void;
}

const scalarLabels: Record<string, string> = {
  'personalInfo.titlePrefix': 'Prefijo (Lic., Dr., ...)',
  'personalInfo.fullName': 'Nombre completo',
  'personalInfo.givenNames': 'Nombres',
  'personalInfo.surname': 'Apellido',
  'personalInfo.email': 'Correo electrónico',
  'personalInfo.phone': 'Teléfono',
  'personalInfo.address': 'Domicilio',
  'personalInfo.cityProvince': 'Ciudad / Provincia',
  'personalInfo.website': 'Sitio web',
  'personalInfo.quote': 'Frase / titular',
  'personalInfo.dni': 'DNI',
  'personalInfo.cuit': 'CUIT',
  'personalInfo.birthDate': 'Fecha de nacimiento',
  'personalInfo.nacionalidad': 'Nacionalidad',
  'personalInfo.estadoCivil': 'Estado civil',
  'personalInfo.disponibilidad': 'Disponibilidad',
  'personalInfo.licenciaConducir': 'Licencia de conducir',
  summary: 'Resumen profesional',
  objective: 'Objetivo profesional',
  frase: 'Frase / lema',
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
  redes: 'Redes profesionales',
};

const listToSectionId: Record<string, string> = {
  experience: 'experiencia',
  education: 'formacion',
  skills: 'habilidades',
  languages: 'idiomas',
  coursesAndCertificates: 'cursos',
  profession: 'profesion',
  achievements: 'logros',
  portfolio: 'portafolio',
  projects: 'proyectos',
  publications: 'publicaciones',
  references: 'referencias',
  hardSkills: 'competencias',
  informatics: 'informatica',
  redes: 'redes',
};

type EditableFieldDef = { key: string; label: string; textarea?: boolean };

const editableRecordFields: Record<ImportableListField, EditableFieldDef[]> = {
  experience: [
    { key: 'role', label: 'Cargo / Rol' },
    { key: 'company', label: 'Empresa' },
    { key: 'startDate', label: 'Desde' },
    { key: 'endDate', label: 'Hasta' },
    { key: 'description', label: 'Descripción', textarea: true },
  ],
  education: [
    { key: 'institution', label: 'Institución' },
    { key: 'degree', label: 'Título / Grado' },
    { key: 'startDate', label: 'Desde' },
    { key: 'endDate', label: 'Hasta' },
    { key: 'description', label: 'Detalle', textarea: true },
  ],
  skills: [],
  languages: [
    { key: 'language', label: 'Idioma' },
    { key: 'proficiency', label: 'Nivel' },
  ],
  coursesAndCertificates: [
    { key: 'title', label: 'Curso / Certificado' },
    { key: 'institution', label: 'Institución / Entidad' },
    { key: 'year', label: 'Año' },
  ],
  profession: [
    { key: 'degree', label: 'Título / Grado' },
    { key: 'institution', label: 'Institución' },
    { key: 'year', label: 'Año' },
  ],
  achievements: [
    { key: 'title', label: 'Logro / Título' },
    { key: 'institution', label: 'Institución' },
    { key: 'details', label: 'Descripción', textarea: true },
  ],
  portfolio: [
    { key: 'title', label: 'Proyecto / Título' },
    { key: 'institution', label: 'Institución' },
    { key: 'details', label: 'Descripción', textarea: true },
  ],
  projects: [
    { key: 'title', label: 'Proyecto / Título' },
    { key: 'institution', label: 'Institución' },
    { key: 'year', label: 'Año' },
    { key: 'details', label: 'Descripción', textarea: true },
  ],
  publications: [
    { key: 'title', label: 'Publicación / Título' },
    { key: 'autor', label: 'Autor' },
    { key: 'year', label: 'Año' },
  ],
  references: [
    { key: 'personaReferencia', label: 'Persona de referencia' },
    { key: 'cargo', label: 'Cargo' },
    { key: 'institution', label: 'Institución' },
    { key: 'contactoReferencia', label: 'Teléfono / Email' },
  ],
  hardSkills: [
    { key: 'name', label: 'Habilidad' },
    { key: 'level', label: 'Nivel' },
  ],
  informatics: [
    { key: 'title', label: 'Curso / Tecnología' },
    { key: 'course', label: 'Curso' },
    { key: 'institution', label: 'Institución' },
  ],
  redes: [
    { key: 'plataforma', label: 'Plataforma' },
    { key: 'usuario', label: 'Usuario' },
    { key: 'url', label: 'URL' },
  ],
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
  const title =
    record?.role ||
    record?.degree ||
    record?.title ||
    record?.language ||
    record?.name ||
    record?.personaReferencia ||
    'Registro detectado';
  const organization = record?.company || record?.institution || record?.school || record?.authority;
  return [title, organization].filter(Boolean).join(' · ');
};

export default function ImportReviewDiffModal({
  current,
  imported,
  onCancel,
  onConfirm,
}: ImportReviewDiffModalProps) {
  const [edited, setEdited] = useState<Record<string, any>>(() => clone(imported));
  const [scalarFields, setScalarFields] = useState<Record<string, 'keep' | 'replace'>>({});
  const [listItems, setListItems] = useState<Record<string, ImportListSelection>>({});
  const [activeFilter, setActiveFilter] = useState<ReviewFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const scalarEntries = IMPORTABLE_SCALAR_FIELDS.map((path) => ({
    path,
    value: valueForPath(edited, path),
  })).filter(({ value }) => value !== undefined && value !== null && String(value).trim() !== '');

  const listEntries = IMPORTABLE_LIST_FIELDS.flatMap((field) => {
    const items = Array.isArray(edited[field]) ? edited[field] : [];
    const existingItems = Array.isArray(current[field]) ? current[field] : [];
    return items.map((item: any, index: number) => ({
      field,
      index,
      item,
      existingItems,
      duplicateIndex: findImportDuplicateIndex(field, item, existingItems),
    }));
  });

  const conflictCount = useMemo(() => {
    const scalarConflicts = scalarEntries.filter(({ path, value }) => {
      const existing = String(valueForPath(current, path) || '').trim();
      return existing !== '' && existing !== String(value || '').trim();
    }).length;
    const listDuplicates = listEntries.filter((e) => e.duplicateIndex >= 0).length;
    return scalarConflicts + listDuplicates;
  }, [scalarEntries, listEntries, current]);

  const updateEditedPath = (path: string, value: string) => {
    setEdited((previous) => {
      const next = clone(previous);
      setValueForPath(next, path, value);
      return next;
    });
  };

  const updateListItem = (field: ImportableListField, index: number, key: string | null, value: string) => {
    setEdited((previous) => {
      const next = clone(previous);
      const items = Array.isArray(next[field]) ? [...next[field]] : [];
      if (key === null) {
        items[index] = value;
      } else {
        items[index] = { ...(items[index] || {}), [key]: value };
      }
      next[field] = items;
      return next;
    });
  };

  const handleReclassify = (fromField: ImportableListField, index: number, toField: ImportableListField) => {
    if (fromField === toField) return;
    const prevFromList = Array.isArray(edited[fromField]) ? edited[fromField] : [];
    const prevToList = Array.isArray(edited[toField]) ? edited[toField] : [];
    const newToIndex = prevToList.length;
    const itemToMove = prevFromList[index];
    if (!itemToMove) return;

    setEdited((prev) => {
      const next = clone(prev);
      const fromList = Array.isArray(next[fromField]) ? [...next[fromField]] : [];
      const target = fromList[index];
      if (!target) return prev;

      fromList.splice(index, 1);
      next[fromField] = fromList;

      const adaptedItem = reclassifyRecord(fromField, toField, target);
      const toList = Array.isArray(next[toField]) ? [...next[toField]] : [];
      toList.push(adaptedItem);
      next[toField] = toList;

      return next;
    });

    // Re-indexar claves posteriores de `fromField` para evitar corrupción de selecciones
    setListItems((prev) => {
      const next: Record<string, ImportListSelection> = {};
      const movedSelection = prev[`${fromField}:${index}`];

      Object.entries(prev).forEach(([k, val]) => {
        if (!k.startsWith(`${fromField}:`)) {
          next[k] = val;
          return;
        }
        const idx = Number(k.split(':')[1]);
        if (idx < index) {
          next[k] = val;
        } else if (idx > index) {
          next[`${fromField}:${idx - 1}`] = val;
        }
      });

      if (movedSelection) {
        next[`${toField}:${newToIndex}`] = movedSelection;
      } else {
        next[`${toField}:${newToIndex}`] = { action: 'add' };
      }
      return next;
    });
  };

  const applyAllDetected = () => {
    const nextScalars: Record<string, 'keep' | 'replace'> = {};
    scalarEntries.forEach(({ path }) => {
      nextScalars[path] = 'replace';
    });
    const nextLists: Record<string, ImportListSelection> = {};
    listEntries.forEach(({ field, index, duplicateIndex }) => {
      nextLists[`${field}:${index}`] =
        duplicateIndex >= 0 ? { action: 'replace', targetIndex: duplicateIndex } : { action: 'add' };
    });
    setScalarFields(nextScalars);
    setListItems(nextLists);
  };

  const fillOnlyEmptyScalars = () => {
    const nextScalars: Record<string, 'keep' | 'replace'> = {};
    scalarEntries.forEach(({ path }) => {
      const existing = String(valueForPath(current, path) || '').trim();
      nextScalars[path] = existing ? 'keep' : 'replace';
    });
    setScalarFields(nextScalars);
  };

  const mergedContext = useMemo(() => ({ ...current, ...edited }), [current, edited]);

  const visibleScalars = useMemo(() => {
    if (activeFilter === 'records') return [];
    return scalarEntries.filter(({ path, value }) => {
      const existing = String(valueForPath(current, path) || '').trim();
      const hasConflict = existing !== '' && existing !== String(value || '').trim();
      if (activeFilter === 'conflicts' && !hasConflict) return false;
      return matchesSearchQuery([scalarLabels[path], existing, String(value || '')], searchQuery, 3);
    });
  }, [scalarEntries, activeFilter, current, searchQuery]);

  const groupedVisibleLists = useMemo(() => {
    if (activeFilter === 'scalars') return [];
    const byField = new Map<ImportableListField, typeof listEntries>();
    for (const entry of listEntries) {
      if (activeFilter === 'conflicts' && entry.duplicateIndex < 0) continue;
      const matches = matchesSearchQuery(
        [listLabels[entry.field], recordLabel(entry.field, entry.item), JSON.stringify(entry.item)],
        searchQuery,
        3,
      );
      if (!matches) continue;
      const group = byField.get(entry.field) || [];
      group.push(entry);
      byField.set(entry.field, group);
    }
    return Array.from(byField.entries());
  }, [listEntries, activeFilter, searchQuery]);

  return (
    <StructuredImportReviewModal
      title="Revisar datos detectados"
      subtitle="Diferenciá de un vistazo tus datos individuales (en verde/ámbar) de tus grupos de registros. Todo lo detectado es editable antes de aplicar."
      onCancel={onCancel}
      scalarCount={scalarEntries.length}
      recordCount={listEntries.length}
      conflictCount={conflictCount}
      activeFilter={activeFilter}
      onFilterChange={setActiveFilter}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      quickActions={
        <>
          <button
            type="button"
            className={`${button.secondary} py-1.5 px-2.5 text-[11px] font-bold`}
            onClick={fillOnlyEmptyScalars}
          >
            Solo completar vacíos
          </button>
          <button
            type="button"
            className={`${button.secondary} py-1.5 px-2.5 text-[11px] font-bold`}
            onClick={applyAllDetected}
          >
            Usar todo lo detectado
          </button>
        </>
      }
      footer={
        <>
          <button type="button" className={`${button.base} ${button.secondary}`} onClick={applyAllDetected}>
            Usar todo lo detectado
          </button>
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
      {/* BLOQUE A: DATOS INDIVIDUALES (1 a 1) */}
      {visibleScalars.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-[var(--ui-border)]">
            <h3 className="text-sm font-black text-[var(--color-secondary-text)] inline-flex items-center gap-1.5">
              <User className="w-4 h-4" /> Datos individuales (perfil)
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-secondary-muted)] text-[var(--color-secondary-text)]">
              {visibleScalars.length} campos
            </span>
          </div>

          <div className="space-y-2">
            {visibleScalars.map(({ path, value }) => {
              const existingValue = valueForPath(current, path) || '';
              const hasExisting = String(existingValue).trim() !== '';
              const defaultChoice = hasExisting ? 'keep' : 'replace';
              const choice = scalarFields[path] || defaultChoice;
              const isLongText = path === 'summary' || path === 'objective';
              const borderAccent = !hasExisting
                ? 'border-l-4 border-l-[var(--color-status-success-base)]'
                : choice === 'replace'
                  ? 'border-l-4 border-l-[var(--color-status-warning-base)]'
                  : 'border-l-4 border-l-[var(--ui-border-strong)] opacity-75';

              return (
                <div
                  key={path}
                  className={`grid grid-cols-1 md:grid-cols-[1fr_1.3fr_auto] gap-3 p-3 rounded-[12px] border border-[var(--ui-border-strong)] bg-[var(--ui-bg-card)] transition ${borderAccent}`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[var(--ui-text-primary)]">{scalarLabels[path]}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          hasExisting
                            ? 'bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)]'
                            : 'bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)]'
                        }`}
                      >
                        {hasExisting ? 'Ya existe' : 'Nuevo dato'}
                      </span>
                    </div>
                    <p className="text-xs break-words text-[var(--ui-text-secondary)] bg-[var(--ui-bg-panel)] px-2.5 py-1.5 rounded-[8px] border border-[var(--ui-border)]">
                      {hasExisting ? String(existingValue) : 'Vacío en tu CV actual'}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <Field
                      id={`review-scalar-${path}`}
                      name={`review-scalar-${path}`}
                      as={isLongText ? 'textarea' : 'input'}
                      rows={isLongText ? 3 : undefined}
                      label="Detectado (editable)"
                      value={String(value ?? '')}
                      onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                        updateEditedPath(path, event.target.value)
                      }
                      headerAction={
                        path === 'summary' ? (
                          <AIButton
                            label="Mejorar redacción con IA"
                            onGenerate={async () => {
                              const res = await executeAiTask<{ summary: string }>({
                                taskId: 'generate_summary',
                                payload: {},
                                cvData: mergedContext as any,
                              });
                              return res.data.summary;
                            }}
                            onSuccess={(text) => updateEditedPath('summary', text)}
                          />
                        ) : path === 'objective' ? (
                          <AIButton
                            label="Mejorar redacción con IA"
                            onGenerate={async () => {
                              const res = await executeAiTask<{ objective: string }>({
                                taskId: 'generate_objective',
                                payload: {},
                                cvData: mergedContext as any,
                              });
                              return res.data.objective;
                            }}
                            onSuccess={(text) => updateEditedPath('objective', text)}
                          />
                        ) : undefined
                      }
                    />
                  </div>

                  <div className="flex flex-col justify-center gap-1.5">
                    <select
                      aria-label={`Acción para ${scalarLabels[path]}`}
                      value={choice}
                      onChange={(event) =>
                        setScalarFields((previous) => ({
                          ...previous,
                          [path]: event.target.value as 'keep' | 'replace',
                        }))
                      }
                      className="rounded-[10px] border border-[var(--ui-border-strong)] bg-[var(--ui-btn-outline-bg)] text-[var(--ui-text-primary)] px-2.5 py-2 text-xs font-bold outline-none focus:border-[var(--color-accent-base)]"
                    >
                      <option value="keep">Conservar actual</option>
                      <option value="replace">Usar detectado</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* BLOQUE B: REGISTROS AGRUPADOS POR SECCIÓN */}
      {groupedVisibleLists.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-[var(--ui-border)]">
            <h3 className="text-sm font-black text-[var(--color-accent-purple-text)] inline-flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Registros por sección
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-accent-purple-light)] text-[var(--color-accent-purple-text)]">
              {groupedVisibleLists.reduce((acc, [, arr]) => acc + arr.length, 0)} registros
            </span>
          </div>

          {groupedVisibleLists.map(([field, items]) => {
            const isCollapsed = Boolean(collapsedGroups[field]);
            const sectionIconId = resolveSectionIconId(listToSectionId[field] || field);
            return (
              <div
                key={field}
                className="rounded-[12px] border border-[var(--ui-border-strong)] bg-[var(--ui-bg-panel)] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedGroups((prev) => ({ ...prev, [field]: !prev[field] }))
                  }
                  className="w-full px-3.5 py-2.5 bg-[var(--ui-bg-card)] border-b border-[var(--ui-border)] flex items-center justify-between gap-2 cursor-pointer hover:bg-[var(--ui-bg-panel)] transition"
                >
                  <span className="flex items-center gap-2 text-xs sm:text-sm font-black text-[var(--ui-text-primary)]">
                    <DomSectionIcon iconId={sectionIconId} className="w-4 h-4 text-[var(--color-accent-purple-text)]" />
                    <span>{listLabels[field]}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-accent-purple-light)] text-[var(--color-accent-purple-text)]">
                      {items.length}
                    </span>
                  </span>
                  {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {!isCollapsed && (
                  <div className="p-3 space-y-2.5">
                    {items.map(({ index, item, existingItems, duplicateIndex }) => {
                      const key = `${field}:${index}`;
                      const selection = listItems[key] || { action: duplicateIndex >= 0 ? 'skip' : 'add' };
                      const fieldDefs = editableRecordFields[field];
                      const isStringSkills = field === 'skills';

                      const cardBorder =
                        selection.action === 'skip'
                          ? 'border-l-4 border-l-[var(--ui-border-strong)] opacity-60'
                          : selection.action === 'replace'
                            ? 'border-l-4 border-l-[var(--color-status-warning-base)]'
                            : 'border-l-4 border-l-[var(--color-secondary-base)]';

                      return (
                        <div
                          key={key}
                          className={`grid grid-cols-1 gap-3 p-3 rounded-[12px] border border-[var(--ui-border)] bg-[var(--ui-bg-card)] transition ${cardBorder}`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="block text-xs sm:text-sm font-bold text-[var(--ui-text-primary)]">
                                {recordLabel(field, item)}
                              </span>
                              {duplicateIndex >= 0 && (
                                <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)]">
                                  Posible coincidencia: {recordLabel(field, existingItems[duplicateIndex])}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-1.5">
                                <label
                                  htmlFor={`reclassify-${key}`}
                                  className="text-[11px] font-semibold text-[var(--ui-text-secondary)] whitespace-nowrap"
                                >
                                  Sección:
                                </label>
                                <select
                                  id={`reclassify-${key}`}
                                  aria-label={`Sección de destino para ${recordLabel(field, item)}`}
                                  value={field}
                                  onChange={(event) =>
                                    handleReclassify(field, index, event.target.value as ImportableListField)
                                  }
                                  className="rounded-[10px] border border-[var(--ui-border)] bg-[var(--ui-btn-outline-bg)] text-[var(--ui-text-primary)] px-2 py-1.5 text-xs font-medium"
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
                                onChange={(event) =>
                                  setListItems((previous) => ({
                                    ...previous,
                                    [key]: {
                                      ...selection,
                                      action: event.target.value as ImportListSelection['action'],
                                    },
                                  }))
                                }
                                className="rounded-[10px] border border-[var(--ui-border)] bg-[var(--ui-btn-outline-bg)] text-[var(--ui-text-primary)] px-2 py-1.5 text-xs font-bold"
                              >
                                <option value="add">Agregar como nuevo</option>
                                <option value="skip">Ignorar</option>
                                <option value="replace">Reemplazar existente</option>
                              </select>

                              {selection.action === 'replace' && (
                                <select
                                  aria-label={`Registro a reemplazar para ${listLabels[field]} ${index + 1}`}
                                  value={selection.targetIndex ?? (duplicateIndex >= 0 ? duplicateIndex : 0)}
                                  onChange={(event) =>
                                    setListItems((previous) => ({
                                      ...previous,
                                      [key]: { ...selection, targetIndex: Number(event.target.value) },
                                    }))
                                  }
                                  className="max-w-48 rounded-[10px] border border-[var(--ui-border)] bg-[var(--ui-btn-outline-bg)] text-[var(--ui-text-primary)] px-2 py-1.5 text-xs"
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
                              <Field
                                id={`review-listitem-${field}-${index}`}
                                name={`review-listitem-${field}-${index}`}
                                label="Competencia"
                                value={
                                  typeof item === 'string'
                                    ? item
                                    : String(item?.name || item?.title || '')
                                }
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                  updateListItem(field, index, null, event.target.value)
                                }
                              />
                            ) : (
                              fieldDefs.map((def) => {
                                const raw = item?.[def.key];
                                const text = typeof raw === 'string' ? raw : String(raw ?? '');
                                const fieldId = `review-listitem-${field}-${index}-${def.key}`;
                                return (
                                  <div
                                    key={def.key}
                                    className={def.textarea ? 'md:col-span-2' : ''}
                                  >
                                    <Field
                                      id={fieldId}
                                      name={fieldId}
                                      as={def.textarea ? 'textarea' : 'input'}
                                      rows={def.textarea ? 3 : undefined}
                                      label={def.label}
                                      value={text}
                                      onChange={(
                                        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                                      ) => updateListItem(field, index, def.key, event.target.value)}
                                      headerAction={
                                        field === 'experience' && def.key === 'description' ? (
                                          <AIButton
                                            label="Mejorar redacción con IA"
                                            onGenerate={async () => {
                                              const res = await executeAiTask<{
                                                improvedBullet: string;
                                                missingMetrics: string | null;
                                              }>({
                                                taskId: 'improve_bullet',
                                                payload: {
                                                  role: item?.role || 'Profesional',
                                                  company: item?.company || '',
                                                  bulletText: text,
                                                },
                                                cvData: mergedContext as any,
                                              });
                                              return res.data.improvedBullet;
                                            }}
                                            onSuccess={(newText) =>
                                              updateListItem('experience', index, 'description', newText)
                                            }
                                          />
                                        ) : undefined
                                      }
                                    />
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
    </StructuredImportReviewModal>
  );
}
