#!/usr/bin/env tsx
/**
 * check-bundle-budget.ts — Presupuesto de carga inicial (Fase 6).
 *
 * Verifica tras `vite build` que `dist/index.html`, los chunks de arranque
 * y `dist/assets/App-*.js` NO precargan ni importan estáticamente librerías
 * pesadas de generación de documentos:
 *   - `@react-pdf/renderer` (`vendor-react-pdf`)
 *   - `pdf-lib`
 *   - `exceljs`
 *   - `mammoth`
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');

if (!fs.existsSync(INDEX_HTML)) {
  console.error('❌ No existe dist/index.html. Ejecutá `npm run build` antes.');
  process.exit(1);
}

const html = fs.readFileSync(INDEX_HTML, 'utf8');
const entryMatches = [...html.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g)].map(
  (m) => m[1],
);
const preloadMatches = [...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)].map(
  (m) => m[1],
);

if (entryMatches.length === 0) {
  console.error('❌ No se encontró <script type="module" src="..."> en dist/index.html.');
  process.exit(1);
}

const FORBIDDEN_STARTUP_CHUNK_PATTERNS = [
  { label: '@react-pdf/renderer', pattern: /react-pdf/i },
  { label: 'exceljs', pattern: /exceljs/i },
  { label: 'pdf-lib', pattern: /pdf-lib/i },
  { label: 'mammoth', pattern: /mammoth/i },
];

const FORBIDDEN_EMBEDDED_CODE_SIGNATURES = [
  { label: '@react-pdf/renderer (code)', pattern: /registerHyphenationCallback/ },
  { label: 'exceljs (bundle)', pattern: /exceljs\.min|Workbook[^\n;]*addWorksheet/ },
  { label: 'pdf-lib (PDFDocument)', pattern: /\bPDFDocument\.(?:create|load)\b/ },
  { label: 'mammoth (convertToHtml)', pattern: /\bconvertToHtml\b/ },
];

function stripViteMapDeps(code: string): string {
  return code.replace(
    /const\s+__vite__mapDeps\s*=\s*\([\s\S]*?return\s+i\.map\([^)]*\)\s*\};?/,
    '',
  );
}

const errors: string[] = [];
const startupAssets = Array.from(new Set([...entryMatches, ...preloadMatches]));

console.log('🔍 Verificando presupuesto del bundle inicial (Fase 6)...\n');

for (const assetHref of startupAssets) {
  const cleanRel = assetHref.replace(/^\//, '');
  const fullPath = path.join(DIST_DIR, cleanRel);
  const sizeKb = fs.existsSync(fullPath) ? (fs.statSync(fullPath).size / 1024).toFixed(1) : '?';
  const kind = entryMatches.includes(assetHref) ? 'entry' : 'preload';
  console.log(`   - [${kind}] ${cleanRel} (${sizeKb} KB)`);

  for (const rule of FORBIDDEN_STARTUP_CHUNK_PATTERNS) {
    if (rule.pattern.test(cleanRel)) {
      errors.push(
        `El arranque (${kind}) referencia chunk pesado prohibido (${rule.label}): ${cleanRel}`,
      );
    }
  }

  if (fs.existsSync(fullPath)) {
    const code = fs.readFileSync(fullPath, 'utf8');
    const codeWithoutMapDeps = stripViteMapDeps(code);

    for (const sig of FORBIDDEN_EMBEDDED_CODE_SIGNATURES) {
      if (sig.pattern.test(codeWithoutMapDeps)) {
        errors.push(
          `El código estático de arranque (${cleanRel}) embebe librería pesada (${sig.label}).`,
        );
      }
    }

    const importStatements = codeWithoutMapDeps.match(/import[^;]*from\s*["'][^"']+["']/g) || [];
    for (const imp of importStatements) {
      for (const rule of FORBIDDEN_STARTUP_CHUNK_PATTERNS) {
        if (rule.pattern.test(imp)) {
          errors.push(
            `${cleanRel} importa estáticamente chunk pesado (${rule.label}): ${imp}`,
          );
        }
      }
    }
  }
}

const assetsDir = path.join(DIST_DIR, 'assets');
const appChunk = fs.existsSync(assetsDir)
  ? fs.readdirSync(assetsDir).find((name) => /^App-[^.]+\.js$/.test(name))
  : undefined;

if (appChunk) {
  const appPath = path.join(assetsDir, appChunk);
  const appSizeKb = (fs.statSync(appPath).size / 1024).toFixed(1);
  console.log(`   - [lazy-app] assets/${appChunk} (${appSizeKb} KB)`);
  const appCode = stripViteMapDeps(fs.readFileSync(appPath, 'utf8'));
  const appImports = appCode.match(/import[^;]*from\s*["'][^"']+["']/g) || [];
  for (const imp of appImports) {
    for (const rule of FORBIDDEN_STARTUP_CHUNK_PATTERNS) {
      if (rule.pattern.test(imp)) {
        errors.push(
          `assets/${appChunk} importa estáticamente chunk pesado (${rule.label}): ${imp}`,
        );
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`\n❌ PRESUPUESTO DE BUNDLE VIOLADO (${errors.length} error/es):`);
  for (const err of errors) console.error(`   - ${err}`);
  process.exit(1);
}

console.log(
  '\n✅ Presupuesto de bundle verificado: 0 librerías pesadas (@react-pdf, pdf-lib, exceljs, mammoth) en carga inicial.\n',
);
process.exit(0);
