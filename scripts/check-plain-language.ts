/**
 * Gobernanza de LENGUAJE SENCILLO — recorre TODO el texto visible de la página
 * (JSX, atributos, catálogos i18n, SEO, blog, mensajes) y falla si aparece jerga de
 * imprenta/formato ("vectorial", "A4", "imprenta pro", "sangrado"…).
 * Reglas y sugerencias: src/shared/core/plainLanguage/plainLanguageRules.ts
 *
 * Uso:  tsx scripts/check-plain-language.ts            (audita src/ y api/)
 *       tsx scripts/check-plain-language.ts --selftest (prueba el propio escáner)
 * Exención puntual: comentario `plain-language:allow` en la misma línea o en la anterior.
 */
import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';
import { findJargon, looksLikeProse, PlainLanguageViolation } from '../src/shared/core/plainLanguage';

const ROOTS = ['src', 'api'];
const SKIP_PATH = [
  /node_modules/,
  /\.test\.tsx?$/,
  /[\\/]__tests__[\\/]/,
  /[\\/]modules[\\/]admin[\\/]/, // consola interna: no la ve la gente común
  /[\\/]core[\\/]plainLanguage[\\/]/, // las propias reglas (contienen la jerga a propósito)
];
const CATALOG_DIR = /src[\\/]shared[\\/]i18n[\\/]catalog[\\/]/;
const IGNORED_CALLEES = /^(console\.|logger\.)/;

export interface Finding {
  file: string;
  line: number;
  text: string;
  violation: PlainLanguageViolation;
}

function lineOf(sf: ts.SourceFile, pos: number): number {
  return sf.getLineAndCharacterOfPosition(pos).line + 1;
}

function isAllowed(sf: ts.SourceFile, pos: number): boolean {
  const lines = sf.text.split('\n');
  const idx = lineOf(sf, pos) - 1;
  return /plain-language:allow/.test(lines[idx] || '') || /plain-language:allow/.test(lines[idx - 1] || '');
}

function isInvisibleContext(node: ts.Node): boolean {
  const p = node.parent;
  if (!p) return false;
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true;
  if (ts.isLiteralTypeNode(p)) return true;
  if (ts.isCaseClause(p)) return true;
  if (ts.isPropertyAssignment(p) && p.name === node) return true; // clave de objeto
  if (ts.isBinaryExpression(p) && /^(===|!==|==|!=)$/.test(p.operatorToken.getText())) return true;
  if (ts.isCallExpression(p) && IGNORED_CALLEES.test(p.expression.getText())) return true;
  return false;
}

export function scanSource(fileName: string, code: string): Finding[] {
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, kind);
  const inCatalog = CATALOG_DIR.test(fileName);
  const out: Finding[] = [];

  const check = (node: ts.Node, text: string) => {
    if (!text.trim()) return;
    if (!inCatalog && !looksLikeProse(text)) return; // 'A4' suelto = código interno
    if (isInvisibleContext(node) || isAllowed(sf, node.getStart(sf))) return;
    for (const v of findJargon(text)) {
      out.push({ file: fileName, line: lineOf(sf, node.getStart(sf)), text: text.trim().slice(0, 140), violation: v });
    }
  };

  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) check(node, node.text);
    else if (ts.isTemplateExpression(node)) {
      const parts = [node.head.text, ...node.templateSpans.map(s => s.literal.text)].join(' ');
      check(node, parts);
    } else if (ts.isJsxText(node)) check(node, node.text);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/** Archivos públicos que no son código (título/descripción de index.html, manifest, imagen para compartir). */
export function scanPlainText(fileName: string, text: string): Finding[] {
  const out: Finding[] = [];
  const lines = text.split('\n');
  lines.forEach((raw, i) => {
    if (/plain-language:allow/.test(raw) || /plain-language:allow/.test(lines[i - 1] || '')) return;
    const line = raw.replace(/https?:\/\/\S+/g, ''); // las URL (slugs) no son texto visible
    for (const v of findJargon(line)) {
      out.push({ file: fileName, line: i + 1, text: raw.trim().slice(0, 140), violation: v });
    }
  });
  return out;
}

const PLAIN_FILES = ['index.html', 'metadata.json'];
const PLAIN_PUBLIC_EXT = /\.(svg|json|html|webmanifest)$/;

function plainFiles(): string[] {
  const out = PLAIN_FILES.map(f => path.resolve(process.cwd(), f)).filter(f => fs.existsSync(f));
  const pub = path.resolve(process.cwd(), 'public');
  const walkPublic = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walkPublic(full);
      else if (PLAIN_PUBLIC_EXT.test(e.name)) out.push(full);
    }
  };
  walkPublic(pub);
  return out;
}

function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (SKIP_PATH.some(rx => rx.test(full))) continue;
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) acc.push(full);
  }
  return acc;
}

function selftest(): number {
  const cases: Array<[string, string, number]> = [
    ['a.tsx', `const x = <p>Exportá tu PDF A4 nativo</p>;`, 1],
    ['a.tsx', `const x = <p>Exportá tu PDF nativo A4</p>;`, 2],
    ['a.ts', `const t = 'Se ve nítido, con letras vectoriales';`, 1],
    ['a.tsx', `const x = <p>Imprimilo en tu casa o llevalo a una imprenta</p>;`, 0],
    ['a.ts', `const s = 'A4'; if (p === 'A3') {}`, 0], // códigos internos
    ['a.ts', `// vectorial en un comentario\nconst ok = 1;`, 0],
    ['a.ts', `const t = 'Descarga vectorial lista'; // x`, 1],
    ['a.ts', `// plain-language:allow\nconst t = 'Motor vectorial interno';`, 0],
    ['src/shared/i18n/catalog/x.ts', `export const c = { a: 'Hoja A4' };`, 1],
    ['a.ts', `console.log('render vectorial A4');`, 0],
  ];
  let bad = 0;
  const plainCases: Array<[string, number]> = [
    ['<title>Currículum en PDF A4 vectorial</title>', 2],
    ['<title>Currículum listo para imprimir</title>', 0],
    ['<link href="https://leecv.app/blog/guia-imposicion-libros">', 0], // URL: no es texto visible
  ];
  for (const [text, expected] of plainCases) {
    const got = scanPlainText('x.html', text).length;
    if (got !== expected) {
      console.error(`❌ selftest (texto plano): ${JSON.stringify(text)} → ${got} hallazgos, esperaba ${expected}`);
      bad++;
    }
  }
  for (const [name, code, expected] of cases) {
    const got = scanSource(name, code).length;
    if (got !== expected) {
      console.error(`❌ selftest: ${JSON.stringify(code)} → ${got} hallazgos, esperaba ${expected}`);
      bad++;
    }
  }
  if (!bad) console.log('✅ check-plain-language selftest OK');
  return bad;
}

/** Escanea toda la página (código + archivos públicos). Lo usan main() y los tests. */
export function scanRepo(): { findings: Finding[]; fileCount: number } {
  const files = ROOTS.flatMap(r => walk(path.resolve(process.cwd(), r)));
  const plain = plainFiles();
  const findings = [
    ...files.flatMap(f => scanSource(path.relative(process.cwd(), f), fs.readFileSync(f, 'utf-8'))),
    ...plain.flatMap(f => scanPlainText(path.relative(process.cwd(), f), fs.readFileSync(f, 'utf-8'))),
  ];
  return { findings, fileCount: files.length + plain.length };
}

function main() {
  if (process.argv.includes('--selftest')) process.exit(selftest() ? 1 : 0);

  const { findings, fileCount } = scanRepo();

  if (findings.length === 0) {
    console.log(`✅ Lenguaje sencillo OK: ${fileCount} archivos, 0 palabras técnicas de imprenta.`);
    return;
  }
  for (const f of findings) {
    console.error(`🗣️  ${f.file}:${f.line}  «${f.violation.match}»  [${f.violation.ruleId}]\n     "${f.text}"\n     → ${f.violation.say}`);
  }
  console.error(`\n❌ ${findings.length} texto(s) con jerga. La página habla para gente común: ver src/shared/core/plainLanguage/plainLanguageRules.ts`);
  process.exit(1);
}

if (process.argv[1] && /check-plain-language/.test(process.argv[1])) main();
