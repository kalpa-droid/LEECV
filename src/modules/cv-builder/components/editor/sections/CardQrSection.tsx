import React from 'react';
import { QrCode } from 'lucide-react';
import { PanelSection } from '../PanelSection';

interface Props {
  cvData: any;
  setCvData: React.Dispatch<React.SetStateAction<any>>;
}

export function CardQrSection({ cvData, setCvData }: Props) {
  return (
    <div className="space-y-6">
      <PanelSection icon={<QrCode className="w-4 h-4" />} title="Código QR Interactivo">
        <div className="p-4 bg-[var(--ui-bg-card)] rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] space-y-3">
          <label className="block text-xs font-bold text-[var(--color-neutral-text-primary)]">Modo del Código QR</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 p-2.5 rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] cursor-pointer hover:bg-[var(--color-neutral-surface-muted)] transition">
              <input
                type="radio"
                name="qrMode"
                value="vcard"
                checked={(cvData?.qrMode || 'vcard') === 'vcard'}
                onChange={() => {
                  setCvData((prev: any) => ({ ...prev, qrMode: 'vcard' }));
                }}
                className="accent-[var(--color-accent-base)]"
              />
              <div className="text-xs">
                <span className="font-bold text-[var(--color-neutral-text-primary)] block">vCard (Guardar contacto en agenda)</span>
                <span className="text-[11px] text-[var(--color-neutral-text-secondary)]">Al escanear abre la agenda para guardar nombre, teléfono y mail.</span>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-[var(--radius-card)] border border-[var(--color-neutral-border)] cursor-pointer hover:bg-[var(--color-neutral-surface-muted)] transition">
              <input
                type="radio"
                name="qrMode"
                value="public_link"
                checked={cvData?.qrMode === 'public_link'}
                onChange={() => {
                  setCvData((prev: any) => ({ ...prev, qrMode: 'public_link' }));
                }}
                className="accent-[var(--color-accent-base)]"
              />
              <div className="text-xs">
                <span className="font-bold text-[var(--color-neutral-text-primary)] block">Link Directo a Perfil Web</span>
                <span className="text-[11px] text-[var(--color-neutral-text-secondary)]">Al escanear abre la versión web publicada del CV.</span>
              </div>
            </label>
          </div>
        </div>
      </PanelSection>
    </div>
  );
}
