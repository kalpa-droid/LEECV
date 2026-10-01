import React, { Suspense } from 'react';
import PhotoCropperModal from '../modules/cv-builder/components/PhotoCropperModal';
import SignatureModal from '../modules/cv-builder/components/SignatureModal';
import WizardModal from '../modules/cv-builder/components/WizardModal';
import SavedCVsModal from '../modules/cv-builder/components/SavedCVsModal';
import SaveModal from '../modules/cv-builder/components/SaveModal';
import SaveAsVersionModal from '../modules/cv-builder/components/SaveAsVersionModal';
import PdfCheckoutModal from '../modules/cv-builder/components/modals/PdfCheckoutModal';
import JsonDownloadModal from '../modules/cv-builder/components/modals/JsonDownloadModal';
import PdfProgressModal from '../modules/cv-builder/components/modals/PdfProgressModal';
import PrivacyModal from '../modules/cv-builder/components/PrivacyModal';
import ShareAppModal from '../modules/cv-builder/components/modals/ShareAppModal';
import EmailSaveModal from '../modules/cv-builder/components/modals/EmailSaveModal';
import { AtsCheckModal } from '../modules/cv-builder/components/AtsCheckModal';
import { CoverLetterExportModal } from '../modules/cover-letter/components/CoverLetterExportModal';
import { UpdateToast } from '../shared/core/ui/UpdateToast';
import { PricingModal } from '../modules/payments/components/PricingModal';
import { CreditsModal } from '../modules/payments/components/CreditsModal';
import { LoginModal } from '../modules/auth/components/LoginModal';
import { navigation } from '../shared/core/utils/navigation';
import { exportCVToJson } from '../shared/core/utils/jsonImporterExporter';
import * as workspaceController from '../shared/core/documents/workspaceController';
import { getOpenTabs } from '../shared/core/documents/tabStore';
import { inferDocumentTypeId } from '../shared/core/capabilities/capabilityRegistry';
import { capabilitiesGate } from '../shared/core/documents/documentEngine/capabilitiesGate';
import { useToast } from '../shared/core/ui/Toast';

const CardExportModal = React.lazy(() => import('../modules/cv-builder/components/modals/CardExportModal').then(m => ({ default: m.CardExportModal })));

export interface AppModalsProps {
  // States
  isPhotoCropperOpen: boolean; setIsPhotoCropperOpen: (v: boolean) => void;
  isSignatureOpen: boolean; setIsSignatureOpen: (v: boolean) => void;
  isWizardOpen: boolean; setIsWizardOpen: (v: boolean) => void;
  isSavedCVsOpen: boolean; setIsSavedCVsOpen: (v: boolean) => void;
  isSaveModalOpen: boolean; setIsSaveModalOpen: (v: boolean) => void;
  isSaveAsModalOpen: boolean; setIsSaveAsModalOpen: (v: boolean) => void;
  initialSaveAsOpen: boolean; setInitialSaveAsOpen: (v: boolean) => void;
  isShareAppModalOpen: boolean; setIsShareAppModalOpen: (v: boolean) => void;
  isPdfCheckoutOpen: boolean; setIsPdfCheckoutOpen: (v: boolean) => void;
  isCardExportOpen: boolean; setIsCardExportOpen: (v: boolean) => void;
  isCoverLetterExportOpen: boolean; setIsCoverLetterExportOpen: (v: boolean) => void;
  isDownloadModalOpen: boolean; setIsDownloadModalOpen: (v: boolean) => void;
  isPrivacyModalOpen: boolean; setIsPrivacyModalOpen: (v: boolean) => void;
  isAtsModalOpen: boolean; setIsAtsModalOpen: (v: boolean) => void;
  isPricingModalOpen: boolean; setIsPricingModalOpen: (v: boolean) => void;
  isCreditsModalOpen: boolean; setIsCreditsModalOpen: (v: boolean) => void;
  isLoginModalOpen: boolean; setIsLoginModalOpen: (v: boolean) => void;
  
  // Extra values
  pdfCheckoutPurpose: 'export' | 'publish';
  isGeneratingPDF: boolean;
  isPdfComplete: boolean; setIsPdfComplete: (v: boolean) => void;
  updateBannerVisible: boolean; setUpdateBannerVisible: (v: boolean) => void;
  atsResult: any;

  // Document states & functions
  cvData: any;
  setCvData: any;
  activeDocType: any;
  isSaving: boolean;
  hasPendingChanges: boolean;
  activeCvId: string;
  setTabs: any;

  // Handlers
  handleSaveCVClick: () => void;
  handleSaveCVAsClick: (v: string) => void;
  handleExportAtsPdf: (omitSensitiveData?: boolean) => void;
  proceedWithExport: () => void;
  triggerPdfGeneration: () => void;
  handleImportJsonFile: (e: any) => Promise<void>;
  handleGenerateCoverLetterFromCV: (cv?: any) => void;
  goToLandingPage: () => void;
}

export function AppModals(props: AppModalsProps) {
  const { showSuccess } = useToast();
  const {
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
    isPricingModalOpen, setIsPricingModalOpen,
    isCreditsModalOpen, setIsCreditsModalOpen,
    isLoginModalOpen, setIsLoginModalOpen,

    pdfCheckoutPurpose,
    isGeneratingPDF,
    isPdfComplete, setIsPdfComplete,
    updateBannerVisible, setUpdateBannerVisible,
    atsResult,

    cvData, setCvData,
    activeDocType,
    isSaving,
    hasPendingChanges,
    activeCvId,
    setTabs,

    handleSaveCVClick,
    handleSaveCVAsClick,
    handleExportAtsPdf,
    proceedWithExport,
    triggerPdfGeneration,
    handleImportJsonFile,
    handleGenerateCoverLetterFromCV,
    goToLandingPage
  } = props;

  return (
    <Suspense fallback={null}>

      {isPhotoCropperOpen && (
        <PhotoCropperModal 
          isOpen={isPhotoCropperOpen}
          onClose={() => setIsPhotoCropperOpen(false)}
          currentPhoto={cvData?.personalInfo?.profilePhoto || ''}
          onSavePhoto={(croppedUrl: string) => {
            setCvData((prev: any) => ({
              ...prev,
              personalInfo: { ...prev.personalInfo, profilePhoto: croppedUrl }
            }));
            setIsPhotoCropperOpen(false);
          }}
        />
      )}

      {isSignatureOpen && (
        <SignatureModal 
          isOpen={isSignatureOpen}
          onClose={() => setIsSignatureOpen(false)}
          currentSignature={cvData?.signature}
          onSaveSignature={(sigData: any) => {
            setCvData((prev: any) => ({
              ...prev,
              signature: sigData
            }));
            setIsSignatureOpen(false);
          }}
        />
      )}

      {isWizardOpen && (
        <WizardModal 
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onOpenPhotoCropper={() => setIsPhotoCropperOpen(true)}
          onOpenSignature={() => setIsSignatureOpen(true)}
          cvData={cvData}
          setCvData={setCvData}
        />
      )}

      {isSavedCVsOpen && (
        <SavedCVsModal 
          isOpen={isSavedCVsOpen}
          docType={activeDocType}
          onClose={() => setIsSavedCVsOpen(false)}
          onSelectCV={(selectedCV: any) => {
            setCvData(selectedCV);
            setTabs(workspaceController.ensureDocumentTab(selectedCV.id, inferDocumentTypeId(selectedCV) as any, selectedCV));
            setIsSavedCVsOpen(false);
          }}
          onImportJson={handleImportJsonFile}
          onGenerateCoverLetterFromCV={handleGenerateCoverLetterFromCV}
          onDocumentClosed={(deletedId: string) => {
            const currentDocState = cvData ? {
              id: cvData.id,
              docType: inferDocumentTypeId(cvData) as any,
              data: cvData,
              isDirty: hasPendingChanges
            } : null;
            workspaceController.closeTab(deletedId, currentDocState, setCvData, goToLandingPage, activeCvId).then(() => setTabs(getOpenTabs()));
          }}
        />
      )}

      {isSaveModalOpen && (
        <SaveModal 
          isOpen={isSaveModalOpen}
          onClose={() => {
            setIsSaveModalOpen(false);
            setInitialSaveAsOpen(false);
          }}
          onSaveStorage={handleSaveCVClick}
          onSaveAs={handleSaveCVAsClick}
          onExportJson={() => setIsDownloadModalOpen(true)}
          isSaving={isSaving}
          initialSaveAsOpen={initialSaveAsOpen}
        />
      )}

      {isSaveAsModalOpen && capabilitiesGate.canVersionByJob(inferDocumentTypeId(cvData)) && (
        <SaveAsVersionModal
          isOpen={isSaveAsModalOpen}
          onClose={() => setIsSaveAsModalOpen(false)}
          onSaveAs={handleSaveCVAsClick}
          isSaving={isSaving}
        />
      )}

      {isShareAppModalOpen && (
        <ShareAppModal
          isOpen={isShareAppModalOpen}
          onClose={() => setIsShareAppModalOpen(false)}
        />
      )}

      {isPdfCheckoutOpen && (
        <PdfCheckoutModal 
          isOpen={isPdfCheckoutOpen}
          onClose={() => setIsPdfCheckoutOpen(false)}
          onConfirm={triggerPdfGeneration}
          onExportJson={() => exportCVToJson(cvData)}
          purpose={pdfCheckoutPurpose}
        />
      )}

      {isCardExportOpen && (
        <Suspense fallback={null}>
          <CardExportModal
            isOpen={isCardExportOpen}
            onClose={() => setIsCardExportOpen(false)}
            cvData={cvData}
            presetId={cvData?.activePresetId || 'tarjeta-personal'}
          />
        </Suspense>
      )}

      {isCoverLetterExportOpen && (
        <CoverLetterExportModal
          isOpen={isCoverLetterExportOpen}
          onClose={() => setIsCoverLetterExportOpen(false)}
          cvData={cvData}
          presetId={cvData?.activePresetId || 'carta-clasica'}
        />
      )}

      {isDownloadModalOpen && (
        <JsonDownloadModal 
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          cvData={cvData}
        />
      )}

      {(isGeneratingPDF || isPdfComplete) && (
        <PdfProgressModal 
          isGenerating={isGeneratingPDF}
          isComplete={isPdfComplete}
          onClose={() => setIsPdfComplete(false)}
        />
      )}

      {isPrivacyModalOpen && (
        <PrivacyModal
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
        />
      )}

      {isPricingModalOpen && (
        <PricingModal
          isOpen={isPricingModalOpen}
          onClose={() => setIsPricingModalOpen(false)}
          onOpenLogin={() => setIsLoginModalOpen(true)}
        />
      )}

      {isCreditsModalOpen && (
        <CreditsModal
          isOpen={isCreditsModalOpen}
          onClose={() => setIsCreditsModalOpen(false)}
          onOpenPricing={() => setIsPricingModalOpen(true)}
        />
      )}

      {isLoginModalOpen && (
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
      )}

      {isAtsModalOpen && atsResult && (
        <AtsCheckModal
          isOpen={isAtsModalOpen}
          onClose={() => setIsAtsModalOpen(false)}
          result={atsResult}
          onExportAtsPdf={handleExportAtsPdf}
          onExportOriginal={proceedWithExport}
          onFixAction={(actionId, ruleId) => {
            if (actionId === 'hide_field' && ruleId === 'sensitive_data') {
              const pi = cvData?.personalInfo;
              const toHide = [];
              if (pi?.dni) toHide.push('dni');
              if (pi?.cuit) toHide.push('cuit');
              if (pi?.birthDate) toHide.push('birthDate');
              if (pi?.estadoCivil) toHide.push('estadoCivil');
              if (pi?.nacionalidad) toHide.push('nacionalidad');
              
              if (toHide.length > 0) {
                setCvData((prev: any) => ({
                  ...prev,
                  hiddenFields: Array.from(new Set([...(prev.hiddenFields || []), ...toHide]))
                }));
                showSuccess('Se han ocultado los datos sensibles.');
              }
              setIsAtsModalOpen(false);
            }
          }}
        />
      )}

      <UpdateToast
        isVisible={updateBannerVisible}
        onUpdate={() => navigation.reload()}
        onDismiss={() => setUpdateBannerVisible(false)}
      />
    </Suspense>
  );
}
