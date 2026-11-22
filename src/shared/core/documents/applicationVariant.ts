/**
 * NÚCLEO — VARIANTES DE POSTULACIÓN (applicationVariant.ts)
 *
 * Una "postulación" es una copia INDEPENDIENTE del CV vinculada al CV base.
 * Regla de oro: `sourceCvTabId` siempre apunta al CV ORIGINAL — nunca se
 * encadena A→B→C al crear una postulación desde otra postulación.
 *
 * Antes, los puntos de entrada (Vacante, Carta bloqueada, banner de Diseño,
 * menú "+", "Guardar copia", botón Carta en Guardados) clonaban a mano con
 * lógica repetida y SIN registrar la pestaña del documento nuevo: la barra
 * quedaba apuntando al documento anterior mientras `cvData` mostraba la
 * copia, y el flujo quedaba "perdido". Este módulo es la ÚNICA fuente de
 * verdad del clonado; `createApplicationVariant` orquesta storage + tabs.
 *
 * Funciones puras (testeables sin storage): buildApplicationVersionLabel,
 * isProvisionalApplicationLabel, isApplicationVariant, resolveBaseSourceTabId,
 * buildApplicationVariantData, computeApplicationRename.
 */
import { DocumentTypeId } from '../../../types/document';

/** Label provisional de una postulación recién creada (antes de que haya puesto/empresa). */
export const PROVISIONAL_APPLICATION_LABEL = 'Nueva postulación';

export interface ApplicationTailoredPatch {
  summary?: string;
  objective?: string;
  experienceUpdates?: Array<{ index: number; role?: string; description?: string }>;
  prioritizedSkills?: string[];
  prioritizedHardSkills?: string[];
  atsKeywords?: string[];
  alignmentSummary?: string;
}

export interface ApplicationVariantOptions {
  /** Puesto de la oferta (precarga jobTarget y define el label "Puesto · Empresa"). */
  puesto?: string;
  /** Empresa de la oferta (precarga jobTarget y define el label "Puesto · Empresa"). */
  empresa?: string;
  /** Descripción editable del aviso / lo que busca la empresa. */
  jobDescription?: string;
  /** Mejoras de contenido y metadatos ATS propuestos por la IA al crear la postulación. */
  tailoredPatch?: ApplicationTailoredPatch;
  /** Label explícita (flujo "Guardar copia"). Si falta, se genera "Puesto · Empresa" o el provisional. */
  versionLabel?: string;
  /** Conservar el jobTarget existente de la copia (p. ej. Carta desde Guardados o Guardar copia). Default false. */
  keepJobTarget?: boolean;
  /** Vaciar el cuerpo de la carta en la copia (siempre en postulaciones nuevas). Default true. */
  resetLetterBody?: boolean;
  /** DocType de la copia (siempre 'cv' en postulaciones). Default 'cv'. */
  docType?: string;
}

/** "Puesto · Empresa" → label canónica. Sin datos → label provisional. */
export function buildApplicationVersionLabel(puesto?: string | null, empresa?: string | null): string {
  const p = (puesto || '').trim();
  const e = (empresa || '').trim();
  if (p && e) return `${p} · ${e}`;
  if (p) return p;
  if (e) return e;
  return PROVISIONAL_APPLICATION_LABEL;
}

/** ¿Es el label provisional? Sólo entonces se permite auto-renombrar al completar puesto/empresa. */
export function isProvisionalApplicationLabel(label?: string | null): boolean {
  const l = (label || '').trim().toLowerCase();
  if (!l) return true;
  return l === PROVISIONAL_APPLICATION_LABEL.toLowerCase()
      || l === 'postulación'
      || l === 'postulacion'
      || l === 'nueva postulacion';
}

/** ¿Este documento es una postulación (variante) y no el CV base? */
export function isApplicationVariant(cvData: any): boolean {
  return Boolean(cvData?.sourceCvTabId);
}

/** CV base original. Nunca encadena: si ya es variante, devuelve el sourceCvTabId original. */
export function resolveBaseSourceTabId(cvData: any): string | undefined {
  return (cvData?.sourceCvTabId as string) || (cvData?.id as string) || undefined;
}

const EMPTY_LETTER_BODY = {
  salutation: '',
  hookParagraph: '',
  evidenceParagraph: '',
  closingParagraph: '',
  signoff: '',
};

/**
 * Construye el CVData de la copia. NO muta el original.
 * - id: undefined (el storage genera uno nuevo).
 * - sourceCvTabId: CV base original (nunca encadenado).
 * - jobTarget: conservado (keepJobTarget) o sólo puesto/empresa explícitos, o vacío.
 * - body: vacío si resetLetterBody (default), conservado si no.
 * - version_label: la explícita o la generada ("Puesto · Empresa" / provisional).
 */
function mergePrioritizedStringList(
  prioritized: string[] | undefined,
  existing: any[] | undefined,
): any[] | undefined {
  if (!Array.isArray(prioritized) || prioritized.length === 0) return existing;
  const cleanedPrioritized = prioritized.map((s) => String(s || '').trim()).filter(Boolean);
  if (cleanedPrioritized.length === 0) return existing;
  const seen = new Set(cleanedPrioritized.map((s) => s.toLowerCase()));
  const tail: any[] = [];
  if (Array.isArray(existing)) {
    for (const item of existing) {
      const label = typeof item === 'string' ? item : String(item?.name || item?.title || '');
      if (label.trim() && !seen.has(label.trim().toLowerCase())) {
        seen.add(label.trim().toLowerCase());
        tail.push(item);
      }
    }
  }
  return [...cleanedPrioritized, ...tail];
}

function mergePrioritizedHardSkills(
  prioritized: string[] | undefined,
  existing: any[] | undefined,
): any[] | undefined {
  if (!Array.isArray(prioritized) || prioritized.length === 0) return existing;
  const currentArr = Array.isArray(existing) ? existing : [];
  const byName = new Map<string, any>();
  for (const item of currentArr) {
    const label = typeof item === 'string' ? item : String(item?.name || item?.title || '');
    if (label.trim()) byName.set(label.trim().toLowerCase(), item);
  }
  const result: any[] = [];
  const used = new Set<string>();
  prioritized.forEach((rawName, idx) => {
    const clean = String(rawName || '').trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (used.has(key)) return;
    used.add(key);
    const matched = byName.get(key);
    if (matched) {
      result.push(typeof matched === 'string' ? { id: `hs_ats_${idx}`, name: matched, level: '' } : matched);
    } else {
      result.push({ id: `hs_ats_${Date.now()}_${idx}`, name: clean, level: '' });
    }
  });
  for (const item of currentArr) {
    const label = typeof item === 'string' ? item : String(item?.name || item?.title || '');
    if (label.trim() && !used.has(label.trim().toLowerCase())) {
      result.push(item);
    }
  }
  return result;
}

export function buildApplicationVariantData(cvData: any, options: ApplicationVariantOptions = {}): any {
  const {
    puesto,
    empresa,
    jobDescription,
    tailoredPatch,
    keepJobTarget = false,
    resetLetterBody = true,
    docType = 'cv',
  } = options;
  const explicitLabel = (options.versionLabel || '').trim();
  const label = explicitLabel || buildApplicationVersionLabel(puesto, empresa);
  const sourceCvTabId = resolveBaseSourceTabId(cvData);

  let jobTarget: any;
  if (keepJobTarget) {
    jobTarget = { ...(cvData?.jobTarget || {}) };
  } else {
    const t: any = {};
    const p = (puesto || '').trim();
    const e = (empresa || '').trim();
    const d = (jobDescription || '').trim();
    if (p) t.jobTitle = p;
    if (e) t.companyName = e;
    if (d) t.jobDescription = d;
    jobTarget = t;
  }

  let nextExperience = Array.isArray(cvData?.experience)
    ? cvData.experience.map((item: any) => ({ ...item }))
    : cvData?.experience;

  if (tailoredPatch?.experienceUpdates && Array.isArray(nextExperience)) {
    for (const upd of tailoredPatch.experienceUpdates) {
      if (typeof upd?.index === 'number' && nextExperience[upd.index]) {
        const current = { ...nextExperience[upd.index] };
        if (typeof upd.description === 'string' && upd.description.trim()) {
          current.descripcion = upd.description.trim();
          current.description = upd.description.trim();
        }
        if (typeof upd.role === 'string' && upd.role.trim()) {
          current.cargo = upd.role.trim();
          current.role = upd.role.trim();
        }
        nextExperience[upd.index] = current;
      }
    }
  }

  const nextSummary = tailoredPatch?.summary?.trim() || cvData?.summary;
  const nextObjective = tailoredPatch?.objective?.trim() || cvData?.objective;
  const nextSkills = mergePrioritizedStringList(tailoredPatch?.prioritizedSkills, cvData?.skills);
  const nextHardSkills = mergePrioritizedHardSkills(tailoredPatch?.prioritizedHardSkills, cvData?.hardSkills);

  const nextSectionVisibility = {
    ...(cvData?.sectionVisibility || {}),
    ...(tailoredPatch?.summary?.trim() ? { resumen: true } : {}),
    ...(tailoredPatch?.objective?.trim() ? { objetivo: true } : {}),
  };

  const atsKeywords = Array.isArray(tailoredPatch?.atsKeywords)
    ? tailoredPatch.atsKeywords.map((k) => String(k || '').trim()).filter(Boolean)
    : undefined;

  const { profileSuggestions: _omitSuggestions, ...cleanSource } = cvData || {};

  return {
    ...cleanSource,
    id: undefined,
    ...(resetLetterBody ? { doc_type_id: docType } : {}),
    sourceCvTabId,
    jobTarget,
    ...(nextSummary !== undefined ? { summary: nextSummary } : {}),
    ...(nextObjective !== undefined ? { objective: nextObjective } : {}),
    ...(nextExperience !== undefined ? { experience: nextExperience } : {}),
    ...(nextSkills !== undefined ? { skills: nextSkills } : {}),
    ...(nextHardSkills !== undefined ? { hardSkills: nextHardSkills } : {}),
    sectionVisibility: nextSectionVisibility,
    ...(tailoredPatch
      ? {
          atsMetadata: {
            subject: buildApplicationVersionLabel(jobTarget.jobTitle, jobTarget.companyName),
            keywords: atsKeywords || [],
            alignmentSummary: tailoredPatch.alignmentSummary || '',
          },
        }
      : {}),
    body: resetLetterBody ? { ...EMPTY_LETTER_BODY } : { ...(cvData?.body || {}) },
    version_label: label,
    versionLabel: label,
  };
}

/**
 * Auto-rename "Puesto · Empresa" para una postulación con label provisional.
 * Devuelve el nuevo label, o null si no corresponde renombrar (label manual,
 * o puesto/empresa vacíos, o el label ya coincide).
 */
export function computeApplicationRename(
  currentLabel: string | null | undefined,
  puesto?: string | null,
  empresa?: string | null,
): string | null {
  if (!isProvisionalApplicationLabel(currentLabel)) return null;
  const next = buildApplicationVersionLabel(puesto, empresa);
  if (next === PROVISIONAL_APPLICATION_LABEL) return null;
  if (next === (currentLabel || '').trim()) return null;
  return next;
}

export interface CreateApplicationVariantDeps {
  /** Persistencia (p. ej. CVContext.saveCVAs). Debe devolver { success, record?: { id } }. */
  saveAs: (data: any, versionLabel?: string) => Promise<any>;
  /** Registro de la pestaña (p. ej. workspaceController.ensureDocumentTab). */
  ensureTab: (id: string, docType: DocumentTypeId, data: any) => unknown;
}

export interface CreateApplicationVariantResult {
  success: boolean;
  id?: string;
  label: string;
  error?: any;
}

/**
 * Orquestador: construye la variante, la persiste y le registra la pestaña.
 * Si la persistencia falla, NO registra pestaña (sin estados fantasma).
 * Si falla sólo el registro de pestaña, la copia ya existe y se reporta.
 */
export async function createApplicationVariant(
  args: { cvData: any } & ApplicationVariantOptions,
  deps: CreateApplicationVariantDeps,
): Promise<CreateApplicationVariantResult> {
  const { cvData, ...options } = args;
  const data = buildApplicationVariantData(cvData, options);
  const label = data.version_label as string;
  const docType = (options.docType || 'cv') as DocumentTypeId;

  let res: any;
  try {
    res = await deps.saveAs(data, label);
  } catch (err) {
    return { success: false, label, error: err };
  }
  if (!res?.success) {
    return { success: false, label, error: res?.error ?? res };
  }
  const id = res?.record?.id as string | undefined;
  if (!id) {
    return { success: false, label, error: 'saveAs no devolvió record.id' };
  }
  try {
    deps.ensureTab(id, docType, { ...data, id, version_label: label, versionLabel: label });
  } catch (err) {
    return { success: false, id, label, error: err };
  }
  return { success: true, id, label };
}
