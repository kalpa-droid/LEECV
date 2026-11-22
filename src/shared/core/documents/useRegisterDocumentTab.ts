import { useEffect, useRef } from 'react';
import {
  OpenTab,
  getOpenTabs,
  openTab,
  setActiveTabId,
  updateTabTitle,
} from './tabStore';
import {
  getDefaultTitleForDocType,
  matchesAnotherDocumentTypeId,
  matchesDocumentTypeId,
} from '../capabilities/capabilityRegistry';
import { getPendingDocumentToOpen, clearPendingDocumentToOpen } from '../storage/pendingDocumentHandoff';
import { generateDocumentId } from './documentEngine/titleEngine';
import { DocumentTypeId } from '../../../types/document';

interface UseRegisterDocumentTabOptions {
  id: string;
  docType: DocumentTypeId;
  title: string;
  documentTabs?: OpenTab[];
  onTabsChanged?: (tabs: OpenTab[]) => void;
}

/**
 * Resuelve el ID inicial de un documento al montar o actualizar un Studio standalone,
 * priorizando la intención pendiente de navegación (pendingDocumentToOpen),
 * luego el activeTabId recibido SÓLO si pertenece estrictamente al mismo tipo (jamás adopta IDs de CV),
 * o generando un ID propio nuevo.
 */
export function resolveDocumentIdWithHandoff(
  activeTabId: string | undefined,
  docType: DocumentTypeId,
): string {
  const pending = getPendingDocumentToOpen();
  if (
    pending &&
    pending.docType === docType &&
    pending.id &&
    !matchesAnotherDocumentTypeId(pending.id, docType)
  ) {
    return pending.id;
  }
  if (activeTabId && matchesDocumentTypeId(activeTabId, docType)) {
    return activeTabId;
  }
  return generateDocumentId(docType);
}

/**
 * Hook unificado para registrar, activar y mantener actualizado el título de la pestaña
 * de una app standalone sin depender de la lista completa de pestañas ni resucitar pestañas cerradas.
 */
export function useRegisterDocumentTab({
  id,
  docType,
  title,
  onTabsChanged,
}: UseRegisterDocumentTabOptions): void {
  const registeredIdRef = useRef<string | null>(null);
  const onTabsChangedRef = useRef(onTabsChanged);
  onTabsChangedRef.current = onTabsChanged;

  useEffect(() => {
    const safeId =
      id && !matchesAnotherDocumentTypeId(id, docType)
        ? id
        : generateDocumentId(docType);
    const safeTitle = (title || '').trim() || getDefaultTitleForDocType(docType);
    const liveTabs = getOpenTabs();

    if (registeredIdRef.current !== safeId) {
      const existing = liveTabs.find((t) => t.id === safeId || t.cvId === safeId);
      if (existing && existing.docType === docType) {
        registeredIdRef.current = safeId;
        setActiveTabId(safeId);
        if (existing.title !== safeTitle) {
          const updated = updateTabTitle(safeId, safeTitle);
          onTabsChangedRef.current?.(updated);
        }
      } else {
        const targetId =
          existing && existing.docType !== docType ? generateDocumentId(docType) : safeId;
        registeredIdRef.current = targetId;
        const updatedTabs = openTab(targetId, docType, safeTitle);
        setActiveTabId(targetId);
        onTabsChangedRef.current?.(updatedTabs);
      }

      const pending = getPendingDocumentToOpen();
      if (pending && pending.docType === docType && pending.id === registeredIdRef.current) {
        clearPendingDocumentToOpen();
      }
      return;
    }

    const existing = liveTabs.find((t) => t.id === safeId || t.cvId === safeId);
    if (existing && existing.docType === docType && existing.title !== safeTitle) {
      const updated = updateTabTitle(safeId, safeTitle);
      onTabsChangedRef.current?.(updated);
    }
  }, [id, docType, title]);
}
