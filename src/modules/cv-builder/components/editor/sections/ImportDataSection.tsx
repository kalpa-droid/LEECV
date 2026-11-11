import React, { Suspense, useState } from 'react';
import { FileText, Loader2, Upload } from 'lucide-react';
import { useCVContext } from '../../../../../context/CVContext';
import { importLinkedinArchive } from '../../../../../shared/core/importers/linkedinArchiveImporter';
import { withErrorHandling } from '../../../../../shared/core/utils/errorHandler';
import { button } from '../../../../../shared/core/uiDesignSystem';
import { useToast } from '../../../../../shared/core/ui/Toast';
import { dal } from '../../../../../shared/core/storage/dataAccessLayer';
import { activateSection } from '../../../../../shared/core/sections/sectionActivationEngine';
import type { ImportReviewSelections } from '../../../utils/cvImportReview';
import { applyImportReview, buildValidatedImportFragment, normalizeImportedCvData } from '../../../utils/cvImportReview';
import ImportReviewDiffModal from '../../modals/ImportReviewDiffModal';

const ImportCvAiModal = React.lazy(() => import('../../modals/ImportCvAiModal'));

export const ImportDataSection: React.FC = () => {
  const { cvData, setCvData } = useCVContext();
  const { showError, showSuccess } = useToast();
  const [isAiImportOpen, setIsAiImportOpen] = useState(false);
  const [isImportingLinkedIn, setIsImportingLinkedIn] = useState(false);
  const [reviewData, setReviewData] = useState<Record<string, any> | null>(null);
  const [reviewJobId, setReviewJobId] = useState<string | null>(null);
  const [reviewKey, setReviewKey] = useState(0);

  const openReview = (rawData: Record<string, any> | null) => {
    if (!rawData) return;
    const { _jobId, ...rest } = rawData;
    setReviewJobId(typeof _jobId === 'string' && _jobId.trim() ? _jobId : null);
    setReviewData(normalizeImportedCvData(rest));
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

  const handleConfirmImport = async (selections: ImportReviewSelections, editedFragment: Record<string, any>) => {
    if (!reviewData) return;
    setCvData((previous) => {
      let updated = applyImportReview(previous, editedFragment, selections);

      const listSectionMapping: Record<string, string> = {
        experience: 'experiencia',
        education: 'formacion',
        profession: 'profesion',
        achievements: 'logros',
        portfolio: 'portafolio',
        coursesAndCertificates: 'cursos',
        informatics: 'informatica',
        projects: 'proyectos',
        publications: 'publicaciones',
        references: 'referencias',
        hardSkills: 'habilidades',
        skills: 'competencias',
        languages: 'idiomas',
        redes: 'redes'
      };

      Object.entries(listSectionMapping).forEach(([fieldKey, sectionId]) => {
        if (Array.isArray(updated[fieldKey]) && updated[fieldKey].length > 0) {
          updated = activateSection(updated, sectionId).updatedCvData;
        }
      });

      if (updated.objective) updated = activateSection(updated, 'objetivo').updatedCvData;
      if (updated.summary) updated = activateSection(updated, 'resumen').updatedCvData;
      if (updated.frase) updated = activateSection(updated, 'frase').updatedCvData;

      return updated;
    });
    const jobId = reviewJobId;
    setReviewData(null);
    setReviewJobId(null);
    showSuccess('Se aplicaron los datos seleccionados al CV.');
    if (!jobId) return;
    await withErrorHandling(() => dal.ocrJobs.update(jobId, {
      result_json: buildValidatedImportFragment(editedFragment, selections, cvData as Record<string, any>),
      status: 'completed',
      completed_at: new Date().toISOString()
    }), {
      context: 'ImportDataSection.persistOcrExtraction',
      errorMessage: 'No se pudo guardar la versión corregida del documento.',
      notify: (message, type) => type === 'error' && showError(message)
    });
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
