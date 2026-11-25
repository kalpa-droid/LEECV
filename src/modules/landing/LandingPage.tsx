import React, { useState, useEffect } from 'react';
import {
  FileText,
  Mail,
  CreditCard,
  BookOpen,
  Newspaper,
  Sparkles,
  ShieldCheck,
  Award,
  Zap,
  CalendarDays,
  LogIn,
  User,
  ScanLine,
  Palette,
  Printer,
  Brush,
  ReceiptText,
  BookOpenCheck,
  ChevronDown,
  Check,
  ArrowRight,
  Crown,
} from 'lucide-react';
import { displayScale, elevationSystem, radius } from '../../shared/core/uiDesignSystem';
import { ThemeToggleButton } from '../../shared/core/ui/ThemeToggleButton';
import { getGlobalUiTheme, cycleGlobalUiTheme } from '../../shared/core/utils/globalThemePreference';
import { navigation } from '../../shared/core/utils/navigation';
import { useText } from '../../shared/i18n/useText';
import { FeatureCard } from '../../shared/core/ui/marketing/FeatureCard';
import { MarketingSection } from '../../shared/core/ui/marketing/MarketingSection';
import { MarketingCTA } from '../../shared/core/ui/marketing/MarketingCTA';
import { Logo } from '../../shared/core/brand/Logo';
import { HeroCarousel } from '../../shared/core/ui/marketing/HeroCarousel';
import { PortalProductsGrid } from '../../shared/core/ui/marketing/PortalProductsGrid';
import { ProductDetailBlock } from '../../shared/core/ui/marketing/ProductDetailBlock';
import { PlanFeatureCard } from '../../shared/core/ui/marketing/PlanFeatureCard';
import { FaqAccordion } from '../../shared/core/ui/marketing/FaqAccordion';
import {
  LANDING_APPS_CATALOG,
  findLandingAppByQuery,
  type LandingAppEntry,
} from '../../shared/core/ui/marketing/landingAppsCatalog';
import AtsAuditHeroWidget from './components/AtsAuditHeroWidget';
import TransparencyComparisonTable from './components/TransparencyComparisonTable';
import { LEECV_VERSION } from '../../shared/core/version';
import { useIsMobile } from '../../shared/core/ui/useIsMobile';
import { useJsonLd } from '../../shared/core/hooks/useJsonLd';
import { useAuth } from '../../shared/core/auth/AuthContext';

interface LandingPageProps {
  onNavigate: (route: string) => void;
  onOpenLogin?: () => void;
}

const NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  cv: FileText,
  editorial: BookOpenCheck,
  book: BookOpen,
  invoice: ReceiptText,
  planner: CalendarDays,
};

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenLogin }) => {
  const t = useText();
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const [currentTheme, setCurrentTheme] = useState<string>('day');
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [exploredApp, setExploredApp] = useState<LandingAppEntry>(() =>
    findLandingAppByQuery(navigation.getSearchParams().get('app')),
  );

  useEffect(() => {
    setCurrentTheme(getGlobalUiTheme());
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = cycleGlobalUiTheme();
    setCurrentTheme(nextTheme);
  };

  const faqItems = [
    { question: t.landing.faq.q1, answer: t.landing.faq.a1 },
    { question: t.landing.faq.q2, answer: t.landing.faq.a2 },
    { question: t.landing.faq.q3, answer: t.landing.faq.a3 },
    { question: t.landing.faq.q4, answer: t.landing.faq.a4 },
    { question: t.landing.faq.q5, answer: t.landing.faq.a5 },
    { question: t.landing.faq.q6, answer: t.landing.faq.a6 },
  ];

  useJsonLd({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  });

  return (
    <div className="h-[100dvh] w-full overflow-y-auto bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] flex flex-col font-sans transition-colors duration-300">
      {/* 1. Header sticky limpio (5 herramientas + blog) */}
      <header className="sticky top-0 z-40 bg-[var(--ui-bg-panel)]/90 backdrop-blur-xl border-b border-[var(--ui-border)] shrink-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 relative">
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0" onClick={() => onNavigate('/')}>
            <Logo layout={isMobile ? 'isotipo' : 'slogan'} animatedRainbow currentUiTheme={currentTheme} className="h-8 sm:h-10" />
          </div>

          {/* Navegación Desktop: 5 apps principales + Blog */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-5 text-xs lg:text-sm font-semibold text-[var(--ui-text-secondary)]">
            {LANDING_APPS_CATALOG.map((appItem) => {
              const Icon = NAV_ICONS[appItem.id] || FileText;
              return (
                <button
                  key={appItem.id}
                  type="button"
                  onClick={() => onNavigate(appItem.route)}
                  className="flex items-center gap-1.5 hover:text-[var(--color-accent-base)] transition-colors cursor-pointer whitespace-nowrap"
                  title={appItem.title}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{appItem.navLabel}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onNavigate('/blog')}
              className="flex items-center gap-1.5 hover:text-[var(--color-accent-base)] transition-colors cursor-pointer whitespace-nowrap"
              title={t.landing.nav.blog}
            >
              <Newspaper className="w-4 h-4 shrink-0" />
              <span>{t.landing.nav.blog}</span>
            </button>
          </nav>

          {/* Selector móvil compacto: Herramientas (5) */}
          <div className="md:hidden relative">
            <button
              type="button"
              onClick={() => setIsToolsMenuOpen((prev) => !prev)}
              style={{ borderRadius: radius.control }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] text-xs font-bold text-[var(--ui-text-primary)] cursor-pointer"
            >
              <span>Herramientas (5)</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isToolsMenuOpen && (
              <div
                style={{ borderRadius: radius.modal }}
                className={`absolute left-1/2 -translate-x-1/2 mt-2 w-64 bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] ${elevationSystem.floating} p-2 z-50 space-y-1`}
              >
                {LANDING_APPS_CATALOG.map((appItem) => {
                  const Icon = NAV_ICONS[appItem.id] || FileText;
                  return (
                    <button
                      key={appItem.id}
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onNavigate(appItem.route);
                      }}
                      style={{ borderRadius: radius.control }}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <Icon className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
                      <span className="truncate">{appItem.navLabel}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsMenuOpen(false);
                    onNavigate('/blog');
                  }}
                  style={{ borderRadius: radius.control }}
                  className="w-full text-left px-3 py-2 hover:bg-[var(--ui-bg-card)] text-xs font-bold flex items-center gap-2 border-t border-[var(--ui-border)] pt-2 mt-1 cursor-pointer"
                >
                  <Newspaper className="w-4 h-4 text-[var(--color-secondary-bright)] shrink-0" />
                  <span>{t.landing.nav.blog}</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggleButton currentThemeId={currentTheme} onToggle={handleToggleTheme} size="md" />

            {user ? (
              <button
                type="button"
                onClick={() => onNavigate('/crear-cv')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--color-accent-base)]/40 bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] text-xs font-bold hover:opacity-90 transition cursor-pointer"
                title="Ir a mi cuenta"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{profile?.name || user.email?.split('@')[0] || 'Mi Cuenta'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] text-xs font-bold hover:opacity-90 shadow-sm transition active:scale-95 cursor-pointer"
                title="Iniciar sesión o registrarme"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Multi-App Interactivo con las 5 herramientas arriba sin scroll */}
      <section className="relative pt-8 pb-12 md:pt-12 md:pb-16 shrink-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--color-accent-muted)] blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 sm:space-y-5 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/30 rounded-full text-[var(--color-accent-text)] font-semibold text-xs tracking-wider uppercase">
            <Sparkles className="w-4 h-4 text-[var(--color-accent-text)] shrink-0" />
            <span>{t.landing.hero.eyebrow}</span>
          </div>

          <h1 className={`${displayScale.hero} text-[var(--ui-text-primary)] max-w-4xl mx-auto`}>
            {t.landing.hero.title}
          </h1>

          <p className={`${displayScale.lead} text-[var(--ui-text-secondary)] max-w-3xl mx-auto font-normal`}>
            {t.landing.hero.lead}
          </p>

          <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 pt-1">
            <MarketingCTA
              label={exploredApp?.ctaLabel || t.landing.hero.primaryCta}
              onClick={() => onNavigate(exploredApp?.route || '/crear-cv')}
              size="lg"
              variant="primary"
            />
            {!user && onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="px-5 py-2.5 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg-card)] hover:bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] font-bold text-xs sm:text-sm transition shadow-sm cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <LogIn className="w-4 h-4 text-[var(--color-accent-text)]" />
                <span>Iniciar sesión</span>
              </button>
            )}
          </div>

          <p className="text-xs font-bold text-[var(--color-status-success-text)]">
            {t.landing.hero.trustSeal}
          </p>

          <div className="flex flex-wrap justify-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/20 text-[var(--color-accent-text)] text-xs font-bold">
              <ScanLine className="w-3.5 h-3.5" />
              <span>{t.landing.hero.heroPills.ats.title}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/20 text-[var(--color-accent-text)] text-xs font-bold">
              <Award className="w-3.5 h-3.5" />
              <span>{t.landing.hero.heroPills.privacy.title}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/20 text-[var(--color-accent-text)] text-xs font-bold">
              <CreditCard className="w-3.5 h-3.5" />
              <span>{t.landing.hero.heroPills.pricing.title}</span>
            </div>
          </div>

          {/* Selector Interactivo de las 5 Apps */}
          <HeroCarousel onNavigate={onNavigate} onActiveAppChange={setExploredApp} />
        </div>
      </section>

      {/* 3. Grilla Portal de las 5 Aplicaciones con filtro por objetivo (arriba) */}
      <MarketingSection>
        <PortalProductsGrid onNavigate={onNavigate} />
      </MarketingSection>

      {/* 3.5 Auditor ATS en vivo (< 60 segundos) */}
      <MarketingSection>
        <AtsAuditHeroWidget />
      </MarketingSection>

      {/* 4. Gobernanza (Features Grid) */}
      <MarketingSection>
        <div className="text-center mb-12">
          <h2 className={`${displayScale.sectionHeading} text-[var(--ui-text-primary)] mb-4`}>
            {t.landing.features.sectionTitle}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={Zap}
            title={t.landing.features.speed.title}
            description={t.landing.features.speed.description}
          />
          <FeatureCard
            icon={Palette}
            title={t.landing.features.designSystem.title}
            description={t.landing.features.designSystem.description}
          />
          <FeatureCard
            icon={Printer}
            title={t.landing.features.printReady.title}
            description={t.landing.features.printReady.description}
          />
        </div>
      </MarketingSection>

      {/* 4.6. Características de Valor */}
      <MarketingSection className="bg-[var(--ui-bg-card)] border-t border-[var(--ui-border)] py-12">
        <div className="text-center mb-12">
          <h2 className={`${displayScale.sectionHeading} text-[var(--ui-text-primary)] mb-4`}>
            ¿Qué te quita el sueño? Nosotros lo resolvemos.
          </h2>
          <p className="text-[var(--ui-text-secondary)] max-w-2xl mx-auto">
            No más capas gráficas rotas, suscripciones trampa ni diseño genérico.
            Diseñá con confianza en tu navegador, guardando también en tu Google Drive personal si querés.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={Mail}
            title={t.landing.features.coverLetter.title}
            description={t.landing.features.coverLetter.description}
          />
          <FeatureCard
            icon={Brush}
            title={t.landing.features.professionalDesign.title}
            description={t.landing.features.professionalDesign.description}
          />
          <FeatureCard
            icon={ShieldCheck}
            title={t.landing.features.transparency.title}
            description={t.landing.features.transparency.description}
          />
        </div>
      </MarketingSection>

      {/* 5. Detalle de los 5 Productos Principales */}
      <MarketingSection className="bg-[var(--ui-bg-card)]">
        <div className="text-center mb-14">
          <h2 className={`${displayScale.sectionHeading} text-[var(--ui-text-primary)]`}>
            {t.landing.products.sectionTitle}
          </h2>
        </div>

        <div className="space-y-20">
          {LANDING_APPS_CATALOG.map((item, idx) => (
            <ProductDetailBlock
              key={item.id}
              title={item.title}
              description={item.description}
              bullets={[...item.benefits]}
              image={item.detailImage}
              ctaLabel={item.ctaLabel}
              onClick={() => onNavigate(item.route)}
              reverse={idx % 2 === 1}
            />
          ))}
        </div>
      </MarketingSection>

      {/* Tabla Comparativa de Transparencia */}
      <MarketingSection className="bg-[var(--ui-bg-card)] border-y border-[var(--ui-border)]">
        <div className="text-center mb-8">
          <h2 className={`${displayScale.sectionHeading} text-[var(--ui-text-primary)] mb-4`}>
            {t.landing.hero.transparencyTable.title}
          </h2>
          <p className="text-[var(--ui-text-secondary)] max-w-2xl mx-auto">
            {t.landing.hero.transparencyTable.subtitle}
          </p>
        </div>
        <TransparencyComparisonTable rows={t.landing.hero.transparencyTable.rows} />
      </MarketingSection>

      {/* 6. Precios Transparentes (3 opciones claras, cero suscripciones trampa) */}
      <MarketingSection id="precios">
        <div className="text-center mb-12">
          <h2 className={`${displayScale.sectionHeading} text-[var(--ui-text-primary)] mb-4`}>
            Precios Claros · Sin Suscripciones Trampa
          </h2>
          <p className="text-[var(--ui-text-secondary)] max-w-2xl mx-auto">
            Armá y previsualizá todo gratis. Pagás solo por descarga, o elegís un Pase Permanente o Pase de 30 días sin débitos automáticos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
          <PlanFeatureCard planId="free" onSelectPlan={() => onNavigate('/crear-cv')} />

          <div
            style={{ borderRadius: radius.modal }}
            className="flex flex-col justify-between p-6 bg-[var(--ui-bg-card)] border border-[var(--ui-border)]"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xl font-bold text-[var(--ui-text-primary)]">Créditos Prepago</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] border border-[var(--color-accent-base)]/30">
                  No vencen
                </span>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-[var(--ui-text-primary)]">Desde $2.60 USD</div>
                <div className="text-xs font-bold text-[var(--color-status-success-text)] mt-0.5">
                  o $3.200 ARS con Mercado Pago
                </div>
                <p className="text-xs text-[var(--ui-text-secondary)] mt-1">
                  Packs de 1, 5 o 10 créditos reutilizables entre CV, Libros, Agendas, EditorLee y FacturLee.
                </p>
              </div>
              <ul className="space-y-2.5 text-xs text-[var(--ui-text-secondary)]">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[var(--color-status-success-text)] shrink-0 mt-0.5" />
                  <span>1 crédito = 1 descarga PDF (y copias en Word/Excel y Drive incluidas)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[var(--color-status-success-text)] shrink-0 mt-0.5" />
                  <span>Carta de Presentación y Tarjeta QR gratis en tu CV</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[var(--color-status-success-text)] shrink-0 mt-0.5" />
                  <span>Canjeá tus créditos por Pases cuando quieras</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/crear-cv')}
              style={{ borderRadius: radius.card }}
              className="mt-6 w-full py-3 px-4 bg-[var(--ui-bg-panel)] hover:bg-[var(--ui-bg-card)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              Empezar con CV, Libro o Agenda
            </button>
          </div>

          <div
            style={{ borderRadius: radius.modal }}
            className="flex flex-col justify-between p-6 bg-[var(--ui-bg-panel)] border-2 border-[var(--color-accent-base)] shadow-[var(--shadow-overlay)]"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xl font-bold text-[var(--ui-text-primary)] flex items-center gap-1.5">
                  <Crown className="w-5 h-5 text-[var(--color-accent-text)]" />
                  <span>Pases EditorLee y FacturLee</span>
                </h3>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-[var(--ui-text-primary)]">10 créditos</div>
                <div className="text-xs font-bold text-[var(--color-status-success-text)] mt-0.5">
                  $17 USD / $21.000 ARS (Pase Permanente) · o 5 cr. por 30 días totales
                </div>
                <p className="text-xs text-[var(--ui-text-secondary)] mt-1">
                  Pago único transparente o canje de tus créditos. Cero débitos automáticos.
                </p>
              </div>
              <ul className="space-y-2.5 text-xs text-[var(--ui-text-secondary)]">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[var(--color-status-success-text)] shrink-0 mt-0.5" />
                  <span><strong>Pase Permanente EditorLee o FacturLee:</strong> exportaciones ilimitadas</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[var(--color-status-success-text)] shrink-0 mt-0.5" />
                  <span><strong>FacturLee incluye 3 comprobantes PDF gratis</strong> para probar primero</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[var(--color-status-success-text)] shrink-0 mt-0.5" />
                  <span><strong>Pase Total 30 Días (5 cr.):</strong> todas las 5 apps + mayor cuota de IA</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onNavigate('/crear-editor')}
                style={{ borderRadius: radius.card }}
                className="py-2.5 px-3 bg-[var(--color-accent-base)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-on-base)] font-bold text-xs cursor-pointer"
              >
                Abrir EditorLee
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/crear-factura')}
                style={{ borderRadius: radius.card }}
                className="py-2.5 px-3 bg-[var(--ui-bg-card)] hover:bg-[var(--ui-bg-panel)] border border-[var(--ui-border)] text-[var(--ui-text-primary)] font-bold text-xs cursor-pointer"
              >
                Abrir FacturLee
              </button>
            </div>
          </div>
        </div>
      </MarketingSection>

      {/* 7. FAQ */}
      <MarketingSection className="bg-[var(--ui-bg-card)] border-y border-[var(--ui-border)]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className={`${displayScale.sectionHeading} text-[var(--ui-text-primary)]`}>
              {t.landing.faq.sectionTitle}
            </h2>
          </div>
          <FaqAccordion items={faqItems} />
        </div>
      </MarketingSection>

      {/* 8. Guías Prácticas y Tutoriales de Uso */}
      <MarketingSection className="bg-[var(--ui-bg-card)] border-t border-[var(--ui-border)]">
        <div className="text-center mb-12">
          <h2 className={`${displayScale.sectionHeading} text-[var(--ui-text-primary)] mb-4`}>
            Guías Prácticas y Tutoriales de Uso
          </h2>
          <p className="text-[var(--ui-text-secondary)] max-w-2xl mx-auto">
            Aprende a sacar el máximo provecho de nuestras herramientas con estas guías paso a paso.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div onClick={() => onNavigate('/blog/como-estructurar-cv-superar-filtros-ats')} className="group p-6 bg-[var(--ui-bg-panel)] rounded-[24px] border border-[var(--ui-border)] hover:border-[var(--color-accent-base)]/50 cursor-pointer transition-all hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-4 text-[var(--color-accent-text)]">
              <FileText className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Curriculum Vitae</span>
            </div>
            <h3 className="text-lg font-bold text-[var(--ui-text-primary)] mb-2 group-hover:text-[var(--color-accent-text)] transition-colors">Cómo estructurar tu CV para superar los filtros ATS</h3>
            <p className="text-sm text-[var(--ui-text-secondary)]">Aprende a maquetar tu currículum con una plantilla de 1 columna y ordenar las secciones correctamente.</p>
          </div>
          <div onClick={() => onNavigate('/blog/redactar-carta-de-presentacion-con-ia')} className="group p-6 bg-[var(--ui-bg-panel)] rounded-[24px] border border-[var(--ui-border)] hover:border-[var(--color-accent-base)]/50 cursor-pointer transition-all hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-4 text-[var(--color-accent-text)]">
              <Mail className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Cartas de Presentación</span>
            </div>
            <h3 className="text-lg font-bold text-[var(--ui-text-primary)] mb-2 group-hover:text-[var(--color-accent-text)] transition-colors">Paso a paso: redactar una carta de presentación con IA</h3>
            <p className="text-sm text-[var(--ui-text-secondary)]">Crea una carta de presentación perfectamente adaptada a los requerimientos del puesto en segundos.</p>
          </div>
          <div onClick={() => onNavigate('/blog/manual-diseno-impresion-tarjetas-personales')} className="group p-6 bg-[var(--ui-bg-panel)] rounded-[24px] border border-[var(--ui-border)] hover:border-[var(--color-accent-base)]/50 cursor-pointer transition-all hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-4 text-[var(--color-accent-text)]">
              <CreditCard className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Tarjetas Personales</span>
            </div>
            <h3 className="text-lg font-bold text-[var(--ui-text-primary)] mb-2 group-hover:text-[var(--color-accent-text)] transition-colors">Manual de diseño e impresión de tarjetas personales</h3>
            <p className="text-sm text-[var(--ui-text-secondary)]">Todo lo que necesitas saber para imprimir tus tarjetas en casa o en una imprenta, con códigos QR.</p>
          </div>
          <div onClick={() => onNavigate('/blog/como-maquetar-doblar-libro-caballete')} className="group p-6 bg-[var(--ui-bg-panel)] rounded-[24px] border border-[var(--ui-border)] hover:border-[var(--color-accent-base)]/50 cursor-pointer transition-all hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-4 text-[var(--color-accent-text)]">
              <BookOpen className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Armado de Libros</span>
            </div>
            <h3 className="text-lg font-bold text-[var(--ui-text-primary)] mb-2 group-hover:text-[var(--color-accent-text)] transition-colors">Cómo maquetar y doblar tu primer libro en caballete</h3>
            <p className="text-sm text-[var(--ui-text-secondary)]">Aprende la regla de los múltiplos de 4 y el orden correcto de las hojas para un libro perfecto.</p>
          </div>
        </div>
        <div className="mt-10 text-center">
          <MarketingCTA label="Ver todos los artículos del Blog" onClick={() => onNavigate('/blog')} variant="secondary" />
        </div>
      </MarketingSection>

      {/* 9. CTA Final con selector de app */}
      <section className="bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] py-16 sm:py-20 text-center px-4 shrink-0">
        <h2 className="text-3xl md:text-5xl font-extrabold mb-4 max-w-3xl mx-auto">
          Elegí tu herramienta y empezá gratis hoy.
        </h2>
        <p className="text-base sm:text-lg opacity-90 max-w-2xl mx-auto mb-8">
          Sin tarjeta de crédito para crear ni previsualizar. Tus borradores quedan seguros en tu dispositivo o en tu Google Drive.
        </p>
        <div className="flex flex-wrap justify-center gap-2.5 max-w-4xl mx-auto">
          {LANDING_APPS_CATALOG.map((appItem) => (
            <button
              key={appItem.id}
              type="button"
              onClick={() => onNavigate(appItem.route)}
              style={{ borderRadius: radius.card }}
              className="bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] px-5 py-3 font-bold text-sm hover:scale-105 transition-transform shadow-[var(--shadow-floating)] cursor-pointer inline-flex items-center gap-2"
            >
              <span>{appItem.navLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ))}
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="mt-auto bg-[var(--ui-bg-panel)] border-t border-[var(--ui-border)] pt-10 pb-24 md:pb-10 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--ui-text-secondary)]">
          <div className="flex flex-col items-center sm:items-start gap-2">
            <Logo layout="isotipo" animatedRainbow={true} currentUiTheme={currentTheme} className="h-6" />
            <p>© 2026 LEECV Studio. {t.landing.footer.rights}</p>
            <p className="text-[10px] opacity-60">{LEECV_VERSION.label}</p>
          </div>
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

      {/* Sticky CTA móvil contextual que recuerda la app explorada */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-[var(--ui-bg-panel)]/95 backdrop-blur-lg border-t border-[var(--ui-border)] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-[var(--ui-text-primary)] truncate">{exploredApp.navLabel}</p>
          <p className="text-[10px] text-[var(--ui-text-secondary)] truncate">{exploredApp.badge}</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate(exploredApp.route)}
          style={{ borderRadius: radius.control }}
          className="px-4 py-2 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] font-bold text-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <span>{exploredApp.ctaLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
