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
console.log('\n── 4. Card atomicidad: wrap={false} en cardContainer ──');
const cardRendererPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/cards/CardObjectRenderer.tsx');
if (fs.existsSync(cardRendererPath)) {
  const crContent = fs.readFileSync(cardRendererPath, 'utf-8');
  check(
    'CardObjectRenderer tiene wrap={false} en cardContainer',
    crContent.includes('style={styles.cardContainer} wrap={false}'),
    'No se encontró wrap={false} en el View de cardContainer'
  );
}

// ─── 5. pageOverflowEngine: NO concatena (cont.) ───
console.log('\n── 5. Overflow engine: sin (cont.) en titleText ──');
const overflowPath = path.join(ROOT, 'src/shared/core/pdf-engine/layers/overflow/pageOverflowEngine.ts');
if (fs.existsSync(overflowPath)) {
  const ofContent = fs.readFileSync(overflowPath, 'utf-8');
  check(
    'pageOverflowEngine NO concatena " (cont.)" al titleText',
    !ofContent.includes("} (cont.)'") && !ofContent.includes('} (cont.)"') && !ofContent.includes('` (cont.)'),
    'Aún se encontró concatenación de " (cont.)" en pageOverflowEngine.ts'
  );
  // Verificar que el margen de seguridad es ≤ 15
  const marginMatches = [...ofContent.matchAll(/availableHeightPt\s*-\s*(\d+)/g)];
  for (const m of marginMatches) {
    const margin = parseInt(m[1], 10);
    check(
      `Margen de seguridad = ${margin}pt (debe ser ≤ 15)`,
      margin <= 15,
      `Margen de ${margin}pt es demasiado grande, genera páginas 90% en blanco`
    );
  }
}

// ─── 6. TemplateRenderer: coverTitle y headerName ───
console.log('\n── 6. TemplateRenderer: coverTitle fallback ≤ 14, headerName ≥ 20 ──');
const templatePath = path.join(ROOT, 'src/shared/core/pdf-engine/renderer/TemplateRenderer.tsx');
if (fs.existsSync(templatePath)) {
  const trContent = fs.readFileSync(templatePath, 'utf-8');
  // coverTitle fallback
  const coverTitleMatch = trContent.match(/coverTitle:\s*\{[^}]*fontSize:\s*.*?\|\|\s*(\d+)/s);
  if (coverTitleMatch) {
    const fallback = parseInt(coverTitleMatch[1], 10);
    check(
      `TemplateRenderer coverTitle fallback = ${fallback}pt`,
      fallback <= 14,
      `Fallback de coverTitle debe ser ≤14 (es ${fallback})`
    );
  }
  // headerName Math.max(20, ...)
  check(
    'TemplateRenderer headerName usa Math.max(20, ...)',
    trContent.includes('Math.max(20,'),
    'No se encontró Math.max(20,...) en headerName'
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
