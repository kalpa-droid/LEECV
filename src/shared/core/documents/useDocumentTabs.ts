import { useState, useEffect, useRef } from 'react';
import {
  getOpenTabs,
  updateTabTitle,
  purgeGhostTabs,
  TABS_CHANGED_EVENT,
  OpenTab as OpenTabItem
} from './tabStore';
import { computeAutoDocumentTitle, getDraftIdForDocType } from './documentEngine';
import { ensureDocumentTab, switchToTab, CurrentDocumentState } from './workspaceController';
import { getDocTypeForRoute, inferDocumentTypeId } from '../capabilities/capabilityRegistry';

export interface UseDocumentTabsParams {
  cvData: any;
  isSwitchingDocument: boolean;
  currentRoute?: string;
  hasPendingChanges?: boolean;
  setCvData?: (data: any) => void;
  setIsSwitchingDocument?: (switching: boolean) => void;
}

export function useDocumentTabs({
  cvData,
  isSwitchingDocument,
  currentRoute,
  hasPendingChanges = false,
  setCvData,
  setIsSwitchingDocument
}: UseDocumentTabsParams) {
  const [tabs, setTabs] = useState<OpenTabItem[]>(() => getOpenTabs());
  const activeCvId = cvData?.id || '';
  const didRegisterInitialTabRef = useRef(false);

  // Purga inicial de pestañas fantasma al montar la aplicación
  useEffect(() => {
    const validIds = cvData?.id ? [cvData.id] : [];
    purgeGhostTabs(validIds);
    setTabs(getOpenTabs());
  }, []);

  // Registro de la pestaña del documento inicial (UNA sola vez al montar)
  useEffect(() => {
    if (didRegisterInitialTabRef.current || !activeCvId) return;
    didRegisterInitialTabRef.current = true;
    const docType = inferDocumentTypeId(cvData);
    setTabs(ensureDocumentTab(activeCvId, docType as any, cvData));
  }, [activeCvId, cvData]);

  // Renombrado derivado del motor de títulos: actualiza únicamente pestañas existentes
  useEffect(() => {
    if (isSwitchingDocument || !activeCvId) return;
    const docType = inferDocumentTypeId(cvData);
    if (docType === 'book') return; // El libro tiene título congelado por capability
    const title = computeAutoDocumentTitle(docType as any, cvData);
    const updated = updateTabTitle(activeCvId, title, cvData?.version_label);
    setTabs(updated);
  }, [
    activeCvId,
    cvData?.title,
    cvData?.version_label,
    cvData?.personalInfo?.fullName,
    cvData?.jobTarget?.jobTitle,
    isSwitchingDocument
  ]);

  // Sincronización a través del bus de eventos global de pestañas
  useEffect(() => {
    const syncTabsFromEngine = () => setTabs(getOpenTabs());
    if (typeof window !== 'undefined') {
      window.addEventListener(TABS_CHANGED_EVENT, syncTabsFromEngine);
      return () => window.removeEventListener(TABS_CHANGED_EVENT, syncTabsFromEngine);
    }
  }, []);



  return {
    tabs,
    setTabs,
    activeCvId
  };
}
