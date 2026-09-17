import React from 'react';
import { Trash2, PenTool } from 'lucide-react';
import { Field } from '../../../../../shared/core/ui/Field';
import { SectionManualAdjustment } from '../SectionManualAdjustment';
import { SectionToggle } from './ui/SectionToggle';
import { radius, elevationSystem, button } from '../../../../../shared/core/uiDesignSystem';
import { resolveDisplayName } from '../../../../../shared/core/utils/cvDataSchema';

interface FirmaSectionProps {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
  onOpenSignature: () => void;
}

export const FirmaSection: React.FC<FirmaSectionProps> = ({ cvData, setCvData, onOpenSignature }) => {
  return (
    <div className="space-y-4">
      <SectionToggle sectionId="firma" title="Firma Digital" cvData={cvData} setCvData={setCvData} />

      {cvData?.sectionVisibility?.firma !== false && (
        <>
          <div className={`p-4 bg-[var(--ui-bg-card)] rounded-[${radius.modal}] border-2 border-[var(--color-neutral-border)] space-y-3 text-center ${elevationSystem.raised}`}>
            {cvData.signature?.dataUrl ? (
              <div className="space-y-2">
                <div className={`bg-[var(--color-neutral-surface-warm)] p-3 rounded-[${radius.card}] border border-[var(--color-accent-amber)]`}>
                  <img src={cvData.signature.dataUrl} alt="Firma" className="h-16 mx-auto object-contain" />
                </div>
                <button
                  onClick={() => {
                    setCvData((prev: any) => ({
                      ...prev,
                      signature: {
                        ...prev.signature,
                        dataUrl: ''
                      }
                    }));
                  }}
                  className={`flex items-center justify-center gap-1 mx-auto px-3 py-1 bg-[var(--color-status-danger-muted)] hover:opacity-80 text-[var(--color-status-danger-text)] text-xs font-bold rounded-[${radius.control}] transition cursor-pointer`}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Quitar Imagen de Firma
                </button>
              </div>
            ) : (
              <p className="text-xs text-[var(--color-neutral-text-primary)] font-bold italic">No has dibujado o subido una imagen de firma aún.</p>
            )}

            <button
              onClick={onOpenSignature}
              className={`w-full flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-[${radius.card}] transition cursor-pointer ${button.primary}`}
            >
              <PenTool className="w-4 h-4" /> Abrir Tablero de Firma (Dibujar / Subir)
            </button>
          </div>

          <div className={`p-4 bg-[var(--ui-bg-card)] rounded-[${radius.modal}] border-2 border-[var(--color-neutral-border)] space-y-3 ${elevationSystem.raised}`}>
            <h4 className="text-xs font-black text-[var(--color-neutral-text-primary)] uppercase">Datos del Pie de Firma</h4>
            
            {/* 1. Nombre Automático */}
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-neutral-text-primary)] mb-1 flex items-center justify-between">
                <span>Nombre del Firmante</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-secondary-muted)] text-[var(--color-secondary-text)] font-extrabold">Automático</span>
              </label>
              <div className={`w-full text-xs p-2.5 rounded-[${radius.card}] border border-[var(--color-neutral-border)] bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-primary)] font-extrabold ${elevationSystem.raised}`}>
                {resolveDisplayName(cvData.personalInfo)}
              </div>
            </div>

            {/* 2. Selector de Título Profesional */}
            {(() => {
              const titleList: string[] = Array.from(new Set([
                ...(cvData.profession || []).map((p: any) => p.degree).filter(Boolean),
                ...(cvData.education || []).map((e: any) => e.degree).filter(Boolean)
              ]));
              const currentSelectedRole = cvData.signature?.signerRole !== undefined 
                ? cvData.signature.signerRole 
                : (titleList[0] || '');

              return (
                <div>
                  <label className="block text-[11px] font-bold text-[var(--color-neutral-text-primary)] mb-1">
                    Título Profesional (Registros de Profesión)
                  </label>
                  {titleList.length > 0 ? (
                    <select
                      value={currentSelectedRole}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCvData((prev: any) => ({
                          ...prev,
                          signature: { ...(prev.signature || {}), signerRole: val }
                        }));
                      }}
                      className={`w-full text-xs p-2.5 rounded-[${radius.card}] border-2 border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] font-bold outline-none focus:border-[var(--color-accent-base)] focus:ring-2 focus:ring-[var(--color-accent-rose-muted)] cursor-pointer transition`}
                    >
                      {titleList.map((t, idx) => (
                        <option key={idx} value={t}>{t}</option>
                      ))}
                    </select>
                  ) : (
                    <div className={`w-full text-xs p-2.5 rounded-[${radius.card}] border border-[var(--color-status-warning-base)]/30 bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)] font-bold`}>
                      ⚠️ No hay títulos agregados en la sección "Títulos Profesionales".
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 3. Selector de Fecha */}
            <div>
              <Field 
                label="Fecha de Firma"
                type="date"
                value={cvData.signature?.date || new Date().toISOString().split('T')[0]}
                onChange={(e: any) => {
                  const val = e.target.value;
                  setCvData((prev: any) => ({
                    ...prev,
                    signature: { ...(prev.signature || {}), date: val }
                  }));
                }}
              />
            </div>

            {/* 4. Lugar */}
            <div>
              <Field 
                label="Lugar / Ciudad de Emisión de la Firma"
                type="text"
                value={cvData.signature?.signerCity || cvData.personalInfo?.cityProvince || ''}
                onChange={(e: any) => {
                  const val = e.target.value;
                  setCvData((prev: any) => ({
                    ...prev,
                    signature: { ...(prev.signature || {}), signerCity: val }
                  }));
                }}
                placeholder="Ej: Salta, Argentina"
              />
            </div>
          </div>
          <div className="pt-2 border-t border-[var(--color-neutral-border)]">
            <SectionManualAdjustment sectionId="firma" cvData={cvData} setCvData={setCvData} />
          </div>
        </>
      )}
    </div>
  );
};
