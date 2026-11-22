import { useState, useEffect, useRef } from 'react';
import {
  getOpenTabs,
  updateTabTitle,
  purgeGhostTabs,
  TABS_CHANGED_EVENT,
  OpenTab as OpenTabItem
} from './tabStore';
import { computeAutoDocumentTitle } from './documentEngine';
import { ensureDocumentTab } from './workspaceController';
import { inferDocumentTypeId, matchesAnotherDocumentTypeId } from '../capabilities/capabilityRegistry';

export interface UseDocumentTabsParams {
  cvData: any;
  isSwitchingDocument: boolean;
  currentRoute?: string;
  isSharedCvWorkspaceRoute?: boolean;
  hasPendingChanges?: boolean;
  setCvData?: (data: any) => void;
  setIsSwitchingDocument?: (switching: boolean) => void;
}

export function useDocumentTabs({
  cvData,
  isSwitchingDocument,
  isSharedCvWorkspaceRoute = true,
}: UseDocumentTabsParams) {
  const [tabs, setTabs] = useState<OpenTabItem[]>(() => getOpenTabs());
  const activeCvId = cvData?.id || '';
  const didRegisterInitialTabRef = useRef(false);

  // Purga inicial de pestañas fantasma al montar la aplicación, preservando pestañas standalone activas
  useEffect(() => {
    const standaloneTabIds = getOpenTabs()
      .filter((t) => matchesAnotherDocumentTypeId(t.id, 'cv'))
      .map((t) => t.id);
    const validIds = [...(cvData?.id ? [cvData.id] : []), ...standaloneTabIds];
    purgeGhostTabs(validIds);
    setTabs(getOpenTabs());
  }, []);

  // Registro de la pestaña del documento inicial del espacio compartido CV (nunca al entrar directo a una app standalone)
  useEffect(() => {
    if (!isSharedCvWorkspaceRoute || didRegisterInitialTabRef.current || !activeCvId) return;
    didRegisterInitialTabRef.current = true;
    const docType = inferDocumentTypeId(cvData);
    setTabs(ensureDocumentTab(activeCvId, docType as any, cvData));
  }, [activeCvId, cvData, isSharedCvWorkspaceRoute]);

  // Renombrado derivado del motor de títulos: actualiza únicamente cuando el espacio compartido CV está activo
  useEffect(() => {
    if (!isSharedCvWorkspaceRoute || isSwitchingDocument || !activeCvId) return;
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
    isSwitchingDocument,
    isSharedCvWorkspaceRoute
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
