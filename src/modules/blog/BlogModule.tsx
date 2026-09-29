import React, { useState, useEffect } from 'react';
import { Newspaper, ArrowLeft, Clock, User, FileText, BookOpen, Mail } from 'lucide-react';
import { displayScale, elevationSystem, radius, button } from '../../shared/core/uiDesignSystem';


interface Article {
  slug: string;
  title: string;
  summary: string;
  category: string;
  readTime: string;
  date: string;
  author: string;
  content: string[];
  ctaLabel?: string;
  ctaRoute?: string;
}

import * as allArticles from './data';

const articlesData: Article[] = Object.values(allArticles);


interface BlogModuleProps {
  initialSlug?: string;
  onNavigateHome: () => void;
  onNavigateProduct: (route: string) => void;
}

export const BlogModule: React.FC<BlogModuleProps> = ({ initialSlug, onNavigateHome, onNavigateProduct }) => {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(() => {
    if (initialSlug) {
      const found = articlesData.find(a => a.slug === initialSlug);
      if (found) return found;
    }
    return null;
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/blog/')) {
        const slug = path.replace('/blog/', '');
        const found = articlesData.find(a => a.slug === slug);
        setSelectedArticle(found || null);
      } else if (path === '/blog') {
        setSelectedArticle(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

    // SEO features removed


  const handleSelectArticle = (art: Article | null) => {
    setSelectedArticle(art);
    if (art) {
      window.history.pushState({}, '', `/blog/${art.slug}`);
    } else {
      window.history.pushState({}, '', '/blog');
    }
  };

  return (
    <div className="h-[100dvh] overflow-y-auto bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] flex flex-col font-sans transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--ui-bg-panel)]/80 backdrop-blur-xl border-b border-[var(--ui-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onNavigateHome}>
            <button className={`p-2 rounded-[${radius.control}] text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-card)] transition-colors cursor-pointer`}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className={`p-2 bg-[var(--color-accent-base)] text-[var(--color-accent-on-base)] rounded-[${radius.card}] font-black ${elevationSystem.raised}`}>
                <Newspaper className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-lg text-[var(--ui-text-primary)] tracking-tight">
                Blog & Recursos <span className="text-[var(--color-accent-text)] text-xs font-normal">LEECV</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">

          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        {selectedArticle ? (
          /* Vista de Artículo Individual */
          <article className="space-y-8 max-w-3xl mx-auto">
            <button
              onClick={() => handleSelectArticle(null)}
              className="flex items-center gap-2 text-sm font-semibold text-[var(--color-accent-text)] hover:text-[var(--color-accent-base)] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a la lista de artículos</span>
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-xs font-semibold text-[var(--ui-text-secondary)]">
                <span className="px-3 py-1 bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] rounded-full border border-[var(--color-accent-base)]/20">
                  {selectedArticle.category}
                </span>
                <span>•</span>
                <span>{selectedArticle.readTime}</span>
                <span>•</span>
                <span>{selectedArticle.date}</span>
              </div>

              <h1 className={`${displayScale.sectionHeading} text-[var(--ui-text-primary)]`}>
                {selectedArticle.title}
              </h1>

              <div className="flex items-center gap-2 text-xs text-[var(--ui-text-secondary)] pt-2 border-b border-[var(--ui-border)] pb-6">
                <User className="w-4 h-4 text-[var(--color-accent-text)]" />
                <span>Por {selectedArticle.author}</span>
              </div>
            </div>

            <div className="space-y-6 text-[var(--ui-text-secondary)] text-base leading-relaxed">
              {selectedArticle.content.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>

            {/* CTA al final del artículo */}
            <div className={`mt-12 p-8 bg-[var(--ui-bg-card)] rounded-[24px] border border-[var(--ui-border)] ${elevationSystem.floating} text-center space-y-4`}>
              <h3 className={`${displayScale.cardTitle} text-[var(--ui-text-primary)]`}>
                ¿Listo para aplicar estas técnicas?
              </h3>
              <div className="flex flex-wrap justify-center gap-4 pt-2">
                {selectedArticle.ctaLabel && selectedArticle.ctaRoute ? (
                  <button
                    onClick={() => onNavigateProduct(selectedArticle.ctaRoute!)}
                    className={`${button.base} ${button.primary} flex items-center gap-2 px-8 py-4 text-base font-bold shadow-[var(--shadow-floating)] hover:scale-105 transition-transform`}
                  >
                    <span>{selectedArticle.ctaLabel}</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onNavigateProduct('/crear-cv')}
                      className={`${button.base} ${button.primary} flex items-center gap-2 px-6 py-3 text-sm`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Crear CV Profesional</span>
                    </button>
                    <button
                      onClick={() => onNavigateProduct('/crear-carta')}
                      className={`${button.base} ${button.secondary} flex items-center gap-2 px-6 py-3 text-sm`}
                    >
                      <Mail className="w-4 h-4" />
                      <span>Crear Carta de Presentación</span>
                    </button>
                    <button
                      onClick={() => onNavigateProduct('/crear-libro')}
                      className={`${button.base} ${button.secondary} flex items-center gap-2 px-6 py-3 text-sm`}
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Imponer Libro PDF</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </article>
        ) : (
          /* Lista de Artículos */
          <div className="space-y-10">
            <div className="text-center space-y-3">
              <h1 className={`${displayScale.sectionHeading} text-[var(--ui-text-primary)]`}>
                Recursos Educativos & Guías de Impresión
              </h1>
              <p className={`${displayScale.lead} text-[var(--ui-text-secondary)] max-w-2xl mx-auto`}>
                Aprende las mejores prácticas de estructuración de currículums, diseño de tarjetas y preparación de documentos PDF para imprenta.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {articlesData.map((art) => (
                <div
                  key={art.slug}
                  onClick={() => handleSelectArticle(art)}
                  className={`group bg-[var(--ui-bg-card)] rounded-[24px] p-8 border border-[var(--ui-border)] hover:border-[var(--color-accent-base)]/50 ${elevationSystem.raised} transition-all cursor-pointer space-y-4 hover:-translate-y-0.5`}
                >
                  <div className="flex items-center gap-3 text-xs font-semibold text-[var(--ui-text-secondary)]">
                    <span className="px-3 py-1 bg-[var(--color-accent-muted)] text-[var(--color-accent-text)] rounded-full border border-[var(--color-accent-base)]/20">
                      {art.category}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {art.readTime}
                    </span>
                  </div>

                  <h2 className={`${displayScale.cardTitle} text-[var(--ui-text-primary)] group-hover:text-[var(--color-accent-base)] transition-colors`}>
                    {art.title}
                  </h2>

                  <p className="text-[var(--ui-text-secondary)] text-sm leading-relaxed">
                    {art.summary}
                  </p>

                  <div className="flex items-center gap-2 text-[var(--color-accent-text)] font-bold text-xs pt-2">
                    <span>Leer artículo completo</span>
                    <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[var(--ui-bg-panel)] border-t border-[var(--ui-border)] py-8 text-center text-xs text-[var(--ui-text-secondary)]">
        <p>© 2026 LEECV Studio. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};
