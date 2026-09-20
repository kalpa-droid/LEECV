import React from 'react';
import { User, Camera, Phone } from 'lucide-react';
import { Field } from './Field';
import { PanelSection } from './PanelSection';
import { colorSystem, typeScale, button, elevationSystem } from '../uiDesignSystem';

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
}

export function PersonalInfoFields({
  personalInfo = {},
  onChange,
  onOpenPhotoCropper,
  renderManualAdjustment
}: PersonalInfoFieldsProps) {
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
            <Field
              id="dni"
              label="DNI"
              value={personalInfo.dni || ''}
              onChange={(e: any) => onChange({ dni: e.target.value })}
              placeholder="Ej: 29334206"
            />
            <Field
              id="cuit"
              label="CUIT / CUIL"
              value={personalInfo.cuit || ''}
              onChange={(e: any) => onChange({ cuit: e.target.value })}
              placeholder="Ej: 27-29334206-2"
            />
          </div>

          <Field
            id="birthDate"
            label="Fecha de Nacimiento"
            type="date"
            value={personalInfo.birthDate || ''}
            onChange={(e: any) => onChange({ birthDate: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              id="nacionalidad"
              label="Nacionalidad"
              value={personalInfo.nacionalidad || ''}
              onChange={(e: any) => onChange({ nacionalidad: e.target.value })}
              placeholder="Ej: Argentina"
            />
            <Field
              id="estadoCivil"
              label="Estado Civil"
              value={personalInfo.estadoCivil || ''}
              onChange={(e: any) => onChange({ estadoCivil: e.target.value })}
              placeholder="Ej: Soltero/a, Casado/a"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              id="disponibilidad"
              label="Disponibilidad (Viaje / Horarios)"
              value={personalInfo.disponibilidad || ''}
              onChange={(e: any) => onChange({ disponibilidad: e.target.value })}
              placeholder="Ej: Inmediata / Relocalización"
            />
            <Field
              id="licenciaConducir"
              label="Licencia de Conducir"
              value={personalInfo.licenciaConducir || ''}
              onChange={(e: any) => onChange({ licenciaConducir: e.target.value })}
              placeholder="Ej: Clase B1 (Autos particulares)"
            />
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
