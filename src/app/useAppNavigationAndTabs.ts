import { useCallback, useEffect, useRef } from 'react';
import { getOpenTabs, OpenTab as OpenTabItem } from '../shared/core/documents/tabStore';
import * as workspaceController from '../shared/core/documents/workspaceController';
import {
  getDocTypeForRoute,
  getDocumentTypeConfig,
  getRouteForDocType,
  inferDocumentTypeId,
} from '../shared/core/capabilities/capabilityRegistry';
import {
  clearPendingDocumentToOpen,
  getPendingDocumentToOpen,
  setPendingDocumentToOpen,
} from '../shared/core/storage/pendingDocumentHandoff';
import { runWithSafeSave } from '../shared/core/storage/safeNavigationEngine';
import { useConfirm } from '../shared/core/ui/ConfirmDialog';
import { useToast } from '../shared/core/ui/Toast';
import type { DocumentTypeId } from '../types/document';
import { findStandaloneStudioByRoute, getAppRuntimeEntry } from './appRegistry';

interface UseAppNavigationAndTabsArgs {
  currentRoute?: string;
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
  saveCV: () => Promise<any>;
  hasPendingChanges: boolean;
  isSwitchingDocument: boolean;
  setIsSwitchingDocument: (v: boolean) => void;
  tabs: OpenTabItem[];
  setTabs: React.Dispatch<React.SetStateAction<OpenTabItem[]>>;
  activeCvId: string;
  createBlankDocumentWithTab: (presetId?: string) => { id: string; docType: DocumentTypeId } | null;
  navigateToRoute: (targetRoute: string) => void;
}

export function useAppNavigationAndTabs({
  currentRoute,
  cvData,
  setCvData,
  saveCV,
  hasPendingChanges,
  isSwitchingDocument,
  setIsSwitchingDocument,
  tabs,
  setTabs,
  activeCvId,
  createBlankDocumentWithTab,
  navigateToRoute,
}: UseAppNavigationAndTabsArgs) {
  const { showSuccess, showError } = useToast();
  const { confirm } = useConfirm();

  const handleSwitchDocumentTab = useCallback(
    async (
      targetCvId: string,
      targetDocType: string = 'cv',
      opts: { skipSaveCurrent?: boolean } = {},
    ) => {
      const targetEntry = getAppRuntimeEntry(targetDocType);
      if (targetEntry.managesOwnStore) {
        setTabs(getOpenTabs());
        if (currentRoute !== targetEntry.effectiveRoute) {
          navigateToRoute(targetEntry.effectiveRoute);
        }
        return;
      }
      if (!targetCvId || targetCvId === cvData?.id || isSwitchingDocument) return;

      setIsSwitchingDocument(true);
      try {
        const currentDocState: workspaceController.CurrentDocumentState | null = cvData
          ? {
              id: cvData.id,
              docType: inferDocumentTypeId(cvData),
              data: cvData,
              isDirty: hasPendingChanges,
            }
          : null;

        const success = await workspaceController.switchToTab(
          targetCvId,
          currentDocState,
          setCvData,
          { saveCurrentIfDirty: !opts.skipSaveCurrent, targetDocType },
        );
        if (success) {
          setTabs(getOpenTabs());
          showSuccess('Pestaña conmutada exitosamente.');
        } else {
          showError('No se pudo cargar el documento de la pestaña seleccionada.');
        }
      } catch (err) {
        console.error('Error al conmutar pestaña de documento:', err);
        showError('Error al abrir la pestaña de documento.');
      } finally {
        setIsSwitchingDocument(false);
      }
    },
    [
      currentRoute,
      cvData,
      hasPendingChanges,
      isSwitchingDocument,
      navigateToRoute,
      setCvData,
      setIsSwitchingDocument,
      setTabs,
      showError,
      showSuccess,
    ],
  );

  const handleNavigateToDocumentTab = useCallback(
    async (targetDocType: DocumentTypeId, targetId: string) => {
      const existingTab = tabs.find((t) => t.docType === targetDocType);
      const finalTargetId = existingTab ? existingTab.cvId || existingTab.id : targetId;
      await runWithSafeSave(saveCV, async () => {
        setPendingDocumentToOpen(finalTargetId, targetDocType);
        navigateToRoute(getRouteForDocType(targetDocType));
      });
    },
    [navigateToRoute, saveCV, tabs],
  );

  const lastCreatedTabIdRef = useRef<string | null>(null);
  useEffect(() => {
    const standalone = findStandaloneStudioByRoute(currentRoute);
    if (!standalone?.autoCreateBlankTabOnRouteEnter) return;
    const hasTab = tabs.some(
      (t) =>
        t.docType === standalone.id ||
        inferDocumentTypeId(t) === standalone.id ||
        t.id === lastCreatedTabIdRef.current,
    );
    if (!hasTab) {
      const created = createBlankDocumentWithTab(
        getDocumentTypeConfig(standalone.id).defaultActivePresetId,
      );
      if (created?.id) lastCreatedTabIdRef.current = created.id;
    }
  }, [currentRoute, tabs, createBlankDocumentWithTab]);

  const prevRouteRef = useRef<string | undefined>(currentRoute);
  useEffect(() => {
    if (
      !currentRoute ||
      currentRoute === '/' ||
      currentRoute === '/blog' ||
      currentRoute === '/dashboard'
    ) {
      prevRouteRef.current = currentRoute;
      return;
    }
    const routeChanged = prevRouteRef.current !== currentRoute;
    prevRouteRef.current = currentRoute;
    if (!routeChanged) return;

    const targetDocType = getDocTypeForRoute(currentRoute);
    if (getAppRuntimeEntry(targetDocType).managesOwnStore) return;

    const pending = getPendingDocumentToOpen();
    if (pending && pending.docType === targetDocType) {
      clearPendingDocumentToOpen();
      void handleSwitchDocumentTab(pending.id, pending.docType);
      return;
    }

    const currentDocType = cvData ? inferDocumentTypeId(cvData) : null;
    if (currentDocType && currentDocType !== targetDocType) {
      const existingTab =
        tabs.find((t) => t.docType === targetDocType) ||
        getOpenTabs().find((t) => t.docType === targetDocType);
      if (existingTab) {
        void handleSwitchDocumentTab(existingTab.cvId || existingTab.id, targetDocType, {
          skipSaveCurrent: false,
        });
      } else {
        createBlankDocumentWithTab(getDocumentTypeConfig(targetDocType).defaultActivePresetId);
      }
    }
  }, [currentRoute, cvData, tabs, createBlankDocumentWithTab, handleSwitchDocumentTab]);

  const goToLandingPage = useCallback(() => navigateToRoute('/'), [navigateToRoute]);

  const handleCloseFooterTab = useCallback(
    (e: React.MouseEvent, cvId: string, title: string) => {
      e.stopPropagation();
      confirm({
        title: '¿Cerrar pestaña?',
        message: `¿Deseas cerrar "${title}"? Tus datos guardados se mantendrán a salvo en tus archivos.`,
        confirmText: 'Cerrar Pestaña',
        onConfirm: async () => {
          setIsSwitchingDocument(true);
          try {
            const currentDocState: workspaceController.CurrentDocumentState | null = cvData
              ? {
                  id: cvData.id,
                  docType: inferDocumentTypeId(cvData),
                  data: cvData,
                  isDirty: hasPendingChanges,
                }
              : null;
            await workspaceController.closeTab(
              cvId,
              currentDocState,
              setCvData,
              goToLandingPage,
              activeCvId,
            );
            setTabs(getOpenTabs());
          } finally {
            setIsSwitchingDocument(false);
          }
        },
      });
    },
    [
      activeCvId,
      confirm,
      cvData,
      goToLandingPage,
      hasPendingChanges,
      setCvData,
      setIsSwitchingDocument,
      setTabs,
    ],
  );

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (cvData && hasPendingChanges) {
        e.preventDefault();
        e.returnValue =
          '¿Deseas salir de la página? Asegúrate de que tus datos estén guardados.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cvData, hasPendingChanges]);

  return {
    handleSwitchDocumentTab,
    handleNavigateToDocumentTab,
    goToLandingPage,
    handleCloseFooterTab,
  };
}
