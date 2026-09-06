import React, { useState, useEffect } from 'react';
import { FileText, CreditCard, BookOpen, Newspaper, Sparkles, Zap, ShieldCheck, Award } from 'lucide-react';
import { displayScale, elevationSystem, radius } from '../../shared/core/uiDesignSystem';
import { ThemeToggleButton } from '../../shared/core/ui/ThemeToggleButton';
import { getGlobalUiTheme, cycleGlobalUiTheme } from '../../shared/core/utils/globalThemePreference';
import { useText } from '../../shared/i18n/useText';
import { ProductCard } from '../../shared/core/ui/marketing/ProductCard';
import { FeatureCard } from '../../shared/core/ui/marketing/FeatureCard';
import { MarketingSection } from '../../shared/core/ui/marketing/MarketingSection';
import { MarketingCTA } from '../../shared/core/ui/marketing/MarketingCTA';

interface LandingPageProps {
  onNavigate: (route: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const t = useText();
  const [currentTheme, setCurrentTheme] = useState<string>('day');

  useEffect(() => {
    setCurrentTheme(getGlobalUiTheme());
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = cycleGlobalUiTheme();
    setCurrentTheme(nextTheme);
  };

  return (
    <div className="min-h-screen bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] flex flex-col font-sans transition-colors duration-300">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 bg-[var(--ui-bg-panel)]/80 backdrop-blur-xl border-b border-[var(--ui-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('/')}>
            <div className={`p-2.5 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded-[${radius.card}] font-black ${elevationSystem.raised}`}>
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-[var(--ui-text-primary)]">
              LEECV <span className="text-[var(--color-accent-text)] font-medium text-sm">Studio Suite</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-[var(--ui-text-secondary)]">
            <button onClick={() => onNavigate('/crear-cv')} className="hover:text-[var(--color-accent-base)] transition-colors cursor-pointer">
              {t.landing.nav.cv}
            </button>
            <button onClick={() => onNavigate('/crear-tarjeta')} className="hover:text-[var(--color-accent-base)] transition-colors cursor-pointer">
              {t.landing.nav.tarjetas}
            </button>
            <button onClick={() => onNavigate('/crear-libro')} className="hover:text-[var(--color-accent-base)] transition-colors cursor-pointer">
              {t.landing.nav.libros}
            </button>
            <button onClick={() => onNavigate('/blog')} className="hover:text-[var(--color-accent-base)] transition-colors cursor-pointer">
              {t.landing.nav.blog}
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggleButton currentThemeId={currentTheme} onToggle={handleToggleTheme} size="md" />
            <MarketingCTA label={t.landing.nav.cta} onClick={() => onNavigate('/crear-cv')} size="md" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-accent-muted)] blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/30 rounded-full text-[var(--color-accent-text)] font-semibold text-xs tracking-wider uppercase">
            <Sparkles className="w-4 h-4" />
            <span>{t.landing.hero.eyebrow}</span>
          </div>

          <h1 className={`${displayScale.hero} text-[var(--ui-text-primary)] max-w-5xl mx-auto`}>
            {t.landing.hero.title}
          </h1>

          <p className={`${displayScale.lead} text-[var(--ui-text-secondary)] max-w-3xl mx-auto font-normal`}>
            {t.landing.hero.lead}
          </p>

          {/* Tarjetas de Producto */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 max-w-6xl mx-auto">
            <ProductCard
              icon={FileText}
              title={t.landing.products.cv.title}
              description={t.landing.products.cv.description}
              ctaLabel={t.landing.products.cv.cta}
              onClick={() => onNavigate('/crear-cv')}
            />
            <ProductCard
              icon={CreditCard}
              title={t.landing.products.tarjetas.title}
              description={t.landing.products.tarjetas.description}
              ctaLabel={t.landing.products.tarjetas.cta}
              onClick={() => onNavigate('/crear-tarjeta')}
            />
            <ProductCard
              icon={BookOpen}
              title={t.landing.products.libros.title}
              description={t.landing.products.libros.description}
              ctaLabel={t.landing.products.libros.cta}
              onClick={() => onNavigate('/crear-libro')}
            />
          </div>
        </div>
      </section>

      {/* Características Destacadas */}
      <section className="py-16 bg-[var(--ui-bg-card)] border-y border-[var(--ui-border)]">
        <MarketingSection className="py-0 sm:py-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <FeatureCard
              icon={Zap}
              title={t.landing.features.speed.title}
              description={t.landing.features.speed.description}
            />
            <FeatureCard
              icon={ShieldCheck}
              title={t.landing.features.designSystem.title}
              description={t.landing.features.designSystem.description}
            />
            <FeatureCard
              icon={Award}
              title={t.landing.features.printReady.title}
              description={t.landing.features.printReady.description}
            />
          </div>
        </MarketingSection>
      </section>

      {/* Acceso al Blog */}
      <MarketingSection>
        <div className={`bg-[var(--ui-bg-card)] rounded-[24px] p-8 sm:p-12 border border-[var(--ui-border)] ${elevationSystem.floating} flex flex-col md:flex-row items-center justify-between gap-8`}>
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-2 text-[var(--color-accent-text)] font-bold text-xs uppercase tracking-wider">
              <Newspaper className="w-4 h-4" />
              <span>{t.landing.blogTeaser.title}</span>
            </div>
            <h2 className={`${displayScale.sectionHeading} text-[var(--ui-text-primary)]`}>
              {t.landing.blogTeaser.subtitle}
            </h2>
          </div>

          <MarketingCTA
            label={t.landing.blogTeaser.readMore}
            onClick={() => onNavigate('/blog')}
            variant="primary"
          />
        </div>
      </MarketingSection>

      {/* Footer */}
      <footer className="mt-auto bg-[var(--ui-bg-panel)] border-t border-[var(--ui-border)] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--ui-text-secondary)]">
          <p>© 2026 LEECV Studio. {t.landing.footer.rights}</p>
          <div className="flex items-center gap-6">
            <a href="/privacidad" className="hover:text-[var(--ui-text-primary)] transition-colors">
              {t.landing.footer.privacy}
            </a>
            <a href="/terminos" className="hover:text-[var(--ui-text-primary)] transition-colors">
              {t.landing.footer.terms}
            </a>
            <a href="/reembolsos" className="hover:text-[var(--ui-text-primary)] transition-colors">
              {t.landing.footer.refund}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
