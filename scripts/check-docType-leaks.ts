#!/usr/bin/env tsx
/**
 * check-docType-leaks.ts — Detector AST de fugas de `docType` (Fase 0).
 *
 * Cuenta por archivo:
 *   1. Comparaciones `===`/`!==`/`==`/`!=` de variables/propiedades `*docType*` / `doc_type*` contra literales.
 *   2. Cláusulas `case '<docType>':` en `switch` para IDs conocidos del registro.
 *   3. Arrays literales escritos a mano con >= 3 IDs de `docType` (p. ej. listas fijas en syncEngine).
 *
 * Ignora comentarios y `switch` no relacionados gracias al AST de TypeScript.
 * Baseline: `scripts/docType-leaks-baseline.json` — solo baja, nunca sube.
 *   - Falla si un archivo nuevo tiene fugas o si algún archivo sube sobre su baseline.
 *   - `--update-baseline` regenera el baseline.
 *   - `--selftest` verifica el detector con fixtures aislados.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const BASELINE_FILE = path.join(__dirname, 'docType-leaks-baseline.json');

const KNOWN_DOC_TYPES = new Set([
  'cv',
  'cover_letter',
  'business_card',
  'book',
  'planner',
  'invoice',
  'editorial',
]);

const ARRAY_EXEMPT_FILES = new Set([
  'src/shared/core/capabilities/capabilityRegistry.ts',
  'src/shared/core/capabilities/appSurfaceManifest.ts',
]);

const DOC_TYPE_NAME_RE = /(?:^|[_])(?:[a-z]*docType(?:Id)?|doc_type(?:_id)?)$/i;

interface FileLeakReport {
  file: string;
  count: number;
  samples: string[];
}

interface DocTypeLeaksBaseline {
  total: number;
  files: Record<string, number>;
}

interface BaselineComparison {
  passed: boolean;
  newFiles: Array<{ file: string; count: number }>;
  increasedFiles: Array<{ file: string; prev: number; curr: number }>;
  decreasedFiles: Array<{ file: string; prev: number; curr: number }>;
  totalBefore: number;
  totalNow: number;
}

function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

function isTestFile(relPosix: string): boolean {
  return /\.(test|spec)\.[a-z]+$/i.test(relPosix) || relPosix.includes('/__tests__/');
}

function extractStringLiteral(node: ts.Expression): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
}

function isDocTypeReference(expr: ts.Expression): boolean {
  let current: ts.Expression = expr;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }

  if (ts.isIdentifier(current)) {
    return DOC_TYPE_NAME_RE.test(current.text);
  }
  if (ts.isPropertyAccessExpression(current)) {
    return DOC_TYPE_NAME_RE.test(current.name.text);
  }
  return false;
}

function isEqualityOp(kind: ts.SyntaxKind): boolean {
  return (
    kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
    kind === ts.SyntaxKind.EqualsEqualsToken ||
    kind === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
    kind === ts.SyntaxKind.ExclamationEqualsToken
  );
}

export function scanCodeForDocTypeLeaks(relPosix: string, content: string): FileLeakReport {
  const scriptKind = relPosix.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : relPosix.endsWith('.jsx')
      ? ts.ScriptKind.JSX
      : relPosix.endsWith('.js') || relPosix.endsWith('.mjs')
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;

  const sf = ts.createSourceFile(relPosix, content, ts.ScriptTarget.Latest, true, scriptKind);
  const hits: string[] = [];

  const lineOf = (pos: number) => sf.getLineAndCharacterOfPosition(pos).line + 1;

  const visit = (node: ts.Node) => {
    if (ts.isBinaryExpression(node) && isEqualityOp(node.operatorToken.kind)) {
      const leftStr = extractStringLiteral(node.left);
      const rightStr = extractStringLiteral(node.right);
      if (
        (rightStr !== null && isDocTypeReference(node.left)) ||
        (leftStr !== null && isDocTypeReference(node.right))
      ) {
        const line = lineOf(node.getStart(sf));
        hits.push(`L${line}: ${node.getText(sf).replace(/\s+/g, ' ').slice(0, 72)}`);
      }
    } else if (ts.isCaseClause(node)) {
      const lit = extractStringLiteral(node.expression);
      if (lit !== null && KNOWN_DOC_TYPES.has(lit)) {
        const line = lineOf(node.getStart(sf));
        hits.push(`L${line}: case '${lit}':`);
      }
    } else if (ts.isArrayLiteralExpression(node) && !ARRAY_EXEMPT_FILES.has(relPosix)) {
      const matchedDocTypes = new Set<string>();
      for (const el of node.elements) {
        if (ts.isExpression(el)) {
          const lit = extractStringLiteral(el);
          if (lit !== null && KNOWN_DOC_TYPES.has(lit)) {
            matchedDocTypes.add(lit);
          }
        }
      }
      if (matchedDocTypes.size >= 3) {
        const line = lineOf(node.getStart(sf));
        hits.push(`L${line}: lista fija [${[...matchedDocTypes].join(', ')}]`);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return {
    file: relPosix,
    count: hits.length,
    samples: hits.slice(0, 3),
  };
}

export function compareAgainstBaseline(
  reports: FileLeakReport[],
  baseline: DocTypeLeaksBaseline
): BaselineComparison {
  const currentMap = new Map<string, number>();
  let totalNow = 0;
  for (const r of reports) {
    if (r.count > 0) {
      currentMap.set(r.file, r.count);
      totalNow += r.count;
    }
  }

  const newFiles: Array<{ file: string; count: number }> = [];
  const increasedFiles: Array<{ file: string; prev: number; curr: number }> = [];
  const decreasedFiles: Array<{ file: string; prev: number; curr: number }> = [];

  for (const [file, curr] of currentMap.entries()) {
    const prev = baseline.files[file];
    if (prev === undefined) {
      newFiles.push({ file, count: curr });
    } else if (curr > prev) {
      increasedFiles.push({ file, prev, curr });
    } else if (curr < prev) {
      decreasedFiles.push({ file, prev, curr });
    }
  }

  for (const [file, prev] of Object.entries(baseline.files)) {
    if (!currentMap.has(file) && prev > 0) {
      decreasedFiles.push({ file, prev, curr: 0 });
    }
  }

  const passed = newFiles.length === 0 && increasedFiles.length === 0 && totalNow <= baseline.total;
  return {
    passed,
    newFiles,
    increasedFiles,
    decreasedFiles,
    totalBefore: baseline.total,
    totalNow,
  };
}

function walkSourceFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') {
        continue;
      }
      walkSourceFiles(full, acc);
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

function runSelftest(): void {
  console.log('🧪 Ejecutando selftest de check-docType-leaks...');

  // 1. Archivo limpio: comentarios y switch de otros dominios = 0
  const clean = scanCodeForDocTypeLeaks(
    'src/shared/core/ui/Clean.tsx',
    `// if (docType === 'cv') return null;\nexport function f(align: string) {\n  switch (align) { case 'left': return 1; case 'right': return 2; default: return 0; }\n}\n`
  );
  if (clean.count !== 0) {
    throw new Error(`Falso positivo en archivo limpio: ${JSON.stringify(clean)}`);
  }

  // 2. Comparaciones docType === / !==
  const cmp = scanCodeForDocTypeLeaks(
    'src/shared/core/ui/Bad.tsx',
    `export const x = (docType: string, targetDocType: string) => docType === 'invoice' || targetDocType !== 'editorial';\n`
  );
  if (cmp.count !== 2) {
    throw new Error(`Se esperaban 2 fugas por comparación, se hallaron ${cmp.count}: ${JSON.stringify(cmp)}`);
  }

  // 3. Switch case con IDs conocidos
  const sw = scanCodeForDocTypeLeaks(
    'src/shared/core/ui/Switch.ts',
    `export function r(t: string) { switch (t) { case 'book': return 1; case 'editorial': return 2; case 'other': return 3; } }\n`
  );
  if (sw.count !== 2) {
    throw new Error(`Se esperaban 2 fugas en switch, se hallaron ${sw.count}: ${JSON.stringify(sw)}`);
  }

  // 4. Lista fija de tipos
  const arr = scanCodeForDocTypeLeaks(
    'src/shared/core/documents/sync.ts',
    `export const SYNC = ['cv', 'cover_letter', 'business_card', 'editorial'];\n`
  );
  if (arr.count !== 1) {
    throw new Error(`Se esperaba 1 fuga por lista fija, se hallaron ${arr.count}: ${JSON.stringify(arr)}`);
  }

  // 5. Regresión contra baseline debe fallar
  const baseline: DocTypeLeaksBaseline = {
    total: 2,
    files: { 'src/shared/core/ui/Existing.tsx': 2 },
  };
  const regressed = compareAgainstBaseline(
    [
      { file: 'src/shared/core/ui/Existing.tsx', count: 2, samples: [] },
      { file: 'src/shared/core/ui/NewLeak.tsx', count: 1, samples: [] },
    ],
    baseline
  );
  if (regressed.passed || regressed.newFiles.length !== 1) {
    throw new Error(`Regresión en archivo nuevo no fue bloqueada: ${JSON.stringify(regressed)}`);
  }

  const increased = compareAgainstBaseline(
    [{ file: 'src/shared/core/ui/Existing.tsx', count: 3, samples: [] }],
    baseline
  );
  if (increased.passed || increased.increasedFiles.length !== 1) {
    throw new Error(`Incremento sobre baseline no fue bloqueado: ${JSON.stringify(increased)}`);
  }

  console.log('✅ Selftest de check-docType-leaks superado (6/6 invariantes verificadas).');
}

function loadBaseline(): DocTypeLeaksBaseline {
  if (!fs.existsSync(BASELINE_FILE)) {
    return { total: 0, files: {} };
  }
  const raw = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  return {
    total: typeof raw.total === 'number' ? raw.total : 0,
    files: raw.files && typeof raw.files === 'object' ? raw.files : {},
  };
}

function main(): void {
  if (process.argv.includes('--selftest')) {
    runSelftest();
    process.exit(0);
  }

  const updateBaseline = process.argv.includes('--update-baseline');
  console.log('🔍 Verificando fugas de docType por AST (Fase 0: red de seguridad)...\n');

  const files = walkSourceFiles(SRC);
  const reports: FileLeakReport[] = [];

  for (const absFile of files) {
    const rel = toPosix(path.relative(ROOT, absFile));
    if (isTestFile(rel)) continue;
    const content = fs.readFileSync(absFile, 'utf8');
    const report = scanCodeForDocTypeLeaks(rel, content);
    if (report.count > 0) {
      reports.push(report);
    }
  }

  reports.sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));
  const total = reports.reduce((sum, r) => sum + r.count, 0);
  const sharedTotal = reports.filter((r) => r.file.startsWith('src/shared/')).reduce((s, r) => s + r.count, 0);
  const appTotal = reports.filter((r) => r.file.startsWith('src/app/')).reduce((s, r) => s + r.count, 0);
  const modulesTotal = reports.filter((r) => r.file.startsWith('src/modules/')).reduce((s, r) => s + r.count, 0);

  if (updateBaseline) {
    const sortedEntries = [...reports].sort((a, b) => a.file.localeCompare(b.file));
    const filesObj: Record<string, number> = {};
    for (const r of sortedEntries) {
      filesObj[r.file] = r.count;
    }
    const next: DocTypeLeaksBaseline = { total, files: filesObj };
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(next, null, 2) + '\n', 'utf8');
    console.log(
      `✅ Baseline actualizado (${BASELINE_FILE}): ${total} fugas en ${reports.length} archivos (shared=${sharedTotal}, app=${appTotal}, modules=${modulesTotal}).`
    );
    process.exit(0);
  }

  const baseline = loadBaseline();
  const cmp = compareAgainstBaseline(reports, baseline);

  console.log(
    `   Total fugas: ${cmp.totalNow} (baseline: ${cmp.totalBefore}) — shared: ${sharedTotal}, app: ${appTotal}, modules: ${modulesTotal}`
  );
  console.log(`   Archivos con fugas: ${reports.length}`);

  if (!cmp.passed) {
    if (cmp.newFiles.length > 0) {
      console.error('\n❌ ARCHIVOS NUEVOS CON FUGAS DE docType (0 tolerancia):');
      for (const f of cmp.newFiles) {
        console.error(`   - ${f.file}: ${f.count} fuga(s)`);
      }
    }
    if (cmp.increasedFiles.length > 0) {
      console.error('\n❌ ARCHIVOS QUE SUBIERON SOBRE SU BASELINE:');
      for (const f of cmp.increasedFiles) {
        console.error(`   - ${f.file}: ${f.prev} -> ${f.curr} (+${f.curr - f.prev})`);
      }
    }
    console.error('\n   Resolvé la rama desde el registro de capacidades en vez de comparar docType.');
    process.exit(1);
  }

  if (cmp.decreasedFiles.length > 0) {
    console.warn(
      `\n⚠️  BASELINE PUEDE BAJAR: ${cmp.totalBefore} -> ${cmp.totalNow} (${cmp.decreasedFiles.length} archivo(s) mejoraron).`
    );
    for (const f of cmp.decreasedFiles) {
      console.warn(`   - ${f.file}: ${f.prev} -> ${f.curr}`);
    }
    console.warn('   Ejecutá `npx tsx scripts/check-docType-leaks.ts --update-baseline` en el mismo PR.');
  }

  console.log('\n✅ Verificación de fugas de docType superada (0 nuevas, 0 incrementos).\n');
  process.exit(0);
}

const isCliEntry =
  !process.env.VITEST &&
  Boolean(process.argv[1]) &&
  path.basename(process.argv[1]).toLowerCase() === 'check-doctype-leaks.ts';

if (isCliEntry) {
  main();
}
