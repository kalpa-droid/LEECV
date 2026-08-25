import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { contrastTestCases, multiLineSnippetTestCases } from './__fixtures__/contrast-test-cases.ts';

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
// ============================================================
// 2. MODO SELF-TEST
// ============================================================
async function runSelfTest() {
  console.log('🧪 Ejecutando Self-Test del auditor de contraste WCAG 2.1 AA...');
  const cssVarMap = loadCssVariablesMap();

  let passCount = 0;
  let failCount = 0;

  // 2.1. Test Cases de Pares Individuales
  for (const tc of contrastTestCases) {
    const ratio = getContrastRatio(tc.bgHex, tc.textHex);
    const passed = ratio >= tc.expectedMinRatio;

    if (passed === tc.shouldPass) {
      passCount++;
    } else {
      console.error(`❌ Self-Test Falló en caso [${tc.id}]: bg=${tc.bgHex}, text=${tc.textHex}, ratio=${ratio.toFixed(2)}, esperadoRatio>=${tc.expectedMinRatio} (${tc.shouldPass})`);
      failCount++;
    }
  }

  // 2.2. Test Cases de Herencia Multilínea (Padre a Hijo en JSX)
  for (const snippetCase of multiLineSnippetTestCases) {
    const snippetLines = snippetCase.snippet.split('\n');
    const violations = auditLinesForContrast(snippetLines, cssVarMap);
    const failedAsExpected = snippetCase.shouldFail ? violations.length > 0 : violations.length === 0;

    if (failedAsExpected) {
      passCount++;
    } else {
      console.error(`❌ Self-Test Multilínea Falló en caso [${snippetCase.id}]: violaciones=${violations.length}, se esperaba fallo=${snippetCase.shouldFail}`);
      failCount++;
    }
  }

  if (failCount > 0) {
    console.error(`❌ Self-Test fallido con ${failCount} errores.`);
    process.exit(1);
  } else {
    console.log(`✅ Self-Test del auditor de contraste completado con éxito (${passCount} casos verificados: pares + herencia multilínea JSX).\n`);
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
  let clean = tokenStr.trim();

  // Remover prefijo hover: o focus: si existiera
  if (clean.includes(':')) {
    clean = clean.split(':').pop();
  }

  // Si tiene modificador de opacidad (ej. bg-white/10, bg-white/20, bg-black/40)
  if (clean.includes('/')) {
    const [base, opacity] = clean.split('/');
    const op = parseInt(opacity, 10);
    if ((base === 'bg-white' || base === 'white') && op <= 50) {
      return '#000000';
    }
    if (base === 'bg-black' || base === 'black') {
      return '#000000';
    }
    clean = base;
  }

  // Remover envoltorios bg-[...] o text-[...]
  const bracketMatch = clean.match(/(?:bg|text)-\[(.*)\]/);
  if (bracketMatch) {
    clean = bracketMatch[1];
  }

  if (clean === 'bg-black' || clean === 'black') return '#000000';
  if (clean === 'bg-white' || clean === 'white') return '#FFFFFF';

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
// 4. ESCANEO ESTÁTICO DE JSX CON HERENCIA DE CONTENEDOR PADRE
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

function auditLinesForContrast(lines, cssVarMap, maxWindow = 15) {
  const violations = [];
  const bgStack = []; // [{ bgToken, bgHex, lineNum, tagName }]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Descartar fondos que excedan la ventana de 15 líneas
    while (bgStack.length > 0 && lineNum - bgStack[bgStack.length - 1].lineNum > maxWindow) {
      bgStack.pop();
    }

    const bgMatch = line.match(/(?<!hover:|focus:)(bg-\[(?:var\(--[a-zA-Z0-9-]+\)|#[0-9a-fA-F]{3,6})\](?:|\/[\d]+)|bg-black(?:|\/[\d]+)|bg-white(?:|\/[\d]+))/);
    const textMatch = line.match(/(text-\[(?:var\(--[a-zA-Z0-9-]+\)|#[0-9a-fA-F]{3,6})\](?:|\/[\d]+)|text-white(?:|\/[\d]+)|text-black(?:|\/[\d]+))/);

    // 1. Evaluar contraste de texto en la línea actual usando bg heredado activo o bg de la misma línea
    if (textMatch) {
      const textToken = textMatch[0];
      const textHex = resolveColorToHex(textToken, cssVarMap);

      if (textHex) {
        let activeBgToken = null;
        let activeBgHex = null;

        // Si la misma línea especifica su propio fondo, ese toma precedencia directa
        if (bgMatch) {
          activeBgToken = bgMatch[0];
          activeBgHex = resolveColorToHex(activeBgToken, cssVarMap);
        } else if (bgStack.length > 0) {
          // De lo contrario, usar el fondo activo del contenedor padre heredado
          const parentBg = bgStack[bgStack.length - 1];
          activeBgToken = parentBg.bgToken;
          activeBgHex = parentBg.bgHex;
        }

        if (activeBgHex && textHex) {
          const ratio = getContrastRatio(activeBgHex, textHex);
          if (ratio < 4.5) {
            violations.push({
              line: lineNum,
              bgToken: activeBgToken,
              textToken,
              bgHex: activeBgHex,
              textHex,
              ratio: ratio.toFixed(2)
            });
          }
        }
      }
    }

    // 2. Apilar fondo si es un contenedor nuevo que no se cierra en la misma línea
    const isSelfClosingOrSameLineClosed = bgMatch && (
      line.includes('/>') || 
      line.includes('</div>') || 
      line.includes('</span>') || 
      line.includes('</button>') || 
      line.includes('</label>')
    );

    if (bgMatch && !isSelfClosingOrSameLineClosed) {
      const bgToken = bgMatch[0];
      const bgHex = resolveColorToHex(bgToken, cssVarMap);
      if (bgHex) {
        bgStack.push({ bgToken, bgHex, lineNum });
      }
    }

    // 3. Desapilar al final de la línea si contiene tags de cierre de contenedor
    const closeTags = (line.match(/<\/(?:div|section|aside|nav|header|footer|button|label|td|th|li|article|select|textarea)>/g) || []).length;
    for (let c = 0; c < closeTags; c++) {
      if (bgStack.length > 0) {
        bgStack.pop();
      }
    }
  }

  return violations;
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

    const fileViolations = auditLinesForContrast(lines, cssVarMap);
    for (const v of fileViolations) {
      violations.push({
        file: relPath,
        line: v.line,
        bgToken: v.bgToken,
        textToken: v.textToken,
        bgHex: v.bgHex,
        textHex: v.textHex,
        ratio: v.ratio
      });
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
