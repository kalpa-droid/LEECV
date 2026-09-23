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

  // Inyectar JSON-LD
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  
  if (meta.type === 'Article') {
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": meta.title,
      "description": meta.description,
      "author": {
        "@type": "Organization",
        "name": "LEECV"
      },
      "url": `https://leecv.app${route}`
    });
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
    contentDiv.innerHTML = `<h1>${meta.title}</h1>` + meta.content.map(p => {
      if(p.startsWith('<h')) return p;
      return `<p>${p}</p>`;
    }).join('');
    root.appendChild(contentDiv);
  }

  const newHtml = dom.serialize();
  
  // Crear directorio y escribir
  const routeDir = path.join(DIST_DIR, route.substring(1));
  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(path.join(routeDir, 'index.html'), newHtml, 'utf8');
  console.log(`✅ Prerenderizado: ${route}`);
}
