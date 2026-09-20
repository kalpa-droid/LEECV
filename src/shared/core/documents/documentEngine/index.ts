export * as titleEngine from './titleEngine';
export { persistenceEngine } from './persistenceEngine';
export { capabilitiesGate } from './capabilitiesGate';
export * as handoffEngine from './handoffEngine';
export { syncEngine } from './syncEngine';
export { lifecycleEngine } from './lifecycleEngine';
export * from './documentHelpers';

// Re-export specific pieces for convenience
export { generateDocumentId, deriveDocumentTitle, deriveDocumentTitle as computeAutoDocumentTitle } from './titleEngine';
export { getPendingDocumentToOpen, setPendingDocumentToOpen, clearPendingDocumentToOpen } from './handoffEngine';
export { useDraftAutosave } from './useDraftAutosave';
export { useRegisterDocumentTab, resolveDocumentIdWithHandoff } from './useRegisterDocumentTab';
