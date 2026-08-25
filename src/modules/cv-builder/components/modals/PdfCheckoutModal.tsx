import React, { useState } from 'react';
import { iniciarPagoMercadoPago } from '../../../payments/paymentService';
import { signInWithGoogle } from '../../../auth/authService';
import {} from '../../../../shared/core/lib/supabaseClient';
import { apiClient } from '../../../../shared/core/utils/apiClient';
import { CreditCard, Sparkles, Download, LogIn, Check, AlertCircle } from 'lucide-react';
import { Modal } from '../../../../shared/core/ui/Modal';

import { isValidEmail } from '../../../../shared/core/utils/validationEngine';
import { isProOrEnterprise as checkProOrEnterprise } from '../../../../shared/core/entitlements/useEntitlements';
import { withErrorHandling } from '../../../../shared/core/utils/errorHandler';

export default function PdfCheckoutModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  currentProfile,
  onOpenPricing,
  onExportJson
}: any) {
  const [email, setEmail] = useState(currentProfile?.email || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isProOrEnterprise = checkProOrEnterprise(currentProfile?.plan);

  const handleMercadoPagoCheckout = async () => {
    if (!email || !isValidEmail(email)) {
      setErrorMsg('Ingresá un correo electrónico válido para recibir tu comprobante');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    const res = await withErrorHandling(
      async () => {
        await iniciarPagoMercadoPago('single_pdf');
      },
      {
        context: 'Pago Mercado Pago (Single PDF)',
        errorMessage: 'Error al conectar con Mercado Pago'
      }
    );
    if (!res.success) {
      setErrorMsg(res.error?.message || 'Error al conectar con Mercado Pago');
      setIsProcessing(false);
    }
  };

  const handlePackCheckout = async (packPlan: 'credits_pack_5' | 'credits_pack_10') => {
    if (!email || !isValidEmail(email)) {
      setErrorMsg('Por favor ingresa un correo electrónico válido para asociar tu compra.');
      return;
    }
    setIsProcessing(true);
    setErrorMsg('');
    const res = await withErrorHandling(
      async () => {
        await iniciarPagoMercadoPago(packPlan);
      },
      {
        context: `Pago Mercado Pago (${packPlan})`,
        errorMessage: 'No se pudo abrir el checkout de Mercado Pago.'
      }
    );
    if (!res.success) {
      setErrorMsg(res.error?.message || 'No se pudo abrir el checkout de Mercado Pago.');
      setIsProcessing(false);
    }
  };

  const handleConfirmExport = async () => {
    if (isProOrEnterprise) {
      onConfirm();
      return;
    }

    if (currentProfile?.id) {
      setIsProcessing(true);
      const res = await withErrorHandling(
        () => apiClient.post('/api/consume-pdf-credit', { userId: currentProfile.id }),
        { context: 'Consumir crédito PDF' }
      );
      setIsProcessing(false);
      if (res.success && res.data?.ok && res.data.data?.success) {
        onConfirm();
        return;
      }
      if (!res.success) {
        setErrorMsg('No se pudo verificar tus créditos — revisá tu conexión e intentá de nuevo.');
        return;
      }
    }

    setErrorMsg('No tienes créditos de exportación activos. Selecciona Mercado Pago para adquirir 1 crédito ($1 USD) o inicia sesión.');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Exportar Documento PDF A4 Nativo"
      icon={<span className="text-xl">📄</span>}
      size="lg"
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white/60 hover:text-white text-xs font-bold transition cursor-pointer"
          >
            Volver al Editor
          </button>
          {(isProOrEnterprise || currentProfile) && (
            <button
              onClick={handleConfirmExport}
              disabled={isProcessing}
              className="px-4 py-2 bg-[var(--color-status-success-base)] hover:opacity-90 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isProOrEnterprise ? 'Exportar PDF A4 Gratis (Plan Pro Activo)' : 'Tengo Créditos / Confirmar Exportación'}</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-3 bg-[var(--color-status-danger-muted)] border border-[var(--color-status-danger-base)]/40 rounded-xl text-[var(--color-status-danger-text)] text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* User Account / Email Section */}
        {!currentProfile ? (
          <div className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[var(--color-accent-purple)] uppercase tracking-wide">
                1. Registra tu Correo o Cuenta
              </span>
              <button 
                onClick={signInWithGoogle}
                className="px-2.5 py-1 bg-white hover:bg-[var(--color-neutral-surface-muted)] text-[var(--color-neutral-text-primary)] rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[var(--color-secondary-base)]" /> Ingresar con Google
              </button>
            </div>

            <p className="text-[11px] text-white/60">
              Ingresa tu correo para enviarte la factura y vincular tus respaldos en la nube:
            </p>

            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.email@ejemplo.com"
              className="w-full text-xs p-2.5 rounded-xl bg-black/40 border border-white/20 text-white placeholder-white/40 font-bold outline-none focus:border-[var(--color-accent-base)] transition"
            />
          </div>
        ) : (
          <div className="p-3 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span className="text-white/60 block text-[10px]">Cuenta Activa:</span>
              <span className="font-extrabold text-[var(--color-accent-purple)]">{currentProfile.email}</span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[var(--color-status-success-muted)] border border-[var(--color-status-success-base)]/40 text-[var(--color-status-success-text)] text-[10px] font-black uppercase">
              Plan {currentProfile.plan || 'Free'}
            </span>
          </div>
        )}

        {/* Payment Gateways & Options */}
        <div className="space-y-2.5">
          <span className="text-xs font-black text-[var(--color-status-warning-text)] uppercase tracking-wide block">
            2. Elige tu Opción de Pago o Descarga
          </span>

          {/* Option A: Mercado Pago ($1 USD) */}
          <button
            onClick={handleMercadoPagoCheckout}
            disabled={isProcessing}
            className="w-full p-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs rounded-2xl shadow-lg transition flex items-center justify-between cursor-pointer border border-[var(--color-status-warning-base)]/50"
          >
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-5 h-5 text-black" />
              <div className="text-left">
                <p className="leading-tight">Pagar 1 Exportación PDF A4 ($1.50 USD)</p>
                <p className="text-[10px] opacity-80 font-bold">Mercado Pago, Tarjeta de Crédito / Débito, Transferencia</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-black/80 text-[var(--color-status-warning-text)] rounded-lg text-[10px] font-black">
              ~$1,800 ARS
            </span>
          </button>

          {/* Packs de créditos */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handlePackCheckout('credits_pack_5')}
              disabled={isProcessing}
              className="p-2.5 bg-white/10 hover:bg-white/20 border border-[var(--color-status-warning-base)]/30 text-[var(--color-status-warning-text)] font-extrabold text-[11px] rounded-xl transition cursor-pointer text-center"
            >
              Pack 5 créditos — $5 USD
            </button>
            <button
              onClick={() => handlePackCheckout('credits_pack_10')}
              disabled={isProcessing}
              className="p-2.5 bg-white/10 hover:bg-white/20 border border-[var(--color-status-warning-base)]/30 text-[var(--color-status-warning-text)] font-extrabold text-[11px] rounded-xl transition cursor-pointer text-center"
            >
              Pack 10 créditos — $8 USD
            </button>
          </div>

          {/* Option B: Upgrade to Pro ($19/mo) */}
          <button
            onClick={() => { onClose(); if (onOpenPricing) onOpenPricing(); }}
            className="w-full p-3 bg-[var(--color-accent-purple-light)]/40 hover:bg-[var(--color-accent-purple-light)]/60 border border-[var(--color-accent-purple)]/40 text-[var(--color-accent-purple)] font-extrabold text-xs rounded-2xl transition flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-accent-purple)]" />
              <span>Suscribirse a Plan Pro ($19 USD/mes) — Exportaciones Ilimitadas</span>
            </div>
            <span className="text-[10px] text-[var(--color-accent-purple)] font-black">Ver Planes &rarr;</span>
          </button>

          {/* Option C: Free JSON Backup */}
          <button
            onClick={() => { onClose(); if (onExportJson) onExportJson(); }}
            className="w-full p-2.5 bg-white/10 hover:bg-white/20 text-white/80 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer border border-white/10"
          >
            <Download className="w-4 h-4 text-[var(--color-status-warning-text)]" />
            <span>Descargar Copia de Respaldo .JSON Gratis en tu Equipo</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
