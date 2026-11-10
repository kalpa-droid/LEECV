import fs from 'fs';
import path from 'path';

export const ROUTES = [
  '/',
  '/privacidad',
  '/terminos',
  '/reembolsos',
  '/crear-cv',
  '/crear-tarjeta',
  '/crear-libro'
];

const metaMap = {
  '/': {
    title: 'LEECV — Creador de Currículum Vitae listo para imprimir',
    description: 'Crea tu Currículum Vitae en minutos y ten tu PDF listo para imprimir en casa o llevar a una imprenta. Plantillas profesionales, diseño de tarjetas, 100% privacidad y sin marca de agua.',
    content: [],
    type: 'WebPage'
  },
  '/crear-cv': {
    title: 'Crear CV Gratis y Compatible con ATS | LEECV',
    description: 'Diseña tu currículum online en minutos y obtén un PDF listo para imprimir o enviar. Compatible con sistemas ATS. Plantillas para cada profesión.',
    content: ['<h1>Crear tu Currículum Vitae</h1>'],
    type: 'WebPage'
  },
  '/crear-tarjeta': {
    title: 'Crear Tarjeta Personal | LEECV',
    description: 'Crea tu tarjeta de presentación online con código QR y DESCÁRGALA en PDF listo para imprimir. Diseño profesional en segundos.',
    content: ['<h1>Crear tu Tarjeta Personal</h1>'],
    type: 'WebPage'
  },
  '/crear-libro': {
    title: 'Crear Libro | LEECV',
    description: 'Maqueta tu libro digital o impreso con herramientas profesionales. Exporta en PDF de alta calidad para imprenta o distribución digital.',
    content: ['<h1>Crear tu Libro</h1>'],
    type: 'WebPage'
  },
  '/privacidad': {
    title: 'Política de Privacidad | LEECV',
    description: 'Política de privacidad y protección de datos de LEECV.',
    content: ['<h1>Política de Privacidad</h1>', '<p>En LEECV respetamos tu privacidad y nos tomamos en serio la protección de tus datos personales.</p>'],
    type: 'WebPage'
  },
  '/terminos': {
    title: 'Términos y Condiciones | LEECV',
    description: 'Términos y condiciones de uso de los servicios de LEECV.',
    content: ['<h1>Términos y Condiciones</h1>', '<p>Al utilizar LEECV aceptas los siguientes términos de servicio.</p>'],
    type: 'WebPage'
  },
  '/reembolsos': {
    title: 'Política de Reembolsos | LEECV',
    description: 'Política de devoluciones y reembolsos de LEECV.',
    content: ['<h1>Política de Reembolsos</h1>', '<p>Conoce nuestra política de reembolsos para cuentas premium y servicios adicionales.</p>'],
    type: 'WebPage'
  }
};

const articlesDir = path.resolve(process.cwd(), 'src/modules/blog/data/articles');
if (fs.existsSync(articlesDir)) {
  const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.ts'));
  for (const file of files) {
    const contentStr = fs.readFileSync(path.join(articlesDir, file), 'utf-8');
    const match = contentStr.match(/export const [a-zA-Z0-9_]+: Article = ([\s\S]+);/);
    if (match && match[1]) {
      try {
        const articleData = eval('(' + match[1] + ')');
        const route = `/blog/${articleData.slug}`;
        ROUTES.push(route);
        metaMap[route] = {
          title: articleData.title,
          description: articleData.summary,
          content: articleData.content,
          type: 'Article',
          faq: articleData.faq || undefined
        };
      } catch (e) {
        console.error('Error parsing article file:', file);
      }
    }
  }
}

// Masivas: carga las 52 rutas /cv/[slug] desde jobTemplatesData.json
const jobTemplatesPath = path.resolve(process.cwd(), 'src/shared/core/seo/jobTemplatesData.json');
if (fs.existsSync(jobTemplatesPath)) {
  const jobTemplates = JSON.parse(fs.readFileSync(jobTemplatesPath, 'utf8'));
  for (const role of jobTemplates) {
    const slug = role.slug;
    const route = `/cv/${slug}`;
    ROUTES.push(route);
    const keywordHtml = role.keywords?.length
      ? `\n<div class="keywords"><h3>Palabras clave ATS</h3><ul><li>${role.keywords.join('</li><li>')}</li></ul></div>`
      : '';
    const sectionsHtml = role.sections?.length
      ? `\n<div class="sections"><h3>Secciones esenciales</h3><ul><li>${role.sections.join('</li><li>')}</li></ul></div>`
      : '';
    const acrHtml = role.acrExample
      ? `\n<div class="acr"><h3>Ejemplo con fórmula ACR (Acción-Contexto-Resultado)</h3><p>${role.acrExample}</p></div>`
      : '';
    metaMap[route] = {
      title: `${role.title} | LEECV`,
      description: role.description,
      content: [
        `<h1>${role.title}</h1>`,
        `Diseña un currículum compatible con sistemas ATS para ${role.title.replace('CV ', '')}. ${role.description}`,
        keywordHtml,
        sectionsHtml,
        acrHtml
      ],
      type: 'Article',
      faq: [
        { question: `¿Qué palabras clave esperan los sistemas ATS en un ${role.title.replace('CV ', '')}?`, answer: role.keywords?.length ? `Incluí estas palabras clave naturalmente en tu CV: ${role.keywords.join(', ')}.` : 'Consultá las recomendaciones de LEECV para tu profesión.' },
        { question: '¿Cómo optimizo mi CV para pasar los filtros ATS?', answer: `Usá secciones estándar (${role.sections?.join(', ')}) y métricas cuantitativas en tus logros.` }
      ]
    };
  }
}

export const getRouteMetadata = (route) => {
  return metaMap[route] || null;
};
