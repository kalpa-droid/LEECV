import React, { useState, useEffect, useRef } from 'react';
import { FileText, BookOpen, ArrowRight, Sparkles, CheckCircle2, ReceiptText, BookOpenCheck, CalendarDays } from 'lucide-react';
import { radius, elevationSystem } from '../../uiDesignSystem';
import { navigation } from '../../utils/navigation';
import { LANDING_APPS_CATALOG, type LandingAppEntry } from './landingAppsCatalog';

export interface HeroCarouselProps {
  onNavigate: (route: string) => void;
  onActiveAppChange?: (app: LandingAppEntry) => void;
}

const APP_ICONS_BY_ID: Record<string, React.ComponentType<{ className?: string }>> = {
  cv: FileText,
  editorial: BookOpenCheck,
  book: BookOpen,
  invoice: ReceiptText,
  planner: CalendarDays,
};

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ onNavigate, onActiveAppChange }) => {
  const slides = LANDING_APPS_CATALOG;

  const [activeIndex, setActiveIndex] = useState(() => {
    const requested = navigation.getSearchParams().get('app')?.trim().toLowerCase();
    if (!requested) return 0;
    const idx = slides.findIndex((s) => s.querySlug === requested || s.id === requested);
    return idx >= 0 ? idx : 0;
  });
  const [isPaused, setIsPaused] = useState(() => Boolean(navigation.getSearchParams().get('app')));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSlide = slides[activeIndex] || slides[0];

  useEffect(() => {
    if (activeSlide && onActiveAppChange) {
      onActiveAppChange(activeSlide);
    }
  }, [activeSlide, onActiveAppChange]);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    timerRef.current = setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 6500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeIndex, isPaused, slides.length]);

  if (!activeSlide) return null;

  return (
    <div
      className="w-full max-w-5xl mx-auto mt-6 flex flex-col gap-3.5"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Selector Interactivo de las 5 Herramientas (tira horizontal en móvil) */}
      <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
        {slides.map((slide, idx) => {
          const Icon = APP_ICONS_BY_ID[slide.id] || FileText;
          const isActive = idx === activeIndex;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => {
                setIsPaused(true);
                setActiveIndex(idx);
              }}
              aria-pressed={isActive}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
                isActive
                  ? 'bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] shadow-[var(--shadow-floating)]'
                  : 'bg-[var(--ui-bg-card)] text-[var(--ui-text-secondary)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-panel)] hover:text-[var(--ui-text-primary)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{slide.navLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Contenedor Principal del Selector con Vista Previa Real */}
      <div
        style={{ borderRadius: radius.modal }}
        className="relative w-full p-2 sm:p-3 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] shadow-[var(--shadow-overlay)] overflow-hidden group"
      >
        <div
          style={{ borderRadius: radius.card }}
          className="relative aspect-[16/11] sm:aspect-[16/9] w-full overflow-hidden bg-[var(--ui-bg-panel)] flex items-center justify-center"
        >
          <img
            key={activeSlide.id}
            src={activeSlide.image}
            alt={activeSlide.title}
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover object-top transition-all duration-500 ease-out group-hover:scale-[1.02]"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[var(--ui-bg-panel)] via-[var(--ui-bg-panel)]/70 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            <div className="text-left space-y-2 max-w-xl">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[var(--color-accent-text)] bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/30 px-2.5 py-1 rounded-full">
                <Sparkles className="w-3 h-3 text-[var(--color-accent-text)] shrink-0" />
                {activeSlide.badge}
              </span>

              <h2 className="text-lg sm:text-2xl font-black text-[var(--ui-text-primary)] leading-tight">
                {activeSlide.title}
              </h2>

              <p className="text-xs sm:text-sm text-[var(--ui-text-secondary)] font-medium leading-relaxed">
                {activeSlide.description}
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {activeSlide.benefits.map((feat) => (
                  <span
                    key={feat}
                    className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-2.5 py-1 bg-[var(--ui-bg-panel)]/90 backdrop-blur border border-[var(--ui-border)] rounded-md text-[var(--ui-text-primary)]"
                  >
                    <CheckCircle2 className="w-3 h-3 text-[var(--color-status-success-bright)] shrink-0" />
                    {feat}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate(activeSlide.route)}
              style={{ borderRadius: radius.card }}
              className={`w-full md:w-auto px-6 py-3 bg-[var(--color-accent-base)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-on-base)] font-bold text-sm shadow-[var(--shadow-floating)] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 shrink-0 ${elevationSystem.raised}`}
            >
              <span>{activeSlide.ctaLabel}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>

        <div className="flex justify-center gap-1.5 mt-2 mb-1">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setIsPaused(true);
                setActiveIndex(idx);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === activeIndex
                  ? 'w-8 bg-[var(--color-accent-base)]'
                  : 'w-2 bg-[var(--ui-border)] hover:bg-[var(--ui-text-secondary)]'
              }`}
              title={s.navLabel}
              aria-label={`Ver ${s.navLabel}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
