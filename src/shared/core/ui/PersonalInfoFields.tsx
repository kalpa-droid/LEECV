import React from 'react';
import { User, Camera, Phone, Info } from 'lucide-react';
import { Field } from './Field';
import { PanelSection } from './PanelSection';
import { VisibilityEyeToggle } from './VisibilityEyeToggle';
import { colorSystem, typeScale, button, elevationSystem } from '../uiDesignSystem';
import { resolvePersonalFieldVisibility, getCvFormat } from '../formats/cvFormatRegistry';

interface PersonalInfo {
  titlePrefix?: string;
  quote?: string;
  givenNames?: string;
  surname?: string;
  fullName?: string;
  profilePhoto?: string;
  dni?: string;
  cuit?: string;
  birthDate?: string;
  nacionalidad?: string;
  estadoCivil?: string;
  disponibilidad?: string;
  licenciaConducir?: string;
  phone?: string;
  address?: string;
  cityProvince?: string;
}

interface PersonalInfoFieldsProps {
  personalInfo?: PersonalInfo;
  onChange: (patch: Partial<PersonalInfo>) => void;
  onOpenPhotoCropper?: () => void;
  renderManualAdjustment?: (sectionId: string) => React.ReactNode;
  cvData?: any;
  onOverrideChange?: (field: string, override: 'show' | 'hide' | undefined) => void;
}

export function PersonalInfoFields({
  personalInfo = {},
  onChange,
  onOpenPhotoCropper,
  renderManualAdjustment,
  cvData,
  onOverrideChange
}: PersonalInfoFieldsProps) {

  const renderVisibilityToggle = (fieldId: string) => {
    if (!cvData || !onOverrideChange) return null;
    const format = getCvFormat(cvData.activeFormatId);
    const policy = format.personalFieldPolicy[fieldId as keyof typeof format.personalFieldPolicy];
    const isVisible = resolvePersonalFieldVisibility(cvData, fieldId as any);

    if (policy === 'hide') {
      return (
        <div className="text-[10px] mt-1.5 flex items-start gap-1" style={{ color: colorSystem.status.warning.text }}>
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>El formato <strong>{format.name}</strong> oculta este dato para evitar sesgos.</span>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-end mt-1.5">
        <VisibilityEyeToggle
          visible={isVisible}
          size="xs"
          targetLabel={fieldId === 'profilePhoto' ? 'La foto de perfil' : `El campo ${fieldId}`}
          onToggle={(next) => onOverrideChange(fieldId, next ? 'show' : 'hide')}
        />
      </div>
    );
  };

  const policyFieldLabels: Record<string, string> = {
    dni: 'DNI',
    cuit: 'CUIT / CUIL',
    birthDate: 'fecha de nacimiento',
    nacionalidad: 'nacionalidad',
    estadoCivil: 'estado civil',
    disponibilidad: 'disponibilidad',
    licenciaConducir: 'licencia de conducir'
  };
  const FORMAT_POLICY_FIELDS = ['dni', 'cuit', 'birthDate', 'nacionalidad', 'estadoCivil'] as const;
  const MANUAL_HIDE_FIELDS = [...FORMAT_POLICY_FIELDS, 'disponibilidad', 'licenciaConducir'] as const;

  const policyHiddenWithData = (() => {
    if (!cvData) return [] as string[];
    const fmt = getCvFormat(cvData.activeFormatId);
    if (!fmt) return [] as string[];
    return FORMAT_POLICY_FIELDS.filter(
      (id) => (personalInfo as any)?.[id] && fmt.personalFieldPolicy?.[id as keyof typeof fmt.personalFieldPolicy] === 'hide'
    );
  })();

  // Ocultos por elección manual (personalFieldOverrides o hiddenFields legado)
  // con datos cargados: la persona debe saber que esos datos no van al PDF.
  const manuallyHiddenWithData = (() => {
    if (!cvData) return [] as string[];
    return MANUAL_HIDE_FIELDS.filter((id) => {
      if (!(personalInfo as any)?.[id]) return false;
      if (cvData?.personalFieldOverrides?.[id] === 'hide') return true;
      if (Array.isArray(cvData?.hiddenFields) && cvData.hiddenFields.includes(id)) return true;
      return false;
    });
  })();

  const datosPersonalesSectionOff = cvData?.sectionVisibility?.['datos-personales'] === false;
  const personalDetailsLoaded = MANUAL_HIDE_FIELDS.some((id) => !!(personalInfo as any)?.[id]);

  return (
    <>
      {/* 1. Titular Profesional & Título Honorífico */}
      <PanelSection 
        icon={<User className="w-4 h-4 text-[var(--ui-secondary)]" />} 
        title="Titular Profesional & Título Honorífico"
      >
        <div className="space-y-3 pt-1">
          <Field
            id="titlePrefix"
            label="Abreviaturas / Título Honorífico (ej: Lic. / Prof. / Dr. / MP)"
            value={personalInfo.titlePrefix || ''}
            onChange={(e: any) => {
              const prefix = e.target.value;
              const given = personalInfo.givenNames || '';
              const sur = personalInfo.surname || '';
              const computed = `${prefix ? prefix + ' ' : ''}${given} ${sur}`.trim();
              onChange({ titlePrefix: prefix, fullName: computed });
            }}
            placeholder="Ej: Lic. / Prof. / Dr. / Ing. / MP 1402"
          />

          <Field
            id="quote"
            label="Titular Profesional (una línea, debajo de tu nombre)"
            value={personalInfo.quote || ''}
            onChange={(e: any) => onChange({ quote: e.target.value })}
            placeholder="Ej: Profesora de Lengua y Literatura | Referente en Innovación Educativa"
          />
        </div>
      </PanelSection>

      {/* 2. Datos Personales */}
      <PanelSection 
        icon={<User className="w-4 h-4 text-[var(--ui-secondary)]" />} 
        title="Datos Personales"
      >
        <div className="space-y-3 pt-1">
          {policyHiddenWithData.length > 0 && (
            <div className="text-[10px] flex items-start gap-1 leading-snug" style={{ color: colorSystem.status.warning.text }}>
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>
                El formato <strong>{getCvFormat(cvData.activeFormatId)?.name}</strong> oculta {policyHiddenWithData.map((id) => policyFieldLabels[id]).join(', ')} para evitar sesgos.
                Por eso esta sección puede no aparecer en el PDF. Elegí otro formato si querés mostrarlos.
              </span>
            </div>
          )}
          {policyHiddenWithData.length === 0 && datosPersonalesSectionOff && personalDetailsLoaded && (
            <div className="text-[10px] flex items-start gap-1 leading-snug" style={{ color: colorSystem.status.warning.text }}>
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>
                La sección <strong>Datos Personales</strong> está desactivada: lo que cargaste arriba no aparece en el PDF por ahora.
                Podés reactivarla desde el interruptor de esta sección.
              </span>
            </div>
          )}
          {manuallyHiddenWithData.length > 0 && (
            <div className="text-[10px] flex items-start gap-1 leading-snug" style={{ color: colorSystem.status.warning.text }}>
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>
                Elegiste ocultar {manuallyHiddenWithData.map((id) => policyFieldLabels[id]).join(', ')} para que no aparezcan en el PDF.
                Podés mostrarlos con el interruptor debajo de cada campo.
              </span>
            </div>
          )}
          {/* Tarjeta Foto de Perfil */}
          <div
            className="flex items-center gap-4 p-3.5 rounded-[12px] border"
            style={{
              backgroundColor: colorSystem.secondary.muted,
              borderColor: colorSystem.neutral.border
            }}
          >
            <div className={`w-14 h-18 rounded-[8px] overflow-hidden bg-[var(--color-neutral-surface)] flex items-center justify-center border border-[var(--color-neutral-border-strong)] ${elevationSystem.raised}`}>
              {personalInfo.profilePhoto ? (
                <img src={personalInfo.profilePhoto} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6" style={{ color: colorSystem.secondary.text }} />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <p className={typeScale.fieldLabel} style={{ color: colorSystem.secondary.textCard }}>
                Foto de Perfil
              </p>
              <p className={typeScale.helper} style={{ color: 'var(--ui-text-secondary)' }}>
                Se muestra en la portada y en el encabezado principal del documento.
              </p>
              {renderVisibilityToggle('profilePhoto')}
              {onOpenPhotoCropper && (
                <button
                  type="button"
                  onClick={onOpenPhotoCropper}
                  className={`${button.secondary} flex items-center gap-1.5 text-[11px] py-1.5 px-3 mt-1`}
                >
                  <Camera className="w-3.5 h-3.5" /> Cortar / Cambiar Foto
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              id="surname"
              label="Apellidos"
              value={personalInfo.surname || ''}
              onChange={(e: any) => {
                const sur = e.target.value;
                const prefix = personalInfo.titlePrefix || '';
                const given = personalInfo.givenNames || '';
                const computed = `${prefix ? prefix + ' ' : ''}${given} ${sur}`.trim();
                onChange({ surname: sur, fullName: computed });
              }}
              placeholder="Ej: BURGOS"
            />
            <Field
              id="givenNames"
              label="Nombres Completos"
              value={personalInfo.givenNames || ''}
              onChange={(e: any) => {
                const given = e.target.value;
                const prefix = personalInfo.titlePrefix || '';
                const sur = personalInfo.surname || '';
                const computed = `${prefix ? prefix + ' ' : ''}${given} ${sur}`.trim();
                onChange({ givenNames: given, fullName: computed });
              }}
              placeholder="Ej: Mónica Daniela"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Field
                id="dni"
                label="DNI"
                value={personalInfo.dni || ''}
                onChange={(e: any) => onChange({ dni: e.target.value })}
                placeholder="Ej: 29334206"
              />
              {renderVisibilityToggle('dni')}
            </div>
            <div>
              <Field
                id="cuit"
                label="CUIT / CUIL"
                value={personalInfo.cuit || ''}
                onChange={(e: any) => onChange({ cuit: e.target.value })}
                placeholder="Ej: 27-29334206-2"
              />
              {renderVisibilityToggle('cuit')}
            </div>
          </div>

          <div>
            <Field
              id="birthDate"
              label="Fecha de Nacimiento"
              type="date"
              value={personalInfo.birthDate || ''}
              onChange={(e: any) => onChange({ birthDate: e.target.value })}
            />
            {renderVisibilityToggle('birthDate')}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Field
                id="nacionalidad"
                label="Nacionalidad"
                value={personalInfo.nacionalidad || ''}
                onChange={(e: any) => onChange({ nacionalidad: e.target.value })}
                placeholder="Ej: Argentina"
              />
              {renderVisibilityToggle('nacionalidad')}
            </div>
            <div>
              <Field
                id="estadoCivil"
                label="Estado Civil"
                value={personalInfo.estadoCivil || ''}
                onChange={(e: any) => onChange({ estadoCivil: e.target.value })}
                placeholder="Ej: Soltero/a, Casado/a"
              />
              {renderVisibilityToggle('estadoCivil')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Field
                id="disponibilidad"
                label="Disponibilidad (Viaje / Horarios)"
                value={personalInfo.disponibilidad || ''}
                onChange={(e: any) => onChange({ disponibilidad: e.target.value })}
                placeholder="Ej: Inmediata / Relocalización"
              />
              {renderVisibilityToggle('disponibilidad')}
            </div>
            <div>
              <Field
                id="licenciaConducir"
                label="Licencia de Conducir"
                value={personalInfo.licenciaConducir || ''}
                onChange={(e: any) => onChange({ licenciaConducir: e.target.value })}
                placeholder="Ej: Clase B1 (Autos particulares)"
              />
              {renderVisibilityToggle('licenciaConducir')}
            </div>
          </div>

          {/* Ajuste Manual: Datos Personales */}
          {renderManualAdjustment?.('datos-personales') && (
            <div className="pt-2 border-t border-[var(--color-neutral-border)]">
              {renderManualAdjustment('datos-personales')}
            </div>
          )}
        </div>
      </PanelSection>

      {/* 3. Contacto */}
      <PanelSection 
        icon={<Phone className="w-4 h-4 text-[var(--ui-secondary)]" />} 
        title="Contacto"
      >
        <div className="space-y-3 pt-1">
          <Field
            id="phone"
            label="Teléfono Celular / WhatsApp"
            value={personalInfo.phone || ''}
            onChange={(e: any) => onChange({ phone: e.target.value })}
            placeholder="Ej: 387-155121515"
          />

          <Field
            id="address"
            label="Domicilio y Barrio"
            value={personalInfo.address || ''}
            onChange={(e: any) => onChange({ address: e.target.value })}
            placeholder="Ej: Manzana 751A Casa 11 - Ciudad Valdivia"
          />

          <Field
            id="cityProvince"
            label="Ciudad / Provincia / País"
            value={personalInfo.cityProvince || ''}
            onChange={(e: any) => onChange({ cityProvince: e.target.value })}
            placeholder="Ej: Salta, Salta, Argentina"
          />

          {/* Ajuste Manual: Contacto */}
          {renderManualAdjustment?.('contacto') && (
            <div className="pt-2 border-t border-[var(--color-neutral-border)]">
              {renderManualAdjustment('contacto')}
            </div>
          )}
        </div>
      </PanelSection>
    </>
  );
}
