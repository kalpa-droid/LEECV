#!/usr/bin/env node
/**
 * check-file-size.js — Gobernanza de "God Files".
 *
 * Mismo patrón que check-module-boundaries.js: arranca en MODO AUDITORÍA
 * (informa pero no rompe el build) para poder medir el progreso del
 * refactor sin frenar otro trabajo, y pasa a modo bloqueante cuando la
 * lista llegue a cero.
 *
 * Umbrales (ver docs/plan_recta_final.md):
 *   - BLOCKING_LIMIT: rompe el build. Arranca alto (nadie lo supera hoy)
 *     para que el check no bloquee de entrada; se baja a 400 cuando el
 *     refactor de EditorPanel.tsx termine.
 *   - AUDIT_LIMIT: solo informa. Es el objetivo real (400 líneas).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, '..', 'src');

const AUDIT_LIMIT = 400;
const BLOCKING_LIMIT = 3000;

/** Archivos que legítimamente son catálogos/registros largos, no "God Files" de UI. */
const EXEMPT = new Set([
  'src/shared/core/uiDesignSystem.ts',
  'src/shared/core/pdf-engine/layers/colors/colorSystem.ts',
]);

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

console.log('\n🔍 Verificando tamaño de archivos (gobernanza de God Files)...\n');

const findings = [];
for (const file of walk(SRC_DIR)) {
  const rel = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');
  if (EXEMPT.has(rel)) continue;
  const lines = fs.readFileSync(file, 'utf8').split('\n').length;
  if (lines > AUDIT_LIMIT) findings.push({ rel, lines });
}

findings.sort((a, b) => b.lines - a.lines);

const blocking = findings.filter(f => f.lines > BLOCKING_LIMIT);

if (blocking.length > 0) {
  console.error(`❌ ${blocking.length} archivo(s) superan el límite bloqueante de ${BLOCKING_LIMIT} líneas:`);
  blocking.forEach(f => console.error(`   - ${f.rel}: ${f.lines} líneas`));
  console.error('\n   Dividir en componentes más chicos antes de continuar. Ver docs/plan_recta_final.md');
  process.exit(1);
}

if (findings.length > 0) {
  console.warn(`⚠️  AUDITORÍA (no bloquea el build todavía): ${findings.length} archivo(s) superan las ${AUDIT_LIMIT} líneas.`);
  console.warn('   Ver docs/plan_recta_final.md — bajar BLOCKING_LIMIT a 400 cuando esta lista llegue a 0.');
  findings.forEach(f => console.warn(`   - ${f.rel}: ${f.lines} líneas`));
  console.log('');
}

console.log(`✅ Verificación de tamaño de archivos superada (0 archivos sobre el límite bloqueante de ${BLOCKING_LIMIT}).\n`);
process.exit(0);
