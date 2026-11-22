import React from 'react';
import { useCVContext } from '../../../../context/CVContext';
import { PersonalInfoFields } from '../../../../shared/core/ui/PersonalInfoFields';
import { SectionManualAdjustment } from './SectionManualAdjustment';
import { SectionSwitch } from '../../../../shared/core/ui/SectionSwitch';
import { LidioHelpTrigger } from '../../../../shared/core/ui/LidioHelpTrigger';
import { colorSystem, typeScale, elevationSystem } from '../../../../shared/core/uiDesignSystem';

export default function PersonalInfoSection({ onOpenPhotoCropper }: { onOpenPhotoCropper: () => void; registeredItems?: any[] }) {
  const { cvData, setCvData, updatePersonalInfo } = useCVContext();

  if (!cvData) return null;

  const contactoVisible = cvData.sectionVisibility?.contacto !== false;
  const datosPersonalesVisible = cvData.sectionVisibility?.['datos-personales'] !== false;
  // Un formato ATS puede apagar "datos-personales" pero dejar "contacto" activado:
  // el bloque Personal sigue editable y Nombre/Contacto siguen visibles.
  const anyVisible = contactoVisible || datosPersonalesVisible;

  const togglePersonalGroup = () => {
    const nextState = !anyVisible;
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
      {/* Header con Perilla y Ayuda de Privacidad */}
      <div className={`flex items-center justify-between gap-2 p-2.5 rounded-[12px] border transition ${
        anyVisible 
          ? `bg-[var(--ui-bg-card)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-primary)] ${elevationSystem.raised}` 
          : 'bg-[var(--color-neutral-surface-muted)] border-[var(--color-neutral-border)] text-[var(--color-neutral-text-muted)] opacity-75'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`${typeScale.sectionTitle} uppercase tracking-wide truncate`} style={{ color: colorSystem.neutral.textPrimary }}>
            Datos Personales & Foto
          </span>
          <LidioHelpTrigger
            size="xs"
            title="Privacidad y Sesgos"
            text="En selección moderna se recomienda ocultar DNI, CUIT, estado civil, edad o foto. Podés completar esos datos igual y usar el ícono de ojo debajo de cada campo para mostrarlos u ocultarlos del PDF sin borrar nada."
            groupKey="privacy-personal-info"
          />
        </div>
        <SectionSwitch
          checked={anyVisible}
          label="Datos Personales & Foto"
          size="sm"
          onChange={() => togglePersonalGroup()}
        />
      </div>

      {anyVisible && (
        <PersonalInfoFields
          personalInfo={cvData.personalInfo}
          onChange={(patch) => {
            Object.entries(patch).forEach(([key, value]) => {
              updatePersonalInfo(key, value);
            });
          }}
          cvData={cvData}
          onOverrideChange={(field, override) => {
            setCvData(prev => {
              const personalFieldOverrides = prev.personalFieldOverrides || {};
              if (override === undefined) {
                const newOverrides = { ...personalFieldOverrides };
                delete newOverrides[field];
                return { ...prev, personalFieldOverrides: newOverrides };
              }
              return { ...prev, personalFieldOverrides: { ...personalFieldOverrides, [field]: override } };
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
