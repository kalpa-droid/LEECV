import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { PrivacyPolicyContent } from '../../shared/legal/PrivacyPolicyContent';
import { radius, elevationSystem } from '../../shared/core/uiDesignSystem';
import { navigation } from '../../shared/core/utils/navigation';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] font-sans flex flex-col">
      {/* Header Público */}
      <header className={`bg-[var(--ui-bg-card)] border-b border-[var(--ui-border)] px-4 py-3 sticky top-0 z-30 ${elevationSystem.raised}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigation.goTo('/')}
              className="p-1.5 rounded-[var(--radius-control)] hover:bg-[var(--ui-bg-panel)] text-[var(--ui-text-secondary)] transition cursor-pointer"
              title="Volver a la aplicación"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[var(--color-accent-purple-text)]" />
              <span className="font-black text-sm tracking-tight">LEECV — Política de Privacidad</span>
            </div>
          </div>
          <a
            href="/"
            className={`px-3 py-1.5 text-xs font-bold bg-[var(--ui-text-primary)] text-[var(--ui-bg-card)] rounded-[${radius.control}] hover:opacity-90 transition`}
          >
            Ir a la App
          </a>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className={`bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-[${radius.modal}] p-6 sm:p-8 ${elevationSystem.overlay}`}>
          <h1 className="text-xl font-black mb-1 text-[var(--ui-text-primary)]">Política de Privacidad de LEECV</h1>
          <p className="text-xs text-[var(--ui-text-secondary)] mb-6">Última actualización: Septiembre 2026 — LEECV Inc. (https://leecv.app)</p>

          <PrivacyPolicyContent />

          <div className="mt-8 pt-4 border-t border-[var(--ui-border)] flex items-center justify-between text-xs text-[var(--ui-text-secondary)]">
            <span>© 2026 LEECV Inc. Todos los derechos reservados.</span>
            <div className="flex gap-4 font-bold">
              <a href="/terminos" className="hover:underline">Términos de Servicio</a>
              <a href="/reembolsos" className="hover:underline">Reembolsos</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PrivacyPolicyPage;
