import React, { Suspense, useRef, useState } from 'react';
import { Award, FileText, FolderOpen, Upload } from 'lucide-react';
import { useCVContext } from '../../../../../context/CVContext';
import { importLinkedinArchive } from '../../../../../shared/core/importers/linkedinArchiveImporter';
import { withErrorHandling } from '../../../../../shared/core/utils/errorHandler';
import { button } from '../../../../../shared/core/uiDesignSystem';
import { useToast } from '../../../../../shared/core/ui/Toast';
import { PanelSection } from '../../../../../shared/core/ui/PanelSection';
import { ActionGrid } from '../../../../../shared/core/ui/ActionGrid';
import { ActionTileButton } from '../../../../../shared/core/ui/ActionTileButton';
import { dal } from '../../../../../shared/core/storage/dataAccessLayer';
import { activateSection } from '../../../../../shared/core/sections/sectionActivationEngine';
import { unpackDocumentFromDisk } from '../../../../../shared/core/storage/leecvPackageCodec';
import { openDocumentFromDisk } from '../../../../../shared/core/storage/nativeFileDocumentService';
import type { ExtractedCertificatePayload } from '../../modals/ImportCertificateAiModal';
import type { ImportReviewSelections } from '../../../utils/cvImportReview';
import { applyImportReview, buildValidatedImportFragment, normalizeImportedCvData } from '../../../utils/cvImportReview';
import ImportReviewDiffModal from '../../modals/ImportReviewDiffModal';

const ImportCvAiModal = React.lazy(() => import('../../modals/ImportCvAiModal'));
const ImportCertificateAiModal = React.lazy(() => import('../../modals/ImportCertificateAiModal'));

export const ImportDataSection: React.FC = () => {
  const { cvData, setCvData } = useCVContext();
  const { showError, showSuccess } = useToast();
  const [isAiImportOpen, setIsAiImportOpen] = useState(false);
  const [isCertImportOpen, setIsCertImportOpen] = useState(false);
  const [isImportingLinkedIn, setIsImportingLinkedIn] = useState(false);
  const [isReadingBackup, setIsReadingBackup] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<{ fileName: string; data: Record<string, any> } | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const [reviewData, setReviewData] = useState<Record<string, any> | null>(null);
  const [reviewJobId, setReviewJobId] = useState<string | null>(null);
  const [reviewKey, setReviewKey] = useState(0);
  const [savedDraft, setSavedDraft] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('leecv_last_imported_draft');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const checkSavedDraft = () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('leecv_last_imported_draft');
      setSavedDraft(raw ? JSON.parse(raw) : null);
    } catch {
      setSavedDraft(null);
    }
  };

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

      // Datos personales leídos por la IA deben mostrarse aunque venían desactivados.
      // Las políticas explícitas de formato (ej. us-resume) ocultando campos siguen vigentes al render.
      const hasPersonalData = Object.values(updated.personalInfo || {}).some(
        (v: any) => typeof v === 'string' && v.trim().length > 0
      );
      if (hasPersonalData) {
        // 'personales' es el id de pestaña del editor, no una sección del CV: el orden canónico usa 'datos-personales'.
        ['contacto', 'datos-personales'].forEach((sectionId) => {
          updated = activateSection(updated, sectionId).updatedCvData;
        });
      }

      return updated;
    });
    const jobId = reviewJobId;
    setReviewData(null);
    setReviewJobId(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('leecv_last_imported_draft');
      } catch {}
    }
    setSavedDraft(null);
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

  const handleOpenBackupFromDisk = async () => {
    setIsReadingBackup(true);
    try {
      const nativeRes = await openDocumentFromDisk();
      if (nativeRes.status === 'cancelled') {
        setIsReadingBackup(false);
        return;
      }
      if (nativeRes.status === 'fallback-required') {
        setIsReadingBackup(false);
        backupFileInputRef.current?.click();
        return;
      }
      setPendingBackup({ fileName: nativeRes.fileName, data: nativeRes.data });
    } catch (err: any) {
      showError(err?.message || 'No se pudo leer el archivo de respaldo seleccionado.');
    } finally {
      setIsReadingBackup(false);
    }
  };

  const handleBackupInputFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setIsReadingBackup(true);
    try {
      const unpacked = await unpackDocumentFromDisk(file);
      setPendingBackup({ fileName: file.name, data: unpacked.data });
    } catch (err: any) {
      showError(err?.message || 'No se pudo abrir el archivo de respaldo.');
    } finally {
      setIsReadingBackup(false);
    }
  };

  const handleConfirmCertificate = (payload: ExtractedCertificatePayload, addAnother?: boolean) => {
    const fieldBySection: Record<string, string> = {
      cursos: 'coursesAndCertificates',
      formacion: 'education',
      profesion: 'profession',
      idiomas: 'languages',
      informatica: 'informatics',
    };
    const targetField = fieldBySection[payload.targetSectionId] || 'coursesAndCertificates';
    const rec = payload.record;

    let formattedItem: any;
    if (payload.targetSectionId === 'idiomas') {
      formattedItem = {
        id: rec.id,
        idioma: rec.tituloOGrado,
        language: rec.tituloOGrado,
        nivelDominio: rec.modalidad || '',
        proficiency: rec.modalidad || '',
        institucion: rec.institucion,
        institution: rec.institucion,
        descripcion: rec.descripcion,
      };
    } else if (payload.targetSectionId === 'informatica') {
      formattedItem = {
        id: rec.id,
        herramienta: rec.tituloOGrado,
        title: rec.tituloOGrado,
        institucion: rec.institucion,
        institution: rec.institucion,
        nivelDominio: rec.modalidad || '',
        descripcion: [rec.cargaHoraria ? `Carga horaria: ${rec.cargaHoraria}` : '', rec.descripcion].filter(Boolean).join(' · '),
      };
    } else if (payload.targetSectionId === 'formacion' || payload.targetSectionId === 'profesion') {
      formattedItem = {
        id: rec.id,
        tituloOGrado: rec.tituloOGrado,
        degree: rec.tituloOGrado,
        institucion: rec.institucion,
        institution: rec.institucion,
        periodo: rec.periodo,
        year: rec.periodo,
        resolucion: rec.resolucion,
        tomoFolio: rec.tomoFolio,
        matricula: rec.matricula,
        descripcion: rec.descripcion,
        description: rec.descripcion,
      };
    } else {
      formattedItem = {
        id: rec.id,
        tituloOGrado: rec.tituloOGrado,
        title: rec.tituloOGrado,
        institucion: rec.institucion,
        institution: rec.institucion,
        periodo: rec.periodo,
        year: rec.periodo,
        cargaHoraria: rec.cargaHoraria,
        hours: rec.cargaHoraria,
        modalidad: rec.modalidad,
        resolucion: rec.resolucion,
        url: rec.url,
        descripcion: rec.descripcion,
        description: rec.descripcion,
      };
    }

    setCvData((prev: any) => {
      const existingList = Array.isArray(prev?.[targetField]) ? prev[targetField] : [];
      let next: any = {
        ...prev,
        [targetField]: [...existingList, formattedItem],
      };
      next = activateSection(next, payload.targetSectionId).updatedCvData;

      if (payload.attachAsScanned && payload.certificateImageDataUrl) {
        const scannedEntry = {
          id: `cert_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          title: rec.tituloOGrado,
          institution: rec.institucion,
          year: rec.periodo,
          dataUrl: payload.certificateImageDataUrl,
          imageUrl: payload.certificateImageDataUrl,
          rotation: payload.rotation || 0,
          linkedRecordId: rec.id,
          linkedSection: payload.targetSectionId,
        };
        next = {
          ...next,
          certificatesScanned: [...(Array.isArray(next.certificatesScanned) ? next.certificatesScanned : []), scannedEntry],
        };
        next = activateSection(next, 'certificados').updatedCvData;
      }
      return next;
    });

    showSuccess(
      payload.attachAsScanned
        ? `Certificado agregado y guardado como adjunto en Certificados.${addAnother ? ' Podés cargar el siguiente.' : ''}`
        : `Certificado agregado a la sección elegida.${addAnother ? ' Podés cargar el siguiente.' : ''}`,
    );
  };

  return (
    <div className="space-y-5 text-[var(--ui-text-primary)]">
      {savedDraft && !reviewData && (
        <section className="rounded-[12px] border border-[var(--color-accent-base)] bg-[var(--ui-bg-panel)] p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
              <span className="text-xs font-bold text-[var(--ui-text-primary)] truncate">
                Extracción pendiente {savedDraft.sourceName ? `(${savedDraft.sourceName})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`${button.base} ${button.secondary} text-xs px-2.5 py-1 cursor-pointer`}
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    try {
                      localStorage.removeItem('leecv_last_imported_draft');
                    } catch {}
                  }
                  setSavedDraft(null);
                }}
              >
                Descartar
              </button>
              <button
                type="button"
                className={`${button.base} ${button.primary} text-xs px-3 py-1 cursor-pointer`}
                onClick={() => {
                  if (savedDraft.data) {
                    openReview(savedDraft.data);
                  }
                }}
              >
                Revisar
              </button>
            </div>
          </div>
        </section>
      )}

      <PanelSection
        icon={<Upload className="w-4 h-4" />}
        title="Importar datos"
        helpText="Sumá información al CV desde un archivo de respaldo (.json / .leecv / .zip), certificados individuales, LinkedIn o un CV anterior. Vos decidís qué aplicar."
      >
        <ActionGrid columns={2}>
          <ActionTileButton
            label={isImportingLinkedIn ? 'Leyendo ZIP…' : 'Copia ZIP de LinkedIn'}
            role="io"
            icon={<Upload className="w-4 h-4" />}
            badge=".zip"
            accept=".zip,application/zip"
            disabled={isImportingLinkedIn}
            helpText="Se leerán los datos disponibles y podrás elegir qué agregar o reemplazar de tu copia de seguridad de LinkedIn."
            helpGroupKey="import-linkedin-zip"
            onFileSelect={(files) => {
              const file = files?.[0];
              if (!file) return;
              handleLinkedInFile({
                target: { files: [file] },
                currentTarget: { value: '' },
              } as unknown as React.ChangeEvent<HTMLInputElement>);
            }}
          />

          <ActionTileButton
            label={isReadingBackup ? 'Abriendo…' : 'Abrir respaldo'}
            role="io"
            icon={<FolderOpen className="w-4 h-4" />}
            badge=".leecv"
            disabled={isReadingBackup}
            helpText="Abrí un archivo guardado en tu computadora, Carpeta Segura o pendrive (.json / .leecv / .zip) para restaurarlo completo o combinar secciones."
            helpGroupKey="import-open-backup"
            onClick={handleOpenBackupFromDisk}
          />

          <ActionTileButton
            label="Cargar certificado"
            role="ai"
            icon={<Award className="w-4 h-4" />}
            badge="IA"
            helpText="Subí la foto o PDF de un diploma o certificado. La IA reconoce los datos y te pregunta si querés adjuntar la imagen en la sección Certificados."
            helpGroupKey="import-certificate-ai"
            onClick={() => setIsCertImportOpen(true)}
          />

          <ActionTileButton
            label="Leer CV anterior"
            role="ai"
            icon={<FileText className="w-4 h-4" />}
            badge="IA"
            helpText="Para un CV anterior en PDF, foto o texto pegado. La IA prepara una propuesta para que elijas qué datos sumar a tu CV actual."
            helpGroupKey="import-cv-ai"
            onClick={() => setIsAiImportOpen(true)}
          />
        </ActionGrid>

        <input
          ref={backupFileInputRef}
          type="file"
          accept=".json,.leecv,.zip,application/json,application/zip"
          onChange={handleBackupInputFile}
          className="hidden"
        />

        {pendingBackup && (
          <div className="mt-2 p-3 rounded-[12px] border border-[var(--color-accent-base)]/50 bg-[var(--ui-bg-card)] space-y-2.5">
            <p className="text-xs font-bold">
              Archivo listo: <span className="text-[var(--color-accent-text)]">{pendingBackup.fileName}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`${button.base} ${button.primary} text-xs px-3 py-1.5 cursor-pointer`}
                onClick={() => {
                  const data = pendingBackup.data;
                  setCvData((prev: any) => ({
                    ...data,
                    id: prev?.id || data.id,
                  }));
                  setPendingBackup(null);
                  showSuccess('Respaldo cargado completamente en este CV.');
                }}
              >
                Cargar completo aquí
              </button>
              <button
                type="button"
                className={`${button.base} ${button.secondary} text-xs px-3 py-1.5 cursor-pointer`}
                onClick={() => {
                  const data = pendingBackup.data;
                  setPendingBackup(null);
                  openReview(data);
                }}
              >
                Elegir qué secciones combinar
              </button>
              <button
                type="button"
                className={`${button.base} ${button.ghost} text-xs px-2.5 py-1.5 cursor-pointer`}
                onClick={() => setPendingBackup(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </PanelSection>

      <Suspense fallback={null}>
        <ImportCvAiModal
          isOpen={isAiImportOpen}
          onClose={() => {
            setIsAiImportOpen(false);
            checkSavedDraft();
          }}
          onImportComplete={(data) => {
            setIsAiImportOpen(false);
            checkSavedDraft();
            openReview(data);
          }}
        />
        <ImportCertificateAiModal
          isOpen={isCertImportOpen}
          onClose={() => setIsCertImportOpen(false)}
          onConfirmCertificate={handleConfirmCertificate}
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
