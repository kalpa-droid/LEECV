import React, { Suspense, useState } from 'react';
import { FileText, Loader2, Upload } from 'lucide-react';
import { useCVContext } from '../../../../../context/CVContext';
import { importLinkedinArchive } from '../../../../../shared/core/importers/linkedinArchiveImporter';
import { withErrorHandling } from '../../../../../shared/core/utils/errorHandler';
import { button } from '../../../../../shared/core/uiDesignSystem';
import { useToast } from '../../../../../shared/core/ui/Toast';
import type { ImportReviewSelections } from '../../../utils/cvImportReview';
import { applyImportReview, normalizeImportedCvData } from '../../../utils/cvImportReview';
import ImportReviewDiffModal from '../../modals/ImportReviewDiffModal';

const ImportCvAiModal = React.lazy(() => import('../../modals/ImportCvAiModal'));

export const ImportDataSection: React.FC = () => {
  const { cvData, setCvData } = useCVContext();
  const { showError, showSuccess } = useToast();
  const [isAiImportOpen, setIsAiImportOpen] = useState(false);
  const [isImportingLinkedIn, setIsImportingLinkedIn] = useState(false);
  const [reviewData, setReviewData] = useState<Record<string, any> | null>(null);
  const [reviewKey, setReviewKey] = useState(0);

  const openReview = (rawData: Record<string, any>) => {
    setReviewData(normalizeImportedCvData(rawData));
    setReviewKey((key) => key + 1);
  };

  const handleLinkedInFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      showError('Seleccioná una copia de seguridad de LinkedIn en formato .zip.');
      return;
    }

    setIsImportingLinkedIn(true);
    const result = await withErrorHandling(() => importLinkedinArchive(file), {
      context: 'ImportDataSection.linkedinArchive',
      errorMessage: 'No se pudo leer la copia de seguridad de LinkedIn.',
      notify: (message, type) => type === 'error' && showError(message)
    });
    setIsImportingLinkedIn(false);
    if (!result.success || !result.data) return;

    const imported = result.data;
    openReview({
      personalInfo: imported.personalInfo,
      experience: imported.experience?.map((item) => ({
        role: item.role,
        company: item.company,
        year: item.year,
        description: item.details || ''
      })),
      education: imported.education,
      skills: imported.skills,
      languages: imported.languages?.map((item) => ({
        language: item.language,
        proficiency: item.level
      })),
      coursesAndCertificates: imported.coursesAndCertificates
    });
  };

  const handleConfirmImport = (selections: ImportReviewSelections) => {
    if (!reviewData) return;
    setCvData((previous) => applyImportReview(previous, reviewData, selections));
    setReviewData(null);
    showSuccess('Se aplicaron los datos seleccionados al CV.');
  };

  return (
    <div className="space-y-6 text-[var(--ui-text-primary)]">
      <header className="space-y-2 border-b border-[var(--ui-border)] pb-4">
        <h2 className="text-lg font-semibold">Importar datos</h2>
        <p className="text-sm text-[var(--ui-text-secondary)]">
          Sumá información al CV desde una copia de LinkedIn, un archivo o texto pegado. Antes de aplicar cambios vas a poder revisar cada dato; lo que ya cargaste se conserva por defecto.
        </p>
      </header>

      <section className="rounded-[var(--ui-radius-card)] border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-[var(--color-primary-bright)]" />
          <h3 className="font-semibold">Copia de seguridad de LinkedIn (.zip)</h3>
        </div>
        <p className="text-sm text-[var(--ui-text-secondary)]">
          Se leerán los datos disponibles y podrás elegir qué agregar o reemplazar.
        </p>
        <label className={`${button.base} ${button.secondary} inline-flex items-center gap-2 cursor-pointer`}>
          {isImportingLinkedIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {isImportingLinkedIn ? 'Leyendo archivo…' : 'Seleccionar archivo .zip'}
          <input
            type="file"
            accept=".zip,application/zip"
            disabled={isImportingLinkedIn}
            onChange={handleLinkedInFile}
            className="sr-only"
          />
        </label>
      </section>

      <section className="rounded-[var(--ui-radius-card)] border border-[var(--ui-border)] bg-[var(--ui-bg-panel)] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[var(--color-primary-bright)]" />
          <h3 className="font-semibold">PDF, foto o texto pegado</h3>
        </div>
        <p className="text-sm text-[var(--ui-text-secondary)]">
          La IA prepara una propuesta con la información reconocida. Vos decidís qué datos aplicar.
        </p>
        <button
          type="button"
          className={`${button.base} ${button.primary} inline-flex items-center gap-2`}
          onClick={() => setIsAiImportOpen(true)}
        >
          <FileText className="w-4 h-4" />
          Elegir archivo o pegar texto
        </button>
      </section>

      <Suspense fallback={null}>
        <ImportCvAiModal
          isOpen={isAiImportOpen}
          onClose={() => setIsAiImportOpen(false)}
          onImportComplete={(data) => {
            setIsAiImportOpen(false);
            openReview(data);
          }}
        />
      </Suspense>

      {reviewData && (
        <ImportReviewDiffModal
          key={reviewKey}
          current={cvData}
          imported={reviewData}
          onCancel={() => setReviewData(null)}
          onConfirm={handleConfirmImport}
        />
      )}
    </div>
  );
};
