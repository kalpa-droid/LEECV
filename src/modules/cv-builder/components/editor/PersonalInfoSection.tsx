import React from 'react';
import { Bot } from 'lucide-react';
import { useCVContext } from '../../../../context/CVContext';
import { PersonalInfoFields } from '../../../../shared/core/ui/PersonalInfoFields';
import { SectionManualAdjustment } from './SectionManualAdjustment';
import { colorSystem, typeScale, button, elevationSystem } from '../../../../shared/core/uiDesignSystem';

const ImportCvAiModal = React.lazy(() => import('../modals/ImportCvAiModal'));

export default function PersonalInfoSection({ onOpenPhotoCropper }: { onOpenPhotoCropper: () => void; registeredItems?: any[] }) {
  const { cvData, setCvData, updatePersonalInfo } = useCVContext();
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);

  if (!cvData) return null;

  const isVisible = cvData.sectionVisibility?.contacto !== false && cvData.sectionVisibility?.['datos-personales'] !== false;

  const togglePersonalGroup = () => {
    const nextState = !isVisible;
    setCvData((prev) => ({
      ...prev,
      sectionVisibility: {
        ...(prev.sectionVisibility || {}),
        contacto: nextState,
        'datos-personales': nextState,
        frase: nextState
      }
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header con Toggle */}
      <div className={`flex items-center justify-between p-2.5 rounded-[12px] border transition ${
        isVisible 
          ? `bg-[var(--ui-bg-card)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] ${elevationSystem.raised}` 
          : 'bg-[var(--color-neutral-surface-muted)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-muted)] opacity-75'
      }`}>
        <span className={`${typeScale.sectionTitle} uppercase tracking-wide`} style={{ color: colorSystem.neutral.textPrimary }}>
          Datos Personales & Foto
        </span>
        <button
          type="button"
          onClick={togglePersonalGroup}
          className={`px-3 py-1 rounded-full text-[11px] font-medium transition flex items-center gap-1.5 ${elevationSystem.raised} cursor-pointer ${
            isVisible
              ? 'bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] hover:bg-[var(--color-secondary-hover)]'
              : 'bg-[var(--color-neutral-text-muted)] text-[var(--color-neutral-surface)] hover:opacity-80'
          }`}
        >
          <span>{isVisible ? 'ACTIVADA' : 'DESACTIVADA'}</span>
        </button>
      </div>

      {isVisible && (
        <div className={`p-3 rounded-[8px] bg-[var(--color-status-info-muted)] border border-[var(--color-status-info-base)]/30 text-[var(--color-status-info-text)] text-[11px] leading-snug font-medium flex items-start gap-2`}>
          <Bot className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--color-status-info-base)]" />
          <p>
            <strong>Consejo de Reclutador:</strong> No incluyas tu DNI, CUIT, edad, fecha de nacimiento, estado civil o nacionalidad. Omitir estos datos evita sesgos en la selección inicial y protege tu privacidad. Si los cargás, <strong>LEECV los ocultará del PDF por defecto</strong> para cuidarte. Tampoco pongas tu dirección exacta; con la localidad o provincia es suficiente.
          </p>
        </div>
      )}

      {isVisible && (
        <PersonalInfoFields
          personalInfo={cvData.personalInfo}
          onChange={(patch) => {
            Object.entries(patch).forEach(([key, value]) => {
              updatePersonalInfo(key, value);
            });
          }}
          onOpenPhotoCropper={onOpenPhotoCropper}
          renderManualAdjustment={(sectionId) => {
            if (sectionId === 'datos-personales') {
              return <SectionManualAdjustment sectionId="datos-personales" cvData={cvData} setCvData={setCvData} />;
            }
            if (sectionId === 'contacto') {
              return <SectionManualAdjustment sectionId="contacto" cvData={cvData} setCvData={setCvData} />;
            }
            return null;
          }}
        />
      )}

      {/* Floating Action / Import Button */}
      {isVisible && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className={`${button.base} ${button.secondary} flex items-center gap-2`}
          >
            <Bot size={18} />
            Importar con IA (PDF/Foto)
          </button>
        </div>
      )}

      <React.Suspense fallback={null}>
        <ImportCvAiModal 
          isOpen={isImportModalOpen} 
          onClose={() => setIsImportModalOpen(false)}
          onImportComplete={(importedData) => {
            setIsImportModalOpen(false);
            if (importedData) {
              setCvData(prev => ({
                ...prev,
                personalInfo: { ...prev.personalInfo, ...importedData.personalInfo },
                experience: importedData.experience?.length ? importedData.experience : prev.experience,
                education: importedData.education?.length ? importedData.education : prev.education,
                skills: importedData.skills?.length ? importedData.skills : prev.skills,
                languages: importedData.languages?.length ? importedData.languages : prev.languages,
              }));
            }
          }}
        />
      </React.Suspense>
    </div>
  );
}
