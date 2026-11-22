#!/usr/bin/env tsx
/**
 * check-forbidden-doctypes.ts — Guardia AST contra tipos fantasma purgados (Fase 2).
 *
 * Impide que `portfolio` o `certificate` vuelvan a colarse como DocumentTypeId,
 * entradas del registro, listas de sincronización o llamadas de almacenamiento por tipo.
 * (No afecta a la sección de CV llamada `portfolio` en `PortafolioSection.tsx` ni a
 * `coursesAndCertificates`.)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { DOCUMENT_TYPE_REGISTRY } from '../src/shared/core/capabilities/capabilityRegistry';
import { APP_SURFACE_MANIFEST } from '../src/shared/core/capabilities/appSurfaceManifest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const FORBIDDEN_DOC_TYPES = new Set(['portfolio', 'certificate']);

const STORAGE_OR_REGISTRY_CALLS = new Set([
  'getSavedDocumentsList',
  'saveDocument',
  'saveDocumentAs',
  'saveDocumentDraftLocal',
  'loadDocumentById',
  'deleteDocumentById',
  'getDocumentTypeConfig',
  'getRouteForDocType',
  'getDefaultTitleForDocType',
  'getDraftIdForDocType',
  'hasCapability',
]);

const DOC_TYPE_CONTAINER_NAMES = /^(DOC_TYPE_IDS|DOC_TYPE_LABELS|DOCUMENT_TYPE_REGISTRY|APP_SURFACE_MANIFEST|DocumentTypeId)$/i;
const DOC_TYPE_VAR_RE = /(?:^|_)(?:[a-z]*docType(?:Id)?|doc_type(?:_id)?)$/i;

function extractStringLiteral(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
}

export function scanFileForForbiddenDocTypes(relPath: string, content: string): string[] {
  const scriptKind = relPath.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : relPath.endsWith('.jsx')
      ? ts.ScriptKind.JSX
      : ts.ScriptKind.TS;

  const sf = ts.createSourceFile(relPath, content, ts.ScriptTarget.Latest, true, scriptKind);
  const violations: string[] = [];
  const lineOf = (pos: number) => sf.getLineAndCharacterOfPosition(pos).line + 1;

  const checkContainerNode = (containerName: string, node: ts.Node) => {
    const walk = (n: ts.Node) => {
      const lit = extractStringLiteral(n);
      if (lit && FORBIDDEN_DOC_TYPES.has(lit)) {
        violations.push(`${relPath}:${lineOf(n.getStart(sf))} — tipo prohibido '${lit}' en ${containerName}`);
      }
      if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name) && FORBIDDEN_DOC_TYPES.has(n.name.text)) {
        violations.push(`${relPath}:${lineOf(n.getStart(sf))} — clave prohibida '${n.name.text}' en ${containerName}`);
      }
      ts.forEachChild(n, walk);
    };
    walk(node);
  };

  const visit = (node: ts.Node) => {
    // 1. Contenedores canónicos de docTypes (DOCUMENT_TYPE_REGISTRY, DOC_TYPE_IDS, DocumentTypeId, etc.)
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && DOC_TYPE_CONTAINER_NAMES.test(node.name.text)) {
      if (node.initializer) checkContainerNode(node.name.text, node.initializer);
    }
    if (ts.isTypeAliasDeclaration(node) && DOC_TYPE_CONTAINER_NAMES.test(node.name.text)) {
      checkContainerNode(node.name.text, node.type);
    }

    // 2. Llamadas a storage/registry con argumento literal prohibido
    if (ts.isCallExpression(node)) {
      const calleeName = ts.isIdentifier(node.expression)
        ? node.expression.text
        : ts.isPropertyAccessExpression(node.expression)
          ? node.expression.name.text
          : null;
      if (calleeName && STORAGE_OR_REGISTRY_CALLS.has(calleeName)) {
        for (const arg of node.arguments) {
          const lit = extractStringLiteral(arg);
          if (lit && FORBIDDEN_DOC_TYPES.has(lit)) {
            violations.push(
              `${relPath}:${lineOf(arg.getStart(sf))} — llamada ${calleeName}('${lit}') con tipo prohibido`
            );
          }
        }
      }
    }

    // 3. Comparaciones directas docType === 'portfolio' | 'certificate'
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      const isCmp =
        op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        op === ts.SyntaxKind.EqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsToken;
      if (isCmp) {
        const leftLit = extractStringLiteral(node.left);
        const rightLit = extractStringLiteral(node.right);
        const leftName = ts.isIdentifier(node.left)
          ? node.left.text
          : ts.isPropertyAccessExpression(node.left)
            ? node.left.name.text
            : '';
        const rightName = ts.isIdentifier(node.right)
          ? node.right.text
          : ts.isPropertyAccessExpression(node.right)
            ? node.right.name.text
            : '';
        if (rightLit && FORBIDDEN_DOC_TYPES.has(rightLit) && DOC_TYPE_VAR_RE.test(leftName)) {
          violations.push(`${relPath}:${lineOf(node.getStart(sf))} — comparación con tipo prohibido '${rightLit}'`);
        }
        if (leftLit && FORBIDDEN_DOC_TYPES.has(leftLit) && DOC_TYPE_VAR_RE.test(rightName)) {
          violations.push(`${relPath}:${lineOf(node.getStart(sf))} — comparación con tipo prohibido '${leftLit}'`);
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return violations;
}

function walkFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      walkFiles(full, acc);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

function runSelftest(): void {
  console.log('🧪 Ejecutando selftest de check-forbidden-doctypes...');

  // 1. Sección de CV llamada portfolio NO debe disparar falso positivo
  const cvSectionOk = scanFileForForbiddenDocTypes(
    'src/modules/cv-builder/PortafolioSection.tsx',
    `export const field = 'portfolio';\nexport const obj = { portfolio: [] };\n`
  );
  if (cvSectionOk.length !== 0) {
    throw new Error(`Falso positivo en sección CV portfolio: ${JSON.stringify(cvSectionOk)}`);
  }

  // 2. Registro con portfolio/certificate DEBE fallar
  const regBad = scanFileForForbiddenDocTypes(
    'src/shared/core/capabilities/capabilityRegistry.ts',
    `export const DOCUMENT_TYPE_REGISTRY = { cv: {}, portfolio: {}, certificate: {} };\n`
  );
  if (regBad.length !== 2) {
    throw new Error(`Se esperaban 2 fallas en registro, hubo ${regBad.length}: ${JSON.stringify(regBad)}`);
  }

  // 3. Llamada getSavedDocumentsList('portfolio') DEBE fallar
  const callBad = scanFileForForbiddenDocTypes(
    'src/shared/core/documents/syncEngine.ts',
    `getSavedDocumentsList('portfolio');\n`
  );
  if (callBad.length !== 1) {
    throw new Error(`Se esperaba 1 falla en getSavedDocumentsList, hubo ${callBad.length}`);
  }

  // 4. Comparación docType === 'certificate' DEBE fallar
  const cmpBad = scanFileForForbiddenDocTypes(
    'src/app/App.tsx',
    `if (docType === 'certificate') console.log(1);\n`
  );
  if (cmpBad.length !== 1) {
    throw new Error(`Se esperaba 1 falla en comparación, hubo ${cmpBad.length}`);
  }

  console.log('✅ Selftest de check-forbidden-doctypes superado (4/4 invariantes verificadas).');
}

function main(): void {
  if (process.argv.includes('--selftest')) {
    runSelftest();
    process.exit(0);
  }

  console.log('🔍 Verificando purga total de docTypes prohibidos (portfolio / certificate)...\n');
  const violations: string[] = [];

  for (const forbidden of FORBIDDEN_DOC_TYPES) {
    if (forbidden in DOCUMENT_TYPE_REGISTRY) {
      violations.push(`DOCUMENT_TYPE_REGISTRY todavía contiene el tipo prohibido '${forbidden}'.`);
    }
    if (forbidden in APP_SURFACE_MANIFEST) {
      violations.push(`APP_SURFACE_MANIFEST todavía contiene el tipo prohibido '${forbidden}'.`);
    }
  }

  const files = [...walkFiles(path.join(ROOT, 'src')), ...walkFiles(path.join(ROOT, 'api'))];
  for (const abs of files) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    const content = fs.readFileSync(abs, 'utf8');
    violations.push(...scanFileForForbiddenDocTypes(rel, content));
  }

  if (violations.length > 0) {
    console.error(`❌ Se encontraron ${violations.length} referencia(s) a tipos de documento prohibidos:`);
    for (const v of violations) console.error(`   - ${v}`);
    process.exit(1);
  }

  console.log(`✅ Purga verificada en ${files.length} archivos (0 referencias prohibidas a portfolio/certificate).\n`);
  process.exit(0);
}

main();
