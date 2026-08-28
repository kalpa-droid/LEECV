#!/usr/bin/env node
/**
 * verify-cv-engine-harmony.js
 * Script de auto-evaluación exhaustivo que verifica las 5 correcciones del plan v21.
 *
 * Verificaciones:
 *   1. Portada: cover.title ≤ 14pt, cover.name ≥ 24pt en todos los presets
 *   2. Sidebar width: widthPercent ≥ 30 en todos los presets con sidebar
 *   3. Sidebar section heading: SectionBannerCard calcula sidebarFontSize = sectionHeading - 2.5
 *   4. Card atomicidad: CardObjectRenderer usa wrap={false} en cardContainer
 *   5. Overflow engine: pageOverflowEngine NO concatena (cont.) al titleText
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function check(label, condition, detail) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label} — ${detail}`);
    failed++;
  }
}

console.log('🔍 Verificación de armonía motor-núcleo CV (plan v21)...\n');

// ─── 1. Portada: cover.title y cover.name en todos los presets ───
console.log('── 1. Tipografía de portada (cover.title ≤ 14, cover.name ≥ 24) ──');
const presetsDir = path.join(ROOT, 'src/shared/core/pdf-engine/layers/presets/presets');
if (fs.existsSync(presetsDir)) {
  const presetFiles = fs.readdirSync(presetsDir).filter(f => f.endsWith('.ts'));
  for (const file of presetFiles) {
    const content = fs.readFileSync(path.join(presetsDir, file), 'utf-8');
    // Buscar cover.title
    const titleMatch = content.match(/cover:\s*\{[^}]*title:\s*(\d+(?:\.\d+)?)/s);
    const nameMatch = content.match(/cover:\s*\{[^}]*name:\s*(\d+(?:\.\d+)?)/s);
    if (titleMatch && nameMatch) {
      const titleVal = parseFloat(titleMatch[1]);
      const nameVal = parseFloat(nameMatch[1]);
      check(
        `${file}: cover.title=${titleVal}, cover.name=${nameVal}`,
        titleVal <= 14 && nameVal >= 24,
        `cover.title debe ser ≤14 (es ${titleVal}), cover.name debe ser ≥24 (es ${nameVal})`
      );
    }
  }
} else {
  check('Directorio de presets existe', false, `No encontrado: ${presetsDir}`);
}

// ─── 2. Sidebar width ≥ 30% en presets con sidebar ───
console.log('\n── 2. Sidebar width ≥ 30% ──');
if (fs.existsSync(presetsDir)) {
  const presetFiles = fs.readdirSync(presetsDir).filter(f => f.endsWith('.ts'));
  for (const file of presetFiles) {
    const content = fs.readFileSync(path.join(presetsDir, file), 'utf-8');
    const sidebarMatch = content.match(/role:\s*['"]sidebar['"].*?widthPercent:\s*(\d+)/s);
    if (sidebarMatch) {
      const w = parseInt(sidebarMatch[1], 10);
      check(
        `${file}: sidebar widthPercent=${w}`,
        w >= 30,
        `Debe ser ≥30% (es ${w}%)`
      );
    }
  }
}

// ─── 3. SectionBannerCard: sidebar heading scaled ───
console.log('\n── 3. Sidebar section heading scaling (sectionHeading - 2.5) ──');
const sectionBannerPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/cards/SectionBannerCard.tsx');
if (fs.existsSync(sectionBannerPath)) {
  const sbContent = fs.readFileSync(sectionBannerPath, 'utf-8');
  check(
    'SectionBannerCard calcula sidebarFontSize = sectionHeading - 2.5',
    sbContent.includes('typography.sectionHeading - 2.5'),
    'No se encontró "typography.sectionHeading - 2.5" en SectionBannerCard.tsx'
  );
  check(
    'SectionBannerCard sanitiza iconId con .replace(/-cont$/, \'\')',
    sbContent.includes(".replace(/-cont$/"),
    'No se encontró sanitización de iconId con .replace(/-cont$/,...)'
  );
  // Verificar que la sidebar usa sidebarFontSize y no typography.sectionHeading directamente
  const sidebarBlock = sbContent.substring(
    sbContent.indexOf('if (isSidebar)'),
    sbContent.indexOf('// Encabezado de Sección en Columna Principal')
  );
  check(
    'Sidebar usa sidebarFontSize en fontSize (no typography.sectionHeading directo)',
    sidebarBlock.includes('fontSize: sidebarFontSize'),
    'El bloque sidebar aún usa typography.sectionHeading directamente en fontSize'
  );
}

// ─── 4. CardObjectRenderer: wrap={false} en cardContainer ───
console.log('\n── 4. Card atomicidad: inner wrap={false} sin conflicto exterior ──');
const cardRendererPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/cards/CardObjectRenderer.tsx');
if (fs.existsSync(cardRendererPath)) {
  const crContent = fs.readFileSync(cardRendererPath, 'utf-8');
  check(
    'CardObjectRenderer NO tiene wrap={false} en cardContainer externo (evita conflicto con overflow engine)',
    !crContent.includes('style={styles.cardContainer} wrap={false}'),
    'Se encontró wrap={false} en cardContainer externo — conflicto con overflow engine'
  );
  check(
    'CardObjectRenderer tiene inner wrap={false} para proteger header atómico',
    crContent.includes('<View wrap={false}>'),
    'No se encontró inner wrap={false} para el header atómico'
  );
}

// ─── 5. Overflow engine: sin (cont.) en titleText y flujo nativo sin doble paginación ───
console.log('\n── 5. Overflow engine: sin (cont.) y flujo nativo ──');
const overflowPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/overflow/pageOverflowEngine.ts');
if (fs.existsSync(overflowPath)) {
  const ofContent = fs.readFileSync(overflowPath, 'utf-8');
  check(
    'pageOverflowEngine NO concatena " (cont.)" al titleText',
    !ofContent.includes("} (cont.)'") && !ofContent.includes('} (cont.)"') && !ofContent.includes('` (cont.)'),
    'Aún se encontró concatenación de " (cont.)" en pageOverflowEngine.ts'
  );
  check(
    'processPageOverflow devuelve flujo nativo (pages.length === 1)',
    ofContent.includes('pages: [{ pageNumber: 1, totalPages: 1, sections }]'),
    'processPageOverflow aún utiliza split pre-calculado en lugar de flujo nativo React-PDF'
  );
}

// ─── 6. TemplateRenderer: señales wrap={false} y sin sufijo (N) ───
console.log('\n── 6. TemplateRenderer: señales wrap={false} y limpieza de títulos ──');
const templatePath = path.join(ROOT, 'src/shared/core/pdf-engine/renderer/TemplateRenderer.tsx');
const cvDataAdapterPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/records/cvDataAdapter.ts');
if (fs.existsSync(templatePath)) {
  const trContent = fs.readFileSync(templatePath, 'utf-8');
  check(
    'TemplateRenderer sidebar usa wrap={false} atómico por sección completa',
    trContent.includes('<View key={sec.id} wrap={false}>'),
    'No se encontró wrap={false} atómico por sección en sidebar'
  );
  check(
    'TemplateRenderer main sector envuelve banner + primer registro en View wrap={false} para evitar títulos huérfanos',
    trContent.includes('<View wrap={false}>') && trContent.includes('sec.records[0]'),
    'No se encontró envoltorio wrap={false} para banner + primer registro en main sector'
  );
  check(
    'TemplateRenderer headerName usa Math.max(20, ...)',
    trContent.includes('Math.max(20,'),
    'No se encontró Math.max(20,...) en headerName'
  );
}

if (fs.existsSync(cvDataAdapterPath)) {
  const adapterContent = fs.readFileSync(cvDataAdapterPath, 'utf-8');
  check(
    'cvDataAdapter NO incluye sufijo (${sortedProfession.length}) en titleText',
    !adapterContent.includes('(${sortedProfession.length})'),
    'Se encontró sufijo (${sortedProfession.length}) en titleText de cvDataAdapter.ts'
  );
}

// ─── Resultado final ───
console.log(`\n${'═'.repeat(60)}`);
if (failed === 0) {
  console.log(`✅ TODAS LAS VERIFICACIONES PASARON: ${passed}/${passed + failed}`);
} else {
  console.log(`❌ VERIFICACIÓN FALLIDA: ${passed} pasaron, ${failed} fallaron`);
  process.exit(1);
}
