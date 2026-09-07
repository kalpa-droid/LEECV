import React, { useState } from 'react';
import { Newspaper, ArrowLeft, Clock, User, FileText, BookOpen } from 'lucide-react';
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
}

const articlesData: Article[] = [
  {
    slug: 'filtros-ats-curriculum-vitae',
    title: 'Cómo optimizar tu CV para superar los sistemas de selección ATS',
    summary: 'Los Applicant Tracking Systems (ATS) analizan tu currículum antes de que lo vea un reclutador. Descubre cómo estructurar tus secciones para maximizar tu puntaje.',
    category: 'Empleabilidad',
    readTime: '5 min de lectura',
    date: '04 de Septiembre, 2026',
    author: 'Equipo LEECV',
    content: [
      'Un sistema ATS (Applicant Tracking System) es un software automatizado que escanea y clasifica las postulaciones de empleo según palabras clave y formato de documento.',
      '1. Usa una estructura de 1 columna limpia: Las tablas complejas y los gráficos flotantes dificultan la extracción automática de texto. Con el motor ATS de LEECV, tu CV exporta etiquetas legibles estándar.',
      '2. Incluye nombres de cargos y habilidades explícitas: Si te postulas a "Desarrollador Frontend", asegúrate de incluir palabras clave como React, TypeScript, HTML y CSS en tus experiencias.',
      '3. Formato PDF vectorial: Evita exportar tu currículum como una imagen JPG o PNG. Los archivos PDF vectoriales permiten la selección directa de texto que requiere el escáner.',
      'Con el chequeador ATS incorporado en LEECV, puedes auditar tu currículum en tiempo real antes de enviarlo a cualquier oferta laboral.'
    ]
  },
  {
    slug: 'guia-imposicion-libros-caballete',
    title: 'Guía de Imposición de Libros: Cómo preparar PDFs para imprenta en caballete',
    summary: 'La imposición de pliegos reordena las páginas de un PDF para que al imprimirse doble faz y doblarse al medio, queden en la secuencia exacta del libro.',
    category: 'Impresión & Imprenta',
    readTime: '6 min de lectura',
    date: '02 de Septiembre, 2026',
    author: 'Studio Imprenta',
    content: [
      'Cuando imprimes un libro o folleto abrochado al centro (saddle-stitch / caballete), no puedes imprimir la página 1 al lado de la página 2 en la misma hoja de papel.',
      'En un libro de 8 páginas impreso en 2 hojas A4 dobladas al medio:',
      '• Frente de la Hoja 1: Página 8 (izquierda) y Página 1 (derecha).',
      '• Dorso de la Hoja 1: Página 2 (izquierda) y Página 7 (derecha).',
      '• Frente de la Hoja 2: Página 6 (izquierda) y Página 3 (derecha).',
      '• Dorso de la Hoja 2: Página 4 (izquierda) y Página 5 (derecha).',
      'El motor de Studio Libros de LEECV realiza esta imposición matemática automáticamente, ajustando el número total de páginas al múltiplo de 4 requerido y generando el archivo PDF listo para enviar a la imprenta.'
    ]
  },
  {
    slug: 'tarjetas-personales-qr-networking',
    title: 'Diseño de Tarjetas Personales con Código QR: Impacto visual y tecnología',
    summary: 'Aprende a combinar un diseño tipográfico impecable con enlaces QR interactivos para proyectar una imagen profesional inolvidable en cada reunión.',
    category: 'Diseño Gráfico',
    readTime: '4 min de lectura',
    date: '28 de Agosto, 2026',
    author: 'Equipo LEECV',
    content: [
      'Una tarjeta personal física sigue siendo el elemento de contacto más ágil en conferencias, eventos de negocios y reuniones presenciales.',
      'Para maximizar su utilidad:',
      '1. Incluye un código QR dinámico: Conecta la tarjeta física a tu portafolio en línea, perfil de LinkedIn o tarjeta digital interactiva.',
      '2. Respeta los márgenes de corte de imprenta: El tamaño estándar de tarjeta es 85 x 55 mm o 90 x 50 mm. Deja siempre un margen de seguridad de 3 mm.',
      '3. Contraste y legibilidad: Utiliza tipografías nítidas y colores de alto contraste entre el texto y el fondo.',
      'En LEECV Tarjetas, puedes subir tu logo con recorte libre, extraer los colores principales y exportar una grilla de 9 tarjetas por hoja A4 para imprimir en cartulina.'
    ]
  }
];

interface BlogModuleProps {
  onNavigateHome: () => void;
  onNavigateProduct: (route: string) => void;
}

export const BlogModule: React.FC<BlogModuleProps> = ({ onNavigateHome, onNavigateProduct }) => {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  return (
    <div className="h-[100dvh] overflow-y-auto bg-[var(--ui-bg-panel)] text-[var(--ui-text-primary)] flex flex-col font-sans transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--ui-bg-panel)]/80 backdrop-blur-xl border-b border-[var(--ui-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onNavigateHome}>
            <button className="p-2 rounded-xl text-[var(--ui-text-secondary)] hover:text-[var(--ui-text-primary)] hover:bg-[var(--ui-bg-card)] transition-colors cursor-pointer">
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        {selectedArticle ? (
          /* Vista de Artículo Individual */
          <article className="space-y-8 max-w-3xl mx-auto">
            <button
              onClick={() => setSelectedArticle(null)}
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
                <button
                  onClick={() => onNavigateProduct('/crear-cv')}
                  className={`${button.base} ${button.primary} flex items-center gap-2 px-6 py-3 text-sm`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Crear CV Profesional</span>
                </button>
                <button
                  onClick={() => onNavigateProduct('/crear-libro')}
                  className={`${button.base} ${button.secondary} flex items-center gap-2 px-6 py-3 text-sm`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Imponer Libro PDF</span>
                </button>
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
                  onClick={() => setSelectedArticle(art)}
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
