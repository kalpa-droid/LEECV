export type ImportableListField =
  | 'experience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'coursesAndCertificates'
  | 'profession'
  | 'achievements'
  | 'portfolio'
  | 'projects'
  | 'publications'
  | 'references'
  | 'hardSkills'
  | 'informatics'
  | 'redes';

export type ImportListSelection = {
  action: 'add' | 'replace' | 'skip';
  targetIndex?: number;
};

export type ImportReviewSelections = {
  scalarFields: Record<string, 'keep' | 'replace'>;
  listItems: Record<string, ImportListSelection>;
};

const scalarFields = [
  'personalInfo.fullName',
  'personalInfo.givenNames',
  'personalInfo.surname',
  'personalInfo.email',
  'personalInfo.phone',
  'personalInfo.address',
  'personalInfo.cityProvince',
  'personalInfo.website',
  'personalInfo.quote',
  'summary',
  'objective'
] as const;

export const IMPORTABLE_SCALAR_FIELDS = scalarFields;

export const IMPORTABLE_LIST_FIELDS: ImportableListField[] = [
  'experience',
  'education',
  'skills',
  'languages',
  'coursesAndCertificates',
  'profession',
  'achievements',
  'portfolio',
  'projects',
  'publications',
  'references',
  'hardSkills',
  'informatics',
  'redes'
];

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const valueForPath = (data: Record<string, any>, path: string) =>
  path.split('.').reduce((value, key) => value?.[key], data);

const duplicateKey = (field: ImportableListField, item: any): string => {
  if (field === 'skills') {
    const value = typeof item === 'string' ? item : item?.name || item?.title;
    return normalize(String(value || ''));
  }

  const first = field === 'experience'
    ? item?.company || item?.companyName
    : field === 'education'
      ? item?.institution || item?.school
      : field === 'languages'
        ? item?.language || item?.name
        : field === 'achievements'
          ? item?.title || item?.name
          : field === 'portfolio'
            ? item?.title || item?.name
            : field === 'projects'
              ? item?.title || item?.name
              : field === 'publications'
                ? item?.title || item?.name
                : field === 'references'
                  ? item?.personaReferencia || item?.name
                  : field === 'hardSkills'
                    ? item?.name || item?.title
                    : field === 'informatics'
                      ? item?.title || item?.name
                      : field === 'profession'
                        ? item?.degree || item?.title || item?.name
                        : field === 'redes'
                          ? item?.plataforma || item?.name
                          : item?.title || item?.name;
  const second = field === 'experience'
    ? item?.role || item?.title || item?.position
    : field === 'education'
      ? item?.degree || item?.title
      : field === 'languages'
        ? item?.proficiency || item?.level
        : field === 'achievements'
          ? item?.institution || item?.details
          : field === 'portfolio'
            ? item?.institution || item?.details
            : field === 'projects'
              ? item?.institution || item?.details
              : field === 'publications'
                ? item?.autor || item?.author
                : field === 'references'
                  ? item?.cargo || item?.title
                  : field === 'hardSkills'
                    ? item?.level || item?.institution
                    : field === 'informatics'
                      ? item?.course || item?.institution
                      : field === 'profession'
                        ? item?.institution || item?.year
                        : field === 'redes'
                          ? item?.usuario || item?.url
                          : item?.institution || item?.authority;

  return [first, second].map((value) => normalize(String(value || ''))).filter(Boolean).join('|');
};

export function findImportDuplicateIndex(
  field: ImportableListField,
  existingItems: any[],
  importedItem: any
): number {
  const key = duplicateKey(field, importedItem);
  if (!key) return -1;
  return existingItems.findIndex((item) => duplicateKey(field, item) === key);
}

export function normalizeImportedCvData(raw: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  if (raw.personalInfo && typeof raw.personalInfo === 'object') {
    normalized.personalInfo = Object.fromEntries(
      Object.entries(raw.personalInfo).filter(([, value]) => typeof value === 'string' && value.trim())
    );
  }

  for (const field of ['summary', 'objective'] as const) {
    if (typeof raw[field] === 'string' && raw[field].trim()) normalized[field] = raw[field].trim();
  }

  for (const field of IMPORTABLE_LIST_FIELDS) {
    if (!Array.isArray(raw[field])) continue;
    normalized[field] = raw[field].filter(Boolean).map((item: any, index: number) => {
      if (field === 'skills') {
        return typeof item === 'string' ? item.trim() : String(item?.name || item?.title || '').trim();
      }
      if (!item || typeof item !== 'object') return { id: `${field}_import_${index}`, title: String(item ?? '') };

      const result = { ...item, id: item.id || `${field}_import_${index}` };
      if (field === 'experience') {
        result.company = item.company || item.companyName || item.employer || '';
        result.role = item.role || item.title || item.position || '';
        result.description = item.description || item.details || '';
      } else if (field === 'education') {
        result.institution = item.institution || item.school || item.schoolName || '';
        result.degree = item.degree || item.title || '';
      } else if (field === 'languages') {
        result.language = item.language || item.name || '';
        result.proficiency = item.proficiency || item.level || '';
      } else if (field === 'coursesAndCertificates') {
        result.title = item.title || item.name || '';
        result.institution = item.institution || item.authority || '';
      } else if (field === 'profession') {
        result.degree = item.degree || item.title || item.tituloOGrado || '';
        result.institution = item.institution || item.institucion || '';
        result.year = item.year || '';
      } else if (field === 'achievements') {
        result.title = item.title || item.name || item.tituloOGrado || item.logro || '';
        result.institution = item.institution || item.institucion || item.empresa || '';
        result.details = item.details || item.description || item.descripcion || item.metricas || '';
      } else if (field === 'portfolio') {
        result.title = item.title || item.name || item.tituloOGrado || item.proyecto || '';
        result.institution = item.institution || item.institucion || item.cliente || '';
        result.details = item.details || item.description || item.descripcion || '';
      } else if (field === 'projects') {
        result.title = item.title || item.name || item.tituloOGrado || '';
        result.institution = item.institution || item.institucion || '';
        result.details = item.details || item.description || item.descripcion || '';
        result.year = item.year || '';
      } else if (field === 'publications') {
        result.title = item.title || item.tituloOGrado || '';
        result.autor = item.autor || item.author || '';
        result.institution = item.institution || item.institucion || '';
        result.year = item.year || '';
      } else if (field === 'references') {
        result.personaReferencia = item.personaReferencia || item.name || item.persona || '';
        result.cargo = item.cargo || item.role || item.title || '';
        result.institution = item.institution || item.company || item.institucion || '';
        result.contactoReferencia = item.contactoReferencia || item.contact || item.phone || item.email || '';
      } else if (field === 'hardSkills') {
        result.name = item.name || item.title || '';
        result.level = item.level || item.nivel || '';
      } else if (field === 'informatics') {
        result.title = item.title || item.course || item.name || '';
        result.course = item.course || item.title || '';
        result.institution = item.institution || item.institucion || '';
      } else if (field === 'redes') {
        result.plataforma = item.plataforma || item.platform || item.network || '';
        result.usuario = item.usuario || item.username || item.user || '';
        result.url = item.url || item.link || '';
      }
      return result;
    }).filter((item: any) => typeof item === 'string'
      ? !!item
      : Object.entries(item).some(([key, value]) =>
          key !== 'id' && typeof value === 'string' && value.trim().length > 0
        ));
  }

  return normalized;
}

export function applyImportReview(
  current: Record<string, any>,
  imported: Record<string, any>,
  selections: ImportReviewSelections
): Record<string, any> {
  const result = { ...current, personalInfo: { ...(current.personalInfo || {}) } };

  for (const path of scalarFields) {
    const importedValue = valueForPath(imported, path);
    if (typeof importedValue !== 'string' || !importedValue.trim()) continue;
    const currentValue = valueForPath(current, path);
    const shouldReplace = selections.scalarFields[path] === 'replace'
      || (selections.scalarFields[path] === undefined && !String(currentValue || '').trim());
    if (!shouldReplace) continue;

    if (path.startsWith('personalInfo.')) {
      result.personalInfo[path.slice('personalInfo.'.length)] = importedValue;
    } else {
      result[path] = importedValue;
    }
  }

  for (const field of IMPORTABLE_LIST_FIELDS) {
    const importedItems = Array.isArray(imported[field]) ? imported[field] : [];
    const items = Array.isArray(current[field]) ? [...current[field]] : [];
    importedItems.forEach((item: any, index: number) => {
      const key = `${field}:${index}`;
      const duplicateIndex = findImportDuplicateIndex(field, items, item);
      const selection = selections.listItems[key] || { action: duplicateIndex >= 0 ? 'skip' : 'add' };

      if (selection.action === 'add') {
        items.push(item);
      } else if (selection.action === 'replace' && Number.isInteger(selection.targetIndex) && selection.targetIndex! >= 0 && selection.targetIndex! < items.length) {
        const existing = items[selection.targetIndex!];
        items[selection.targetIndex!] = typeof item === 'object' && item !== null && typeof existing === 'object' && existing !== null
          ? { ...existing, ...item, ...(existing.id ? { id: existing.id } : {}) }
          : item;
      }
    });
    if (importedItems.length > 0) result[field] = items;
  }

  return result;
}

function setValueForPath(data: Record<string, any>, path: string, value: any): void {
  const parts = path.split('.');
  let cursor = data;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (typeof cursor[parts[i]] !== 'object' || cursor[parts[i]] === null) {
      cursor[parts[i]] = {};
    }
    cursor = cursor[parts[i]];
  }
  cursor[parts[parts.length - 1]] = value;
}

/**
 * Construye el fragmento validado por el usuario para persistir en
 * ocr_jobs.result_json: sólo los campos que aceptó (explícitamente o por
 * defecto), con sus ediciones aplicadas. NO aplica el fragmento al CV;
 * para eso está applyImportReview.
 *
 * Semántica de selección:
 * - Escalar: se incluye si `scalarFields[path] === 'replace'`, o si está
 *   indefinido y `current` está ausente/vacío (misma regla por defecto que
 *   applyImportReview). 'keep' se excluye.
 * - Ítem de lista: se incluye salvo `listItems['<field>:<index>'].action ===
 *   'skip'`. Sin current, el índice de duplicado no se puede calcular y se
 *   asume 'add'.
 */
export function buildValidatedImportFragment(
  imported: Record<string, any>,
  selections: ImportReviewSelections,
  current?: Record<string, any>
): Record<string, any> {
  const fragment: Record<string, any> = {};

  for (const path of scalarFields) {
    const rawValue = valueForPath(imported, path);
    if (typeof rawValue !== 'string' || !rawValue.trim()) continue;
    const decision = selections.scalarFields[path];
    const currentValue = current ? valueForPath(current, path) : undefined;
    const include = decision === 'replace'
      || (decision === undefined && (!current || !String(currentValue ?? '').trim()));
    if (!include) continue;
    setValueForPath(fragment, path, rawValue.trim());
  }

  for (const field of IMPORTABLE_LIST_FIELDS) {
    const items = Array.isArray(imported[field]) ? imported[field] : [];
    if (items.length === 0) continue;
    const reference = current && Array.isArray(current[field]) ? current[field] : [];
    const accepted: any[] = [];
    items.forEach((item: any, index: number) => {
      const selection = selections.listItems[`${field}:${index}`];
      const action = selection?.action
        ?? (findImportDuplicateIndex(field, reference, item) >= 0 ? 'skip' : 'add');
      if (action === 'skip') return;
      accepted.push(item);
    });
    if (accepted.length > 0) fragment[field] = accepted;
  }

  return fragment;
}
