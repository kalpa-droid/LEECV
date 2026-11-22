/**
 * Registro modular de conocimiento de Lidio por app + validación de privacidad en el servidor (Fase 7).
 *
 * - Inyección dinámica por `docType`: cada llamada envía únicamente `PLATFORM + appKnowledge[docType]`.
 * - Para tipos `metadata-only` (`invoice`), `sanitizeMetadataOnlyEditorState` valida el contexto
 *   con esquema estricto de lista blanca antes de construir el prompt (defensa en profundidad).
 */

import { PLATFORM_LIDIO_FOOTER, PLATFORM_LIDIO_HEADER } from './platform.js';
import { CV_KNOWLEDGE } from './cv.js';
import { COVER_LETTER_KNOWLEDGE } from './cover_letter.js';
import { BUSINESS_CARD_KNOWLEDGE } from './business_card.js';
import { BOOK_KNOWLEDGE } from './book.js';
import { PLANNER_KNOWLEDGE } from './planner.js';
import { INVOICE_KNOWLEDGE } from './invoice.js';
import { EDITORIAL_KNOWLEDGE } from './editorial.js';

export type KnowledgeDocTypeId =
  | 'cv'
  | 'cover_letter'
  | 'business_card'
  | 'book'
  | 'planner'
  | 'invoice'
  | 'editorial';

export const APP_KNOWLEDGE_BY_ID: Record<KnowledgeDocTypeId, string> = {
  cv: CV_KNOWLEDGE,
  cover_letter: COVER_LETTER_KNOWLEDGE,
  business_card: BUSINESS_CARD_KNOWLEDGE,
  book: BOOK_KNOWLEDGE,
  planner: PLANNER_KNOWLEDGE,
  invoice: INVOICE_KNOWLEDGE,
  editorial: EDITORIAL_KNOWLEDGE,
};

const METADATA_ONLY_DOC_TYPES = new Set<string>(['invoice']);

const ALLOWED_INVOICE_STEP_IDS = new Set([
  'fact_emisor',
  'fact_comprobante',
  'fact_items',
  'fact_catalogo',
  'fact_clientes',
  'fact_historial',
  'fact_diseno',
  'fact_respaldo',
]);

const ALLOWED_INVOICE_FIELD_IDS = new Set([
  'emisor.razonSocial',
  'emisor.cuit',
  'emisor.condicionIva',
  'comprobante.tipo',
  'comprobante.numero',
  'cliente.nombre',
  'cliente.cuit',
  'items.lista',
  'items.descripcion',
  'items.precioUnitario',
]);

export function resolveKnowledgeDocType(docType?: string | null): KnowledgeDocTypeId {
  if (docType && Object.prototype.hasOwnProperty.call(APP_KNOWLEDGE_BY_ID, docType)) {
    return docType as KnowledgeDocTypeId;
  }
  return 'cv';
}

/**
 * Compone el system prompt de Lidio inyectando SOLO la base de plataforma + la app activa.
 */
export function composeAssistantSystemPrompt(docType?: string | null): string {
  const id = resolveKnowledgeDocType(docType);
  return `${PLATFORM_LIDIO_HEADER}\n\n${APP_KNOWLEDGE_BY_ID[id]}\n\n${PLATFORM_LIDIO_FOOTER}`;
}

/**
 * Validación estricta en servidor del `editorState` recibido.
 * Si el `docType` es `metadata-only` (`invoice`), descarta CUALQUIER clave no autorizada
 * o valor libre del usuario, permitiendo únicamente: `mode`, `docType`, `stepId`/`activeStepId`,
 * `flowStepIds`, `vaultLocked`, `totalRequired`, `completedRequired` e `issues` con `fieldId`
 * perteneciente al catálogo cerrado y `state` en `{'missing','invalid'}`.
 */
export function sanitizeMetadataOnlyEditorState(docType: string | null | undefined, editorState: unknown): unknown {
  if (!docType || !METADATA_ONLY_DOC_TYPES.has(docType)) {
    return editorState ?? null;
  }

  if (!editorState || typeof editorState !== 'object' || Array.isArray(editorState)) {
    return {
      mode: 'metadata-only',
      docType: 'invoice',
      stepId: 'fact_comprobante',
      issues: [],
    };
  }

  const raw = editorState as Record<string, any>;
  const rawStep = typeof raw.stepId === 'string' ? raw.stepId : typeof raw.activeStepId === 'string' ? raw.activeStepId : '';
  const stepId = ALLOWED_INVOICE_STEP_IDS.has(rawStep) ? rawStep : 'fact_comprobante';

  const rawIssues = Array.isArray(raw.issues) ? raw.issues : [];
  const safeIssues = rawIssues
    .filter(
      (item: any) =>
        item &&
        typeof item === 'object' &&
        typeof item.fieldId === 'string' &&
        ALLOWED_INVOICE_FIELD_IDS.has(item.fieldId) &&
        (item.state === 'missing' || item.state === 'invalid')
    )
    .slice(0, 30)
    .map((item: any) => ({
      fieldId: item.fieldId,
      state: item.state,
      ...(typeof item.occurrence === 'number' && Number.isInteger(item.occurrence) && item.occurrence > 0
        ? { occurrence: item.occurrence }
        : {}),
    }));

  const safeFlow = Array.isArray(raw.flowStepIds)
    ? raw.flowStepIds.filter((s: unknown) => typeof s === 'string' && ALLOWED_INVOICE_STEP_IDS.has(s))
    : [...ALLOWED_INVOICE_STEP_IDS];

  return {
    mode: 'metadata-only',
    docType: 'invoice',
    stepId,
    flowStepIds: safeFlow,
    ...(typeof raw.vaultLocked === 'boolean' ? { vaultLocked: raw.vaultLocked } : {}),
    ...(typeof raw.totalRequired === 'number' && Number.isFinite(raw.totalRequired)
      ? { totalRequired: Math.max(0, Math.floor(raw.totalRequired)) }
      : {}),
    ...(typeof raw.completedRequired === 'number' && Number.isFinite(raw.completedRequired)
      ? { completedRequired: Math.max(0, Math.floor(raw.completedRequired)) }
      : {}),
    issues: safeIssues,
  };
}
