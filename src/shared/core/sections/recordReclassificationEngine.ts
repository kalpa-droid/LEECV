/**
 * Motor puro de reclasificación / movimiento de registros entre secciones compatibles.
 *
 * Reglas:
 * 1. Lista blanca estricta por familia semántica: solo se permite mover registros entre
 *    secciones compatibles (ej. Cursos ↔ Formación ↔ Profesión ↔ Experiencia ↔ Proyectos ↔ Logros,
 *    y Competencias ↔ Habilidades Técnicas).
 * 2. Nunca permite mover tipos incompatibles (ej. Redes Sociales ↔ Cursos o Referencias ↔ Formación).
 * 3. Detecta campos que no existen en el destino para no descartar datos en silencio y
 *    permite conservarlos anexados en Descripción.
 */

import { BUILTIN_RECORD_KINDS, FIELD_CATALOG } from '../pdf-engine/layers/records/fieldCatalog';
import { resolveLegacyFieldKey } from '../pdf-engine/layers/records/fieldAliasCatalog';
import { activateSection } from './sectionActivationEngine';

export interface MovableSectionTarget {
  sectionKey: string;
  fieldName: string;
  label: string;
  family: string;
}

interface SectionSpec {
  sectionKey: string;
  fieldName: string;
  label: string;
  family: 'credentials_trajectory' | 'skills_band' | 'informatics_tool' | 'language_item';
  fields: readonly string[];
  isSkillList?: boolean;
}

const SECTION_SPECS: Record<string, SectionSpec> = {
  formacion: {
    sectionKey: 'formacion',
    fieldName: 'education',
    label: 'Formación Académica',
    family: 'credentials_trajectory',
    fields: BUILTIN_RECORD_KINDS.education.defaultFields,
  },
  cursos: {
    sectionKey: 'cursos',
    fieldName: 'coursesAndCertificates',
    label: 'Cursos y Capacitaciones',
    family: 'credentials_trajectory',
    fields: BUILTIN_RECORD_KINDS.course.defaultFields,
  },
  profesion: {
    sectionKey: 'profesion',
    fieldName: 'profession',
    label: 'Títulos Profesionales',
    family: 'credentials_trajectory',
    fields: BUILTIN_RECORD_KINDS.profession.defaultFields,
  },
  experiencia: {
    sectionKey: 'experiencia',
    fieldName: 'experience',
    label: 'Experiencia Laboral',
    family: 'credentials_trajectory',
    fields: BUILTIN_RECORD_KINDS.experience.defaultFields,
  },
  proyectos: {
    sectionKey: 'proyectos',
    fieldName: 'projects',
    label: 'Proyectos Destacados',
    family: 'credentials_trajectory',
    fields: BUILTIN_RECORD_KINDS.projects.defaultFields,
  },
  publicaciones: {
    sectionKey: 'publicaciones',
    fieldName: 'publications',
    label: 'Publicaciones',
    family: 'credentials_trajectory',
    fields: BUILTIN_RECORD_KINDS.publications.defaultFields,
  },
  logros: {
    sectionKey: 'logros',
    fieldName: 'achievements',
    label: 'Logros y Premios',
    family: 'credentials_trajectory',
    fields: BUILTIN_RECORD_KINDS.achievements.defaultFields,
  },
  portafolio: {
    sectionKey: 'portafolio',
    fieldName: 'portfolio',
    label: 'Portafolio y Trabajos',
    family: 'credentials_trajectory',
    fields: BUILTIN_RECORD_KINDS.portfolio.defaultFields,
  },
  competencias: {
    sectionKey: 'competencias',
    fieldName: 'skills',
    label: 'Competencias Clave',
    family: 'skills_band',
    fields: ['name'],
    isSkillList: true,
  },
  habilidades: {
    sectionKey: 'habilidades',
    fieldName: 'hardSkills',
    label: 'Habilidades Técnicas',
    family: 'skills_band',
    fields: ['name', 'level'],
    isSkillList: true,
  },
  informatica: {
    sectionKey: 'informatica',
    fieldName: 'informatics',
    label: 'Informática y TICs',
    family: 'informatics_tool',
    fields: BUILTIN_RECORD_KINDS.informatics.defaultFields,
  },
  idiomas: {
    sectionKey: 'idiomas',
    fieldName: 'languages',
    label: 'Idiomas',
    family: 'language_item',
    fields: BUILTIN_RECORD_KINDS.languages.defaultFields,
  },
};

function resolveDynamicSectionSpec(sectionKey: string, cvData?: any): SectionSpec | null {
  if (SECTION_SPECS[sectionKey]) return SECTION_SPECS[sectionKey];

  if (sectionKey.startsWith('personalizada-') && cvData) {
    const customFields: string[] = Array.isArray(cvData?.sectionFieldSelection?.[sectionKey])
      ? cvData.sectionFieldSelection[sectionKey]
      : [];
    const hasCompatibleHeading = customFields.includes('tituloOGrado') || customFields.includes('cargo');
    if (!hasCompatibleHeading) return null;
    const customLabel =
      String(cvData?.sectionTitleOverrides?.[sectionKey] || '').trim() || `Sección (${sectionKey})`;
    return {
      sectionKey,
      fieldName: sectionKey,
      label: customLabel,
      family: 'credentials_trajectory',
      fields: customFields,
    };
  }

  return null;
}

function getAllActiveCustomTrajectorySpecs(cvData?: any): SectionSpec[] {
  if (!cvData || typeof cvData !== 'object') return [];
  const out: SectionSpec[] = [];
  for (let i = 1; i <= 5; i++) {
    const slotId = `personalizada-${i}`;
    if (cvData?.sectionVisibility?.[slotId] === true) {
      const spec = resolveDynamicSectionSpec(slotId, cvData);
      if (spec) out.push(spec);
    }
  }
  return out;
}

/**
 * Devuelve las secciones destino compatibles para mover un registro desde `sourceSectionKey`.
 * Secciones incompatibles (ej. `redes`, `referencias`) devuelven `[]`.
 */
export function getCompatibleTargetSections(
  sourceSectionKey: string,
  cvData?: any,
): MovableSectionTarget[] {
  const sourceSpec = resolveDynamicSectionSpec(sourceSectionKey, cvData);
  if (!sourceSpec) return [];

  if (sourceSpec.family === 'credentials_trajectory') {
    const builtinTargets = Object.values(SECTION_SPECS).filter(
      (s) => s.family === 'credentials_trajectory' && s.sectionKey !== sourceSectionKey,
    );
    const customTargets = getAllActiveCustomTrajectorySpecs(cvData).filter(
      (s) => s.sectionKey !== sourceSectionKey,
    );
    return [...builtinTargets, ...customTargets].map((s) => ({
      sectionKey: s.sectionKey,
      fieldName: s.fieldName,
      label: s.label,
      family: s.family,
    }));
  }

  if (sourceSpec.family === 'skills_band') {
    return Object.values(SECTION_SPECS)
      .filter((s) => s.family === 'skills_band' && s.sectionKey !== sourceSectionKey)
      .map((s) => ({
        sectionKey: s.sectionKey,
        fieldName: s.fieldName,
        label: s.label,
        family: s.family,
      }));
  }

  if (sourceSpec.family === 'informatics_tool') {
    return [SECTION_SPECS.cursos, SECTION_SPECS.habilidades].map((s) => ({
      sectionKey: s.sectionKey,
      fieldName: s.fieldName,
      label: s.label,
      family: s.family,
    }));
  }

  if (sourceSpec.family === 'language_item') {
    return [SECTION_SPECS.cursos].map((s) => ({
      sectionKey: s.sectionKey,
      fieldName: s.fieldName,
      label: s.label,
      family: s.family,
    }));
  }

  return [];
}

function readCanonicalValues(item: any, sourceSpec: SectionSpec): Record<string, string> {
  const canonical: Record<string, string> = {};
  if (typeof item === 'string') {
    canonical.name = item;
    return canonical;
  }
  if (!item || typeof item !== 'object') return canonical;

  for (const fieldId of sourceSpec.fields) {
    const legacyKey = resolveLegacyFieldKey(fieldId, sourceSpec.fieldName);
    const raw = item[fieldId] !== undefined && item[fieldId] !== '' ? item[fieldId] : item[legacyKey];
    if (typeof raw === 'string' && raw.trim()) {
      canonical[fieldId] = raw.trim();
    }
  }

  // Fallback extra para claves comunes no listadas
  if (!canonical.tituloOGrado && !canonical.cargo) {
    const titleCandidate =
      item.tituloOGrado || item.cargo || item.role || item.degree || item.title || item.herramienta || item.idioma || item.name || '';
    if (typeof titleCandidate === 'string' && titleCandidate.trim()) {
      canonical.tituloOGrado = titleCandidate.trim();
    }
  }
  if (!canonical.institucion && (item.institucion || item.institution || item.company)) {
    canonical.institucion = String(item.institucion || item.institution || item.company).trim();
  }
  if (!canonical.periodo && (item.periodo || item.year)) {
    canonical.periodo = String(item.periodo || item.year).trim();
  }
  if (!canonical.descripcion && (item.descripcion || item.description || item.details)) {
    canonical.descripcion = String(item.descripcion || item.description || item.details).trim();
  }
  if (sourceSpec.isSkillList && !canonical.name && typeof item.name === 'string') {
    canonical.name = item.name.trim();
  }
  if (typeof item.level === 'string' && item.level.trim() && !canonical.level) {
    canonical.level = item.level.trim();
  }

  return canonical;
}

export interface PlannedRecordMove {
  compatible: boolean;
  sourceLabel: string;
  targetLabel: string;
  targetSectionKey: string;
  targetFieldName: string;
  translatedRecord: any;
  overflowSummary: Array<{ fieldId: string; label: string; value: string }>;
  isLossless: boolean;
}

export function planRecordMove(
  item: any,
  sourceSectionKey: string,
  targetSectionKey: string,
  cvData?: any,
): PlannedRecordMove {
  const sourceSpec = resolveDynamicSectionSpec(sourceSectionKey, cvData);
  const targetSpec = resolveDynamicSectionSpec(targetSectionKey, cvData);
  const compatibleTargets = getCompatibleTargetSections(sourceSectionKey, cvData);
  const isCompatible = Boolean(
    sourceSpec &&
      targetSpec &&
      compatibleTargets.some((t) => t.sectionKey === targetSectionKey),
  );

  if (!isCompatible || !sourceSpec || !targetSpec) {
    return {
      compatible: false,
      sourceLabel: sourceSpec?.label || sourceSectionKey,
      targetLabel: targetSpec?.label || targetSectionKey,
      targetSectionKey,
      targetFieldName: targetSpec?.fieldName || targetSectionKey,
      translatedRecord: null,
      overflowSummary: [],
      isLossless: true,
    };
  }

  const values = readCanonicalValues(item, sourceSpec);
  const overflowSummary: Array<{ fieldId: string; label: string; value: string }> = [];

  // Caso especial: familia Competencias ↔ Habilidades Técnicas o Informática → Habilidades
  if (targetSpec.isSkillList) {
    const rawName = values.name || values.herramienta || values.tituloOGrado || '';
    const level = values.level || values.nivelDominio || '';

    if (targetSectionKey === 'competencias') {
      if (level) {
        overflowSummary.push({ fieldId: 'level', label: 'Nivel', value: level });
      }
      if (values.institucion) {
        overflowSummary.push({ fieldId: 'institucion', label: 'Institución', value: values.institucion });
      }
      return {
        compatible: true,
        sourceLabel: sourceSpec.label,
        targetLabel: targetSpec.label,
        targetSectionKey,
        targetFieldName: targetSpec.fieldName,
        translatedRecord: rawName || 'Nueva competencia',
        overflowSummary,
        isLossless: overflowSummary.length === 0,
      };
    }

    // Habilidades técnicas (hardSkills): objeto { id, name, level }
    return {
      compatible: true,
      sourceLabel: sourceSpec.label,
      targetLabel: targetSpec.label,
      targetSectionKey,
      targetFieldName: targetSpec.fieldName,
      translatedRecord: {
        id: (typeof item === 'object' && item?.id) || `rec_moved_${Date.now()}`,
        name: rawName || 'Nueva habilidad',
        level,
      },
      overflowSummary: values.institucion
        ? [{ fieldId: 'institucion', label: 'Institución', value: values.institucion }]
        : [],
      isLossless: !values.institucion,
    };
  }

  // Caso general de registros estructurados (trayectoria / formación / cursos / informática / idiomas)
  const translated: Record<string, any> = {
    id: (typeof item === 'object' && item?.id) || `rec_moved_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  };

  const primaryTitle =
    values.tituloOGrado || values.cargo || values.herramienta || values.idioma || '';

  const consumedSourceKeys = new Set<string>();

  for (const targetField of targetSpec.fields) {
    let resolvedVal = values[targetField];
    if (!resolvedVal && (targetField === 'tituloOGrado' || targetField === 'cargo')) {
      resolvedVal = primaryTitle;
      if (values.tituloOGrado) consumedSourceKeys.add('tituloOGrado');
      if (values.cargo) consumedSourceKeys.add('cargo');
      if (values.herramienta) consumedSourceKeys.add('herramienta');
      if (values.idioma) consumedSourceKeys.add('idioma');
    }
    if (resolvedVal) {
      translated[targetField] = resolvedVal;
      consumedSourceKeys.add(targetField);
      const legacyTargetKey = resolveLegacyFieldKey(targetField, targetSpec.fieldName);
      if (legacyTargetKey !== targetField) {
        translated[legacyTargetKey] = resolvedVal;
      }
    }
  }

  // Verificar si quedó algún valor no vacío en origen que no entró en los campos destino
  for (const [fieldId, val] of Object.entries(values)) {
    if (!val || consumedSourceKeys.has(fieldId) || targetSpec.fields.includes(fieldId)) continue;
    if ((fieldId === 'tituloOGrado' || fieldId === 'cargo' || fieldId === 'herramienta' || fieldId === 'idioma') && primaryTitle && (targetSpec.fields.includes('tituloOGrado') || targetSpec.fields.includes('cargo'))) {
      continue;
    }
    const label = FIELD_CATALOG[fieldId]?.label || fieldId;
    overflowSummary.push({ fieldId, label, value: val });
  }

  return {
    compatible: true,
    sourceLabel: sourceSpec.label,
    targetLabel: targetSpec.label,
    targetSectionKey,
    targetFieldName: targetSpec.fieldName,
    translatedRecord: translated,
    overflowSummary,
    isLossless: overflowSummary.length === 0,
  };
}

export function executeRecordMove(
  cvData: any,
  args: {
    sourceSectionKey: string;
    sourceFieldName: string;
    itemIndex: number;
    targetSectionKey: string;
    mergeOverflowIntoDescription?: boolean;
  },
): { updatedCvData: any; targetLabel: string; movedRecordId?: string } {
  const sourceList = Array.isArray(cvData?.[args.sourceFieldName]) ? cvData[args.sourceFieldName] : [];
  const sourceItem = sourceList[args.itemIndex];
  if (sourceItem === undefined) {
    return { updatedCvData: cvData, targetLabel: args.targetSectionKey };
  }

  const plan = planRecordMove(sourceItem, args.sourceSectionKey, args.targetSectionKey, cvData);
  if (!plan.compatible || !plan.translatedRecord) {
    return { updatedCvData: cvData, targetLabel: plan.targetLabel };
  }

  let finalRecord = plan.translatedRecord;
  if (args.mergeOverflowIntoDescription !== false && plan.overflowSummary.length > 0) {
    const extraText = plan.overflowSummary.map((o) => `${o.label}: ${o.value}`).join(' · ');
    if (typeof finalRecord === 'string') {
      finalRecord = `${finalRecord} (${extraText})`;
    } else if (finalRecord && typeof finalRecord === 'object') {
      const targetSpec = resolveDynamicSectionSpec(args.targetSectionKey, cvData);
      if (targetSpec?.fields.includes('descripcion')) {
        const existingDesc = String(finalRecord.descripcion || '').trim();
        const combinedDesc = existingDesc ? `${existingDesc}\n${extraText}` : extraText;
        finalRecord = {
          ...finalRecord,
          descripcion: combinedDesc,
          [resolveLegacyFieldKey('descripcion', plan.targetFieldName)]: combinedDesc,
        };
      }
    }
  }

  const nextSourceList = sourceList.filter((_: any, idx: number) => idx !== args.itemIndex);
  const existingTargetList = Array.isArray(cvData?.[plan.targetFieldName]) ? cvData[plan.targetFieldName] : [];
  const movedId = typeof finalRecord === 'object' ? finalRecord.id : undefined;

  let nextCvData: any = {
    ...cvData,
    [args.sourceFieldName]: nextSourceList,
    [plan.targetFieldName]: [...existingTargetList, finalRecord],
  };

  // Mantener vínculo si había un certificado escaneado asociado a este registro
  if (movedId && Array.isArray(nextCvData.certificatesScanned)) {
    nextCvData = {
      ...nextCvData,
      certificatesScanned: nextCvData.certificatesScanned.map((c: any) =>
        c?.linkedRecordId === movedId ? { ...c, linkedSection: args.targetSectionKey } : c,
      ),
    };
  }

  nextCvData = activateSection(nextCvData, args.targetSectionKey).updatedCvData;

  return {
    updatedCvData: nextCvData,
    targetLabel: plan.targetLabel,
    movedRecordId: movedId,
  };
}
