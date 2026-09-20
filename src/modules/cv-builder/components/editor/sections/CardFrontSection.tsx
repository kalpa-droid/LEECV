import React from 'react';
import { PenTool, RotateCw } from 'lucide-react';
import { PanelSection } from '../../../../../shared/core/ui/PanelSection';
import { useToast } from '../../../../../shared/core/ui/Toast';

interface Props {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export function CardFrontSection({ cvData, setCvData }: Props) {
  const { showSuccess } = useToast();

  const fields = [
    { field: 'fullName', label: 'Nombre Completo', placeholder: 'Ej: Juan Pérez', cvFallback: `${cvData?.personalInfo?.surname || ''} ${cvData?.personalInfo?.givenNames || ''}`.trim() || cvData?.personalInfo?.fullName || '' },
    { field: 'role', label: 'Cargo / Profesión', placeholder: 'Ej: Diseñador UI/UX & Desarrollador', cvFallback: cvData?.roles?.[0] || cvData?.profession?.[0]?.degree || '' },
    { field: 'phone', label: 'Teléfono de Contacto', placeholder: 'Ej: +54 11 1234-5678', cvFallback: cvData?.personalInfo?.phone || '' },
    { field: 'email', label: 'Correo Electrónico', placeholder: 'Ej: juan@ejemplo.com', cvFallback: cvData?.personalInfo?.email || '' },
    { field: 'website', label: 'Sitio Web / Portafolio', placeholder: 'Ej: www.midominio.com', cvFallback: cvData?.personalInfo?.website || cvData?.personalInfo?.facebook || '' },
    { field: 'address', label: 'Ciudad / Dirección', placeholder: 'Ej: Buenos Aires, Argentina', cvFallback: cvData?.personalInfo?.cityProvince || cvData?.personalInfo?.address || '' }
  ];

  return (
    <div className="space-y-6">
      <PanelSection icon={<PenTool className="w-4 h-4" />} title="Datos del Frente">
        <div className="p-4 bg-[var(--ui-bg-card)] rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] space-y-3">
          {fields.map(({ field, label, placeholder, cvFallback }) => {
            const hasOverride = cvData?.cardOverrides?.[field] !== undefined;
            const currentValue = cvData?.cardOverrides?.[field] ?? cvFallback;

            return (
              <div key={field} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)]">{label}</label>
                  {hasOverride && cvFallback && (
                    <button
                      type="button"
                      onClick={() => {
                        setCvData((prev: any) => {
                          const copy = { ...(prev?.cardOverrides || {}) };
                          delete copy[field];
                          return { ...prev, cardOverrides: copy };
                        });
                        showSuccess(`Valor restaurado del CV para ${label}.`);
                      }}
                      className="text-[10px] font-bold text-[var(--color-accent-text)] hover:underline flex items-center gap-1 cursor-pointer"
                      title="Restaurar valor original del CV"
                    >
                      <RotateCw className="w-3 h-3" /> Restaurar del CV
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={currentValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCvData((prev: any) => ({
                      ...prev,
                      cardOverrides: { ...(prev?.cardOverrides || {}), [field]: val }
                    }));
                  }}
                  placeholder={placeholder}
                  className="w-full text-xs p-2.5 rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-bold outline-none focus:border-[var(--color-accent-base)] transition"
                />
              </div>
            );
          })}
        </div>
      </PanelSection>
    </div>
  );
}
