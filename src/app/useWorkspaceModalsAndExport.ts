import { useCallback, useState } from 'react';
import { withErrorHandling } from '../shared/core/utils/errorHandler';
import { useExportEntitlement } from '../shared/core/entitlements/useExportEntitlement';
import { useToast } from '../shared/core/ui/Toast';
import type { OpenTab as OpenTabItem } from '../shared/core/documents/tabStore';
import type { AtsPreflightResult } from '../shared/core/pdf-engine/layers/ats/atsPreflightCheck';
import type { RegisteredDocumentTypeId } from '../shared/core/capabilities/capabilityRegistry';
import type { AppModalsProps } from './AppModals';
import type { CreateApplicationVariantOptions } from './useDocumentCreation';

interface UseWorkspaceModalsAndExportArgs {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
  activeDocType: RegisteredDocumentTypeId;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  isPanelOpen: boolean;
  setIsPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isSaving: boolean;
  hasPendingChanges: boolean;
  activeCvId: string;
  setTabs: React.Dispatch<React.SetStateAction<OpenTabItem[]>>;
  updateBannerVisible: boolean;
  setUpdateBannerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  handleSaveCVClick: () => void;
  createApplicationVariantFor: (opts?: CreateApplicationVariantOptions) => Promise<any>;
  handleGenerateCoverLetterFromCV: (sourceCvData?: any) => Promise<void>;
  goToLandingPage: () => void;
}

export function useWorkspaceModalsAndExport({
  cvData,
  setCvData,
  activeDocType,
  activeTab,
  setActiveTab,
  isPanelOpen,
  setIsPanelOpen,
  isSaving,
  hasPendingChanges,
  activeCvId,
  setTabs,
  updateBannerVisible,
  setUpdateBannerVisible,
  handleSaveCVClick,
  createApplicationVariantFor,
  handleGenerateCoverLetterFromCV,
  goToLandingPage,
}: UseWorkspaceModalsAndExportArgs) {
  const { showSuccess, showError } = useToast();
  const { consumeCreditIfNeeded } = useExportEntitlement(activeDocType);

  const [isPhotoCropperOpen, setIsPhotoCropperOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSavedCVsOpen, setIsSavedCVsOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
  const [initialSaveAsOpen, setInitialSaveAsOpen] = useState(false);
  const [isShareAppModalOpen, setIsShareAppModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPdfCheckoutOpen, setIsPdfCheckoutOpen] = useState(false);
  const [isCardExportOpen, setIsCardExportOpen] = useState(false);
  const [isCoverLetterExportOpen, setIsCoverLetterExportOpen] = useState(false);
  const [isAtsModalOpen, setIsAtsModalOpen] = useState(false);
  const [isAtsLivePanelOpen, setIsAtsLivePanelOpen] = useState(false);
  const [isRegionFormatModalOpen, setIsRegionFormatModalOpen] = useState(false);
  const [atsResult, setAtsResult] = useState<AtsPreflightResult | null>(null);
  const [atsLiveResult, setAtsLiveResult] = useState<AtsPreflightResult | null>(null);
  const [pdfCheckoutPurpose, setPdfCheckoutPurpose] = useState<'export' | 'publish'>('export');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPdfComplete, setIsPdfComplete] = useState(false);

  const handleStartPDFGeneration = useCallback(async () => {
    setIsGeneratingPDF(true);
    setIsPdfComplete(false);
    const result = await withErrorHandling(
      async () => {
        const [{ exportDocumentToPDF }, { resolveActivePreset }] = await Promise.all([
          import('../shared/core/pdf-engine/pdfExporter'),
          import('../shared/core/pdf-engine/layers/presets/presetRegistry'),
          import('../modules/cv-builder/pdf/CoverLetterPdfDocument'),
        ]);
        return exportDocumentToPDF(cvData, resolveActivePreset(cvData));
      },
      {
        context: 'Exportar PDF',
        errorMessage: 'Hubo un inconveniente al generar el PDF. Por favor verifica las imágenes o intenta nuevamente.',
        notify: (msg) => showError(msg),
      },
    );
    setIsGeneratingPDF(false);
    if (result.success && result.data) setIsPdfComplete(true);
  }, [cvData, showError]);

  const handleExportAtsPdf = async (omitSensitiveData: boolean = false) => {
    const allowed = await consumeCreditIfNeeded(activeDocType);
    if (!allowed) {
      setPdfCheckoutPurpose('export');
      setIsPdfCheckoutOpen(true);
      return;
    }
    setIsGeneratingPDF(true);
    setIsPdfComplete(false);
    const result = await withErrorHandling(
      async () => {
        const [{ exportDocumentToPDF }, { resolveActivePreset }] = await Promise.all([
          import('../shared/core/pdf-engine/pdfExporter'),
          import('../shared/core/pdf-engine/layers/presets/presetRegistry'),
        ]);
        const exportData = omitSensitiveData
          ? {
              ...cvData,
              hiddenFields: Array.from(
                new Set([...(cvData?.hiddenFields || []), 'dni', 'cuit', 'birthDate', 'estadoCivil', 'nacionalidad']),
              ),
            }
          : cvData;
        return exportDocumentToPDF(exportData, resolveActivePreset(exportData), true);
      },
      {
        context: 'Exportar PDF ATS',
        errorMessage: 'Hubo un inconveniente al generar el PDF ATS.',
        notify: (msg) => showError(msg),
      },
    );
    setIsGeneratingPDF(false);
    if (result.success && result.data) {
      setIsPdfComplete(true);
      showSuccess('Versión ATS de 1 columna generada exitosamente.');
    }
  };

  const proceedWithExport = async () => {
    const allowed = await consumeCreditIfNeeded(activeDocType);
    if (!allowed) {
      setPdfCheckoutPurpose('export');
      setIsPdfCheckoutOpen(true);
      return;
    }
    await handleStartPDFGeneration();
  };

  const handleSaveCVAsClick = async (versionLabel: string) => {
    try {
      const result = await createApplicationVariantFor({
        versionLabel,
        keepJobTarget: true,
        resetLetterBody: false,
        goTo: 'keep',
        successMessage: `¡Nueva versión guardada! 📌 Título: "${versionLabel}"`,
      });
      if (!result) showError('Hubo un inconveniente al crear la nueva versión.');
    } catch (err) {
      console.error(err);
      showError('Error al crear la nueva versión del documento.');
    }
  };

  const handleImportJsonFile = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    try {
      const { importCVFromJsonFile } = await import('../shared/core/utils/jsonImporterExporter');
      const importedData = await importCVFromJsonFile(file);
      if (importedData) {
        if (importedData.id === 'cv_ejemplo_estandar') importedData.id = `cv_${Date.now()}`;
        setCvData(importedData);
        showSuccess('¡Currículum cargado exitosamente desde tu archivo .JSON!');
      } else {
        showError('El archivo seleccionado no tiene un formato válido de LEECV.');
      }
    } catch (err: any) {
      console.error('Error importando JSON:', err);
      showError(err?.message || 'Error al procesar el archivo .JSON seleccionado.');
    }
  };

  const appModalsProps: AppModalsProps = {
    isPhotoCropperOpen, setIsPhotoCropperOpen,
    isSignatureOpen, setIsSignatureOpen,
    isWizardOpen, setIsWizardOpen,
    isSavedCVsOpen, setIsSavedCVsOpen,
    isSaveModalOpen, setIsSaveModalOpen,
    isSaveAsModalOpen, setIsSaveAsModalOpen,
    initialSaveAsOpen, setInitialSaveAsOpen,
    isShareAppModalOpen, setIsShareAppModalOpen,
    isPdfCheckoutOpen, setIsPdfCheckoutOpen,
    isCardExportOpen, setIsCardExportOpen,
    isCoverLetterExportOpen, setIsCoverLetterExportOpen,
    isDownloadModalOpen, setIsDownloadModalOpen,
    isPrivacyModalOpen, setIsPrivacyModalOpen,
    isAtsModalOpen, setIsAtsModalOpen,
    isAtsLivePanelOpen, setIsAtsLivePanelOpen,
    isRegionFormatModalOpen, setIsRegionFormatModalOpen,
    atsLiveResult,
    activeTab,
    setActiveTab: (tab) => { setActiveTab(tab); setIsPanelOpen(true); },
    isPanelOpen,
    setIsPanelOpen,
    isPricingModalOpen, setIsPricingModalOpen,
    isCreditsModalOpen, setIsCreditsModalOpen,
    isLoginModalOpen, setIsLoginModalOpen,
    pdfCheckoutPurpose,
    isGeneratingPDF,
    isPdfComplete, setIsPdfComplete,
    updateBannerVisible, setUpdateBannerVisible,
    atsResult, cvData, setCvData, activeDocType,
    isSaving, hasPendingChanges, activeCvId, setTabs,
    handleSaveCVClick, handleSaveCVAsClick,
    handleExportAtsPdf, proceedWithExport,
    triggerPdfGeneration: handleStartPDFGeneration,
    handleImportJsonFile, handleGenerateCoverLetterFromCV, goToLandingPage,
  };

  return {
    appModalsProps,
    handleStartPDFGeneration,
    setAtsLiveResult,
    openPhotoCropper: () => setIsPhotoCropperOpen(true),
    openSignature: () => setIsSignatureOpen(true),
    openSavedCVs: () => setIsSavedCVsOpen(true),
    openSaveAsModal: () => setIsSaveAsModalOpen(true),
    openJsonDownloadModal: () => setIsDownloadModalOpen(true),
    openPricing: () => setIsPricingModalOpen(true),
    openCreditsModal: () => setIsCreditsModalOpen(true),
    openShareAppModal: () => setIsShareAppModalOpen(true),
    openPrivacy: () => setIsPrivacyModalOpen(true),
    openCardExport: () => setIsCardExportOpen(true),
    openCoverLetterExport: () => setIsCoverLetterExportOpen(true),
    openAtsLivePanel: () => setIsAtsLivePanelOpen(true),
    openRegionFormatModal: () => setIsRegionFormatModalOpen(true),
    openAtsModalWithResult: (result: AtsPreflightResult) => {
      setAtsResult(result);
      setIsAtsModalOpen(true);
    },
    openPdfCheckoutForExport: () => {
      setPdfCheckoutPurpose('export');
      setIsPdfCheckoutOpen(true);
    },
  };
}
