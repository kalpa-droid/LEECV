import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { ROUTES, getRouteMetadata } from './prerenderMeta.mjs';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');

if (!fs.existsSync(INDEX_HTML_PATH)) {
  console.error('❌ Error: dist/index.html no encontrado. Corre vite build primero.');
  process.exit(1);
}

const baseHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

for (const route of ROUTES) {
  const meta = getRouteMetadata(route);
  if (!meta) continue;

  const dom = new JSDOM(baseHtml);
  const document = dom.window.document;

  // Actualizar meta title
  document.title = meta.title;
  
  // Actualizar description
  let descMeta = document.querySelector('meta[name="description"]');
  if (descMeta) {
    descMeta.setAttribute('content', meta.description);
  }

  // Actualizar OG title y description
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', meta.title);

  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', meta.description);

  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', `https://leecv.app${route}`);

  // Actualizar canonical por ruta (evita que todas las páginas canonicen al home)
  let canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', `https://leecv.app${route}`);

  // Inyectar JSON-LD
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  
  if (meta.type === 'Article') {
    const baseSchema = {
      "@context": "https://schema.org",
      "@type": meta.faq && meta.faq.length > 0 ? ["Article", "FAQPage"] : "Article",
      "headline": meta.title,
      "description": meta.description,
      "author": {
        "@type": "Organization",
        "name": "LEECV"
      },
      "url": `https://leecv.app${route}`
    };

    if (meta.faq && meta.faq.length > 0) {
      baseSchema.mainEntity = meta.faq.map(item => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answer
        }
      }));
    }

    script.textContent = JSON.stringify(baseSchema);
  } else {
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": meta.title,
      "description": meta.description,
      "url": `https://leecv.app${route}`
    });
  }
  
  document.head.appendChild(script);

  // Inyectar contenido en el body para accesibilidad
  const root = document.getElementById('root');
  if (root) {
    const contentDiv = document.createElement('div');
    contentDiv.id = 'prerendered-content';
    // Hide it from visual view if needed, but it will be replaced by React on hydration
    // Actually better to just wrap it in a visually hidden class, but React will wipe #root
    // So if it's inside #root, React replaces it.
    let contentHtml = '';
    if (typeof meta.content === 'string') {
      contentHtml = `<p>${meta.content}</p>`;
    } else if (Array.isArray(meta.content)) {
      contentHtml = meta.content.map(p => {
        if(p.startsWith('<h')) return p;
        return `<p>${p}</p>`;
      }).join('');
    }
    let headingHtml = `<h1>${meta.title}</h1>`;
    const contentStartsWithH1 =
      (typeof meta.content === 'string' && meta.content.trimStart().startsWith('<h1')) ||
      (Array.isArray(meta.content) && meta.content.some(p => p.trimStart().startsWith('<h1')));
    if (contentStartsWithH1) headingHtml = '';
    contentDiv.innerHTML = headingHtml + contentHtml;
    root.appendChild(contentDiv);
  }

  const newHtml = dom.serialize();
  
  // Crear directorio y escribir
  const routeDir = path.join(DIST_DIR, route.substring(1));
  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(path.join(routeDir, 'index.html'), newHtml, 'utf8');
  console.log(`✅ Prerenderizado: ${route}`);
}
