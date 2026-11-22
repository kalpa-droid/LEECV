/**
 * Motor de completitud sin fuga de datos para FacturLee (Fase 7 — Decisión #2).
 *
 * Garantía de privacidad `metadata-only`:
 * - `FACTURADOR_FIELD_CATALOG` es un catálogo ESTÁTICO cerrado de identificadores de campo.
 * - `assessFacturadorCompleteness()` inspecciona localmente el borrador y produce ÚNICAMENTE
 *   estados binarios/estructurales (`'missing' | 'invalid'`) por `fieldId` (y `occurrence` numérico
 *   para ítems de la lista). NUNCA incluye los valores cargados.
 * - `buildFacturadorMetadataOnlyContext()` NO acepta el borrador ni datos de empresa/cliente
 *   como parámetro: solo recibe el `CompletenessReport` ya despojado de valores.
 */

import type {
  CompletenessIssue,
  CompletenessReport,
  FieldCatalogEntry,
  MetadataOnlyContext,
} from '../../../shared/contracts/assistantContract';
import type { EmpresaConfig, InvoiceDraft } from './facturadorTypes';
import { FACTURADOR_STEP_SEQUENCE } from './facturadorStepSequence';

export const FACTURADOR_FIELD_CATALOG = [
  { id: 'emisor.razonSocial', label: 'nombre o razón social del negocio', stepId: 'fact_emisor', required: true },
  { id: 'emisor.cuit', label: 'CUIT del negocio', stepId: 'fact_emisor', required: true },
  { id: 'emisor.condicionIva', label: 'condición frente al IVA del negocio', stepId: 'fact_emisor', required: true },
  { id: 'comprobante.tipo', label: 'tipo de comprobante', stepId: 'fact_comprobante', required: true },
  { id: 'comprobante.numero', label: 'número del comprobante', stepId: 'fact_comprobante', required: true },
  { id: 'cliente.nombre', label: 'nombre o razón social del cliente', stepId: 'fact_comprobante', required: true },
  { id: 'cliente.cuit', label: 'CUIT del cliente', stepId: 'fact_comprobante', required: true },
  { id: 'items.lista', label: 'al menos un ítem o servicio', stepId: 'fact_items', required: true },
  { id: 'items.descripcion', label: 'descripción del ítem', stepId: 'fact_items', required: true },
  { id: 'items.precioUnitario', label: 'precio unitario del ítem', stepId: 'fact_items', required: true },
] as const satisfies readonly FieldCatalogEntry[];

export type FacturadorFieldId = (typeof FACTURADOR_FIELD_CATALOG)[number]['id'];

export const FACTURADOR_ALLOWED_FIELD_IDS: ReadonlySet<string> = new Set(
  FACTURADOR_FIELD_CATALOG.map((f) => f.id)
);

const FACTURADOR_FIELD_BY_ID = new Map<FacturadorFieldId, (typeof FACTURADOR_FIELD_CATALOG)[number]>(
  FACTURADOR_FIELD_CATALOG.map((entry) => [entry.id, entry])
);

const FACTURADOR_FLOW_STEP_IDS: readonly string[] = FACTURADOR_STEP_SEQUENCE.map((s) => s.id);
const FACTURADOR_STEP_ID_SET = new Set(FACTURADOR_FLOW_STEP_IDS);

/**
 * Valida localmente un CUIT argentino (11 dígitos + dígito verificador Módulo 11).
 * Nunca devuelve el número ingresado; solo indica `'ok' | 'missing' | 'invalid'`.
 */
export function validateCuitState(raw: unknown): 'ok' | 'missing' | 'invalid' {
  if (typeof raw !== 'string' || !raw.trim()) return 'missing';
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 11) return 'invalid';

  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(digits[i]) * weights[i];
  }
  const mod = 11 - (sum % 11);
  const expected = mod === 11 ? 0 : mod === 10 ? 9 : mod;
  return Number(digits[10]) === expected ? 'ok' : 'invalid';
}

export interface FacturadorCompletenessInput {
  empresa?: Partial<EmpresaConfig> | null;
  draft?: Partial<InvoiceDraft> | null;
}

/**
 * Calcula qué campos obligatorios faltan o tienen formato inválido.
 * El reporte resultante NO contiene ningún valor ingresado por la persona.
 */
export function assessFacturadorCompleteness(
  input: FacturadorCompletenessInput,
  activeStepId?: string | null
): CompletenessReport<FacturadorFieldId> {
  const stepId =
    activeStepId && FACTURADOR_STEP_ID_SET.has(activeStepId) ? activeStepId : 'fact_comprobante';
  const issues: CompletenessIssue<FacturadorFieldId>[] = [];
  let totalRequired = 0;
  let completedRequired = 0;

  const recordCheck = (fieldId: FacturadorFieldId, state: 'ok' | 'missing' | 'invalid', occurrence?: number) => {
    totalRequired++;
    if (state === 'ok') {
      completedRequired++;
    } else {
      issues.push(occurrence !== undefined ? { fieldId, state, occurrence } : { fieldId, state });
    }
  };

  const empresa = input?.empresa;
  recordCheck(
    'emisor.razonSocial',
    typeof empresa?.razonSocial === 'string' && empresa.razonSocial.trim().length > 0 ? 'ok' : 'missing'
  );
  recordCheck('emisor.cuit', validateCuitState(empresa?.cuit));
  recordCheck(
    'emisor.condicionIva',
    typeof empresa?.condicionIva === 'string' && empresa.condicionIva.trim().length > 0 ? 'ok' : 'missing'
  );

  const draft = input?.draft;
  recordCheck(
    'comprobante.tipo',
    typeof draft?.tipo === 'string' && draft.tipo.trim().length > 0 ? 'ok' : 'missing'
  );
  recordCheck(
    'comprobante.numero',
    typeof draft?.numero === 'string' && draft.numero.trim().length > 0 ? 'ok' : 'missing'
  );

  const cliente = draft?.cliente;
  recordCheck(
    'cliente.nombre',
    typeof cliente?.nombre === 'string' && cliente.nombre.trim().length > 0 ? 'ok' : 'missing'
  );
  // Si el cliente es consumidor final y no cargó CUIT, es válido; en otros casos el CUIT es obligatorio
  const clienteCuitState = validateCuitState(cliente?.cuit);
  const cuitOptional = cliente?.condicionIva === 'consumidor_final' && clienteCuitState === 'missing';
  recordCheck('cliente.cuit', cuitOptional ? 'ok' : clienteCuitState);

  const items = Array.isArray(draft?.items) ? draft!.items : [];
  if (items.length === 0) {
    recordCheck('items.lista', 'missing');
  } else {
    recordCheck('items.lista', 'ok');
    items.forEach((item, idx) => {
      const occ = idx + 1;
      recordCheck(
        'items.descripcion',
        typeof item?.descripcion === 'string' && item.descripcion.trim().length > 0 ? 'ok' : 'missing',
        occ
      );
      const priceValid = typeof item?.precioUnitario === 'number' && Number.isFinite(item.precioUnitario) && item.precioUnitario > 0;
      recordCheck(
        'items.precioUnitario',
        item?.precioUnitario === undefined || item?.precioUnitario === null ? 'missing' : priceValid ? 'ok' : 'invalid',
        occ
      );
    });
  }

  return {
    stepId,
    flowStepIds: [...FACTURADOR_FLOW_STEP_IDS],
    totalRequired,
    completedRequired,
    issues,
  };
}

export interface BuildFacturadorContextParams {
  activeStepId?: string | null;
  vaultLocked: boolean;
  report?: CompletenessReport<FacturadorFieldId> | null;
}

/**
 * Construye el payload `metadata-only` para Lidio.
 * Por firma de tipos, JAMÁS recibe `draft`, `empresa` ni `cliente`: solo el reporte de completitud.
 */
export function buildFacturadorMetadataOnlyContext(
  params: BuildFacturadorContextParams
): MetadataOnlyContext<FacturadorFieldId> {
  const stepId =
    params.activeStepId && FACTURADOR_STEP_ID_SET.has(params.activeStepId)
      ? params.activeStepId
      : 'fact_comprobante';

  if (params.vaultLocked || !params.report) {
    return {
      mode: 'metadata-only',
      docType: 'invoice',
      stepId,
      flowStepIds: [...FACTURADOR_FLOW_STEP_IDS],
      vaultLocked: Boolean(params.vaultLocked),
      totalRequired: 0,
      completedRequired: 0,
      issues: [],
    };
  }

  // Filtrar estrictamente contra el catálogo cerrado (defensa adicional)
  const safeIssues: CompletenessIssue<FacturadorFieldId>[] = params.report.issues
    .filter((issue) => FACTURADOR_ALLOWED_FIELD_IDS.has(issue.fieldId))
    .map((issue) => ({
      fieldId: issue.fieldId,
      state: issue.state === 'invalid' ? 'invalid' : 'missing',
      ...(typeof issue.occurrence === 'number' && Number.isInteger(issue.occurrence) && issue.occurrence > 0
        ? { occurrence: issue.occurrence }
        : {}),
    }));

  return {
    mode: 'metadata-only',
    docType: 'invoice',
    stepId,
    flowStepIds: [...FACTURADOR_FLOW_STEP_IDS],
    vaultLocked: false,
    totalRequired: params.report.totalRequired,
    completedRequired: params.report.completedRequired,
    issues: safeIssues,
  };
}

/** Convierte un issue de completitud en una frase humana sin ningún valor del usuario. */
export function formatFacturadorCompletenessHint(issue: CompletenessIssue<FacturadorFieldId>): string {
  const entry = FACTURADOR_FIELD_BY_ID.get(issue.fieldId);
  const label = entry ? entry.label : issue.fieldId;
  const itemSuffix = issue.occurrence ? ` (ítem #${issue.occurrence})` : '';
  return issue.state === 'invalid'
    ? `Revisá ${label}${itemSuffix}: el formato no es válido.`
    : `Falta completar ${label}${itemSuffix}.`;
}
