import React, { useState, useEffect } from 'react';
import { FileText, Mail, CreditCard, BookOpen, Newspaper, Sparkles, ShieldCheck, Award, Zap } from 'lucide-react';
import { displayScale, elevationSystem, radius } from '../../shared/core/uiDesignSystem';
import { ThemeToggleButton } from '../../shared/core/ui/ThemeToggleButton';
import { getGlobalUiTheme, cycleGlobalUiTheme } from '../../shared/core/utils/globalThemePreference';
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
import { useToast } from '../../shared/core/ui/Toast';
import { useIsMobile } from '../../shared/core/ui/useIsMobile';
import { AccountMenuButton } from '../../shared/core/ui/AccountMenuButton';
import { selectPaidPlan } from '../payments/paymentService';

interface LandingPageProps {
  onNavigate: (route: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const t = useText();
  const isMobile = useIsMobile();
  const { showError } = useToast();
  const [currentTheme, setCurrentTheme] = useState<string>('day');
  const [loadingGateway, setLoadingGateway] = useState<string | null>(null);

  const handleSelectGateway = async (planId: 'pro' | 'enterprise', gateway: 'mercadopago' | 'paypal' | 'lemonsqueezy') => {
    setLoadingGateway(gateway);
    await selectPaidPlan(planId, gateway, {
      onError: (msg) => showError(msg),
    });
    setLoadingGateway(null);
  };

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
  ];

  return (
    <div className="h-[100dvh] w-full overflow-y-auto bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] flex flex-col font-sans transition-colors duration-300">
      {/* 1. Header sticky */}
      <header className="sticky top-0 z-40 bg-[var(--ui-bg-panel)]/80 backdrop-blur-xl border-b border-[var(--ui-border)] shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => onNavigate('/')}>
            <Logo layout={isMobile ? 'horizontal' : 'slogan'} animatedRainbow currentUiTheme={currentTheme} className="h-8 sm:h-10" />
          </div>

          <nav className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm font-semibold text-[var(--ui-text-secondary)]">
            <button onClick={() => onNavigate('/crear-cv')} className="flex items-center gap-1 hover:text-[var(--color-accent-base)] transition-colors cursor-pointer" title={t.landing.nav.cv}>
              <FileText className="w-4 h-4" />
              {!isMobile && <span>{t.landing.nav.cv}</span>}
            </button>
            <button onClick={() => onNavigate('/crear-carta')} className="flex items-center gap-1 hover:text-[var(--color-accent-base)] transition-colors cursor-pointer" title={(t.landing.nav as any).cartas || 'Cartas de Presentación'}>
              <Mail className="w-4 h-4" />
              {!isMobile && <span>{(t.landing.nav as any).cartas || 'Cartas'}</span>}
            </button>
            <button onClick={() => onNavigate('/crear-tarjeta')} className="flex items-center gap-1 hover:text-[var(--color-accent-base)] transition-colors cursor-pointer" title={t.landing.nav.tarjetas}>
              <CreditCard className="w-4 h-4" />
              {!isMobile && <span>{t.landing.nav.tarjetas}</span>}
            </button>
            <button onClick={() => onNavigate('/crear-libro')} className="flex items-center gap-1 hover:text-[var(--color-accent-base)] transition-colors cursor-pointer" title={t.landing.nav.libros}>
              <BookOpen className="w-4 h-4" />
              {!isMobile && <span>{t.landing.nav.libros}</span>}
            </button>
            <button onClick={() => onNavigate('/blog')} className="flex items-center gap-1 hover:text-[var(--color-accent-base)] transition-colors cursor-pointer" title={t.landing.nav.blog}>
              <Newspaper className="w-4 h-4" />
              {!isMobile && <span>{t.landing.nav.blog}</span>}
            </button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggleButton currentThemeId={currentTheme} onToggle={handleToggleTheme} size="md" />
            <AccountMenuButton
              onLogin={() => onNavigate('/crear-cv')}
              onOpenPricing={() => { document.getElementById('precios')?.scrollIntoView({ behavior: 'smooth' }); }}
              onOpenSavedDocs={() => onNavigate('/dashboard')}
              buttonText={isMobile ? undefined : t.landing.nav.cta}
            />
          </div>
        </div>
      </header>

      {/* 2. Hero Optimizado con Carrusel y Social Proof */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 shrink-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--color-accent-muted)] blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent-muted)] border border-[var(--color-accent-base)]/30 rounded-full text-[var(--color-accent-text)] font-semibold text-xs tracking-wider uppercase">
            <Sparkles className="w-4 h-4 text-[var(--color-accent-text)]" />
            <span>{t.landing.hero.eyebrow}</span>
          </div>

          <h1 className={`${displayScale.hero} text-[var(--ui-text-primary)] max-w-4xl mx-auto`}>
            {t.landing.hero.title}
          </h1>

          <p className={`${displayScale.lead} text-[var(--ui-text-secondary)] max-w-3xl mx-auto font-normal pb-2`}>
            {t.landing.hero.lead}
          </p>

          <div className="flex justify-center gap-4 pb-2">
            <MarketingCTA label={t.landing.hero.primaryCta} onClick={() => onNavigate('/crear-cv')} size="lg" variant="primary" />
          </div>

          {/* Barra de Prueba Social */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--ui-bg-card)] border border-[var(--ui-border)] rounded-full text-xs font-bold text-[var(--ui-text-primary)] shadow-sm">
            <span className="text-[var(--color-accent-amber-bright)]">⭐</span>
            <span>{t.landing.socialProof.line}</span>
            <span className="text-[var(--ui-text-secondary)] font-normal hidden sm:inline">| 100% privado · Sin marcas de agua</span>
          </div>

          {/* Carrusel Interactivo de Productos */}
          <HeroCarousel onNavigate={onNavigate} />
        </div>
      </section>


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

      {/* 4.5. Grilla Portal de Productos (Grilla 2x2 con CTAs directos) */}
      <MarketingSection>
        <PortalProductsGrid onNavigate={onNavigate} />
      </MarketingSection>

      {/* 5. Detalle de Productos en Zigzag */}
      <MarketingSection className="bg-[var(--ui-bg-card)]">
        <div className="text-center mb-16">
          <h2 className={`${displayScale.sectionHeading} text-[var(--ui-text-primary)]`}>
            {t.landing.products.sectionTitle}
          </h2>
        </div>
        
        <div className="space-y-24">
          <ProductDetailBlock
            title={t.landing.products.cv.title}
            description={t.landing.products.cv.description}
            bullets={t.landing.products.cv.bullets as any as string[]}
            image="/marketing/preview-cv-detail.webp"
            ctaLabel={t.landing.products.cv.cta}
            onClick={() => onNavigate('/crear-cv')}
            reverse={false}
          />

          <ProductDetailBlock
            title={((t.landing.products as any).cartas?.title || 'Cartas de Presentación & IA')}
            description={((t.landing.products as any).cartas?.description || 'Cartas de presentación personalizadas por vacante, redactadas con asistencia de IA.')}
            bullets={((t.landing.products as any).cartas?.bullets || []) as any as string[]}
            image="/marketing/preview-carta-detail.webp"
            ctaLabel={((t.landing.products as any).cartas?.cta || 'Crear Carta con IA')}
            onClick={() => onNavigate('/crear-carta')}
            reverse={true}
          />

          <ProductDetailBlock
            title={t.landing.products.tarjetas.title}
            description={t.landing.products.tarjetas.description}
            bullets={t.landing.products.tarjetas.bullets as any as string[]}
            image="/marketing/preview-tarjeta-detail.webp"
            ctaLabel={t.landing.products.tarjetas.cta}
            onClick={() => onNavigate('/crear-tarjeta')}
            reverse={false}
          />

          <ProductDetailBlock
            title={t.landing.products.libros.title}
            description={t.landing.products.libros.description}
            bullets={t.landing.products.libros.bullets as any as string[]}
            image="/marketing/preview-libro-detail.webp"
            ctaLabel={t.landing.products.libros.cta}
            onClick={() => onNavigate('/crear-libro')}
            reverse={true}
          />
        </div>
      </MarketingSection>

      {/* 6. Precios en Vivo */}
      <MarketingSection id="precios">
        <div className="text-center mb-12">
          <h2 className={`${displayScale.sectionHeading} text-[var(--ui-text-primary)] mb-4`}>
            Planes Simples y Transparentes
          </h2>
          <p className="text-[var(--ui-text-secondary)] max-w-2xl mx-auto">
            Comenzá gratis y pagá solo cuando necesites herramientas avanzadas o impresión en alta calidad. Sin suscripciones ocultas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
          <PlanFeatureCard planId="free" onSelectPlan={() => onNavigate('/crear-cv')} />
          <PlanFeatureCard
            planId="pro"
            highlighted
            onSelectGateway={handleSelectGateway}
            loadingGateway={loadingGateway}
          />
          <PlanFeatureCard
            planId="enterprise"
            onSelectGateway={handleSelectGateway}
            loadingGateway={loadingGateway}
          />
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
          {/* Card 1 */}
          <div onClick={() => onNavigate('/blog/como-estructurar-cv-superar-filtros-ats')} className="group p-6 bg-[var(--ui-bg-panel)] rounded-[24px] border border-[var(--ui-border)] hover:border-[var(--color-accent-base)]/50 cursor-pointer transition-all hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-4 text-[var(--color-accent-text)]">
              <FileText className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Curriculum Vitae</span>
            </div>
            <h3 className="text-lg font-bold text-[var(--ui-text-primary)] mb-2 group-hover:text-[var(--color-accent-text)] transition-colors">Cómo estructurar tu CV para superar los filtros ATS</h3>
            <p className="text-sm text-[var(--ui-text-secondary)]">Aprende a maquetar tu currículum con una plantilla de 1 columna y ordenar las secciones correctamente.</p>
          </div>
          {/* Card 2 */}
          <div onClick={() => onNavigate('/blog/redactar-carta-de-presentacion-con-ia')} className="group p-6 bg-[var(--ui-bg-panel)] rounded-[24px] border border-[var(--ui-border)] hover:border-[var(--color-accent-base)]/50 cursor-pointer transition-all hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-4 text-[var(--color-accent-text)]">
              <Mail className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Cartas de Presentación</span>
            </div>
            <h3 className="text-lg font-bold text-[var(--ui-text-primary)] mb-2 group-hover:text-[var(--color-accent-text)] transition-colors">Paso a paso: redactar una carta de presentación con IA</h3>
            <p className="text-sm text-[var(--ui-text-secondary)]">Crea una carta de presentación perfectamente adaptada a los requerimientos del puesto en segundos.</p>
          </div>
          {/* Card 3 */}
          <div onClick={() => onNavigate('/blog/manual-diseno-impresion-tarjetas-personales')} className="group p-6 bg-[var(--ui-bg-panel)] rounded-[24px] border border-[var(--ui-border)] hover:border-[var(--color-accent-base)]/50 cursor-pointer transition-all hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-4 text-[var(--color-accent-text)]">
              <CreditCard className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Tarjetas Personales</span>
            </div>
            <h3 className="text-lg font-bold text-[var(--ui-text-primary)] mb-2 group-hover:text-[var(--color-accent-text)] transition-colors">Manual de diseño e impresión de tarjetas personales</h3>
            <p className="text-sm text-[var(--ui-text-secondary)]">Todo lo que necesitas saber para imprimir tus tarjetas en casa o en una imprenta, con códigos QR.</p>
          </div>
          {/* Card 4 */}
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

      {/* 9. CTA Final */}
      <section className="bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] py-20 text-center px-4 shrink-0">
        <h2 className="text-3xl md:text-5xl font-extrabold mb-6 max-w-3xl mx-auto">
          Empieza a crear documentos que destaquen.
        </h2>
        <p className="text-lg opacity-90 max-w-2xl mx-auto mb-10">
          No necesitas tarjeta de crédito para empezar a diseñar. Sumate a los miles de profesionales que ya usan LEECV.
        </p>
        <button
          onClick={() => onNavigate('/crear-cv')}
          className={`bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] px-8 py-4 rounded-[${radius.card}] font-bold text-lg hover:scale-105 transition-transform shadow-[var(--shadow-floating)] cursor-pointer`}
        >
          {t.landing.nav.cta}
        </button>
      </section>

      {/* 10. Footer */}
      <footer className="mt-auto bg-[var(--ui-bg-panel)] border-t border-[var(--ui-border)] py-10 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--ui-text-secondary)]">
          <div className="flex flex-col items-center sm:items-start gap-2">
            <Logo layout="isotipo" animatedRainbow={true} currentUiTheme={currentTheme} className="h-6" />
            <p>© 2026 LEECV Studio. {t.landing.footer.rights}</p>
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
    </div>
  );
};
