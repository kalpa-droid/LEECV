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

export interface ApplicationVariantOptions {
  /** Puesto de la oferta (precarga jobTarget y define el label "Puesto · Empresa"). */
  puesto?: string;
  /** Empresa de la oferta (precarga jobTarget y define el label "Puesto · Empresa"). */
  empresa?: string;
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
export function buildApplicationVariantData(cvData: any, options: ApplicationVariantOptions = {}): any {
  const { puesto, empresa, keepJobTarget = false, resetLetterBody = true, docType = 'cv' } = options;
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
    if (p) t.jobTitle = p;
    if (e) t.companyName = e;
    jobTarget = t;
  }

  return {
    ...cvData,
    id: undefined,
    ...(resetLetterBody ? { doc_type_id: docType } : {}),
    sourceCvTabId,
    jobTarget,
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
