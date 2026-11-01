import fs from 'fs';
import path from 'path';

export const ROUTES = [
  '/',
  '/privacidad',
  '/terminos',
  '/reembolsos',
  '/cv/marketing-digital',
  '/cv/desarrollo-web',
  '/cv/gestion-de-proyectos'
];

const metaMap = {
  '/': {
    title: 'LEECV — Creador de Currículum Vitae listo para imprimir',
    description: 'Crea tu Currículum Vitae en minutos y ten tu PDF listo para imprimir en casa o llevar a una imprenta. Plantillas profesionales, diseño de tarjetas, 100% privacidad y sin marca de agua.',
    content: [],
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
  },
  '/cv/marketing-digital': { title: 'CV Marketing Digital | LEECV', description: 'Currículum optimizado para marketing digital.', content: ['<h1>Marketing Digital</h1>'], type: 'WebPage' },
  '/cv/desarrollo-web': { title: 'CV Desarrollo Web | LEECV', description: 'Currículum técnico para desarrolladores.', content: ['<h1>Desarrollo Web</h1>'], type: 'WebPage' },
  '/cv/gestion-de-proyectos': { title: 'CV Gestión de Proyectos | LEECV', description: 'CV para gestión de proyectos.', content: ['<h1>Gestión de Proyectos</h1>'], type: 'WebPage' }
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

export const getRouteMetadata = (route) => {
  return metaMap[route] || null;
};
