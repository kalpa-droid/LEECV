import React, { useState } from 'react';
import { FileText, BookOpen, ArrowRight, Check, CalendarDays, ReceiptText, BookOpenCheck } from 'lucide-react';
import { radius, elevationSystem } from '../../uiDesignSystem';
import { useText } from '../../../i18n/useText';
import { LANDING_APPS_CATALOG, type LandingAppCategory } from './landingAppsCatalog';

export interface PortalProductsGridProps {
  onNavigate: (route: string) => void;
}

const PORTAL_ROUTE_FALLBACKS: Record<string, string> = {
  cv: '/crear-cv',
  editorial: '/crear-editor',
  book: '/crear-libro',
  invoice: '/crear-factura',
  planner: '/crear-agenda',
};

const PRODUCT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  cv: FileText,
  editorial: BookOpenCheck,
  book: BookOpen,
  invoice: ReceiptText,
  planner: CalendarDays,
};

const CATEGORY_FILTERS: ReadonlyArray<{ id: 'all' | LandingAppCategory; label: string }> = [
  { id: 'all', label: 'Todas (5)' },
  { id: 'empleo', label: 'Empleo' },
  { id: 'estudio_libros', label: 'Estudio y Libros' },
  { id: 'negocio_organizacion', label: 'Negocio y Organización' },
];

export const PortalProductsGrid: React.FC<PortalProductsGridProps> = ({ onNavigate }) => {
  const t = useText();
  const [selectedCategory, setSelectedCategory] = useState<'all' | LandingAppCategory>('all');

  const filteredProducts =
    selectedCategory === 'all'
      ? LANDING_APPS_CATALOG
      : LANDING_APPS_CATALOG.filter((item) => item.category === selectedCategory);

  return (
    <div className="w-full max-w-6xl mx-auto py-4 sm:py-6">
      <div className="text-center mb-6 space-y-2">
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

      {/* Filtro rápido por objetivo */}
      <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto no-scrollbar pb-4 mb-4">
        {CATEGORY_FILTERS.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              aria-pressed={active}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer shrink-0 whitespace-nowrap ${
                active
                  ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] border-[var(--color-accent-base)]'
                  : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] border-[var(--ui-border)] hover:text-[var(--ui-text-primary)]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((p) => {
          const Icon = PRODUCT_ICONS[p.id] || FileText;
          const targetRoute = p.route || PORTAL_ROUTE_FALLBACKS[p.id] || '/crear-cv';
          return (
            <div
              key={p.id}
              style={{ borderRadius: radius.modal }}
              className="group relative p-5 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] shadow-[var(--shadow-floating)] hover:border-[var(--color-accent-base)] transition-all flex flex-col justify-between gap-5 hover:-translate-y-1"
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-11 h-11 rounded-2xl bg-[var(--color-accent-muted)] flex items-center justify-center text-[var(--color-accent-text)] group-hover:scale-105 transition-transform shrink-0">
                    <Icon className="w-5 h-5 stroke-[2]" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] border-[var(--color-accent-base)]/30">
                    {p.badge}
                  </span>
                </div>

                <div
                  style={{ borderRadius: radius.card }}
                  className="aspect-[16/9] w-full overflow-hidden border border-[var(--ui-border)] bg-[var(--ui-bg-panel)]"
                >
                  <img
                    src={p.image}
                    alt={p.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-top"
                  />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[var(--ui-text-primary)] group-hover:text-[var(--color-accent-text)] transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-xs font-semibold text-[var(--color-accent-text)] mt-0.5">
                    {p.tagline}
                  </p>
                </div>

                <p className="text-xs text-[var(--ui-text-secondary)] leading-relaxed font-normal">
                  {p.description}
                </p>

                <ul className="space-y-1.5 pt-2 border-t border-[var(--ui-border)]/60">
                  {p.benefits.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[var(--ui-text-primary)] font-medium">
                      <Check className="w-3.5 h-3.5 text-[var(--color-status-success-bright)] flex-shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => onNavigate(targetRoute)}
                style={{ borderRadius: radius.card }}
                className={`w-full py-2.5 px-4 bg-[var(--color-accent-base)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-on-base)] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${elevationSystem.raised}`}
              >
                <span>{p.ctaLabel}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
