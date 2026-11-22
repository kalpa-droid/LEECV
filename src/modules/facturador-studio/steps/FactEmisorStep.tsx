import React, { useState } from 'react';
import { Store, Upload, Trash2 } from 'lucide-react';
import { Field } from '../../../shared/core/ui/Field';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { CONDICIONES_IVA, FactStepBaseProps } from '../facturadorStepsShared';
import { EmpresaConfig } from '../domain/facturadorTypes';
import { isValidCuit, isValidEmail } from '../../../shared/core/utils/validationEngine';
import { readLogoFile, svgToDataUrl } from '../domain/svgLogoRasterizer';
import { radius } from '../../../shared/core/uiDesignSystem';

/** Paso 1 — Datos del negocio emisor + logo. */
export const FactEmisorStep: React.FC<FactStepBaseProps> = ({ vault, updateVault, notify }) => {
  const empresa = vault.empresa;
  const [logoError, setLogoError] = useState<string | null>(null);

  const patch = (values: Partial<EmpresaConfig>) =>
    updateVault((prev) => ({ ...prev, empresa: { ...prev.empresa, ...values } }));

  const handleLogo = async (file: File | undefined) => {
    if (!file) return;
    setLogoError(null);
    try {
      const logo = await readLogoFile(file);
      patch({ logoSvgRaw: logo.svgRaw, logoPngDataUrl: logo.pngDataUrl });
      notify.success('Logo cargado.');
    } catch {
      setLogoError('No pudimos leer ese archivo. Usá un SVG o un PNG.');
    }
  };

  const logoSrc = empresa.logoPngDataUrl || (empresa.logoSvgRaw ? svgToDataUrl(empresa.logoSvgRaw) : '');

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Store className="w-5 h-5" /> Tu negocio
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)] mt-1">
          Estos datos aparecen en el encabezado de cada comprobante. Quedan cifrados en esta computadora.
        </p>
      </div>

      <PanelSection icon={<Store className="w-4 h-4" />} title="Datos fiscales">
        <div className="space-y-3">
          <Field
            label="Razón social"
            value={empresa.razonSocial}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ razonSocial: e.target.value })}
            placeholder="Ej: Panadería La Espiga S.A."
          />
          <Field
            label="Nombre de fantasía"
            value={empresa.nombreFantasia}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ nombreFantasia: e.target.value })}
            placeholder="Cómo te conoce la gente"
          />
          <Field
            label="CUIT"
            value={empresa.cuit}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ cuit: e.target.value })}
            placeholder="20-12345678-9"
            error={empresa.cuit && !isValidCuit(empresa.cuit) ? 'Ese CUIT no parece válido.' : null}
          />
          <Field
            as="select"
            label="Condición frente al IVA"
            value={empresa.condicionIva}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => patch({ condicionIva: e.target.value as EmpresaConfig['condicionIva'] })}
          >
            {CONDICIONES_IVA.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Field>
          <Field
            label="Domicilio"
            value={empresa.domicilio}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ domicilio: e.target.value })}
            placeholder="Calle y número"
          />
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Localidad"
              value={empresa.localidad}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ localidad: e.target.value })}
            />
            <Field
              label="Provincia"
              value={empresa.provincia}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ provincia: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Teléfono"
              value={empresa.telefono}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ telefono: e.target.value })}
            />
            <Field
              label="Email"
              value={empresa.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ email: e.target.value })}
              error={empresa.email && !isValidEmail(empresa.email) ? 'Ese email no parece válido.' : null}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Ingresos Brutos"
              value={empresa.ingresosBrutos}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ ingresosBrutos: e.target.value })}
              helperText="Opcional"
            />
            <Field
              type="date"
              label="Inicio de actividades"
              value={empresa.inicioActividades}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => patch({ inicioActividades: e.target.value })}
              helperText="Opcional"
            />
          </div>
        </div>
      </PanelSection>

      <PanelSection icon={<Upload className="w-4 h-4" />} title="Logo">
        <div className="space-y-3">
          {logoSrc ? (
            <div className="flex items-center gap-3 p-3 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)]" style={{ borderRadius: radius.control }}>
              <img src={logoSrc} alt="Logo del negocio" className="max-h-14 max-w-[120px] object-contain bg-white p-1" />
              <button
                type="button"
                onClick={() => patch({ logoSvgRaw: undefined, logoPngDataUrl: undefined })}
                className="ml-auto text-xs font-bold text-[var(--color-status-danger-text)] inline-flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Quitar
              </button>
            </div>
          ) : null}
          <label className="block">
            <span className="block text-xs font-bold mb-1">Subir logo (SVG o PNG)</span>
            <input
              type="file"
              accept=".svg,image/svg+xml,image/png"
              onChange={(e) => void handleLogo(e.target.files?.[0])}
              className="block w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-bold file:bg-[var(--color-accent-muted)] file:text-[var(--color-accent-text)] cursor-pointer"
            />
          </label>
          {logoError ? <p className="text-xs font-semibold text-[var(--color-status-danger-text)]">{logoError}</p> : null}
          <p className="text-[10px] text-[var(--ui-text-secondary)]">
            El SVG se guarda tal cual y se convierte a PNG para que salga bien impreso. El archivo viaja dentro de tu bóveda cifrada.
          </p>
        </div>
      </PanelSection>
    </div>
  );
};
