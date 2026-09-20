import React from 'react';
import { User, Camera, Phone } from 'lucide-react';
import { useCVContext } from '../../../../context/CVContext';
import { Field } from '../../../../shared/core/ui/Field';
import { PanelSection } from '../../../../shared/core/ui/PanelSection';
import { PersonalInfoFields } from '../../../../shared/core/ui/PersonalInfoFields';
import { SectionManualAdjustment } from './SectionManualAdjustment';
import { colorSystem, typeScale, button, elevationSystem } from '../../../../shared/core/uiDesignSystem';

export default function PersonalInfoSection({ onOpenPhotoCropper }: { onOpenPhotoCropper: () => void; registeredItems?: any[] }) {
  const { cvData, setCvData, updatePersonalInfo } = useCVContext();

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
          ? 'bg-white border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] ${elevationSystem.raised}' 
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
    </div>
  );
}
