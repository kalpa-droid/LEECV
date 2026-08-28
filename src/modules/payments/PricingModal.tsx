import React, { useState } from 'react';
import { Check, Crown, Zap, Shield, Sparkles, Cloud, Smartphone, User, LogOut, HardDrive, LogIn } from 'lucide-react';
import { iniciarPagoMercadoPago, iniciarPagoLemonSqueezy } from './paymentService';
import { useToast } from '../../shared/core/ui/Toast';
import { Modal } from '../../shared/core/ui/Modal';
import { withErrorHandling } from '../../shared/core/utils/errorHandler';
import { logout, signInWithGoogle } from '../auth/authService';

import { elevationSystem, radius } from '../../shared/core/uiDesignSystem';

export default function PricingModal({ isOpen, onClose, currentProfile }: any) {
  const { showError, showSuccess } = useToast();
  const [loadingGateway, setLoadingGateway] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await withErrorHandling(
      async () => {
        await logout();
        showSuccess('Sesión cerrada correctamente. Puedes ingresar con otra cuenta.');
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      },
      { context: 'Cerrar Sesión' }
    );
    setIsLoggingOut(false);
  }

  async function handleGoogleConnect() {
    await withErrorHandling(
      async () => {
        await signInWithGoogle();
      },
      { context: 'Vincular Google Drive' }
    );
  }

  async function handleSelectPlan(planId: 'pro' | 'enterprise', gateway: 'mercadopago' | 'lemonsqueezy') {
    setLoadingGateway(gateway);
    await withErrorHandling(
      async () => {
        if (gateway === 'mercadopago') {
          await iniciarPagoMercadoPago(planId);
        } else {
          await iniciarPagoLemonSqueezy(planId);
        }
      },
      {
        context: 'Selección de Plan de Pago',
        errorMessage: 'Inconveniente al conectar con la pasarela de pagos.',
        notify: (msg) => showError(msg)
      }
    );
    setLoadingGateway(null);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mi Cuenta & Suscripciones LEECV"
      icon={<Sparkles className="w-5 h-5 text-[var(--ui-accent-purple)]" />}
      size="4xl"
      footer={
        <div className="w-full p-2 text-center text-[11px] text-white/60">
          🔒 Todos los pagos están procesados con encriptación SSL de 256 bits a través de Mercado Pago y Stripe / Lemon Squeezy. Puedes cancelar en cualquier momento.
        </div>
      }
    >
      <div className={`space-y-6 bg-[var(--ui-bg-dock)] p-4 rounded-[${radius.modal}] text-white`}>
        {/* Tarjeta de Cuenta Activa / Perfil de Usuario */}
        <div className={`bg-[var(--ui-bg-dock)] border border-white/10 rounded-[${radius.modal}] p-4 flex flex-col md:flex-row items-center justify-between gap-4`}>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className={`w-10 h-10 rounded-[${radius.card}] bg-[var(--color-accent-purple-light)] border border-[var(--color-accent-purple)]/40 text-[var(--color-accent-purple-text)] flex items-center justify-center flex-shrink-0`}>
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">
                  {currentProfile?.email || 'Sesión Activa en LEECV'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[var(--color-status-warning-muted)] text-[var(--color-status-warning-text)] border border-[var(--color-status-warning-base)]/30 uppercase">
                  {currentProfile?.role === 'admin' ? 'Administrador' : currentProfile?.role === 'enterprise' ? 'Empresa' : currentProfile?.role === 'pro' ? 'Pro' : 'Plan Gratuito'}
                </span>
              </div>
              <p className="text-[11px] text-white/60 flex items-center gap-1.5 mt-0.5">
                <HardDrive className="w-3.5 h-3.5 text-[var(--ui-secondary)]" />
                <span>Google Drive: {currentProfile?.drive_connected ? '🟢 Conectado' : '⚪ No vinculado'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => handleSelectPlan('pro', 'mercadopago')}
              className={`px-3.5 py-2 rounded-[${radius.card}] bg-[var(--color-accent-purple)] hover:opacity-90 text-white font-extrabold text-xs transition ${elevationSystem.raised} cursor-pointer flex items-center gap-1.5`}
            >
              <Crown className="w-4 h-4" />
              <span>Mejorar a Plan Agencia ($19/mes)</span>
            </button>
          </div>
        </div>

        {/* Encabezado Explicativo */}
        <div className="text-center space-y-1.5 max-w-xl mx-auto">
          <h2 className="text-lg font-black text-white tracking-tight">Elige el Plan Perfecto para tu Escala</h2>
          <p className="text-xs text-white/80">
            Desde la creación gratuita de tu propio CV hasta la gestión masiva de candidatos para agencias con respaldo en la nube.
          </p>
        </div>

        {/* Tabla de 3 Niveles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* NIVEL 1: USUARIO INDIVIDUAL */}
          <div className={`bg-[var(--ui-bg-dock)] border border-white/10 rounded-[${radius.modal}] p-5 flex flex-col justify-between space-y-4 hover:border-white/20 transition`}>
            <div className="space-y-3">
              <div className={`w-10 h-10 rounded-[${radius.card}] bg-white/5 border border-white/10 text-white flex items-center justify-center`}>
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-white">Usuario Individual</h3>
                <p className="text-[11px] text-white/60">Para crear tu propio CV personal</p>
              </div>
              <div className="py-2">
                <span className="text-2xl font-black text-white">Gratis</span>
                <span className="text-xs text-white/60 font-medium"> / editor básico</span>
              </div>
              <ul className="space-y-2 text-xs text-white/80">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--ui-success)] flex-shrink-0" />
                  <span>Editor 100% Gratis en Navegador</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--ui-success)] flex-shrink-0" />
                  <span>Respaldo .JSON gratis en PC o en tu Google Drive</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--ui-success)] flex-shrink-0" />
                  <span>Guardado Local en IndexedDB del navegador</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--ui-success)] flex-shrink-0" />
                  <span>PDF A4 Nativo de Alta Calidad ($1 USD)</span>
                </li>
              </ul>
            </div>
            <button
              onClick={onClose}
              className={`w-full py-2.5 bg-white/10 hover:bg-white/20 text-white/80 text-xs font-black rounded-[${radius.card}] transition cursor-pointer`}
            >
              Usar Editor Gratuito
            </button>
          </div>

          {/* NIVEL 2: AGENCIA PRO (MÁS POPULAR) */}
          <div className={`bg-[var(--ui-bg-dock)] border-2 border-[var(--color-accent-purple)] rounded-[${radius.modal}] p-5 flex flex-col justify-between space-y-4 ${elevationSystem.overlay} relative transform hover:-translate-y-1 transition`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--color-accent-purple)] text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full tracking-wider shadow">
              Más Recomendado
            </div>

            <div className="space-y-3">
              <div className={`w-10 h-10 rounded-[${radius.card}] bg-[var(--color-accent-purple-light)] border border-[var(--color-accent-purple)]/40 text-[var(--color-accent-purple-text)] flex items-center justify-center`}>
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-white">Agencia Pro</h3>
                <p className="text-[11px] text-white/80">Para Reclutadores y Consultoras</p>
              </div>
              <div className="py-2">
                <span className="text-3xl font-black text-white">$19 USD</span>
                <span className="text-xs text-white/80 font-medium"> / mes</span>
              </div>
              <ul className="space-y-2 text-xs text-white/90">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--ui-accent-purple)] flex-shrink-0" />
                  <strong>PDFs A4 ILIMITADOS (Sin pagar $1/PDF)</strong>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--ui-accent-purple)] flex-shrink-0" />
                  <span>Panel Multi-Candidato en Supabase Cloud</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--ui-accent-purple)] flex-shrink-0" />
                  <span>Respaldo en tu propio Google Drive (15 GB)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[var(--ui-accent-purple)] flex-shrink-0" />
                  <span>Envío a WhatsApp & Telegram a 1-Clic</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleSelectPlan('pro', 'mercadopago')}
                disabled={loadingGateway !== null}
                className={`w-full py-2.5 bg-[var(--color-accent-purple)] hover:opacity-90 text-white text-xs font-black rounded-[${radius.card}] ${elevationSystem.raised} transition flex items-center justify-center gap-1.5 cursor-pointer`}
              >
                <span>🇦🇷 Suscribirse con Mercado Pago</span>
              </button>
              <button
                onClick={() => handleSelectPlan('pro', 'lemonsqueezy')}
                disabled={loadingGateway !== null}
                className={`w-full py-2 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold rounded-[${radius.card}] transition flex items-center justify-center gap-1.5 border border-[var(--color-accent-purple)]/30 cursor-pointer`}
              >
                <span>🌎 Suscribirse Internacional (USD)</span>
              </button>
            </div>
          </div>

          {/* NIVEL 3: AGENCIA ENTERPRISE + LEECV CLOUD */}
          <div className={`bg-[var(--ui-bg-dock)] border border-[var(--color-status-warning-base)]/40 rounded-[${radius.modal}] p-5 flex flex-col justify-between space-y-4 hover:border-[var(--color-status-warning-base)]/70 transition`}>
            <div className="space-y-3">
              <div className={`w-10 h-10 rounded-[${radius.card}] bg-[var(--color-status-warning-muted)] border border-[var(--color-status-warning-base)]/40 text-[var(--color-status-warning-text)] flex items-center justify-center`}>
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-white">Enterprise + Cloud</h3>
                <p className="text-[11px] text-white/60">Sin depender de tu Google Drive</p>
              </div>
              <div className="py-2">
                <span className="text-2xl font-black text-white">$29 USD</span>
                <span className="text-xs text-white/60 font-medium"> / mes</span>
              </div>
              <ul className="space-y-2 text-xs text-white/80">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--ui-warning)] flex-shrink-0" />
                  <strong>Todo lo del Plan Agencia Pro</strong>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--ui-warning)] flex-shrink-0" />
                  <span>+50 GB Almacenamiento LEECV Cloud</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--ui-warning)] flex-shrink-0" />
                  <span>Soporte de Anexos Certificados en PDF</span>
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[var(--ui-warning)] flex-shrink-0" />
                  <span>Alertas Preventivas de Espacio sin Falla</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectPlan('enterprise', 'lemonsqueezy')}
              disabled={loadingGateway !== null}
              className={`w-full py-2.5 bg-[image:var(--gradient-gold)] hover:opacity-95 text-black text-xs font-black rounded-[${radius.card}] ${elevationSystem.floating} transition cursor-pointer`}
            >
              Activar Plan Enterprise Cloud
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
