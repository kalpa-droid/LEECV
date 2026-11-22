import { useCallback } from 'react';
import { computeAutoDocumentTitle } from '../shared/core/documents/documentEngine';
import { createApplicationVariant, buildApplicationVariantData } from '../shared/core/documents/applicationVariant';
import * as workspaceController from '../shared/core/documents/workspaceController';
import { getOpenTabs, openTab as addOpenTab, OpenTab as OpenTabItem } from '../shared/core/documents/tabStore';
import {
  getDocumentTypeConfig,
  hasCapability,
  inferDocumentTypeId,
} from '../shared/core/capabilities/capabilityRegistry';
import { runWithSafeSave } from '../shared/core/storage/safeNavigationEngine';
import { setPendingDocumentToOpen } from '../shared/core/storage/pendingDocumentHandoff';
import { useConfirm } from '../shared/core/ui/ConfirmDialog';
import { useToast } from '../shared/core/ui/Toast';
import type { DocumentTypeId } from '../types/document';
import { getAppRuntimeEntry } from './appRegistry';

export interface CreateApplicationVariantOptions {
  puesto?: string;
  empresa?: string;
  versionLabel?: string;
  keepJobTarget?: boolean;
  resetLetterBody?: boolean;
  goTo?: 'carta' | 'vacante' | 'keep';
  successMessage?: string;
  sourceCvData?: any;
}

interface UseDocumentCreationArgs {
  cvData: any;
  currentRoute?: string;
  resetToBlankCV: (options?: { activePresetId?: string }) => any;
  saveCV: () => Promise<any>;
  saveCVAs: (versionLabel?: string, documentOverrides?: any) => Promise<any>;
  setTabs: React.Dispatch<React.SetStateAction<OpenTabItem[]>>;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  navigateToRoute: (targetRoute: string) => void;
}

export function useDocumentCreation({
  cvData,
  currentRoute,
  resetToBlankCV,
  saveCV,
  saveCVAs,
  setTabs,
  setActiveTab,
  navigateToRoute,
}: UseDocumentCreationArgs) {
  const { confirm } = useConfirm();
  const { showSuccess, showError } = useToast();

  const createBlankDocumentWithTab = useCallback(
    (presetId?: string) => {
      const blank = resetToBlankCV(presetId ? { activePresetId: presetId } : undefined) as any;
      const newId = blank?.id;
      if (newId) {
        const docType = inferDocumentTypeId(blank);
        addOpenTab(newId, docType as any, computeAutoDocumentTitle(docType as any, blank));
        setTabs(getOpenTabs());
        return { id: newId, docType };
      }
      return null;
    },
    [resetToBlankCV, setTabs],
  );

  const createApplicationVariantFor = useCallback(
    async (options: CreateApplicationVariantOptions = {}) => {
      const source = options.sourceCvData || cvData;
      if (!source) return null;
      const sourceType = inferDocumentTypeId(source) || 'cv';
      const built = buildApplicationVariantData(source, options);
      const hasJobTarget = Boolean(
        built.jobTarget?.jobTitle || built.jobTarget?.companyName || built.jobTarget?.jobDescription,
      );
      const result = await createApplicationVariant(
        { ...options, cvData: source, docType: sourceType },
        {
          saveAs: (data, label) => saveCVAs(label, data),
          ensureTab: (id, docType, data) => workspaceController.ensureDocumentTab(id, docType, data),
        },
      );
      if (!result.success) {
        showError('No se pudo crear la postulación. El CV de origen se conservó sin cambios.');
        return null;
      }
      setTabs(getOpenTabs());
      if (hasCapability(sourceType, 'experience')) {
        if (currentRoute !== '/crear-cv' && currentRoute !== '/') {
          navigateToRoute('/crear-cv');
        }
        if (options.goTo !== 'keep') {
          setActiveTab(options.goTo ?? (hasJobTarget ? 'carta' : 'vacante'));
        }
      }
      showSuccess(
        options.successMessage ??
          'Postulación creada. Completá la vacante y redactá la carta dentro de esta versión.',
      );
      return result;
    },
    [cvData, currentRoute, navigateToRoute, saveCVAs, setActiveTab, setTabs, showError, showSuccess],
  );

  const handleGenerateCoverLetterFromCV = useCallback(
    async (sourceCvData?: any) => {
      const fromSaved = Boolean(sourceCvData) && sourceCvData.id !== cvData?.id;
      await createApplicationVariantFor({
        ...(fromSaved ? { sourceCvData } : {}),
        keepJobTarget: true,
      });
    },
    [createApplicationVariantFor, cvData?.id],
  );

  const handleNewDocument = useCallback(
    async (docType: DocumentTypeId) => {
      const cfg = getDocumentTypeConfig(docType);
      const entry = getAppRuntimeEntry(docType);
      const copy = entry.newDocumentCopy;

      if (cfg.creationStrategy === 'variant') {
        confirm({
          title: copy.confirmTitle || '¿Crear una nueva postulación?',
          message: copy.confirmMessage || '',
          confirmText: copy.confirmText || 'Crear postulación',
          variant: copy.confirmVariant || 'info',
          onConfirm: async () => {
            await createApplicationVariantFor({});
          },
        });
        return;
      }

      if (entry.managesOwnStore) {
        if (currentRoute !== entry.effectiveRoute) {
          navigateToRoute(entry.effectiveRoute);
        }
        showSuccess(copy.successToast);
        return;
      }

      confirm({
        title: copy.confirmTitle || `¿Iniciar nuevo ${cfg.name}?`,
        message: copy.confirmMessage || '',
        confirmText: copy.confirmText || 'Sí, crear nuevo',
        ...(copy.confirmVariant ? { variant: copy.confirmVariant } : {}),
        onConfirm: async () => {
          await runWithSafeSave(saveCV, () => {
            const created = createBlankDocumentWithTab(cfg.defaultActivePresetId);
            setActiveTab(entry.initialTabId);
            if (created) setPendingDocumentToOpen(created.id, created.docType);
            if (currentRoute !== entry.effectiveRoute && currentRoute !== '/') {
              navigateToRoute(entry.effectiveRoute);
            }
            showSuccess(copy.successToast);
          });
        },
      });
    },
    [
      confirm,
      createApplicationVariantFor,
      createBlankDocumentWithTab,
      currentRoute,
      navigateToRoute,
      saveCV,
      setActiveTab,
      showSuccess,
    ],
  );

  return {
    createBlankDocumentWithTab,
    createApplicationVariantFor,
    handleGenerateCoverLetterFromCV,
    handleNewDocument,
  };
}
