import React, { useRef, useState } from 'react';
import { ShieldCheck, Download, Upload, KeyRound, LockKeyhole, FileSpreadsheet, HardDrive, Copy } from 'lucide-react';
import { Field } from '../../../shared/core/ui/Field';
import { PanelSection } from '../../../shared/core/ui/PanelSection';
import { FactStepBaseProps } from '../facturadorStepsShared';
import { VaultSession } from '../domain/facturadorTypes';
import { isBackupDue } from '../domain/vaultStorage';
import { formatRecoveryKey } from '../domain/vaultCrypto';
import { downloadBlob } from '../../../shared/core/utils/downloadUtils';
import { radius } from '../../../shared/core/uiDesignSystem';

interface FactRespaldoStepProps extends FactStepBaseProps {
  session: VaultSession;
  onExportPortable: () => Promise<void>;
  onExportXlsx: () => Promise<void>;
  onImportXlsx: (file: File) => Promise<void>;
  onImportPortable: (file: File, password: string) => Promise<void>;
  onRegenerateRecoveryKey: () => Promise<string>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onLock: () => void;
}

/** Paso 8 — Respaldo en pendrive, Excel real, contraseña y bloqueo. */
export const FactRespaldoStep: React.FC<FactRespaldoStepProps> = ({
  vault,
  session,
  updateVault,
  onExportPortable,
  onExportXlsx,
  onImportXlsx,
  onImportPortable,
  onRegenerateRecoveryKey,
  onChangePassword,
  onLock,
  notify,
}) => {
  const [portablePassword, setPortablePassword] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const portableInput = useRef<HTMLInputElement>(null);
  const xlsxInput = useRef<HTMLInputElement>(null);

  const due = isBackupDue(vault.backup);
  const hasRecovery = Boolean(session.envelope.wrappedDekRecovery);

  const handlePortable = async () => {
    await onExportPortable();
    updateVault((prev) => ({ ...prev, backup: { ...prev.backup, lastBackupAt: new Date().toISOString() } }));
  };

  const changePassword = async () => {
    if (nextPassword.length < 8) {
      notify.error('La contraseña nueva necesita al menos 8 caracteres.');
      return;
    }
    if (nextPassword !== confirmPassword) {
      notify.error('Las contraseñas nuevas no coinciden.');
      return;
    }
    setChanging(true);
    try {
      await onChangePassword(currentPassword, nextPassword);
      setCurrentPassword('');
      setNextPassword('');
      setConfirmPassword('');
      notify.success('Contraseña cambiada. Tus datos siguen intactos.');
    } catch {
      notify.error('No pudimos cambiar la contraseña. Revisá la actual.');
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" /> Bóveda y pendrive
        </h2>
        <p className="text-xs text-[var(--ui-text-secondary)] mt-1">
          Tus datos viven cifrados en esta computadora. Hacé un respaldo seguido para no perderlos.
        </p>
      </div>

      {due ? (
        <div className="p-3 bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)] text-[11px] text-[var(--color-status-warning-text)]" style={{ borderRadius: radius.control }}>
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <HardDrive className="w-3.5 h-3.5" /> Toca respaldar
          </div>
          {vault.backup.lastBackupAt
            ? `Tu último respaldo fue el ${new Date(vault.backup.lastBackupAt).toLocaleDateString('es-AR')}.`
            : 'Todavía no guardaste una copia fuera de esta computadora.'}
        </div>
      ) : null}

      <PanelSection
        icon={<HardDrive className="w-4 h-4" />}
        title="Copia para pendrive"
        helpText="Genera un archivo .leecv-fact cifrado con empresa, clientes, catálogo, comprobantes y logo. Sin tu contraseña no se puede abrir."
      >
        <div className="space-y-2">
          <button
            type="button"
            onClick={handlePortable}
            className="w-full py-2 text-xs font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] inline-flex items-center justify-center gap-1.5"
            style={{ borderRadius: radius.control }}
          >
            <Download className="w-4 h-4" /> Descargar copia cifrada
          </button>

          <div className="pt-2 border-t border-[var(--ui-border)] space-y-2">
            <p className="text-[11px] font-bold text-[var(--ui-text-primary)]">Restaurar una copia</p>
            <input
              ref={portableInput}
              type="file"
              accept=".leecv-fact,application/zip"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.currentTarget.value = '';
                if (file) void onImportPortable(file, portablePassword);
              }}
            />
            <Field
              type="password"
              label="Contraseña de esa copia"
              value={portablePassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPortablePassword(e.target.value)}
              helperText="La contraseña que tenía la bóveda cuando hiciste ese respaldo."
            />
            <button
              type="button"
              onClick={() => portableInput.current?.click()}
              disabled={!portablePassword}
              className="w-full py-2 text-xs font-bold bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
              style={{ borderRadius: radius.control }}
            >
              <Upload className="w-4 h-4" /> Elegir archivo y restaurar
            </button>
            <p className="text-[10px] text-[var(--color-status-warning-text)]">
              Restaurar reemplaza los datos actuales de esta bóveda por los del archivo.
            </p>
          </div>
        </div>
      </PanelSection>

      <PanelSection icon={<FileSpreadsheet className="w-4 h-4" />} title="Planillas (.xlsx)">
        <div className="space-y-2">
          <button
            type="button"
            onClick={onExportXlsx}
            className="w-full py-2 text-xs font-bold bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] inline-flex items-center justify-center gap-1.5"
            style={{ borderRadius: radius.control }}
          >
            <Download className="w-4 h-4" /> Descargar Excel con 5 hojas
          </button>
          <input
            ref={xlsxInput}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.currentTarget.value = '';
              if (file) void onImportXlsx(file);
            }}
          />
          <button
            type="button"
            onClick={() => xlsxInput.current?.click()}
            className="w-full py-2 text-xs font-bold bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] inline-flex items-center justify-center gap-1.5"
            style={{ borderRadius: radius.control }}
          >
            <Upload className="w-4 h-4" /> Importar catálogo y clientes desde Excel
          </button>
          <p className="text-[10px] text-[var(--color-status-warning-text)]">
            El Excel no está cifrado: guardalo en un lugar seguro y no lo compartas.
          </p>
        </div>
      </PanelSection>

      <PanelSection icon={<KeyRound className="w-4 h-4" />} title="Llave de Rescate">
        <div className="space-y-2">
          <p className="text-[11px] text-[var(--ui-text-secondary)]">
            {hasRecovery
              ? 'Tenés una Llave de Rescate guardada en esta bóveda.'
              : 'Esta bóveda no tiene Llave de Rescate: si olvidás la contraseña, no hay forma de entrar.'}
          </p>
          <button
            type="button"
            onClick={async () => setNewKey(await onRegenerateRecoveryKey())}
            className="w-full py-2 text-xs font-bold bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] inline-flex items-center justify-center gap-1.5"
            style={{ borderRadius: radius.control }}
          >
            <KeyRound className="w-4 h-4" /> {hasRecovery ? 'Generar llave nueva' : 'Crear Llave de Rescate'}
          </button>
          {newKey ? (
            <div className="p-2 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] space-y-2" style={{ borderRadius: radius.control }}>
              <p className="text-[10px] font-bold text-[var(--color-status-warning-text)]">
                Anotá esta llave: no se vuelve a mostrar.
              </p>
              <p className="font-mono text-xs font-bold text-center select-all text-[var(--ui-text-primary)]">
                {formatRecoveryKey(newKey)}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(formatRecoveryKey(newKey))}
                  className="py-1.5 text-[10px] font-bold bg-[var(--ui-bg-card)] border border-[var(--ui-border)] inline-flex items-center justify-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copiar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadBlob(
                      new Blob([`Llave de Rescate FacturLee\n\n${formatRecoveryKey(newKey)}\n`], { type: 'text/plain;charset=utf-8' }),
                      'FacturLee-Llave-de-Rescate.txt'
                    )
                  }
                  className="py-1.5 text-[10px] font-bold bg-[var(--ui-bg-card)] border border-[var(--ui-border)] inline-flex items-center justify-center gap-1"
                >
                  <Download className="w-3 h-3" /> Descargar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </PanelSection>

      <PanelSection icon={<LockKeyhole className="w-4 h-4" />} title="Contraseña">
        <div className="space-y-2">
          <Field
            type="password"
            label="Contraseña actual"
            value={currentPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Field
            type="password"
            label="Contraseña nueva"
            value={nextPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNextPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Field
            type="password"
            label="Repetir la nueva"
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={changePassword}
            disabled={changing || !currentPassword || !nextPassword}
            className="w-full py-2 text-xs font-bold bg-[var(--color-secondary-base)] text-[var(--color-secondary-on-base)] disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
            style={{ borderRadius: radius.control }}
          >
            <KeyRound className="w-4 h-4" /> {changing ? 'Cambiando…' : 'Cambiar contraseña'}
          </button>
          <button
            type="button"
            onClick={onLock}
            className="w-full py-2 text-xs font-bold bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--color-status-danger-text)] inline-flex items-center justify-center gap-1.5"
            style={{ borderRadius: radius.control }}
          >
            <LockKeyhole className="w-4 h-4" /> Bloquear ahora
          </button>
        </div>
      </PanelSection>
    </div>
  );
};
