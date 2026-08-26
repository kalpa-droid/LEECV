#!/usr/bin/env node
/**
 * Migra shadow-X y rounded-X con nombre de Tailwind a los tokens reales del
 * nucleo (elevationSystem/radius de uiDesignSystem.ts).
 *
 * 100% mecanico (regex + path.relative de Node) - no hay decision de texto
 * involucrada, por eso esto vive en un script en vez de hacerse a mano
 * archivo por archivo.
 *
 * Uso: node scripts/migrate-shadow-radius.cjs <ruta-del-archivo.tsx>
 */
const fs = require('fs');
const path = require('path');

const SHADOW_MAP = {
  'shadow-sm': 'elevationSystem.raised',
  'shadow-md': 'elevationSystem.raised',
  'shadow-lg': 'elevationSystem.floating',
  'shadow-xl': 'elevationSystem.overlay',
  'shadow-2xl': 'elevationSystem.overlay',
  'shadow-inner': 'elevationSystem.raised',
};
const RADIUS_MAP = {
  'rounded-lg': 'radius.control',
  'rounded-xl': 'radius.card',
  'rounded-2xl': 'radius.modal',
  'rounded-3xl': 'radius.modal',
  // rounded-full NO se migra a proposito: es semantico (circulo perfecto).
};

const ALL_PATTERNS = new RegExp('\\b(' + [...Object.keys(SHADOW_MAP), ...Object.keys(RADIUS_MAP)].join('|') + ')\\b', 'g');
function tokenFor(cls) {
  return SHADOW_MAP[cls] ? `\${${SHADOW_MAP[cls]}}` : `rounded-[\${${RADIUS_MAP[cls]}}]`;
}

const file = process.argv[2];
if (!file) { console.error('Uso: node scripts/migrate-shadow-radius.cjs <archivo>'); process.exit(1); }
let src = fs.readFileSync(file, 'utf8');
let changed = 0;
let usedElevation = false, usedRadius = false;

// Pasada 1: className="...", className='...' o className={`...`}
src = src.replace(/className=(\{`([^`]*)`\}|"([^"]*)"|'([^']*)')/g, (full, _g, tpl, dq, sq) => {
  const content = tpl !== undefined ? tpl : (dq !== undefined ? dq : sq);
  if (!ALL_PATTERNS.test(content)) return full;
  ALL_PATTERNS.lastIndex = 0;
  const newContent = content.replace(ALL_PATTERNS, (m) => {
    changed++;
    if (SHADOW_MAP[m]) usedElevation = true; else usedRadius = true;
    return tokenFor(m);
  });
  return `className={\`${newContent}\`}`;
});

// Pasada 2: className={condicion ? 'string' : 'string'} sin backtick envolvente
src = src.replace(
  /className=\{([^{}?:]*?)\?\s*'([^']*)'\s*:\s*'([^']*)'\s*\}/g,
  (full, cond, branchA, branchB) => {
    const hasA = ALL_PATTERNS.test(branchA); ALL_PATTERNS.lastIndex = 0;
    const hasB = ALL_PATTERNS.test(branchB); ALL_PATTERNS.lastIndex = 0;
    if (!hasA && !hasB) return full;
    const migrate = (str) => str.replace(ALL_PATTERNS, (m) => {
      changed++;
      if (SHADOW_MAP[m]) usedElevation = true; else usedRadius = true;
      return tokenFor(m);
    });
    const newA = hasA ? `\`${migrate(branchA)}\`` : `'${branchA}'`;
    const newB = hasB ? `\`${migrate(branchB)}\`` : `'${branchB}'`;
    return `className={${cond}? ${newA} : ${newB}}`;
  }
);

if (changed === 0) { console.log('SIN_CAMBIOS'); process.exit(0); }

const needed = [usedElevation && 'elevationSystem', usedRadius && 'radius'].filter(Boolean);
const targetModule = 'shared/core/uiDesignSystem';
const existingImportRe = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"]([^'"]*${targetModule})['"];?`);
const existing = src.match(existingImportRe);

if (existing) {
  const already = existing[1].split(',').map(s => s.trim()).filter(Boolean);
  const merged = Array.from(new Set([...already, ...needed]));
  src = src.replace(existingImportRe, `import { ${merged.join(', ')} } from '${existing[2]}';`);
} else {
  const fileDir = path.dirname(file);
  let rel = path.relative(fileDir, 'src/shared/core/uiDesignSystem').split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = './' + rel;
  const importLine = `import { ${needed.join(', ')} } from '${rel}';\n`;
  const lastImportMatch = [...src.matchAll(/^import .*;\s*$/gm)].pop();
  if (lastImportMatch) {
    const insertAt = lastImportMatch.index + lastImportMatch[0].length;
    src = src.slice(0, insertAt) + '\n' + importLine + src.slice(insertAt);
  } else {
    src = importLine + src;
  }
}

fs.writeFileSync(file, src, 'utf8');
console.log(`OK: ${changed} reemplazos + import (${needed.join(', ')}) resuelto automaticamente en ${file}`);
