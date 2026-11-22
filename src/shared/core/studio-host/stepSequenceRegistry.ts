import type React from 'react';
import type { DocumentTypeId } from '../../../types/document';

export type DockTabVariant = 'default' | 'accent' | 'secondary' | 'success' | 'custom';

export interface DockTabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconId?: string;
  stepNumber?: number;
  /** Botón de doble ancho/alto (col-span-2 desktop, row-span-2 móvil). */
  isLarge?: boolean;
  /** Variante visual semántica dentro del Dock. */
  variant?: DockTabVariant;
  hasContent?: boolean;
  isDisabled?: boolean;
  isCustom?: boolean;
}

export interface DockStepContext {
  cvData?: any;
  bookMode?: string;
}

export type DockStepProvider = (ctx: DockStepContext) => DockTabItem[];

const dockProviderRegistry = new Map<DocumentTypeId, DockStepProvider>();
const registeredStepIds = new Map<DocumentTypeId, readonly string[]>();

/**
 * Registra el proveedor declarativo de pasos del Dock para un DocumentTypeId.
 * Invocado desde el Composition Root (appRegistry) o desde cada cápsula vertical.
 */
export function registerDockStepProvider(
  docType: DocumentTypeId,
  provider: DockStepProvider,
): void {
  dockProviderRegistry.set(docType, provider);
}

export function hasDockStepProvider(docType: DocumentTypeId): boolean {
  return dockProviderRegistry.has(docType);
}

/**
 * Resuelve los botones del Dock para el tipo de documento activo sin `if`/`switch`
 * sobre `docType` dentro de los componentes del shell.
 */
export function getDockTabsForDocType(
  docType: DocumentTypeId,
  ctx: DockStepContext = {},
): DockTabItem[] {
  const provider = dockProviderRegistry.get(docType);
  if (!provider) return [];
  return provider(ctx);
}

/**
 * Registra los stepIds válidos para validación del asistente Lidio (D18) sin que
 * assistantTips.ts importe archivos privados de `*-engine`.
 */
export function registerStepIds(
  docType: DocumentTypeId,
  stepIds: readonly string[],
): void {
  registeredStepIds.set(docType, [...stepIds]);
}

export function getRegisteredStepIds(
  docType: DocumentTypeId,
): readonly string[] | undefined {
  return registeredStepIds.get(docType);
}
