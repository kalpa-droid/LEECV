import React, { useState } from 'react';
import { Check, Crown, Zap, Shield, Sparkles, X, Cloud, Smartphone } from 'lucide-react';
import { iniciarPagoMercadoPago, iniciarPagoLemonSqueezy } from './paymentService';

import { useToast } from '../../shared/core/ui/Toast';

export default function PricingModal({ isOpen, onClose, currentProfile: _currentProfile }: any) {
  const { showError } = useToast();
  const [loadingGateway, setLoadingGateway] = useState(null);

  if (!isOpen) return null;

  async function handleSelectPlan(planId: 'pro' | 'enterprise', gateway: 'mercadopago' | 'lemonsqueezy') {
    setLoadingGateway(gateway);
    try {
      if (gateway === 'mercadopago') {
        await iniciarPagoMercadoPago(planId);
      } else {
        await iniciarPagoLemonSqueezy(planId);
      }
    } catch (err: any) {
      showError('Inconveniente al conectar con la pasarela de pagos: ' + (err?.message || err));
    } finally {
      setLoadingGateway(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in no-print overflow-y-auto">
      <div className="bg-[#1E1222] border border-[${colorSystem.neutral.border}]/30 rounded-3xl max-w-4xl w-full p-6 text-white space-y-6 shadow-2xl relative my-8">
        
        {/* Botón Cerrar */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[${colorSystem.accent.base}]/20 border border-[${colorSystem.accent.base}]/40 text-[#FFD9E3] text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[${colorSystem.accent.base}]" /> Planes & Suscripciones LEECV
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Elige el plan ideal para tus necesidades
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Desde la creación gratuita de tu propio CV hasta la gestión masiva de candidatos para agencias con respaldo en la nube.
          </p>
        </div>

        {/* Tabla de 3 Niveles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* NIVEL 1: USUARIO INDIVIDUAL */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-white">Usuario Individual</h3>
                <p className="text-[11px] text-slate-400">Para crear tu propio CV personal</p>
              </div>
              <div className="py-2">
                <span className="text-2xl font-black text-white">$1 USD</span>
                <span className="text-xs text-slate-400 font-medium"> / por exportación PDF</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />
                  <span>Editor 100% Gratis en Navegador</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />
                  <span>Respaldo .JSON gratis en PC o en tu Google Drive</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />
                  <span>Guardado Local en IndexedDB del navegador</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />
                  <span>PDF A4 Nativo de Alta Calidad ($1 USD)</span>
                </li>
              </ul>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black rounded-xl transition"
            >
              Usar Editor Gratuito
            </button>
          </div>

          {/* NIVEL 2: AGENCIA PRO (MÁS POPULAR) */}
          <div className="bg-gradient-to-b from-[${colorSystem.neutral.textPrimary}] to-[#1A0E1D] border-2 border-[${colorSystem.accent.base}] rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl shadow-[${colorSystem.accent.base}]/10 relative transform hover:-translate-y-1 transition">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[${colorSystem.accent.base}] text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full tracking-wider shadow">
              Más Recomendado
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[${colorSystem.accent.base}]/20 border border-[${colorSystem.accent.base}]/40 text-[${colorSystem.accent.base}] flex items-center justify-center">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-white">Agencia Pro</h3>
                <p className="text-[11px] text-slate-300">Para Reclutadores y Consultoras</p>
              </div>
              <div className="py-2">
                <span className="text-3xl font-black text-white">$19 USD</span>
                <span className="text-xs text-slate-300 font-medium"> / mes</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-200">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[${colorSystem.accent.base}] flex-shrink-0" />
                  <strong>PDFs A4 ILIMITADOS (Sin pagar $1/PDF)</strong>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[${colorSystem.accent.base}] flex-shrink-0" />
                  <span>Panel Multi-Candidato en Supabase Cloud</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[${colorSystem.accent.base}] flex-shrink-0" />
                  <span>Respaldo en tu propio Google Drive (15 GB)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[${colorSystem.accent.base}] flex-shrink-0" />
                  <span>Envío a WhatsApp & Telegram a 1-Clic</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleSelectPlan('pro', 'mercadopago')}
                disabled={loadingGateway !== null}
                className="w-full py-2.5 bg-[${colorSystem.accent.base}] hover:bg-[#E31555] text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                <span>🇦🇷 Suscribirse con Mercado Pago</span>
              </button>
              <button
                onClick={() => handleSelectPlan('pro', 'lemonsqueezy')}
                disabled={loadingGateway !== null}
                className="w-full py-2 bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 text-[11px] font-bold rounded-xl transition flex items-center justify-center gap-1.5 border border-purple-500/30"
              >
                <span>🌎 Suscribirse Internacional (USD)</span>
              </button>
            </div>
          </div>

          {/* NIVEL 3: AGENCIA ENTERPRISE + LEECV CLOUD */}
          <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-amber-500/70 transition">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-white">Enterprise + Cloud</h3>
                <p className="text-[11px] text-slate-400">Sin depender de tu Google Drive</p>
              </div>
              <div className="py-2">
                <span className="text-2xl font-black text-white">$29 USD</span>
                <span className="text-xs text-slate-400 font-medium"> / mes</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <strong>Todo lo del Plan Agencia Pro</strong>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>+50 GB Almacenamiento LEECV Cloud</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Soporte de Anexos Certificados en PDF</span>
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Alertas Preventivas de Espacio sin Falla</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectPlan('enterprise', 'lemonsqueezy')}
              disabled={loadingGateway !== null}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black rounded-xl shadow-lg transition"
            >
              Activar Plan Enterprise Cloud
            </button>
          </div>

        </div>

        {/* Pie informativo */}
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center text-[11px] text-slate-400">
          🔒 Todos los pagos están procesados con encriptación SSL de 256 bits a través de Mercado Pago y Stripe / Lemon Squeezy. Puedes cancelar tu suscripción en cualquier momento desde tu panel.
        </div>

      </div>
    </div>
  );
}
