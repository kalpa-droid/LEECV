#!/usr/bin/env tsx
/**
 * check-import-graph.ts — Red de seguridad de dependencias por AST (Fase 0).
 *
 * Usa la Compiler API de TypeScript (`ts.createSourceFile` + `ts.resolveModuleName`)
 * para resolver imports reales (`import`, `export ... from`, `import()`, `require`,
 * alias de tsconfig y rutas relativas) sobre todo `src/`.
 *
 * Verifica:
 *   1. Matriz de capas (contracts / shared-core / kits / app-engine / modules / app / context-data).
 *   2. Pureza de `modules/<app>/manifest.ts` y `modules/<app>/domain/**`.
 *   3. Aislamiento de red de FacturLee / boveda cifrada (`vault-network-isolation`).
 *   4. Dependencias circulares en runtime (Tarjan SCC sobre imports con valor).
 *
 * Baseline: `scripts/import-graph-baseline.json` (estrictamente decreciente).
 *   - Falla si aparece una violacion o ciclo nuevo, o si sube el total.
 *   - `--update-baseline` regenera el baseline.
 *   - `--selftest` ejecuta pruebas aisladas con fixtures sinteticos.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASELINE_FILE = path.join(__dirname, 'import-graph-baseline.json');

type LayerKind =
  | 'contracts'
  | 'kits'
  | 'app-engine'
  | 'shared-core'
  | 'module'
  | 'app'
  | 'context-data'
  | 'types'
  | 'other';

interface FileClassification {
  layer: LayerKind;
  moduleName?: string;
  engineName?: string;
  subPath?: string;
}

interface ExtractedImport {
  specifier: string;
  isTypeOnly: boolean;
}

interface GraphAnalysisResult {
  filesScanned: number;
  boundaryViolations: string[];
  cycles: string[];
}

interface ImportGraphBaseline {
  boundaryViolations: string[];
  cycles: string[];
}

const APP_ENGINES = new Set(['book-engine', 'facturador-engine', 'editorial-engine']);
const FORBIDDEN_DOMAIN_EXTERNALS = new Set(['react', 'react-dom', '@react-pdf/renderer']);
const VAULT_FORBIDDEN_TARGETS = /(?:^|\/)(supabaseClient|syncEngine|cloudBackup[^/]*|leecvCloudBackend)\.[a-z]+$/i;
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];

function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

function classifyPath(relPosix: string): FileClassification {
  if (relPosix.startsWith('src/shared/contracts/')) {
    return { layer: 'contracts' };
  }
  if (relPosix.startsWith('src/shared/kits/')) {
    return { layer: 'kits' };
  }
  if (relPosix.startsWith('src/shared/core/')) {
    const parts = relPosix.split('/');
    const area = parts[3];
    if (area && APP_ENGINES.has(area)) {
      return { layer: 'app-engine', engineName: area };
    }
    return { layer: 'shared-core' };
  }
  if (relPosix.startsWith('src/shared/')) {
    return { layer: 'shared-core' };
  }
  if (relPosix.startsWith('src/modules/')) {
    const parts = relPosix.split('/');
    const moduleName = parts[2];
    const subPath = parts.slice(3).join('/');
    return { layer: 'module', moduleName, subPath };
  }
  if (relPosix.startsWith('src/app/')) {
    return { layer: 'app' };
  }
  if (relPosix.startsWith('src/context/') || relPosix.startsWith('src/data/')) {
    return { layer: 'context-data' };
  }
  if (relPosix.startsWith('src/types/')) {
    return { layer: 'types' };
  }
  return { layer: 'other' };
}

function isVaultIsolatedFile(relPosix: string): boolean {
  return (
    relPosix.startsWith('src/modules/facturador-studio/') ||
    relPosix.startsWith('src/shared/core/facturador-engine/') ||
    /EncryptedVault/i.test(relPosix)
  );
}

function isTestFile(relPosix: string): boolean {
  return /\.(test|spec)\.[a-z]+$/i.test(relPosix) || relPosix.includes('/__tests__/');
}

function loadCompilerOptions(rootDir: string): ts.CompilerOptions {
  const tsconfigPath = path.join(rootDir, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    const read = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    if (!read.error && read.config) {
      const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, rootDir);
      return parsed.options;
    }
  }
  return {
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
    allowJs: true,
  };
}

function extractImportsFromAst(filePath: string, content: string): ExtractedImport[] {
  const scriptKind = filePath.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : filePath.endsWith('.jsx')
      ? ts.ScriptKind.JSX
      : filePath.endsWith('.js') || filePath.endsWith('.mjs') || filePath.endsWith('.cjs')
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;

  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, scriptKind);
  const results: ExtractedImport[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const isTypeOnly = Boolean(
        node.importClause?.isTypeOnly ||
          (node.importClause?.namedBindings &&
            ts.isNamedImports(node.importClause.namedBindings) &&
            !node.importClause.name &&
            node.importClause.namedBindings.elements.length > 0 &&
            node.importClause.namedBindings.elements.every((el) => el.isTypeOnly))
      );
      results.push({ specifier: node.moduleSpecifier.text, isTypeOnly });
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const isTypeOnly = Boolean(
        node.isTypeOnly ||
          (node.exportClause &&
            ts.isNamedExports(node.exportClause) &&
            node.exportClause.elements.length > 0 &&
            node.exportClause.elements.every((el) => el.isTypeOnly))
      );
      results.push({ specifier: node.moduleSpecifier.text, isTypeOnly });
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      results.push({ specifier: node.moduleReference.expression.text, isTypeOnly: node.isTypeOnly });
    } else if (ts.isCallExpression(node) && node.arguments.length >= 1) {
      const firstArg = node.arguments[0];
      const isStaticString = ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg);
      if (isStaticString) {
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          results.push({ specifier: firstArg.text, isTypeOnly: false });
        } else if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
          results.push({ specifier: firstArg.text, isTypeOnly: false });
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return results;
}

function findRealFile(basePath: string): string | null {
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath;
  }
  for (const ext of SOURCE_EXTENSIONS) {
    const candidate = basePath + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  for (const ext of SOURCE_EXTENSIONS) {
    const indexCandidate = path.join(basePath, `index${ext}`);
    if (fs.existsSync(indexCandidate) && fs.statSync(indexCandidate).isFile()) {
      return indexCandidate;
    }
  }
  return null;
}

function resolveImportTarget(
  specifier: string,
  fromAbs: string,
  rootDir: string,
  compilerOptions: ts.CompilerOptions
): { resolvedAbs: string | null; externalPkg: string | null } {
  if (specifier.startsWith('node:') || specifier.startsWith('http:') || specifier.startsWith('https:') || specifier.startsWith('data:')) {
    return { resolvedAbs: null, externalPkg: specifier };
  }

  const normalizedSpec = specifier.startsWith('@/')
    ? path.join(rootDir, 'src', specifier.slice(2))
    : specifier.startsWith('/src/')
      ? path.join(rootDir, specifier.slice(1))
      : specifier;

  const isLocalLike =
    specifier.startsWith('.') ||
    specifier.startsWith('@/') ||
    specifier.startsWith('/src/');

  const tsResolved = ts.resolveModuleName(specifier, fromAbs, compilerOptions, ts.sys);
  const resolvedFileName = tsResolved.resolvedModule?.resolvedFileName;
  if (resolvedFileName) {
    const normalizedResolved = path.resolve(resolvedFileName);
    const relFromRoot = toPosix(path.relative(rootDir, normalizedResolved));
    if (!relFromRoot.startsWith('..') && !relFromRoot.includes('node_modules/')) {
      return { resolvedAbs: normalizedResolved, externalPkg: null };
    }
  }

  if (isLocalLike) {
    const candidateBase = path.isAbsolute(normalizedSpec)
      ? normalizedSpec
      : path.resolve(path.dirname(fromAbs), normalizedSpec);
    const realFile = findRealFile(candidateBase);
    if (realFile) {
      const relFromRoot = toPosix(path.relative(rootDir, realFile));
      if (!relFromRoot.startsWith('..') && !relFromRoot.includes('node_modules/')) {
        return { resolvedAbs: realFile, externalPkg: null };
      }
    }
    return { resolvedAbs: null, externalPkg: null };
  }

  const pkgRoot = specifier.startsWith('@')
    ? specifier.split('/').slice(0, 2).join('/')
    : specifier.split('/')[0];
  return { resolvedAbs: null, externalPkg: pkgRoot };
}

function checkBoundaryRule(
  fromRel: string,
  fromClass: FileClassification,
  toRel: string | null,
  toClass: FileClassification | null,
  externalPkg: string | null
): string | null {
  if (isVaultIsolatedFile(fromRel) && !isTestFile(fromRel)) {
    if (externalPkg && externalPkg.startsWith('@supabase/')) {
      return `[vault-network-isolation] ${fromRel} -> ${externalPkg}`;
    }
    if (toRel && VAULT_FORBIDDEN_TARGETS.test(toRel)) {
      return `[vault-network-isolation] ${fromRel} -> ${toRel}`;
    }
  }

  if (fromClass.layer === 'module' && fromClass.subPath === 'manifest.ts') {
    if (externalPkg) {
      return `[manifest-purity] ${fromRel} -> ${externalPkg}`;
    }
    if (toRel && toClass && toClass.layer !== 'contracts') {
      return `[manifest-purity] ${fromRel} -> ${toRel}`;
    }
  }

  if (fromClass.layer === 'module' && fromClass.subPath?.startsWith('domain/') && !isTestFile(fromRel)) {
    if (externalPkg && FORBIDDEN_DOMAIN_EXTERNALS.has(externalPkg)) {
      return `[domain-purity] ${fromRel} -> ${externalPkg}`;
    }
    if (toRel && toClass?.layer === 'module' && toClass.moduleName === fromClass.moduleName && toClass.subPath?.startsWith('ui/')) {
      return `[domain-purity] ${fromRel} -> ${toRel}`;
    }
  }

  if (!toRel || !toClass) return null;

  if (fromClass.layer === 'contracts') {
    if (toClass.layer !== 'contracts') {
      return `[contracts-boundary] ${fromRel} -> ${toRel}`;
    }
  }

  if (fromClass.layer === 'shared-core') {
    if (toClass.layer === 'module' || toClass.layer === 'app' || toClass.layer === 'context-data') {
      return `[shared-boundary] ${fromRel} -> ${toRel}`;
    }
    if (toClass.layer === 'app-engine') {
      return `[trunk-to-engine] ${fromRel} -> ${toRel}`;
    }
    if (toClass.layer === 'kits') {
      return `[core-to-kit] ${fromRel} -> ${toRel}`;
    }
  }

  if (fromClass.layer === 'kits') {
    if (
      toClass.layer === 'module' ||
      toClass.layer === 'app' ||
      toClass.layer === 'context-data' ||
      toClass.layer === 'app-engine'
    ) {
      return `[kit-boundary] ${fromRel} -> ${toRel}`;
    }
  }

  if (fromClass.layer === 'app-engine') {
    if (toClass.layer === 'module' || toClass.layer === 'app' || toClass.layer === 'context-data') {
      return `[engine-boundary] ${fromRel} -> ${toRel}`;
    }
    if (toClass.layer === 'app-engine' && toClass.engineName !== fromClass.engineName) {
      return `[engine-boundary] ${fromRel} -> ${toRel}`;
    }
  }

  if (fromClass.layer === 'module') {
    if (toClass.layer === 'module' && fromClass.moduleName !== toClass.moduleName) {
      return `[cross-module] ${fromRel} -> ${toRel}`;
    }
    if (toClass.layer === 'app') {
      return `[module-to-app] ${fromRel} -> ${toRel}`;
    }
    if (toClass.layer === 'context-data' && fromClass.moduleName !== 'cv-builder') {
      return `[module-to-cv-state] ${fromRel} -> ${toRel}`;
    }
  }

  return null;
}

function findRuntimeCycles(adjacency: Map<string, Set<string>>): string[] {
  let index = 0;
  const indices = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const cycles: string[] = [];

  const nodes = [...adjacency.keys()].sort();

  function strongConnect(v: string) {
    indices.set(v, index);
    lowlink.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    const neighbors = [...(adjacency.get(v) || [])].sort();
    for (const w of neighbors) {
      if (w === v) {
        cycles.push(`CYCLE: ${v} <-> ${v}`);
        continue;
      }
      if (!indices.has(w)) {
        strongConnect(w);
        lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v)!, indices.get(w)!));
      }
    }

    if (lowlink.get(v) === indices.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);

      if (scc.length > 1) {
        scc.sort();
        cycles.push(`CYCLE: ${scc.join(' <-> ')}`);
      }
    }
  }

  for (const node of nodes) {
    if (!indices.has(node)) {
      strongConnect(node);
    }
  }

  return [...new Set(cycles)].sort();
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
    } else if (
      /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(entry.name) &&
      !entry.name.endsWith('.d.ts')
    ) {
      acc.push(full);
    }
  }
  return acc;
}

export function analyzeImportGraph(rootDir: string): GraphAnalysisResult {
  const srcDir = path.join(rootDir, 'src');
  const compilerOptions = loadCompilerOptions(rootDir);
  const files = walkSourceFiles(srcDir);
  const violations = new Set<string>();
  const adjacency = new Map<string, Set<string>>();

  for (const absFile of files) {
    const fromRel = toPosix(path.relative(rootDir, absFile));
    if (!adjacency.has(fromRel)) {
      adjacency.set(fromRel, new Set<string>());
    }
    const fromClass = classifyPath(fromRel);
    const content = fs.readFileSync(absFile, 'utf8');
    const imports = extractImportsFromAst(absFile, content);

    for (const imp of imports) {
      const { resolvedAbs, externalPkg } = resolveImportTarget(imp.specifier, absFile, rootDir, compilerOptions);
      const toRel = resolvedAbs ? toPosix(path.relative(rootDir, resolvedAbs)) : null;
      const toClass = toRel ? classifyPath(toRel) : null;

      if (toRel && !imp.isTypeOnly && !isTestFile(fromRel) && !isTestFile(toRel)) {
        adjacency.get(fromRel)!.add(toRel);
      }

      const violation = checkBoundaryRule(fromRel, fromClass, toRel, toClass, externalPkg);
      if (violation) {
        violations.add(violation);
      }
    }
  }

  const cycles = findRuntimeCycles(adjacency);
  return {
    filesScanned: files.length,
    boundaryViolations: [...violations].sort(),
    cycles,
  };
}

function runSelftest(): void {
  console.log('🧪 Ejecutando selftest de check-import-graph...');
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'leecv-import-graph-test-'));

  const writeFixture = (rel: string, content: string) => {
    const full = path.join(tmpRoot, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf8');
  };

  try {
    // Caso 1: grafo limpio (incluye comentario engañoso que un regex fallaría)
    writeFixture('src/shared/contracts/doc.ts', 'export interface Doc { id: string; }\n');
    writeFixture(
      'src/shared/core/util.ts',
      `// import from '../modules/cv-builder/Navbar'\nimport type { Doc } from '../contracts/doc';\nexport const ok = (d: Doc) => d.id;\n`
    );
    writeFixture(
      'src/modules/alpha/ui/Panel.tsx',
      `import { ok } from '../../../shared/core/util';\nexport const P = () => ok({ id: '1' });\n`
    );

    const clean = analyzeImportGraph(tmpRoot);
    if (clean.boundaryViolations.length !== 0 || clean.cycles.length !== 0) {
      throw new Error(`Caso limpio falló: ${JSON.stringify(clean)}`);
    }

    // Caso 2: import relativo entre módulos (D1)
    writeFixture('src/modules/cv-builder/components/Navbar.tsx', 'export const Navbar = () => null;\n');
    writeFixture(
      'src/modules/book-studio/BookView.tsx',
      `import { Navbar } from '../cv-builder/components/Navbar';\nexport const B = Navbar;\n`
    );

    // Caso 3: shared -> context (D14)
    writeFixture('src/context/CVContext.tsx', 'export const useCVContext = () => ({});\n');
    writeFixture(
      'src/shared/core/ui/Undo.tsx',
      `import { useCVContext } from '../../../context/CVContext';\nexport const U = useCVContext;\n`
    );

    // Caso 4: shared -> app-engine (D18)
    writeFixture('src/shared/core/book-engine/seq.ts', 'export const SEQ = [];\n');
    writeFixture(
      'src/shared/core/assistant/tips.ts',
      `import { SEQ } from '../book-engine/seq';\nexport const T = SEQ;\n`
    );

    // Caso 5: FacturLee -> supabase (seguridad de bóveda)
    writeFixture('src/shared/core/lib/supabaseClient.ts', 'export const supabase = null;\n');
    writeFixture(
      'src/modules/facturador-studio/Leak.ts',
      `import { supabase } from '../../shared/core/lib/supabaseClient';\nexport const L = supabase;\n`
    );

    // Caso 6: ciclo en runtime
    writeFixture('src/shared/core/cycleA.ts', `import { b } from './cycleB';\nexport const a = () => b;\n`);
    writeFixture('src/shared/core/cycleB.ts', `import { a } from './cycleA';\nexport const b = () => a;\n`);

    const dirty = analyzeImportGraph(tmpRoot);
    const hasCrossModule = dirty.boundaryViolations.some((v) => v.startsWith('[cross-module]'));
    const hasSharedBoundary = dirty.boundaryViolations.some((v) => v.startsWith('[shared-boundary]'));
    const hasTrunkToEngine = dirty.boundaryViolations.some((v) => v.startsWith('[trunk-to-engine]'));
    const hasVaultIsolation = dirty.boundaryViolations.some((v) => v.startsWith('[vault-network-isolation]'));
    const hasCycle = dirty.cycles.some((c) => c.includes('cycleA.ts') && c.includes('cycleB.ts'));

    if (!hasCrossModule || !hasSharedBoundary || !hasTrunkToEngine || !hasVaultIsolation || !hasCycle) {
      throw new Error(`Selftest no detectó todas las fallas esperadas: ${JSON.stringify(dirty, null, 2)}`);
    }

    console.log('✅ Selftest de check-import-graph superado (6/6 invariantes verificadas).');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

function loadBaseline(): ImportGraphBaseline {
  if (!fs.existsSync(BASELINE_FILE)) {
    return { boundaryViolations: [], cycles: [] };
  }
  const raw = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  if (Array.isArray(raw)) {
    return { boundaryViolations: raw, cycles: [] };
  }
  return {
    boundaryViolations: Array.isArray(raw.boundaryViolations) ? raw.boundaryViolations : [],
    cycles: Array.isArray(raw.cycles) ? raw.cycles : [],
  };
}

function main(): void {
  if (process.argv.includes('--selftest')) {
    runSelftest();
    process.exit(0);
  }

  const updateBaseline = process.argv.includes('--update-baseline');
  console.log('🔍 Verificando grafo de imports por AST (Fase 0: red de seguridad)...\n');

  const result = analyzeImportGraph(ROOT);

  if (updateBaseline) {
    const nextBaseline: ImportGraphBaseline = {
      boundaryViolations: result.boundaryViolations,
      cycles: result.cycles,
    };
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(nextBaseline, null, 2) + '\n', 'utf8');
    console.log(
      `✅ Baseline actualizado (${BASELINE_FILE}): ${result.boundaryViolations.length} violaciones de frontera, ${result.cycles.length} ciclos (sobre ${result.filesScanned} archivos).`
    );
    process.exit(0);
  }

  const baseline = loadBaseline();
  const baseViolationsSet = new Set(baseline.boundaryViolations);
  const baseCyclesSet = new Set(baseline.cycles);
  const currViolationsSet = new Set(result.boundaryViolations);
  const currCyclesSet = new Set(result.cycles);

  const newViolations = result.boundaryViolations.filter((v) => !baseViolationsSet.has(v));
  const fixedViolations = baseline.boundaryViolations.filter((v) => !currViolationsSet.has(v));
  const newCycles = result.cycles.filter((c) => !baseCyclesSet.has(c));
  const fixedCycles = baseline.cycles.filter((c) => !currCyclesSet.has(c));

  console.log(`   Archivos analizados: ${result.filesScanned}`);
  console.log(`   Fronteras: ${result.boundaryViolations.length} (baseline: ${baseline.boundaryViolations.length})`);
  console.log(`   Ciclos runtime: ${result.cycles.length} (baseline: ${baseline.cycles.length})`);

  let failed = false;

  if (newViolations.length > 0) {
    failed = true;
    console.error('\n❌ VIOLACIONES DE FRONTERA NUEVAS:');
    for (const v of newViolations) console.error(`   - ${v}`);
  }
  if (result.boundaryViolations.length > baseline.boundaryViolations.length) {
    failed = true;
    console.error(
      `\n❌ El total de violaciones de frontera subió (${baseline.boundaryViolations.length} -> ${result.boundaryViolations.length}).`
    );
  }
  if (newCycles.length > 0) {
    failed = true;
    console.error('\n❌ DEPENDENCIAS CIRCULARES NUEVAS:');
    for (const c of newCycles) console.error(`   - ${c}`);
  }
  if (result.cycles.length > baseline.cycles.length) {
    failed = true;
    console.error(
      `\n❌ El total de ciclos subió (${baseline.cycles.length} -> ${result.cycles.length}).`
    );
  }

  if (failed) {
    console.error('\n   Corregí la dependencia antes de continuar. Los baselines solo bajan.');
    process.exit(1);
  }

  if (fixedViolations.length > 0 || fixedCycles.length > 0) {
    console.warn(
      `\n⚠️  BASELINE PUEDE BAJAR: -${fixedViolations.length} fronteras, -${fixedCycles.length} ciclos.`
    );
    console.warn('   Ejecutá `npx tsx scripts/check-import-graph.ts --update-baseline` en el mismo PR.');
  }

  console.log('\n✅ Grafo de imports verificado (0 violaciones nuevas, 0 ciclos nuevos).\n');
  process.exit(0);
}

const isCliEntry =
  !process.env.VITEST &&
  Boolean(process.argv[1]) &&
  path.basename(process.argv[1]).toLowerCase() === 'check-import-graph.ts';

if (isCliEntry) {
  main();
}
