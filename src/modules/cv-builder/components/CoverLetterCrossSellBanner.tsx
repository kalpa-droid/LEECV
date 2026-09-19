import React from 'react';
import { Mail, Sparkles, ArrowRight } from 'lucide-react';
import { elevationSystem, radius, button } from '../../../shared/core/uiDesignSystem';

interface CoverLetterCrossSellBannerProps {
  onGenerateCoverLetter: () => void;
}

export const CoverLetterCrossSellBanner: React.FC<CoverLetterCrossSellBannerProps> = ({
  onGenerateCoverLetter,
}) => {
  return (
    <div className={`p-4 bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/40 rounded-[${radius.card}] ${elevationSystem.raised} space-y-3`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded-[${radius.control}] shrink-0`}>
          <Mail className="w-4 h-4" />
        </div>
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-[var(--ui-text-primary)]">¿Querés una Carta de Presentación?</span>
            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded-full flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> 1-Clic
            </span>
          </div>
          <p className="text-xs text-[var(--ui-text-secondary)] leading-relaxed">
            Complementá tu CV con una carta redactada a medida reutilizando tus datos personales.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onGenerateCoverLetter}
        className={`${button.primary} w-full py-2 px-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition`}
      >
        <span>Crear Carta para este CV</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
