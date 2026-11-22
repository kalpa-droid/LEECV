/**
 * Contratos puros de aplicación, manifiesto y registro en 3 niveles
 * (`Manifest` estático + `loadDomain` lazy + `loadStudio`/`loadPdf` lazy).
 */

import type { AssistantPolicyForStorage, CompletenessReport, FieldCatalogEntry } from './assistantContract';
import type { CloudBackupProjector, StoragePolicy } from './persistenceContract';
import type { ContactProfileProvider, PortId } from './ports/contactProfile';
import type { DocumentSessionApi } from './sessionContract';

export type CreationStrategy = 'blank' | 'variant' | 'vault';
export type ExportFormat = 'pdf' | 'docx' | 'xlsx' | 'json' | 'zip';

export interface CapabilityConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: 'styling' | 'content' | 'attachments' | 'branding' | 'utility';
  readonly defaultData: any;
}

export interface StepDescriptor {
  readonly id: string;
  readonly label: string;
  readonly iconId: string;
  readonly stepNumber: number;
  readonly optional?: boolean;
}

export interface DocumentTypePortsSpec {
  readonly provides?: readonly PortId[];
  readonly consumes?: readonly PortId[];
}

export interface DocumentTypeSeoSpec {
  readonly title: string;
  readonly description: string;
  readonly prerender: boolean;
}

export type MenuBadgeTone = 'purple' | 'secondary' | 'warning' | 'accent' | 'green' | 'success';

export interface DocumentTypeUiSpec {
  readonly productIconId: string;
  readonly menuTitle: string;
  readonly menuSubtitle: string;
  readonly menuBadgeTone: MenuBadgeTone;
}

export interface DocumentTypeFileFormatSpec {
  readonly extension: `.${string}`;
  readonly legacyExtensions?: readonly `.${string}`[];
  readonly label: string;
  readonly mimeType: string;
  readonly pwaFileHandler?: boolean;
}

export interface DocumentTypeManifest<
  TId extends string = string,
  S extends StoragePolicy = StoragePolicy,
> {
  readonly id: TId;
  readonly capsuleId: string;
  readonly name: string;
  readonly description: string;
  readonly iconName: string;
  readonly ui: DocumentTypeUiSpec;
  readonly fileFormat?: DocumentTypeFileFormatSpec;
  readonly route: `/${string}`;
  /** Ruta efectiva de navegación si el tipo vive integrado en otra ruta (ej. cover_letter -> /crear-cv). */
  readonly studioRoute?: `/${string}`;
  readonly defaultTitle: string;
  readonly titlePrefix: string;
  readonly draftIdPrefix: string;
  readonly storage: S;
  readonly assistant: AssistantPolicyForStorage<S>;
  readonly creationStrategy: CreationStrategy;
  readonly capabilities: readonly string[];
  readonly exportFormats: readonly ExportFormat[];
  readonly stepSequenceId: string;
  readonly defaultPaperSize?: string;
  readonly defaultActivePresetId?: string;
  /** Aliases legados aceptados al inferir tipo desde documentos antiguos. */
  readonly legacyAliases?: readonly string[];
  /** Prefijos de ID históricos aceptados al inferir tipo. */
  readonly idPrefixes?: readonly string[];
  /** Prefijos o IDs de preset aceptados al inferir tipo. */
  readonly presetPrefixes?: readonly string[];
  /** Propiedad booleana heredada aceptada al inferir tipo (p. ej. `bookMode`). */
  readonly legacyBooleanFlag?: string;
  readonly ports?: DocumentTypePortsSpec;
  readonly seo?: DocumentTypeSeoSpec;
}

export interface AppManifest {
  readonly capsuleId: string;
  readonly documentTypes: readonly DocumentTypeManifest[];
}

export interface AppDomainModule<TData = unknown, TFieldId extends string = string> {
  readonly schemaVersion: number;
  readonly steps: readonly StepDescriptor[];
  readonly fields: readonly FieldCatalogEntry<TFieldId>[];
  readonly createInitialData: (options?: Record<string, unknown>) => TData;
  readonly sanitize: (raw: unknown) => TData | null;
  readonly migrate: (raw: unknown, fromVersion: number) => TData;
  readonly extractDisplayName: (data: TData) => string;
  readonly assessCompleteness: (data: TData, activeStepId: string) => CompletenessReport<TFieldId>;
  readonly summarizeForAssistant?: (data: TData) => Readonly<Record<string, unknown>>;
  readonly cloudProjector?: CloudBackupProjector<TData>;
  readonly contactProfileProvider?: ContactProfileProvider<TData>;
}

export interface AppStudioSlots<TData = unknown> {
  readonly headerActions?: (props: { session: DocumentSessionApi<TData> }) => unknown;
  readonly previewToolbar?: (props: { session: DocumentSessionApi<TData> }) => unknown;
  readonly sidebarFooter?: (props: { session: DocumentSessionApi<TData> }) => unknown;
}

export interface AppStudioModule<TData = unknown> {
  readonly renderStepPanel: (stepId: string, session: DocumentSessionApi<TData>) => unknown;
  readonly slots?: AppStudioSlots<TData>;
  readonly renderCustomPreview?: (session: DocumentSessionApi<TData>) => unknown;
}

export interface AppPdfModule<TData = unknown> {
  readonly presets: readonly unknown[];
  readonly adaptToPdfModel: (data: TData, options?: Record<string, unknown>) => unknown;
  readonly DocumentComponent: unknown;
  readonly extraExporters?: Partial<Record<ExportFormat, (data: TData) => Promise<Blob>>>;
}

export interface AppRegistration<TId extends string = string, TData = unknown> {
  readonly manifest: AppManifest;
  readonly loadDomain: () => Promise<Record<TId, AppDomainModule<TData>>>;
  readonly loadStudio: () => Promise<Record<TId, AppStudioModule<TData>>>;
  readonly loadPdf: () => Promise<Record<TId, AppPdfModule<TData>>>;
}
