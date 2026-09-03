import React from 'react';
import { User, Camera } from 'lucide-react';
import { useCVContext } from '../../../../context/CVContext';
import { Field } from '../../../../shared/core/ui/Field';
import { PanelSection } from './PanelSection';
import { SectionManualAdjustment } from './SectionManualAdjustment';
import { colorSystem, typeScale, button, elevationSystem } from '../../../../shared/core/uiDesignSystem';

export default function PersonalInfoSection({ onOpenPhotoCropper }: { onOpenPhotoCropper: () => void; registeredItems?: any[] }) {
  const { cvData, setCvData, updatePersonalInfo, toggleSectionVisibility } = useCVContext();

  if (!cvData) return null;

  const isVisible = cvData.sectionVisibility?.personales !== false;

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
          onClick={() => toggleSectionVisibility('personales')}
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
        <div className="space-y-4">
          {/* 1. Titular Profesional & Título Honorífico */}
          <PanelSection 
            icon={<User className="w-4 h-4 text-[var(--ui-secondary)]" />} 
            title="Titular Profesional & Título Honorífico"
          >
            <div className="space-y-3 pt-1">
              <Field
                id="titlePrefix"
                label="Abreviaturas / Título Honorífico (ej: Lic. / Prof. / Dr. / MP)"
                value={cvData.personalInfo?.titlePrefix || ''}
                onChange={(e: any) => {
                  const prefix = e.target.value;
                  const given = cvData.personalInfo?.givenNames || '';
                  const sur = cvData.personalInfo?.surname || '';
                  const computed = `${prefix ? prefix + ' ' : ''}${given} ${sur}`.trim();
                  updatePersonalInfo('titlePrefix', prefix);
                  updatePersonalInfo('fullName', computed);
                }}
                placeholder="Ej: Lic. / Prof. / Dr. / Ing. / MP 1402"
              />

              <Field
                id="quote"
                label="Titular Profesional (una línea, debajo de tu nombre)"
                value={cvData.personalInfo?.quote || ''}
                onChange={(e: any) => updatePersonalInfo('quote', e.target.value)}
                placeholder="Ej: Profesora de Lengua y Literatura | Referente en Innovación Educativa"
              />
            </div>
          </PanelSection>

          {/* 2. Datos Personales & Contacto (Unificado) */}
          <PanelSection 
            icon={<User className="w-4 h-4 text-[var(--ui-secondary)]" />} 
            title="Datos Personales & Contacto"
          >
            <div className="space-y-3 pt-1">
              {/* Tarjeta Foto de Perfil */}
              <div
                className="flex items-center gap-4 p-3.5 rounded-[12px] border"
                style={{
                  backgroundColor: colorSystem.secondary.muted,
                  borderColor: colorSystem.neutral.border
                }}
              >
                <div className={`w-14 h-18 rounded-[8px] overflow-hidden bg-[var(--color-neutral-surface)] flex items-center justify-center border border-[var(--color-neutral-border-strong)] ${elevationSystem.raised}`}>
                  {cvData.personalInfo?.profilePhoto ? (
                    <img src={cvData.personalInfo.profilePhoto} alt="Perfil" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6" style={{ color: colorSystem.secondary.text }} />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <p className={typeScale.fieldLabel} style={{ color: colorSystem.secondary.textCard }}>
                    Foto de Perfil
                  </p>
                  <p className={typeScale.helper} style={{ color: 'var(--ui-text-secondary)' }}>
                    Se muestra en la portada y en el encabezado principal del CV.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenPhotoCropper}
                    className={`${button.secondary} flex items-center gap-1.5 text-[11px] py-1.5 px-3 mt-1`}
                  >
                    <Camera className="w-3.5 h-3.5" /> Cortar / Cambiar Foto
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  id="surname"
                  label="Apellidos"
                  value={cvData.personalInfo?.surname || ''}
                  onChange={(e: any) => {
                    const sur = e.target.value;
                    const prefix = cvData.personalInfo?.titlePrefix || '';
                    const given = cvData.personalInfo?.givenNames || '';
                    const computed = `${prefix ? prefix + ' ' : ''}${given} ${sur}`.trim();
                    updatePersonalInfo('surname', sur);
                    updatePersonalInfo('fullName', computed);
                  }}
                  placeholder="Ej: BURGOS"
                />
                <Field
                  id="givenNames"
                  label="Nombres Completos"
                  value={cvData.personalInfo?.givenNames || ''}
                  onChange={(e: any) => {
                    const given = e.target.value;
                    const prefix = cvData.personalInfo?.titlePrefix || '';
                    const sur = cvData.personalInfo?.surname || '';
                    const computed = `${prefix ? prefix + ' ' : ''}${given} ${sur}`.trim();
                    updatePersonalInfo('givenNames', given);
                    updatePersonalInfo('fullName', computed);
                  }}
                  placeholder="Ej: Mónica Daniela"
                />
              </div>

              <Field
                id="phone"
                label="Teléfono Celular / WhatsApp"
                value={cvData.personalInfo?.phone || ''}
                onChange={(e: any) => updatePersonalInfo('phone', e.target.value)}
                placeholder="Ej: 387-155121515"
              />

              <Field
                id="address"
                label="Domicilio y Barrio"
                value={cvData.personalInfo?.address || ''}
                onChange={(e: any) => updatePersonalInfo('address', e.target.value)}
                placeholder="Ej: Manzana 751A Casa 11 - Ciudad Valdivia"
              />

              <Field
                id="cityProvince"
                label="Ciudad / Provincia / País"
                value={cvData.personalInfo?.cityProvince || ''}
                onChange={(e: any) => updatePersonalInfo('cityProvince', e.target.value)}
                placeholder="Ej: Salta, Salta, Argentina"
              />

              <div className="grid grid-cols-2 gap-3">
                <Field
                  id="dni"
                  label="DNI"
                  value={cvData.personalInfo?.dni || ''}
                  onChange={(e: any) => updatePersonalInfo('dni', e.target.value)}
                  placeholder="Ej: 29334206"
                />
                <Field
                  id="cuit"
                  label="CUIT / CUIL"
                  value={cvData.personalInfo?.cuit || ''}
                  onChange={(e: any) => updatePersonalInfo('cuit', e.target.value)}
                  placeholder="Ej: 27-29334206-2"
                />
              </div>

              <Field
                id="birthDate"
                label="Fecha de Nacimiento"
                value={cvData.personalInfo?.birthDate || ''}
                onChange={(e: any) => updatePersonalInfo('birthDate', e.target.value)}
                placeholder="Ej: 4 de febrero de 1982"
              />

              <div className="grid grid-cols-2 gap-3">
                <Field
                  id="nacionalidad"
                  label="Nacionalidad"
                  value={cvData.personalInfo?.nacionalidad || ''}
                  onChange={(e: any) => updatePersonalInfo('nacionalidad', e.target.value)}
                  placeholder="Ej: Argentina"
                />
                <Field
                  id="estadoCivil"
                  label="Estado Civil"
                  value={cvData.personalInfo?.estadoCivil || ''}
                  onChange={(e: any) => updatePersonalInfo('estadoCivil', e.target.value)}
                  placeholder="Ej: Soltero/a, Casado/a"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  id="disponibilidad"
                  label="Disponibilidad (Viaje / Horarios)"
                  value={cvData.personalInfo?.disponibilidad || ''}
                  onChange={(e: any) => updatePersonalInfo('disponibilidad', e.target.value)}
                  placeholder="Ej: Inmediata / Relocalización"
                />
                <Field
                  id="licenciaConducir"
                  label="Licencia de Conducir"
                  value={cvData.personalInfo?.licenciaConducir || ''}
                  onChange={(e: any) => updatePersonalInfo('licenciaConducir', e.target.value)}
                  placeholder="Ej: Clase B1 (Autos particulares)"
                />
              </div>

              {/* Ajuste Manual: Contacto y Datos Personales */}
              <div className="pt-2 border-t border-[var(--color-neutral-border)] space-y-2">
                <SectionManualAdjustment sectionId="contacto" cvData={cvData} setCvData={setCvData} />
                <SectionManualAdjustment sectionId="datos-personales" cvData={cvData} setCvData={setCvData} />
              </div>
            </div>
          </PanelSection>
        </div>
      )}
    </div>
  );
}
