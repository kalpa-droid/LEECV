import React, { useState } from 'react';
import { Shield, FileText, Lock } from 'lucide-react';
import { elevationSystem, radius } from '../../../shared/core/uiDesignSystem';
import { Modal } from '../../../shared/core/ui/Modal';
import { PrivacyPolicyContent } from '../../../shared/legal/PrivacyPolicyContent';
import { TermsOfServiceContent } from '../../../shared/legal/TermsOfServiceContent';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Política de Privacidad & Términos de Servicio"
      icon={<Shield className="w-5 h-5 text-[var(--ui-accent-purple)]" />}
      size="4xl"
      footer={
        <div className="w-full flex items-center justify-between">
          <span className="text-[10px] text-[var(--ui-text-secondary)]">Última actualización: Septiembre 2026 — LEECV Inc.</span>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 bg-[var(--ui-text-primary)] text-[var(--ui-bg-card)] hover:opacity-90 font-extrabold text-xs rounded-[${radius.card}] transition cursor-pointer`}
          >
            Entendido
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs text-[var(--ui-text-secondary)] leading-relaxed font-normal">
        {/* Tab Selector */}
        <div className={`flex border-b border-[var(--ui-border)] bg-[var(--ui-bg-panel)] p-1 rounded-[${radius.card}] mb-4`}>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 text-xs font-bold transition flex-1 flex items-center justify-center gap-2 rounded-[${radius.control}] cursor-pointer ${
              activeTab === 'privacy'
                ? `bg-[var(--color-accent-purple-light)] text-[var(--color-accent-purple-text)] border border-[var(--color-accent-purple)]/40 ${elevationSystem.raised}`
                : 'text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Política de Privacidad
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2 text-xs font-bold transition flex-1 flex items-center justify-center gap-2 rounded-[${radius.control}] cursor-pointer ${
              activeTab === 'terms'
                ? `bg-[var(--color-status-success-muted)] text-[var(--color-status-success-text)] border border-[var(--color-status-success-base)]/40 ${elevationSystem.raised}`
                : 'text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Términos de Uso y Servicio
          </button>
        </div>

        {activeTab === 'privacy' ? <PrivacyPolicyContent /> : <TermsOfServiceContent />}
      </div>
    </Modal>
  );
}
