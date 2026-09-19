import React from 'react';
import { FileText, Mail, CreditCard, BookOpen, ArrowRight, Check, Sparkles } from 'lucide-react';
import { radius, elevationSystem } from '../../uiDesignSystem';

import { useText } from '../../../i18n/useText';

export interface PortalProductsGridProps {
  onNavigate: (route: string) => void;
}

export const PortalProductsGrid: React.FC<PortalProductsGridProps> = ({ onNavigate }) => {
  const t = useText();

  const products = [
    {
      id: 'cv',
      icon: FileText,
      badge: t.landing.products.cv.badge,
      badgeColor: 'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] border-[var(--color-accent-base)]/30',
      title: t.landing.products.cv.title,
      tagline: t.landing.products.cv.tagline,
      description: t.landing.products.cv.description,
      bullets: [...t.landing.products.cv.bullets],
      route: '/crear-cv',
      cta: t.landing.products.cv.cta,
    },
    {
      id: 'cartas',
      icon: Mail,
      badge: t.landing.products.cartas.badge,
      badgeColor: 'bg-[var(--color-accent-purple-muted)] text-[var(--color-accent-purple)] border-[var(--color-accent-purple)]/30',
      title: t.landing.products.cartas.title,
      badgeIcon: Sparkles,
      tagline: t.landing.products.cartas.tagline,
      description: t.landing.products.cartas.description,
      bullets: [...t.landing.products.cartas.bullets],
      route: '/crear-carta',
      cta: t.landing.products.cartas.cta,
    },
    {
      id: 'tarjetas',
      icon: CreditCard,
      badge: t.landing.products.tarjetas.badge,
      badgeColor: 'bg-[var(--color-accent-amber-muted)] text-[var(--color-neutral-text-primary)] border-[var(--color-accent-amber-bright)]/30',
      title: t.landing.products.tarjetas.title,
      tagline: t.landing.products.tarjetas.tagline,
      description: t.landing.products.tarjetas.description,
      bullets: [...t.landing.products.tarjetas.bullets],
      route: '/crear-tarjeta',
      cta: t.landing.products.tarjetas.cta,
    },
    {
      id: 'libros',
      icon: BookOpen,
      badge: t.landing.products.libros.badge,
      badgeColor: 'bg-[var(--color-accent-emerald-muted)] text-[var(--color-neutral-text-primary)] border-[var(--color-accent-emerald-bright)]/30',
      title: t.landing.products.libros.title,
      tagline: t.landing.products.libros.tagline,
      description: t.landing.products.libros.description,
      bullets: [...t.landing.products.libros.bullets],
      route: '/crear-libro',
      cta: t.landing.products.libros.cta,
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto py-8">
      <div className="text-center mb-10 space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent-text)]">
          {t.landing.portalIntro.eyebrow}
        </span>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--ui-text-primary)]">
          {t.landing.portalIntro.title}
        </h2>
        <p className="text-sm sm:text-base text-[var(--ui-text-secondary)] max-w-2xl mx-auto font-medium">
          {t.landing.portalIntro.description}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {products.map((p) => {
          const Icon = p.icon;
          const BadgeIcon = p.badgeIcon;
          return (
            <div
              key={p.id}
              className={`group relative p-6 bg-[var(--ui-bg-card)] rounded-[${radius.modal}] border border-[var(--ui-border)] shadow-[var(--shadow-floating)] hover:border-[var(--color-accent-base)] transition-all flex flex-col justify-between gap-6 hover:-translate-y-1`}
            >
              <div className="space-y-4">
                {/* Cabecera de la Tarjeta de Producto */}
                <div className="flex items-center justify-between gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent-muted)] flex items-center justify-center text-[var(--color-accent-text)] group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 stroke-[2]" />
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${p.badgeColor}`}>
                    {BadgeIcon && <BadgeIcon className="w-3.5 h-3.5" />}
                    {p.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[var(--ui-text-primary)] group-hover:text-[var(--color-accent-text)] transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-xs font-semibold text-[var(--color-accent-text)] mt-0.5">
                    {p.tagline}
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-[var(--ui-text-secondary)] leading-relaxed font-normal">
                  {p.description}
                </p>

                {/* Bullets */}
                <ul className="space-y-2 pt-2 border-t border-[var(--ui-border)]/60">
                  {p.bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[var(--ui-text-primary)] font-medium">
                      <Check className="w-4 h-4 text-[var(--color-accent-emerald-bright)] flex-shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Botón CTA Directo */}
              <button
                type="button"
                onClick={() => onNavigate(p.route)}
                className={`w-full py-3 px-4 rounded-[${radius.card}] bg-[var(--color-accent-base)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-on-base)] font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[var(--shadow-floating)] group-hover:scale-[1.02] ${elevationSystem.raised}`}
              >
                <span>{p.cta}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
