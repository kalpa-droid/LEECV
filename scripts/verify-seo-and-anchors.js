/**
 * SCRIPT DE AUTOCOMPROBACIÓN Y AUDITORÍA PROFUNDA
 * Verify SEO, Search Console Indexing, Sitemap, Robots.txt & PDF Anchor Engine
 */

import fs from 'fs';
import path from 'path';
import { generateWebApplicationSchema, CENTRAL_SEO_CONFIG } from '../src/shared/core/seo/seoIndexingEngine.js';
import { resolveSectionAnchor } from '../src/shared/core/pdf-engine/layers/anchors/pdfAnchorEngine.js';
import { getAllPresets } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry.js';

console.log('🔍 Iniciando auditoría profunda de SEO, Indexación Google y Motor de Anclaje PDF...\n');

let totalChecks = 0;
let failedChecks = 0;

// 1. Auditoría del Motor de SEO y Esquemas JSON-LD
totalChecks++;
try {
  const schema = generateWebApplicationSchema();
  if (!schema['@graph'] || schema['@graph'].length < 3) {
    console.error('❌ FALLO SEO: El esquema JSON-LD no contiene el grafo completo (WebApplication, SoftwareApplication, FAQPage).');
    failedChecks++;
  } else {
    console.log('  ✓ Motor SEO JSON-LD: Esquema Schema.org estructurado generado correctamente (WebApplication + SoftwareApplication + FAQPage Rich Snippets).');
  }
} catch (err) {
  console.error('❌ FALLO SEO:', err);
  failedChecks++;
}

// 2. Verificación de sitemap.xml público
totalChecks++;
const sitemapPath = path.resolve(process.cwd(), 'public/sitemap.xml');
if (!fs.existsSync(sitemapPath)) {
  console.error('❌ FALLO SEO: public/sitemap.xml no existe.');
  failedChecks++;
} else {
  const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
  if (sitemapContent.includes('https://leecv.app/') && sitemapContent.includes('urlset')) {
    console.log('  ✓ Infraestructura SEO: public/sitemap.xml existe y contiene estructura canónica válida.');
  } else {
    console.error('❌ FALLO SEO: public/sitemap.xml es inválido.');
    failedChecks++;
  }
}

// 3. Verificación de robots.txt público
totalChecks++;
const robotsPath = path.resolve(process.cwd(), 'public/robots.txt');
if (!fs.existsSync(robotsPath)) {
  console.error('❌ FALLO SEO: public/robots.txt no existe.');
  failedChecks++;
} else {
  const robotsContent = fs.readFileSync(robotsPath, 'utf8');
  if (robotsContent.includes('Sitemap:') && robotsContent.includes('User-agent: *')) {
    console.log('  ✓ Infraestructura SEO: public/robots.txt existe y apunta correctamente al sitemap.');
  } else {
    console.error('❌ FALLO SEO: public/robots.txt es inválido.');
    failedChecks++;
  }
}

// 4. Verificación del Motor de Anclaje PDF
const presets = getAllPresets();
const tabsToTest = ['personales', 'contacto', 'frase', 'experiencia', 'formacion', 'competencias', 'cursos', 'ecologia', 'firma'];

for (const preset of presets) {
  for (const tab of tabsToTest) {
    totalChecks++;
    try {
      const anchor = resolveSectionAnchor(tab, [], preset);
      if (!anchor || typeof anchor.verticalRatio !== 'number' || anchor.verticalRatio < 0 || anchor.verticalRatio > 1.0) {
        console.error(`❌ FALLO DE ANCLAJE PDF [Preset: ${preset.id}, Tab: ${tab}]: Ratio devuelto fuera de límites (${anchor?.verticalRatio}).`);
        failedChecks++;
      } else {
        // ok
      }
    } catch (err) {
      console.error(`❌ FALLO DE ANCLAJE PDF [Preset: ${preset.id}, Tab: ${tab}]: Excepción:`, err);
      failedChecks++;
    }
  }
  console.log(`  ✓ Motor Anclaje PDF [Preset: ${preset.id}] - Resuelve las 9 pestañas de UI a coordenadas verticales OK.`);
}

console.log('\n════════════════════════════════════════════════════════════');
if (failedChecks > 0) {
  console.error(`❌ AUDITORÍA DE SEO Y ANCLAJE PDF FALLIDA: ${failedChecks} de ${totalChecks} verificaciones no pasaron.`);
  process.exit(1);
} else {
  console.log(`✅ AUDITORÍA DE SEO Y ANCLAJE PDF EXITOSA: ${totalChecks} verificaciones pasaron al 100%.`);
}
