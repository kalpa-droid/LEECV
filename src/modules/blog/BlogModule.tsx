import React, { useState, useEffect } from 'react';
import { Newspaper, ArrowLeft, Clock, User, FileText, BookOpen, Mail } from 'lucide-react';
import { displayScale, elevationSystem, radius, button } from '../../shared/core/uiDesignSystem';
import { updatePageSeo, generateHowToSchema, generateTechArticleSchema } from '../../shared/core/seo/seoIndexingEngine';

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
      '3. Guarda tu currículum como PDF con texto: Evita exportarlo como una imagen JPG o PNG. Un PDF normal permite seleccionar el texto, y eso es justo lo que necesita leer el escáner.',
      'Con el chequeador ATS incorporado en LEECV, puedes auditar tu currículum en tiempo real antes de enviarlo a cualquier oferta laboral.'
    ]
  },
  {
    slug: 'guia-imposicion-libros-caballete',
    title: 'Cómo preparar tu libro para imprimirlo y doblarlo al medio',
    summary: 'Para que un libro doblado al medio quede en orden, las páginas no se imprimen una tras otra: hay que reacomodarlas. Te explicamos cómo, y lo hacemos por ti.',
    category: 'Impresión & Imprenta',
    readTime: '6 min de lectura',
    date: '02 de Septiembre, 2026',
    author: 'Studio Imprenta',
    content: [
      'Cuando imprimes un libro o folleto abrochado al centro (saddle-stitch / caballete), no puedes imprimir la página 1 al lado de la página 2 en la misma hoja de papel.',
      'En un libro de 8 páginas impreso en 2 hojas dobladas al medio:',
      '• Frente de la Hoja 1: Página 8 (izquierda) y Página 1 (derecha).',
      '• Dorso de la Hoja 1: Página 2 (izquierda) y Página 7 (derecha).',
      '• Frente de la Hoja 2: Página 6 (izquierda) y Página 3 (derecha).',
      '• Dorso de la Hoja 2: Página 4 (izquierda) y Página 5 (derecha).',
      'Studio Libros de LEECV reacomoda las páginas por ti automáticamente, ajusta el total al múltiplo de 4 que hace falta y te da el archivo listo para imprimir en tu casa o llevar a la imprenta.'
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
      '2. Deja un margen de seguridad: Mantén el texto y el logo un poco alejados del borde, para que no se corten al recortar la tarjeta.',
      '3. Contraste y legibilidad: Utiliza tipografías nítidas y colores de alto contraste entre el texto y el fondo.',
      'En LEECV Tarjetas, puedes subir tu logo con recorte libre, extraer los colores principales y armar una hoja con 9 tarjetas para imprimir en cartulina.'
    ]
  },
  {
    slug: 'como-escribir-carta-presentacion-entrevistas',
    title: 'Cómo escribir una carta de presentación que consiga entrevistas',
    summary: 'La carta de presentación es tu oportunidad de contar la historia detrás de tu CV. Aprende la estructura de 4 párrafos que capta la atención de los reclutadores.',
    category: 'Cartas de Presentación',
    readTime: '5 min de lectura',
    date: '18 de Septiembre, 2026',
    author: 'Equipo LEECV',
    content: [
      'Mientras que tu CV enumera tus logros pasados, la carta de presentación explica por qué esos logros te convierten en el candidato ideal para el puesto específico al que te postulas.',
      '1. Saludo personalizado y gancho inicial: Evita frases genéricas. Menciona el puesto exacto y un logro relevante que demuestre tu entusiasmo.',
      '2. Evidencia concreta: Demuestra con métricas cómo resolviste problemas similares a los que enfrenta la empresa.',
      '3. Cierre proactivo: Expresa tu deseo de profundizar en una entrevista y agradece el tiempo del selector.',
      'Con la asistencia de IA en LEECV Cartas, puedes conectar tu CV y la oferta laboral para redactar una propuesta adaptada en segundos.'
    ]
  },
  {
    slug: 'carta-vs-cv-cuando-usar-cada-una',
    title: 'Carta de Presentación vs CV: cuándo usar cada una y cómo complementarlas',
    summary: 'Comprende las diferencias fundamentales entre ambos documentos y cómo usarlos en conjunto para destacar en postulaciones competitivas.',
    category: 'Estrategia Laboral',
    readTime: '4 min de lectura',
    date: '15 de Septiembre, 2026',
    author: 'Equipo LEECV',
    content: [
      'Existe una confusión frecuente sobre si enviar solo el CV o adjuntar también una carta. La regla general es: siempre que la postulación lo permita, adjunta ambas.',
      '• El CV es cuantitativo y estructurado: resume tu trayectoria en listas limpias y escaneables.',
      '• La Carta de Presentación es narrativa y enfocada: conecta tu motivación personal con los valores y necesidades de la empresa.',
      'Al sincronizar ambos documentos en LEECV, mantienes la misma paleta cromática y tipografía para presentar un legajo visualmente armónico.'
    ]
  },
  {
    slug: 'errores-que-matan-tu-carta-de-presentacion',
    title: '5 Errores fatales que matan tu carta de presentación antes de que la lean',
    summary: 'Descubre las fallas más comunes al redactar cartas de presentación y cómo evitarlas para asegurar que tu postulación pase los primeros filtros.',
    category: 'Consejos de Selección',
    readTime: '4 min de lectura',
    date: '10 de Septiembre, 2026',
    author: 'Equipo LEECV',
    content: [
      'Incluso profesionales con excelente trayectoria son descartados por errores evitables en su carta de presentación:',
      '1. Repetir el CV palabra por palabra: La carta debe aportar contexto y motivación, no resumir el currículum.',
      '2. Cartas genéricas sin personalizar: Enviar la misma carta a 20 empresas distintas destruye tu tasa de respuesta.',
      '3. Errores tipográficos en el nombre de la empresa o recruiter: Revisa siempre los datos antes de exportar.',
      '4. Longitud excesiva: Mantén la carta en una sola hoja, limpia, con 3 a 4 párrafos concisos.',
      'Utiliza LEECV para ver cómo queda la carta impresa y comprobar que combine con tu CV.'
    ]
  },
  {
    slug: 'como-estructurar-cv-superar-filtros-ats',
    title: 'Cómo estructurar tu CV para superar los filtros ATS',
    summary: 'Aprende a maquetar tu currículum con una plantilla de 1 columna, ordenar las secciones correctamente y usar el chequeo ATS para asegurar que los robots lean tu perfil.',
    category: 'Guías Prácticas',
    readTime: '6 min de lectura',
    date: '19 de Septiembre, 2026',
    author: 'Equipo LEECV',
    content: [
      'Paso 1: Elige una plantilla de 1 columna. Las plantillas de dos columnas suelen romper la jerarquía de lectura de los sistemas ATS, haciendo que mezclen tu experiencia con tus habilidades.',
      'Paso 2: Ordena tus secciones. Datos personales arriba, luego un breve resumen, seguido de tu experiencia laboral (la sección más importante), educación y finalmente habilidades.',
      'Paso 3: Usa el chequeo ATS en tiempo real de LEECV. Nuestra herramienta te avisará si falta alguna sección clave o si hay problemas en la extracción del texto de tu PDF.'
    ],
    ctaLabel: 'Auditar mi currículum ahora',
    ctaRoute: '/crear-cv'
  },
  {
    slug: 'redactar-carta-de-presentacion-con-ia',
    title: 'Paso a paso: redactar una carta de presentación con IA',
    summary: 'Crea una carta de presentación perfectamente adaptada a los requerimientos del puesto en segundos, manteniendo un tono profesional y vinculada a tu CV.',
    category: 'Guías Prácticas',
    readTime: '4 min de lectura',
    date: '19 de Septiembre, 2026',
    author: 'Equipo LEECV',
    content: [
      'Paso 1: Define los requerimientos del puesto. Antes de generar la carta, asegúrate de tener a mano la descripción de la vacante para dársela a la IA.',
      'Paso 2: Sincroniza tu CV. La IA leerá tus experiencias pasadas para justificar por qué eres el candidato ideal para esa vacante específica.',
      'Paso 3: Ajusta el tono y personaliza. Revisa el borrador generado, ajusta el nivel de formalidad y asegúrate de que refleje tu voz.'
    ],
    ctaLabel: 'Crear mi carta de presentación',
    ctaRoute: '/crear-carta'
  },
  {
    slug: 'manual-diseno-impresion-tarjetas-personales',
    title: 'Manual de diseño e impresión de tarjetas personales',
    summary: 'Todo lo que necesitas saber para imprimir tus tarjetas en casa o en una imprenta: cómo dejar márgenes seguros, sumar un código QR y armar una hoja con 9 tarjetas.',
    category: 'Guías Prácticas',
    readTime: '5 min de lectura',
    date: '19 de Septiembre, 2026',
    author: 'Equipo LEECV',
    content: [
      'Paso 1: Deja margen para el corte. Extiende el color o el fondo de tu diseño un poquito más allá del borde. Así, si el corte sale apenas corrido, no quedan bordes blancos.',
      'Paso 2: El Código QR. Incluye un código QR que apunte a tu CV online o perfil de LinkedIn. Asegúrate de que el contraste sea alto para facilitar el escaneo.',
      'Paso 3: Una hoja con varias tarjetas. Para imprimir en casa o en una imprenta, LEECV arma automáticamente una hoja con 9 tarjetas ordenadas y listas para recortar.'
    ],
    ctaLabel: 'Diseñar mis tarjetas',
    ctaRoute: '/crear-tarjeta'
  },
  {
    slug: 'como-maquetar-doblar-libro-caballete',
    title: 'Cómo maquetar y doblar tu primer libro en caballete',
    summary: 'Aprende la regla de los múltiplos de 4 y el orden correcto de las hojas para lograr un libro perfecto abrochado al medio.',
    category: 'Guías Prácticas',
    readTime: '7 min de lectura',
    date: '19 de Septiembre, 2026',
    author: 'Equipo LEECV',
    content: [
      'Paso 1: La regla del múltiplo de 4. Todo libro abrochado al medio (caballete) debe tener un número de páginas que sea múltiplo de 4 (8, 12, 16, 20, etc.).',
      'Paso 2: Carga tu PDF original de páginas simples. No intentes ordenarlas tú mismo. Sube tu archivo con las páginas del 1 al final en orden correlativo.',
      'Paso 3: Orden automático. Studio Libros tomará tus páginas simples y las acomodará en hojas dobles (por ejemplo, la página 8 junto a la 1), listas para imprimir de ambos lados y doblar.'
    ],
    ctaLabel: 'Abrir Studio Libros',
    ctaRoute: '/crear-libro'
  }
];

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

  useEffect(() => {
    if (selectedArticle) {
      updatePageSeo({
        title: selectedArticle.title,
        description: selectedArticle.summary,
        type: 'article',
        canonicalUrl: `https://leecv.app/blog/${selectedArticle.slug}`,
        schemas: [
          generateTechArticleSchema(
            selectedArticle.title,
            selectedArticle.summary,
            selectedArticle.author,
            selectedArticle.date.replace(/ de /g, ' ').replace(',', ''), // very simple parsing or keep as string
            `https://leecv.app/blog/${selectedArticle.slug}`
          ),
          generateHowToSchema(
            selectedArticle.title,
            selectedArticle.summary,
            selectedArticle.content.filter(p => p.startsWith('Paso')) // Filter paragraphs that are steps
          )
        ]
      });
    } else {
      updatePageSeo({
        title: 'Blog & Recursos',
        description: 'Guías prácticas, tutoriales y recursos sobre diseño de CV, cartas de presentación y tarjetas personales.',
        type: 'website',
        canonicalUrl: 'https://leecv.app/blog'
      });
    }
  }, [selectedArticle]);

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
