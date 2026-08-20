import React, { useState } from 'react';
import { iniciarPagoMercadoPago } from '../../../payments/paymentService';
import { signInWithGoogle } from '../../../auth/authService';
import { CreditCard, Sparkles, Download, LogIn, Check, AlertCircle } from 'lucide-react';

export default function PdfCheckoutModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  currentProfile,
  onOpenPricing,
  onExportJson
}) {
  const [email, setEmail] = useState(currentProfile?.email || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isProOrEnterprise = currentProfile?.plan === 'pro' || currentProfile?.plan === 'enterprise';

  const handleMercadoPagoCheckout = async () => {
    if (!email || !email.includes('@')) {
      setErrorMsg('Por favor ingresa un correo electrónico válido para asociar tu compra.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    try {
      const userId = currentProfile?.id || `user_anon_${Date.now()}`;
      await iniciarPagoMercadoPago(userId, email, 'single_pdf');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'No se pudo abrir el checkout de Mercado Pago.');
      setIsProcessing(false);
    }
  };

  const handlePackCheckout = async (packPlan) => {
    if (!email || !email.includes('@')) {
      setErrorMsg('Por favor ingresa un correo electrónico válido para asociar tu compra.');
      return;
    }
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const userId = currentProfile?.id || `user_anon_${Date.now()}`;
      await iniciarPagoMercadoPago(userId, email, packPlan);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'No se pudo abrir el checkout de Mercado Pago.');
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
      try {
        const res = await fetch('/api/consume-pdf-credit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentProfile.id })
        });
        const data = await res.json();
        if (data.success) {
          onConfirm();
          return;
        }
      } catch (err) {
        console.warn('Error verificando créditos:', err);
      } finally {
        setIsProcessing(false);
      }
    }

    setErrorMsg('No tienes créditos de exportación activos. Selecciona Mercado Pago para adquirir 1 crédito ($1 USD) o inicia sesión.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 text-white space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-400 flex items-center justify-center text-2xl">
            📄
          </div>
          <div>
            <h3 className="text-base font-black text-white">Exportar Documento PDF A4 Nativo</h3>
            <p className="text-xs text-amber-300 font-bold">Costo por descarga: $1 USD (o equivalente ~$1,200 ARS)</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* User Account / Email Section */}
        {!currentProfile ? (
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-300 uppercase tracking-wide">
                1. Registra tu Correo o Cuenta
              </span>
              <button 
                onClick={signInWithGoogle}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-600" /> Ingresar con Google
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Ingresa tu correo para enviarte la factura y vincular tus respaldos en la nube:
            </p>

            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.email@ejemplo.com"
              className="w-full text-xs p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 font-bold outline-none focus:border-amber-500 transition"
            />
          </div>
        ) : (
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Cuenta Activa:</span>
              <span className="font-extrabold text-purple-300">{currentProfile.email}</span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase">
              Plan {currentProfile.plan || 'Free'}
            </span>
          </div>
        )}

        {/* Payment Gateways & Options */}
        <div className="space-y-2.5">
          <span className="text-xs font-black text-amber-300 uppercase tracking-wide block">
            2. Elige tu Opción de Pago o Descarga
          </span>

          {/* Option A: Mercado Pago ($1 USD) */}
          <button
            onClick={handleMercadoPagoCheckout}
            disabled={isProcessing}
            className="w-full p-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition flex items-center justify-between cursor-pointer border border-yellow-300"
          >
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-5 h-5 text-slate-950" />
              <div className="text-left">
                <p className="leading-tight">Pagar 1 Exportación PDF A4 ($1.50 USD)</p>
                <p className="text-[10px] opacity-80 font-bold">Mercado Pago, Tarjeta de Crédito / Débito, Transferencia</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-slate-950 text-amber-400 rounded-lg text-[10px] font-black">
              ~$1,800 ARS
            </span>
          </button>

          {/* Packs de créditos: mejor margen que el pago suelto */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handlePackCheckout('credits_pack_5')}
              disabled={isProcessing}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-amber-200 font-extrabold text-[11px] rounded-xl transition cursor-pointer text-center"
            >
              Pack 5 créditos — $5 USD
            </button>
            <button
              onClick={() => handlePackCheckout('credits_pack_10')}
              disabled={isProcessing}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-amber-500/30 text-amber-200 font-extrabold text-[11px] rounded-xl transition cursor-pointer text-center"
            >
              Pack 10 créditos — $8 USD
            </button>
          </div>

          {/* Option B: Upgrade to Pro ($19/mo) */}
          <button
            onClick={() => { onClose(); if (onOpenPricing) onOpenPricing(); }}
            className="w-full p-3 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 text-purple-200 font-extrabold text-xs rounded-2xl transition flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Suscribirse a Plan Pro ($19 USD/mes) — Exportaciones Ilimitadas</span>
            </div>
            <span className="text-[10px] text-purple-300 font-black">Ver Planes &rarr;</span>
          </button>

          {/* Option C: Free JSON Backup */}
          <button
            onClick={() => { onClose(); if (onExportJson) onExportJson(); }}
            className="w-full p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Descargar Copia de Respaldo .JSON Gratis en tu Equipo</span>
          </button>
        </div>

        {/* Existing Credit or Pro Export Confirmation */}
        {(isProOrEnterprise || currentProfile) && (
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={handleConfirmExport}
              disabled={isProcessing}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isProOrEnterprise ? 'Exportar PDF A4 Gratis (Plan Pro Activo)' : 'Tengo Créditos / Confirmar Exportación'}</span>
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 text-slate-400 hover:text-white text-xs font-bold transition cursor-pointer text-center"
        >
          Volver al Editor
        </button>
      </div>
    </div>
  );
}
