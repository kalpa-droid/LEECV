import React, { useState } from 'react';
import { ShieldCheck, KeyRound, Download, Copy, LockKeyhole, FileCheck2 } from 'lucide-react';
import { Field } from '../../shared/core/ui/Field';
import { colorSystem, radius, elevationSystem } from '../../shared/core/uiDesignSystem';
import { downloadBlob } from '../../shared/core/utils/downloadUtils';
import { formatRecoveryKey } from '../../shared/core/facturador-engine/vaultCrypto';

interface VaultLockScreenProps {
  phase: 'loading' | 'needs_setup' | 'locked';
  error: string | null;
  isBusy: boolean;
  onCreate: (password: string, withRecoveryKey: boolean) => Promise<string | undefined>;
  onUnlock: (password: string) => Promise<void>;
  onUnlockRecovery: (key: string) => Promise<void>;
}

const ERROR_TEXT: Record<string, string> = {
  clave_incorrecta: 'Esa contraseña no es la correcta. Probá de nuevo o usá tu Llave de Rescate.',
  llave_invalida: 'La Llave de Rescate no es válida. Revisá que estén los 24 caracteres.',
  no_se_pudo_abrir: 'No pudimos abrir la bóveda. Revisá los datos e intentá otra vez.',
  no_se_pudo_crear: 'No pudimos crear la bóveda. Probá con otra contraseña.',
};

/**
 * Pantalla de entrada a FacturLee: crear la bóveda la primera vez o abrirla
 * con contraseña / Llave de Rescate. Sin red: todo ocurre en este navegador.
 */
export const VaultLockScreen: React.FC<VaultLockScreenProps> = ({
  phase,
  error,
  isBusy,
  onCreate,
  onUnlock,
  onUnlockRecovery,
}) => {
  const [mode, setMode] = useState<'password' | 'recovery'>('password');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [withRecovery, setWithRecovery] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [keySaved, setKeySaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSetup = phase === 'needs_setup';
  const busy = isBusy || phase === 'loading';

  const handleCreate = async () => {
    setLocalError(null);
    if (password.trim().length < 8) {
      setLocalError('Usá una contraseña de al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Las dos contraseñas no coinciden.');
      return;
    }
    const key = await onCreate(password, withRecovery);
    if (key) setCreatedKey(key);
  };

  const handleUnlock = async () => {
    setLocalError(null);
    if (mode === 'recovery') {
      await onUnlockRecovery(recoveryKey.trim());
    } else {
      await onUnlock(password);
    }
  };

  const copyKey = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(formatRecoveryKey(createdKey));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setLocalError('No pudimos copiar. Anotá la llave a mano.');
    }
  };

  const downloadKey = () => {
    if (!createdKey) return;
    const body = [
      'LEECV — FacturLee',
      'Llave de Rescate (guardala fuera de esta computadora)',
      '',
      formatRecoveryKey(createdKey),
      '',
      'Con esta llave podés abrir tu bóveda si olvidás la contraseña.',
      'Nadie de LEECV puede recuperarla por vos: no se guarda en ningún servidor.',
    ].join('\n');
    downloadBlob(new Blob([body], { type: 'text/plain;charset=utf-8' }), 'FacturLee-Llave-de-Rescate.txt');
  };

  // Paso 2 tras crear la bóveda: mostrar la llave UNA sola vez.
  if (createdKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--ui-bg-panel)] p-4">
        <div className="w-full max-w-lg bg-[var(--ui-bg-card)] border border-[var(--ui-border)] p-6 space-y-4" style={{ borderRadius: radius.card }}>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" style={{ color: colorSystem.accent.base }} />
            <h1 className="text-lg font-bold text-[var(--ui-text-primary)]">Guardá tu Llave de Rescate</h1>
          </div>
          <p className="text-xs text-[var(--ui-text-secondary)]">
            Esta llave abre tu bóveda si algún día olvidás la contraseña. Se muestra{' '}
            <strong>una sola vez</strong> y no se guarda en ningún servidor.
          </p>
          <div className="p-3 text-center bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] select-all" style={{ borderRadius: radius.control }}>
            <span className="font-mono text-base font-bold tracking-wider text-[var(--ui-text-primary)]">
              {formatRecoveryKey(createdKey)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyKey} className="px-3 py-2 text-xs font-bold bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] inline-flex items-center gap-1.5" style={{ borderRadius: radius.control }}>
              <Copy className="w-3.5 h-3.5" /> {copied ? 'Copiada' : 'Copiar'}
            </button>
            <button type="button" onClick={downloadKey} className="px-3 py-2 text-xs font-bold bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] inline-flex items-center gap-1.5" style={{ borderRadius: radius.control }}>
              <Download className="w-3.5 h-3.5" /> Descargar .txt
            </button>
          </div>
          <label className="flex items-start gap-2 text-xs text-[var(--ui-text-primary)] cursor-pointer">
            <input type="checkbox" checked={keySaved} onChange={(e) => setKeySaved(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--color-accent-base)]" />
            <span>Ya guardé la llave en un lugar seguro (papel o un pendrive).</span>
          </label>
          <button
            type="button"
            disabled={!keySaved}
            onClick={() => setCreatedKey(null)}
            className="w-full py-2.5 text-sm font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] disabled:opacity-40"
            style={{ borderRadius: radius.control }}
          >
            Entrar a FacturLee
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--ui-bg-panel)] p-4">
      <div className="w-full max-w-md bg-[var(--ui-bg-card)] border border-[var(--ui-border)] p-6 space-y-4" style={{ borderRadius: radius.card, boxShadow: elevationSystem.floating }}>
        <div className="text-center space-y-1">
          <div className="mx-auto w-12 h-12 flex items-center justify-center bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]" style={{ borderRadius: radius.card }}>
            <LockKeyhole className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-[var(--ui-text-primary)]">FacturLee</h1>
          <p className="text-xs text-[var(--ui-text-secondary)]">
            Tus datos fiscales quedan en esta computadora, protegidos con tu contraseña. No se suben a ningún servidor.
          </p>
        </div>

        {isSetup ? (
          <>
            <div className="p-3 bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)] text-[11px] text-[var(--color-status-warning-text)]" style={{ borderRadius: radius.control }}>
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <FileCheck2 className="w-3.5 h-3.5" /> Antes de empezar
              </div>
              FacturLee hace presupuestos y comprobantes internos. Sin CAE de ARCA no son facturas fiscales.
            </div>
            <Field
              label="Contraseña de la bóveda"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              helperText="Mínimo 8 caracteres. Si la olvidás, solo podés entrar con la Llave de Rescate."
              autoComplete="new-password"
            />
            <Field
              label="Repetí la contraseña"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            <label className="flex items-center gap-2 text-xs text-[var(--ui-text-primary)] cursor-pointer">
              <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} className="w-4 h-4 accent-[var(--color-accent-base)]" />
              Mostrar contraseña
            </label>
            <label className="flex items-start gap-2 text-xs text-[var(--ui-text-primary)] cursor-pointer">
              <input type="checkbox" checked={withRecovery} onChange={(e) => setWithRecovery(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--color-accent-base)]" />
              <span>
                Crear una <strong>Llave de Rescate</strong> de 24 caracteres (recomendado: te deja entrar si olvidás la contraseña).
              </span>
            </label>
            <button
              type="button"
              onClick={handleCreate}
              disabled={busy}
              className="w-full py-2.5 text-sm font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] disabled:opacity-50"
              style={{ borderRadius: radius.control }}
            >
              {busy ? 'Creando bóveda segura…' : 'Crear mi bóveda'}
            </button>
          </>
        ) : (
          <>
            <div className="flex gap-1 p-1 bg-[var(--ui-bg-panel)]" style={{ borderRadius: radius.control }}>
              {(['password', 'recovery'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setLocalError(null); }}
                  className={`flex-1 py-1.5 text-xs font-bold transition ${mode === m ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)]' : 'text-[var(--ui-text-secondary)]'}`}
                  style={{ borderRadius: radius.control }}
                >
                  {m === 'password' ? 'Contraseña' : 'Llave de Rescate'}
                </button>
              ))}
            </div>

            {mode === 'password' ? (
              <Field
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') void handleUnlock(); }}
                autoComplete="current-password"
              />
            ) : (
              <Field
                label="Llave de Rescate"
                value={recoveryKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecoveryKey(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                helperText="Los 24 caracteres que guardaste al crear la bóveda."
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') void handleUnlock(); }}
              />
            )}

            <button
              type="button"
              onClick={handleUnlock}
              disabled={busy}
              className="w-full py-2.5 text-sm font-bold bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] disabled:opacity-50"
              style={{ borderRadius: radius.control }}
            >
              {busy ? 'Abriendo…' : 'Abrir mi bóveda'}
            </button>
            <p className="text-[10px] text-center text-[var(--ui-text-secondary)] inline-flex items-center justify-center gap-1 w-full">
              <ShieldCheck className="w-3 h-3" /> Sin nube: si perdés la contraseña y la llave, no hay forma de recuperar los datos.
            </p>
          </>
        )}

        {(localError || error) && (
          <p className="text-xs font-semibold text-[var(--color-status-danger-text)]" role="alert">
            {localError || ERROR_TEXT[error || ''] || 'Ocurrió un problema. Intentá de nuevo.'}
          </p>
        )}
      </div>
    </div>
  );
};
