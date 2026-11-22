/**
 * Contratos puros del Asistente Lidio y detección de completitud sin fuga de datos.
 *
 * Garantía a nivel de tipos:
 * - Si un documento usa `storage.kind === 'local-encrypted'` (FacturLee),
 *   `AssistantPolicyForStorage` prohíbe `'full-summary'` en tiempo de compilación.
 * - `MetadataOnlyContext<F>` solo acepta `fieldId: F` de un catálogo estático de
 *   identificadores de campo y un estado cerrado (`'missing' | 'invalid'`).
 *   Nunca acepta valores ni texto libre introducido por el usuario.
 */

import type { StoragePolicy } from './persistenceContract';

export type AssistantPrivacyPolicy = 'full-summary' | 'metadata-only' | 'disabled';

export type AssistantPolicyForStorage<S extends StoragePolicy = StoragePolicy> =
  S extends { readonly kind: 'local-encrypted' }
    ? {
        readonly knowledgeId: string;
        readonly privacy: 'metadata-only' | 'disabled';
      }
    : {
        readonly knowledgeId: string;
        readonly privacy: AssistantPrivacyPolicy;
      };

export type FieldCompletenessState = 'missing' | 'invalid';

export interface FieldCatalogEntry<F extends string = string> {
  readonly id: F;
  readonly label: string;
  readonly stepId: string;
  readonly required: boolean;
}

export interface CompletenessIssue<F extends string = string> {
  readonly fieldId: F;
  readonly state: FieldCompletenessState;
  readonly occurrence?: number;
}

export interface CompletenessReport<F extends string = string> {
  readonly stepId: string;
  readonly flowStepIds: readonly string[];
  readonly totalRequired: number;
  readonly completedRequired: number;
  readonly issues: readonly CompletenessIssue<F>[];
}

export interface MetadataOnlyContext<F extends string = string> {
  readonly mode: 'metadata-only';
  readonly docType: string;
  readonly stepId: string;
  readonly flowStepIds: readonly string[];
  readonly vaultLocked?: boolean;
  readonly totalRequired: number;
  readonly completedRequired: number;
  readonly issues: readonly CompletenessIssue<F>[];
}

export interface FullSummaryContext<F extends string = string> {
  readonly mode: 'full-summary';
  readonly docType: string;
  readonly stepId: string;
  readonly flowStepIds: readonly string[];
  readonly completeness: CompletenessReport<F>;
  readonly summary: Readonly<Record<string, unknown>>;
}

export type AssistantContextPayload<F extends string = string> =
  | MetadataOnlyContext<F>
  | FullSummaryContext<F>;
