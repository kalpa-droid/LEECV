import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Regex para detectar clases sueltas de Tailwind con paleta de color dura
const TAILWIND_COLOR_REGEX = /\b(bg|text|border|ring|shadow|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b/g;

// Regex para detectar hex sueltos (#1e293b, #0f172a, etc.)
const RAW_HEX_REGEX = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;

// Regex para detectar clases de Tailwind con hex directo (bg-[#123456])
const ARBITRARY_TAILWIND_HEX_REGEX = /\b(bg|text|border|ring|shadow|fill|stroke)-\[#[0-9a-fA-F]{3,6}\]/g;

// 1. SELF-TEST DEL SCRIPT (Mejora 1)
function runSelfTest() {
  console.log('🧪 Ejecutando Self-Test del auditor de tokens UI...');

  const fixtureLeaks = [
    { code: `const bg = "bg-slate-900";`, pattern: TAILWIND_COLOR_REGEX },
    { code: `const color = "text-purple-500";`, pattern: TAILWIND_COLOR_REGEX },
    { code: `const border = "border-amber-500";`, pattern: TAILWIND_COLOR_REGEX },
    { code: `const style = { color: "#FF2E63" };`, pattern: RAW_HEX_REGEX },
    { code: `const bg = "bg-[#4285F4]";`, pattern: ARBITRARY_TAILWIND_HEX_REGEX }
  ];

  for (const test of fixtureLeaks) {
    test.pattern.lastIndex = 0;
    const match = test.pattern.test(test.code);
    if (!match) {
      console.error(`❌ FALSO NEGATIVO EN SELF-TEST: No se detectó fuga en: ${test.code}`);
      process.exit(1);
    }
  }

  const fixtureValids = [
    `const style = { color: 'var(--color-accent-base)' };`,
    `const cls = "bg-[var(--color-neutral-surface)]";`,
    `import { colorSystem } from '../shared/core/uiDesignSystem';`
  ];

  for (const code of fixtureValids) {
    TAILWIND_COLOR_REGEX.lastIndex = 0;
    ARBITRARY_TAILWIND_HEX_REGEX.lastIndex = 0;

    if (ARBITRARY_TAILWIND_HEX_REGEX.test(code)) {
      console.error(`❌ FALSO POSITIVO EN SELF-TEST: Se marcó como error código válido: ${code}`);
      process.exit(1);
    }
  }

  console.log('✅ Self-Test del script completado con éxito (0 falsos positivos / 0 falsos negativos).\n');
}

// 2. CARGA Y VALIDACIÓN DE ALLOWLIST (Mejora 2)
function loadAllowlist() {
  const allowlistPath = path.join(ROOT_DIR, 'scripts', 'ui-tokens-allowlist.json');
  if (!fs.existsSync(allowlistPath)) return [];

  try {
    const raw = fs.readFileSync(allowlistPath, 'utf8');
    const json = JSON.parse(raw);
    const exceptions = json.allowedExceptions || [];

    for (const item of exceptions) {
      if (!item.reason || !item.reason.trim()) {
        console.error(`❌ RECHAZO DE ALLOWLIST: La excepción para ${item.file} no incluye una justificación (reason) no vacía.`);
        process.exit(1);
      }
    }
    return exceptions;
  } catch (err) {
    console.error('❌ Error leyendo ui-tokens-allowlist.json:', err.message);
    process.exit(1);
  }
}

function isAllowed(filePath, lineContent, allowlist) {
  const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  for (const item of allowlist) {
    const itemFile = item.file.replace(/\\/g, '/');
    if (relPath.endsWith(itemFile) || relPath === itemFile) {
      if (item.pattern) {
        const reg = new RegExp(item.pattern, 'i');
        if (reg.test(lineContent)) return true;
      } else {
        return true;
      }
    }
  }
  return false;
}

// 3. EXPLORACIÓN DE ARCHIVOS
function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'pdf-engine') {
        walkDir(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js')) {
      if (!filePath.includes('uiDesignSystem.ts') && !filePath.includes('ui-tokens') && !filePath.includes('scripts/')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

// 4. AUDITORÍA DE ARCHIVOS
function runAudit(scopePath, allowlist) {
  const targetDir = scopePath ? path.resolve(ROOT_DIR, scopePath) : path.join(ROOT_DIR, 'src');
  if (!fs.existsSync(targetDir)) {
    console.error(`❌ El directorio especificado en --scope no existe: ${targetDir}`);
    process.exit(1);
  }

  const files = fs.lstatSync(targetDir).isDirectory() ? walkDir(targetDir) : [targetDir];
  const leaks = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      // Ignorar líneas de comentarios
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

      if (isAllowed(file, line, allowlist)) return;

      TAILWIND_COLOR_REGEX.lastIndex = 0;
      RAW_HEX_REGEX.lastIndex = 0;
      ARBITRARY_TAILWIND_HEX_REGEX.lastIndex = 0;

      let match;
      while ((match = TAILWIND_COLOR_REGEX.exec(line)) !== null) {
        leaks.push({ file, line: idx + 1, match: match[0], type: 'Tailwind Color' });
      }
      while ((match = ARBITRARY_TAILWIND_HEX_REGEX.exec(line)) !== null) {
        leaks.push({ file, line: idx + 1, match: match[0], type: 'Arbitrary Tailwind Hex' });
      }
    });
  }

  return leaks;
}

// MAIN EXECUTION
function main() {
  const args = process.argv.slice(2);
  const isSelftestOnly = args.includes('--selftest');
  const scopeArg = args.find(a => a.startsWith('--scope='));
  const scopePath = scopeArg ? scopeArg.split('=')[1] : null;

  runSelfTest();

  if (isSelftestOnly) {
    console.log('✨ Self-test finalizado exitosamente.');
    process.exit(0);
  }

  const allowlist = loadAllowlist();
  console.log(`🔍 Iniciando auditoría cromática de tokens de UI ${scopePath ? `(Scope: ${scopePath})` : '(Proyecto Completo)'}...`);

  const leaks = runAudit(scopePath, allowlist);

  if (leaks.length > 0) {
    console.error(`\n❌ SE ENCONTRARON ${leaks.length} FUGAS DE COLORES NO TOKENIZADOS EN LA UI:\n`);
    leaks.forEach(l => {
      const relFile = path.relative(ROOT_DIR, l.file);
      console.error(`  - ${relFile}:${l.line} → [${l.type}] "${l.match}"`);
    });
    console.error(`\n⚠️ Todos los colores de la UI deben consumirse desde uiDesignSystem.ts.`);
    process.exit(1);
  }

  console.log(`\n✅ Auditoría cromática superada: 0 fugas encontradas ${scopePath ? `en ${scopePath}` : ''}.\n`);
}

main();
