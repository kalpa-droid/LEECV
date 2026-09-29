import fs from 'fs';
import path from 'path';

const articles = [
  {
    slug: 'filtros-ats-curriculum-vitae',
    title: 'Mitos y realidades sobre los sistemas de selección ATS (Unificado)',
    summary: 'Los Applicant Tracking Systems (ATS) analizan tu currículum antes de que lo vea un reclutador. Descubre cómo estructurar tus secciones para maximizar tu puntaje.',
    category: 'Empleabilidad',
    readTime: '6 min de lectura',
    date: '19 de Septiembre, 2026',
    author: 'Equipo LEECV',
    content: [
      'Un sistema ATS (Applicant Tracking System) es un software automatizado que escanea y clasifica las postulaciones de empleo según palabras clave y formato de documento.',
      'Paso 1: Usa una estructura de 1 columna limpia. Las plantillas de dos columnas suelen romper la jerarquía de lectura de los sistemas ATS, haciendo que mezclen tu experiencia con tus habilidades.',
      'Paso 2: Ordena tus secciones. Datos personales arriba, luego un breve resumen, seguido de tu experiencia laboral, educación y finalmente habilidades.',
      'Paso 3: Incluye nombres de cargos y habilidades explícitas. Si te postulas a "Desarrollador Frontend", incluye React, TypeScript, etc.',
      'Paso 4: Guarda tu currículum como PDF con texto. Un PDF normal permite seleccionar el texto, que es lo que lee el escáner.',
      'Usa el chequeo ATS en tiempo real de LEECV para auditar tu currículum antes de enviarlo.'
    ],
    ctaLabel: 'Auditar mi currículum ahora',
    ctaRoute: '/crear-cv',
    faq: [
      { question: '¿Qué formato de archivo prefiere un ATS?', answer: 'Un PDF estándar (con texto seleccionable, no como imagen) es la mejor opción universal.' },
      { question: '¿Debo ocultar palabras clave en blanco?', answer: 'No, esto es una práctica penalizada (keyword stuffing) que los reclutadores detectarán inmediatamente.' }
    ]
  },
  {
    slug: 'guia-imposicion-libros-caballete',
    title: 'Cómo preparar tu libro para imprimirlo y doblarlo al medio',
    summary: 'Para que un libro doblado al medio quede en orden, las páginas no se imprimen una tras otra: hay que reacomodarlas.',
    category: 'Impresión & Imprenta',
    readTime: '6 min de lectura',
    date: '02 de Septiembre, 2026',
    author: 'Studio Imprenta',
    content: [
      'Cuando imprimes un libro o folleto abrochado al centro, no puedes imprimir la página 1 al lado de la página 2 en la misma hoja de papel.',
      'En un libro de 8 páginas impreso en 2 hojas dobladas al medio:',
      '• Frente de la Hoja 1: Página 8 (izquierda) y Página 1 (derecha).',
      '• Dorso de la Hoja 1: Página 2 (izquierda) y Página 7 (derecha).',
      '• Frente de la Hoja 2: Página 6 (izquierda) y Página 3 (derecha).',
      '• Dorso de la Hoja 2: Página 4 (izquierda) y Página 5 (derecha).',
      'Studio Libros de LEECV reacomoda las páginas por ti automáticamente.'
    ],
    ctaLabel: 'Abrir Studio Libros',
    ctaRoute: '/crear-libro'
  },
  {
    slug: 'tarjetas-personales-qr-networking',
    title: 'Diseño de Tarjetas Personales con Código QR',
    summary: 'Aprende a combinar un diseño tipográfico impecable con enlaces QR interactivos para proyectar una imagen profesional.',
    category: 'Diseño Gráfico',
    readTime: '4 min de lectura',
    date: '28 de Agosto, 2026',
    author: 'Equipo LEECV',
    content: [
      'Una tarjeta personal física sigue siendo el elemento de contacto más ágil en conferencias y networking.',
      '1. Incluye un código QR dinámico.',
      '2. Deja un margen de seguridad.',
      '3. Contraste y legibilidad: Utiliza tipografías nítidas.',
      'En LEECV Tarjetas, puedes subir tu logo y armar una hoja con 9 tarjetas.'
    ],
    ctaLabel: 'Diseñar mis tarjetas',
    ctaRoute: '/crear-tarjeta'
  },
  {
    slug: 'como-escribir-carta-presentacion-entrevistas',
    title: 'Cómo escribir una carta de presentación que consiga entrevistas',
    summary: 'La carta de presentación es tu oportunidad de contar la historia detrás de tu CV.',
    category: 'Cartas de Presentación',
    readTime: '5 min de lectura',
    date: '18 de Septiembre, 2026',
    author: 'Equipo LEECV',
    content: [
      'Mientras que tu CV enumera tus logros pasados, la carta de presentación explica por qué te postulas al puesto.',
      '1. Saludo personalizado y gancho inicial.',
      '2. Evidencia concreta: Demuestra con métricas.',
      '3. Cierre proactivo.'
    ],
    ctaLabel: 'Crear mi carta de presentación',
    ctaRoute: '/crear-carta'
  },
  {
    slug: 'carta-vs-cv-cuando-usar-cada-una',
    title: 'Carta de Presentación vs CV: cuándo usar cada una y cómo complementarlas',
    summary: 'Comprende las diferencias fundamentales entre ambos documentos.',
    category: 'Estrategia Laboral',
    readTime: '4 min de lectura',
    date: '15 de Septiembre, 2026',
    author: 'Equipo LEECV',
    content: [
      'El CV es cuantitativo y estructurado.',
      'La Carta de Presentación es narrativa y enfocada.',
      'Sincroniza ambos documentos en LEECV.'
    ]
  },
  {
    slug: 'errores-que-matan-tu-carta-de-presentacion',
    title: '5 Errores fatales que matan tu carta de presentación',
    summary: 'Descubre las fallas más comunes al redactar cartas de presentación.',
    category: 'Consejos de Selección',
    readTime: '4 min de lectura',
    date: '10 de Septiembre, 2026',
    author: 'Equipo LEECV',
    content: [
      '1. Repetir el CV palabra por palabra.',
      '2. Cartas genéricas sin personalizar.',
      '3. Errores tipográficos.',
      '4. Longitud excesiva.'
    ]
  },
  {
    slug: 'redactar-carta-de-presentacion-con-ia',
    title: 'Paso a paso: redactar una carta de presentación con IA',
    summary: 'Crea una carta de presentación perfectamente adaptada en segundos.',
    category: 'Guías Prácticas',
    readTime: '4 min de lectura',
    date: '19 de Septiembre, 2026',
    author: 'Equipo LEECV',
    content: [
      'Paso 1: Define los requerimientos del puesto.',
      'Paso 2: Sincroniza tu CV.',
      'Paso 3: Ajusta el tono y personaliza.'
    ],
    ctaLabel: 'Crear mi carta de presentación',
    ctaRoute: '/crear-carta'
  },
  {
    slug: 'manual-diseno-impresion-tarjetas-personales',
    title: 'Manual de diseño e impresión de tarjetas personales',
    summary: 'Todo lo que necesitas saber para imprimir tus tarjetas en casa o en una imprenta.',
    category: 'Guías Prácticas',
    readTime: '5 min de lectura',
    date: '19 de Septiembre, 2026',
    author: 'Equipo LEECV',
    content: [
      'Paso 1: Deja margen para el corte.',
      'Paso 2: El Código QR.',
      'Paso 3: Una hoja con varias tarjetas.'
    ],
    ctaLabel: 'Diseñar mis tarjetas',
    ctaRoute: '/crear-tarjeta'
  }
];

// Slugs extraídos de rulesCatalog.ts que necesitamos crear:
const missingSlugs = [
  'datos-que-jamas-debes-poner',
  'guia-completa-cv',
  'sustantivos-accion-clave',
  'huecos-trabajos-cortos-freelance',
  'cv-sin-experiencia',
  'frases-relleno',
  'formacion-y-cursos',
  'herramientas-idiomas-barras',
  'diseno-y-plantillas',
  'como-adaptar-tu-cv'
];

missingSlugs.forEach(slug => {
  articles.push({
    slug,
    title: 'Guía: ' + slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    summary: 'Próximamente: Artículo en construcción para ayudarte a mejorar este aspecto de tu CV.',
    category: 'Reglas de Reclutamiento',
    readTime: '2 min de lectura',
    date: '28 de Septiembre, 2026',
    author: 'Equipo LEECV',
    content: 'Este artículo está siendo redactado y pronto estará disponible.',
    ctaLabel: 'Mejorar mi CV',
    ctaRoute: '/crear-cv'
  });
});

const outDir = path.join(process.cwd(), 'src/modules/blog/data/articles');

let indexExport = '';

articles.forEach(art => {
  if (Array.isArray(art.content)) {
    art.content = art.content.join('\n\n');
  }
  const varName = art.slug.replace(/-./g, x => x[1].toUpperCase());
  indexExport += `export { ${varName} } from './articles/${art.slug}';\n`;

  const code = `import { Article } from '../types';

export const ${varName}: Article = ${JSON.stringify(art, null, 2)};
`;
  fs.writeFileSync(path.join(outDir, art.slug + '.ts'), code);
});

fs.writeFileSync(path.join(process.cwd(), 'src/modules/blog/data/index.ts'), indexExport);
console.log('Done!');
