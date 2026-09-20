import { useEffect } from 'react';
import { OpenTab, openTab } from './tabStore';
import { inferDocumentTypeId } from '../capabilities/capabilityRegistry';
import { getPendingDocumentToOpen, clearPendingDocumentToOpen } from '../storage/pendingDocumentHandoff';
import { generateDocumentId } from './documentEngine/titleEngine';
import { DocumentTypeId } from '../../../types/document';

interface UseRegisterDocumentTabOptions {
  id: string;
  docType: DocumentTypeId;
  title: string;
  documentTabs: OpenTab[];
  onTabsChanged?: (tabs: OpenTab[]) => void;
}

/**
 * Resuelve el ID inicial de un documento al montar un Studio (Book/Planner),
 * priorizando la intención pendiente de navegación (pendingDocumentToOpen),
 * luego el activeTabId recibido si coincide con el tipo, o generando uno nuevo.
 */
export function resolveDocumentIdWithHandoff(
  activeTabId: string | undefined,
  docType: DocumentTypeId
): string {
  const pending = getPendingDocumentToOpen();
  if (pending && pending.docType === docType) {
    clearPendingDocumentToOpen();
    return pending.id;
  }
  if (activeTabId && (inferDocumentTypeId({ id: activeTabId, docType }) === docType || activeTabId.startsWith(`doc_${docType}_`))) {
    return activeTabId;
  }
  return generateDocumentId(docType);
}

/**
 * Hook unificado para registrar la pestaña de un documento al montar el Studio.
 * Evita duplicación verificando contra documentTabs y llama a onTabsChanged si se crea.
 */
export function useRegisterDocumentTab({
  id,
  docType,
  title,
  documentTabs,
  onTabsChanged
}: UseRegisterDocumentTabOptions): void {
  useEffect(() => {
    const currentId = id || generateDocumentId(docType);
    const alreadyExists = documentTabs?.some(
      t => t.id === currentId || t.cvId === currentId || inferDocumentTypeId(t) === docType
    );
    if (alreadyExists) return;

    const updatedTabs = openTab(currentId, docType, title);
    if (onTabsChanged) onTabsChanged(updatedTabs);
  }, [id, docType, title, documentTabs, onTabsChanged]);
}
