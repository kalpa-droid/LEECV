import React, { useState } from 'react';
import { Camera, Palette } from 'lucide-react';
import { PanelSection } from '../../../../../shared/core/ui/PanelSection';
import PhotoCropperModal from '../../PhotoCropperModal';
import { extractDominantCornerColor } from '../../../../../shared/core/pdf-engine/utils/extractDominantEdgeColor';
import { useToast } from '../../../../../shared/core/ui/Toast';

interface Props {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export function CardLogoSection({ cvData, setCvData }: Props) {
  const { showSuccess } = useToast();
  const [isLogoCropperOpen, setIsLogoCropperOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PanelSection icon={<Camera className="w-4 h-4 text-[var(--color-accent-text)]" />} title="Logotipo de Marca / Empresa (Opcional)">
        <div className="p-3 bg-[var(--ui-bg-card)] rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] space-y-3">
          <div className="flex items-center gap-4 p-3 rounded-[var(--radius-card)] bg-[var(--color-secondary-muted)] border border-[var(--color-neutral-border)]">
            <div className={`w-16 h-12 rounded-[var(--radius-control)] overflow-hidden bg-[var(--color-neutral-surface)] flex items-center justify-center border border-[var(--color-neutral-border-strong)] shadow-[var(--shadow-raised)]`}>
              {cvData?.cardOverrides?.logoDataUrl ? (
                <img src={cvData.cardOverrides.logoDataUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Camera className="w-5 h-5 text-[var(--color-secondary-text)]" />
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <p className="text-xs font-bold text-[var(--color-secondary-text)]">
                {cvData?.cardOverrides?.logoDataUrl ? 'Logotipo de Marca Cargado' : 'Sin Logotipo Subido'}
              </p>
              <p className="text-[11px] text-[var(--color-neutral-text-secondary)] leading-tight">
                Recomendado: PNG con fondo transparente o JPG. Se recortará reutilizando el visor de imagen.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsLogoCropperOpen(true)}
                  className="px-2.5 py-1 text-xs font-bold rounded-[var(--radius-control)] bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] hover:opacity-90 transition cursor-pointer flex items-center gap-1"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {cvData?.cardOverrides?.logoDataUrl ? 'Cambiar / Recortar Logo' : 'Subir / Recortar Logo'}
                </button>

                {cvData?.cardOverrides?.logoDataUrl && (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        const color = await extractDominantCornerColor(cvData.cardOverrides.logoDataUrl);
                        setCvData((prev: any) => ({
                          ...prev,
                          cardOverrides: { ...(prev?.cardOverrides || {}), cardBgColor: color }
                        }));
                        showSuccess(`Fondo de tarjeta adaptado al color del logo (${color}).`);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-[var(--radius-control)] border border-[var(--color-neutral-border)] bg-[var(--ui-bg-card)] text-[var(--color-neutral-text-primary)] hover:bg-[var(--color-neutral-surface-muted)] transition cursor-pointer flex items-center gap-1"
                      title="Extrae el color de fondo de la imagen del logo y lo asigna al fondo de la tarjeta"
                    >
                      <Palette className="w-3 h-3 text-[var(--color-accent-text)]" />
                      Usar color del logo como fondo
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCvData((prev: any) => {
                          const copy = { ...(prev?.cardOverrides || {}) };
                          delete copy.logoDataUrl;
                          return { ...prev, cardOverrides: copy };
                        });
                        showSuccess('Logotipo quitado de la tarjeta.');
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-[var(--radius-control)] text-[var(--color-status-error-bright)] hover:bg-[var(--color-status-error-bg)] transition cursor-pointer"
                    >
                      Quitar Logo
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </PanelSection>

      {isLogoCropperOpen && (
        <PhotoCropperModal
          isOpen={isLogoCropperOpen}
          onClose={() => setIsLogoCropperOpen(false)}
          onSavePhoto={(croppedDataUrl: string) => {
            setCvData((prev: any) => ({
              ...prev,
              cardOverrides: { ...(prev?.cardOverrides || {}), logoDataUrl: croppedDataUrl }
            }));
            showSuccess('Logotipo guardado correctamente en la tarjeta.');
          }}
          currentPhoto={cvData?.cardOverrides?.logoDataUrl || ''}
          title="Recortador de Logotipo de Marca"
          canvasWidth={320}
          canvasHeight={200}
          exportFormat="image/png"
        />
      )}
    </div>
  );
}
