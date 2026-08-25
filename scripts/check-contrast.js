import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ============================================================
// 1. FÓRMULAS DE CONTRASTE MATEMÁTICO (WCAG 2.1)
// ============================================================
function getRelativeLuminance(hex) {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    const f = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const f = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function getContrastRatio(hex1, hex2) {
  try {
    const l1 = getRelativeLuminance(hex1);
    const l2 = getRelativeLuminance(hex2);
    const brighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (brighter + 0.05) / (darker + 0.05);
  } catch (_err) {
    return 0;
  }
}

// ============================================================
// 2. MODO SELF-TEST
// ============================================================
async function runSelfTest() {
  console.log('🧪 Ejecutando Self-Test del auditor de contraste WCAG 2.1 AA...');
  const fixturePath = path.join(__dirname, '__fixtures__', 'contrast-test-cases.ts');
  const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');

  // Parse test cases from fixture content
  let passCount = 0;
  let failCount = 0;

  const testCaseMatches = [...fixtureContent.matchAll(/id:\s*'([^']+)'[\s\S]*?bgHex:\s*'([^']+)'[\s\S]*?textHex:\s*'([^']+)'[\s\S]*?expectedMinRatio:\s*([\d.]+)[\s\S]*?shouldPass:\s*(true|false)/g)];

  for (const match of testCaseMatches) {
    const [, id, bgHex, textHex, minRatioStr, shouldPassStr] = match;
    const minRatio = parseFloat(minRatioStr);
    const shouldPass = shouldPassStr === 'true';
    const ratio = getContrastRatio(bgHex, textHex);
    const passed = ratio >= minRatio;

    if (passed === shouldPass) {
      passCount++;
    } else {
      console.error(`❌ Self-Test Falló en caso [${id}]: bg=${bgHex}, text=${textHex}, ratio=${ratio.toFixed(2)}, esperadoRatio>=${minRatio} (${shouldPass})`);
      failCount++;
    }
  }

  if (failCount > 0) {
    console.error(`❌ Self-Test fallido con ${failCount} errores.`);
    process.exit(1);
  } else {
    console.log(`✅ Self-Test del auditor de contraste completado con éxito (${passCount} casos verificados).\n`);
    if (process.argv.includes('--selftest')) {
      process.exit(0);
    }
  }
}

// ============================================================
// 3. EXTRACCIÓN Y MAPEO DE TOKENS Y VARIABLES CSS
// ============================================================
function loadCssVariablesMap() {
  const indexCssPath = path.join(rootDir, 'src', 'index.css');
  const cssContent = fs.readFileSync(indexCssPath, 'utf-8');
  
  const varMap = new Map();
  const varMatches = [...cssContent.matchAll(/--([a-zA-Z0-9-]+):\s*(#[0-9a-fA-F]{3,6})/g)];
  for (const [, name, hex] of varMatches) {
    varMap.set(`--${name}`, hex.toUpperCase());
  }

  // Mapeos adicionales por defecto de UI y Tailwind
  varMap.set('white', '#FFFFFF');
  varMap.set('#fff', '#FFFFFF');
  varMap.set('#ffffff', '#FFFFFF');
  varMap.set('black', '#000000');
  varMap.set('#000', '#000000');
  varMap.set('#000000', '#000000');

  return varMap;
}

function resolveColorToHex(tokenStr, cssVarMap) {
  if (!tokenStr) return null;
  const clean = tokenStr.trim();

  if (clean.startsWith('#')) return clean.toUpperCase();
  if (clean.startsWith('var(')) {
    const varNameMatch = clean.match(/var\((--[a-zA-Z0-9-]+)\)/);
    if (varNameMatch && cssVarMap.has(varNameMatch[1])) {
      return cssVarMap.get(varNameMatch[1]);
    }
  }
  if (cssVarMap.has(clean)) return cssVarMap.get(clean);

  return null;
}

// ============================================================
// 4. ESCANEO ESTÁTICO DE JSX DE COMPONENTES
// ============================================================
function getAllTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        getAllTsxFiles(filePath, fileList);
      }
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      if (!filePath.includes('pdf-engine') && !filePath.includes('scripts')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

function auditCodebaseContrast() {
  console.log('🔍 Iniciando auditoría de contraste WCAG 2.1 AA en componentes UI...');
  const cssVarMap = loadCssVariablesMap();
  const tsxFiles = getAllTsxFiles(path.join(rootDir, 'src'));

  const violations = [];

  for (const filePath of tsxFiles) {
    const relPath = path.relative(rootDir, filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detección de combinaciones en un mismo elemento JSX
      // Ejemplo: bg-[var(--color-accent-purple-light)] ... text-[var(--color-accent-purple)]
      const bgMatch = line.match(/bg-\[(var\(--[a-zA-Z0-9-]+\)|#[0-9a-fA-F]{3,6})\]/);
      const textMatch = line.match(/text-\[(var\(--[a-zA-Z0-9-]+\)|#[0-9a-fA-F]{3,6})\]/);

      if (bgMatch && textMatch) {
        const bgToken = bgMatch[1];
        const textToken = textMatch[1];

        const bgHex = resolveColorToHex(bgToken, cssVarMap);
        const textHex = resolveColorToHex(textToken, cssVarMap);

        if (bgHex && textHex) {
          const ratio = getContrastRatio(bgHex, textHex);
          if (ratio < 4.5) {
            violations.push({
              file: relPath,
              line: i + 1,
              bgToken,
              textToken,
              bgHex,
              textHex,
              ratio: ratio.toFixed(2)
            });
          }
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error('\n🚨 VIOLACIONES DE CONTRASTE DETECTADAS (WCAG 2.1 AA - Mínimo 4.5:1):');
    for (const v of violations) {
      console.error(`  - ${v.file}:${v.line} → Fondo: ${v.bgToken} (${v.bgHex}), Texto: ${v.textToken} (${v.textHex}) | Ratio: ${v.ratio}:1 < 4.5:1`);
    }
    console.error(`\n❌ Se encontraron ${violations.length} violaciones de contraste WCAG 2.1 AA.`);
    process.exit(1);
  } else {
    console.log('✅ Auditoría de contraste WCAG 2.1 AA superada: 0 violaciones encontradas.\n');
  }
}

// ============================================================
// MAIN EXECUTION
// ============================================================
async function main() {
  await runSelfTest();
  if (!process.argv.includes('--selftest')) {
    auditCodebaseContrast();
  }
}

main();
