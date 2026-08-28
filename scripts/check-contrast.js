import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { contrastTestCases, multiLineSnippetTestCases, multiThemeSnippetTestCases } from './__fixtures__/contrast-test-cases.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ============================================================
// 0. PALETA NOMINADA DE TAILWIND (valores por defecto del framework)
// ============================================================
const TAILWIND_COLOR_PALETTE = {
  slate:   { 50:'#F8FAFC',100:'#F1F5F9',200:'#E2E8F0',300:'#CBD5E1',400:'#94A3B8',500:'#64748B',600:'#475569',700:'#334155',800:'#1E293B',900:'#0F172A',950:'#020617' },
  gray:    { 50:'#F9FAFB',100:'#F3F4F6',200:'#E5E7EB',300:'#D1D5DB',400:'#9CA3AF',500:'#6B7280',600:'#4B5563',700:'#374151',800:'#1F2937',900:'#111827',950:'#030712' },
  zinc:    { 50:'#FAFAFA',100:'#F4F4F5',200:'#E4E4E7',300:'#D4D4D8',400:'#A1A1AA',500:'#71717A',600:'#52525B',700:'#3F3F46',800:'#27272A',900:'#18181B',950:'#09090B' },
  neutral: { 50:'#FAFAFA',100:'#F5F5F5',200:'#E5E5E5',300:'#D4D4D4',400:'#A3A3A3',500:'#737373',600:'#525252',700:'#404040',800:'#262626',900:'#171717',950:'#0A0A0A' },
  stone:   { 50:'#FAFAF9',100:'#F5F5F4',200:'#E7E5E4',300:'#D6D3D1',400:'#A8A29E',500:'#78716C',600:'#57534E',700:'#44403C',800:'#292524',900:'#1C1917',950:'#0C0A09' },
  red:     { 50:'#FEF2F2',100:'#FEE2E2',200:'#FECACA',300:'#FCA5A5',400:'#F87171',500:'#EF4444',600:'#DC2626',700:'#B91C1C',800:'#991B1B',900:'#7F1D1D',950:'#450A0A' },
  orange:  { 50:'#FFF7ED',100:'#FFEDD5',200:'#FED7AA',300:'#FDBA74',400:'#FB923C',500:'#F97316',600:'#EA580C',700:'#C2410C',800:'#9A3412',900:'#7C2D12',950:'#431407' },
  amber:   { 50:'#FFFBEB',100:'#FEF3C7',200:'#FDE68A',300:'#FCD34D',400:'#FBBF24',500:'#F59E0B',600:'#D97706',700:'#B45309',800:'#92400E',900:'#78350F',950:'#451A03' },
  yellow:  { 50:'#FEFCE8',100:'#FEF9C3',200:'#FEF08A',300:'#FDE047',400:'#FACC15',500:'#EAB308',600:'#CA8A04',700:'#A16207',800:'#854D0E',900:'#713F12',950:'#422006' },
  lime:    { 50:'#F7FEE7',100:'#ECFCCB',200:'#D9F99D',300:'#BEF264',400:'#A3E635',500:'#84CC16',600:'#65A30D',700:'#4D7C0F',800:'#3F6212',900:'#365314',950:'#1A2E05' },
  green:   { 50:'#F0FDF4',100:'#DCFCE7',200:'#BBF7D0',300:'#86EFAC',400:'#4ADE80',500:'#22C55E',600:'#16A34A',700:'#15803D',800:'#166534',900:'#14532D',950:'#052E16' },
  emerald: { 50:'#ECFDF5',100:'#D1FAE5',200:'#A7F3D0',300:'#6EE7B7',400:'#34D399',500:'#10B981',600:'#059669',700:'#047857',800:'#065F46',900:'#064E3B',950:'#022C22' },
  teal:    { 50:'#F0FDFA',100:'#CCFBF1',200:'#99F6E4',300:'#5EEAD4',400:'#2DD4BF',500:'#14B8A6',600:'#0D9488',700:'#0F766E',800:'#115E59',900:'#134E4A',950:'#042F2E' },
  cyan:    { 50:'#ECFEFF',100:'#CFFAFE',200:'#A5F3FC',300:'#67E8F9',400:'#22D3EE',500:'#06B6D4',600:'#0891B2',700:'#0E7490',800:'#155E75',900:'#164E63',950:'#083344' },
  sky:     { 50:'#F0F9FF',100:'#E0F2FE',200:'#BAE6FD',300:'#7DD3FC',400:'#38BDF8',500:'#0EA5E9',600:'#0284C7',700:'#0369A1',800:'#075985',900:'#0C4A6E',950:'#082F49' },
  blue:    { 50:'#EFF6FF',100:'#DBEAFE',200:'#BFDBFE',300:'#93C5FD',400:'#60A5FA',500:'#3B82F6',600:'#2563EB',700:'#1D4ED8',800:'#1E40AF',900:'#1E3A8A',950:'#172554' },
  indigo:  { 50:'#EEF2FF',100:'#E0E7FF',200:'#C7D2FE',300:'#A5B4FC',400:'#818CF8',500:'#6366F1',600:'#4F46E5',700:'#4338CA',800:'#3730A3',900:'#312E81',950:'#1E1B4B' },
  violet:  { 50:'#F5F3FF',100:'#EDE9FE',200:'#DDD6FE',300:'#C4B5FD',400:'#A78BFA',500:'#8B5CF6',600:'#7C3AED',700:'#6D28D9',800:'#5B21B6',900:'#4C1D95',950:'#2E1065' },
  purple:  { 50:'#FAF5FF',100:'#F3E8FF',200:'#E9D5FF',300:'#D8B4FE',400:'#C084FC',500:'#A855F7',600:'#9333EA',700:'#7E22CE',800:'#6B21A8',900:'#581C87',950:'#3B0764' },
  fuchsia: { 50:'#FDF4FF',100:'#FAE8FF',200:'#F5D0FE',300:'#F0ABFC',400:'#E879F9',500:'#D946EF',600:'#C026D3',700:'#A21CAF',800:'#86198F',900:'#701A75',950:'#4A044E' },
  pink:    { 50:'#FDF2F8',100:'#FCE7F3',200:'#FBCFE8',300:'#F9A8D4',400:'#F472B6',500:'#EC4899',600:'#DB2777',700:'#BE185D',800:'#9D174D',900:'#831843',950:'#500724' },
  rose:    { 50:'#FFF1F2',100:'#FFE4E6',200:'#FECDD3',300:'#FDA4AF',400:'#FB7185',500:'#F43F5E',600:'#E11D48',700:'#BE185D',800:'#9F1239',900:'#881337',950:'#4C0519' },
};

const TAILWIND_COLOR_NAMES = Object.keys(TAILWIND_COLOR_PALETTE).join('|');
const TAILWIND_NAMED_RE = new RegExp(`^(?:bg|text)-(${TAILWIND_COLOR_NAMES})-([0-9]{2,3})$`);

function resolveTailwindNamedColor(base) {
  const m = base.match(TAILWIND_NAMED_RE);
  if (!m) return null;
  const [, colorName, shade] = m;
  const shadeMap = TAILWIND_COLOR_PALETTE[colorName];
  const hex = shadeMap && shadeMap[Number(shade)];
  return hex || null;
}

// ============================================================
// 1. FÓRMULAS DE CONTRASTE MATEMÁTICO (WCAG 2.1)
// ============================================================
function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const c = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

function getRelativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c8) => {
    const c = c8 / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
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
// 1b. MEZCLA ALFA MATEMÁTICA (blendColors)
// ============================================================
export function blendColors(fgHex, bgHex, alpha) {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  const a = Math.max(0, Math.min(1, alpha));
  return rgbToHex({
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
  });
}

// ============================================================
// 2. MODO SELF-TEST
// ============================================================
async function runSelfTest() {
  console.log('🧪 Ejecutando Self-Test del auditor de contraste WCAG 2.1 AA...');
  const themeMaps = loadAllThemeCssVariables();
  const dayMap = themeMaps.day;

  let passCount = 0;
  let failCount = 0;

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

  for (const snippetCase of multiLineSnippetTestCases) {
    const snippetLines = snippetCase.snippet.split('\n');
    const violations = auditLinesForContrast(snippetLines, dayMap);
    const failedAsExpected = snippetCase.shouldFail ? violations.length > 0 : violations.length === 0;
    if (failedAsExpected) {
      passCount++;
    } else {
      console.error(`❌ Self-Test Multilínea Falló en caso [${snippetCase.id}]: violaciones=${violations.length}, se esperaba fallo=${snippetCase.shouldFail}`);
      failCount++;
    }
  }

  for (const mtCase of multiThemeSnippetTestCases) {
    const snippetLines = mtCase.snippet.split('\n');
    let mtPassed = true;
    const detail = [];
    for (const themeId of Object.keys(themeMaps)) {
      const violations = auditLinesForContrast(snippetLines, themeMaps[themeId]);
      const shouldFailThisTheme = mtCase.expectedFailingThemes.includes(themeId);
      const didFail = violations.length > 0;
      detail.push(`${themeId}:${didFail ? 'FALLA' : 'OK'}(esperado:${shouldFailThisTheme ? 'FALLA' : 'OK'})`);
      if (didFail !== shouldFailThisTheme) mtPassed = false;
    }
    if (mtPassed) {
      passCount++;
    } else {
      console.error(`❌ Self-Test Multi-Tema Falló en caso [${mtCase.id}]: ${detail.join(', ')}`);
      failCount++;
    }
  }

  const rawResolutionCases = [
    { token: 'text-slate-400', expectedHex: '#94A3B8' },
    { token: 'bg-purple-600', expectedHex: '#9333EA' },
    { token: 'text-amber-500', expectedHex: '#F59E0B' },
  ];
  for (const rc of rawResolutionCases) {
    const resolved = resolveColorToHex(rc.token, dayMap, null);
    if (resolved === rc.expectedHex) {
      passCount++;
    } else {
      console.error(`❌ Self-Test Paleta Nominada Falló en [${rc.token}]: resolvió ${resolved}, esperado ${rc.expectedHex}`);
      failCount++;
    }
  }

  const blendResult = blendColors('#000000', '#FFFFFF', 0.4);
  if (blendResult === '#999999') {
    passCount++;
  } else {
    console.error(`❌ Self-Test blendColors Falló: bg-black/40 sobre #FFFFFF dio ${blendResult}, esperado #999999`);
    failCount++;
  }
  const blendResult2 = blendColors('#FFFFFF', '#999999', 0.6);
  if (blendResult2 === '#D6D6D6') {
    passCount++;
  } else {
    console.error(`❌ Self-Test blendColors Falló: text-white/60 sobre #999999 dio ${blendResult2}, esperado #D6D6D6`);
    failCount++;
  }

  const ternarySnippet = `
      <button className={isActive ? 'bg-purple-600 text-white px-4' : 'text-slate-400 px-4'}>
        Pestaña
      </button>
  `.split('\n');
  const ternaryViolations = auditLinesForContrast(ternarySnippet, dayMap);
  const leakedIntoInactiveBranch = ternaryViolations.some((v) => v.textToken === 'text-slate-400' && v.bgToken === 'bg-purple-600');
  if (!leakedIntoInactiveBranch) {
    passCount++;
  } else {
    console.error(`❌ Self-Test Ternarios Falló: el fondo de la rama activa (bg-purple-600) se filtró a la rama inactiva (text-slate-400).`);
    failCount++;
  }

  if (failCount > 0) {
    console.error(`❌ Self-Test fallido con ${failCount} errores.`);
    process.exit(1);
  } else {
    console.log(`✅ Self-Test del auditor de contraste completado con éxito (${passCount} casos verificados: pares + herencia multilínea + multi-tema + paleta nominada + blend + ternarios).\n`);
    if (process.argv.includes('--selftest')) {
      process.exit(0);
    }
  }
}

// ============================================================
// 3. EXTRACCIÓN Y MAPEO DE VARIABLES CSS — MULTI-TEMA REAL
// ============================================================
function parseCssBlocks(cssContent) {
  const blocks = [];
  let i = 0;
  // Remover comentarios de CSS primero
  const cleanCss = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');
  while (i < cleanCss.length) {
    const openBrace = cleanCss.indexOf('{', i);
    if (openBrace === -1) break;
    const selector = cleanCss.slice(i, openBrace).trim();

    let depth = 1;
    let j = openBrace + 1;
    while (j < cleanCss.length && depth > 0) {
      if (cleanCss[j] === '{') depth++;
      else if (cleanCss[j] === '}') depth--;
      j++;
    }
    const body = cleanCss.slice(openBrace + 1, j - 1);
    blocks.push({ selector, body });

    // Si el bloque tenia anidamiento (ej. @layer), tambien extraemos bloques internos
    if (body.includes('{')) {
      const subBlocks = parseCssBlocks(body);
      for (const sb of subBlocks) blocks.push(sb);
    }

    i = j;
  }
  return blocks;
}

function extractVarsFromBody(body) {
  const vars = new Map();
  const varMatches = [...body.matchAll(/--([a-zA-Z0-9-]+):\s*(#[0-9a-fA-F]{3,6})/g)];
  for (const [, name, hex] of varMatches) {
    vars.set(`--${name}`, hex.toUpperCase());
  }
  return vars;
}

export function loadAllThemeCssVariables() {
  const indexCssPath = path.join(rootDir, 'src', 'index.css');
  const cssContent = fs.readFileSync(indexCssPath, 'utf-8');
  const blocks = parseCssBlocks(cssContent);

  const base = new Map();
  const dayOnly = new Map();
  const nightOverrides = new Map();
  const tealOverrides = new Map();
  const inkOverrides = new Map();

  for (const block of blocks) {
    const sel = block.selector;
    const vars = extractVarsFromBody(block.body);
    if (vars.size === 0) continue;

    const isBaseRoot = sel.includes(':root');
    const isDefaultThemeRoot = sel.includes('[data-ui-theme="default"]');
    const isDark = sel.includes('[data-ui-theme="dark"]');
    const isTeal = sel.includes('[data-ui-theme="teal_ocean"]');
    const isInk = sel.includes('[data-ui-theme="ink"]');

    if (isBaseRoot) {
      for (const [k, v] of vars) base.set(k, v);
    }
    if (isDefaultThemeRoot) {
      for (const [k, v] of vars) dayOnly.set(k, v);
    }
    if (isDark) {
      for (const [k, v] of vars) nightOverrides.set(k, v);
    }
    if (isTeal) {
      for (const [k, v] of vars) tealOverrides.set(k, v);
    }
    if (isInk) {
      for (const [k, v] of vars) inkOverrides.set(k, v);
    }
  }

  const mergeInto = (target, ...sources) => {
    const merged = new Map(target);
    for (const src of sources) for (const [k, v] of src) merged.set(k, v);
    return merged;
  };

  const utilityDefaults = (map) => {
    map.set('white', '#FFFFFF');
    map.set('#fff', '#FFFFFF');
    map.set('#ffffff', '#FFFFFF');
    map.set('black', '#000000');
    map.set('#000', '#000000');
    map.set('#000000', '#000000');
    return map;
  };

  const day = utilityDefaults(mergeInto(base, dayOnly));
  const night = utilityDefaults(mergeInto(base, nightOverrides));
  const teal_ocean = utilityDefaults(mergeInto(base, tealOverrides));
  const ink = utilityDefaults(mergeInto(base, inkOverrides));

  return { day, night, teal_ocean, ink };
}

function resolveColorToHex(tokenStr, cssVarMap, activeBgHexForBlend) {
  if (!tokenStr) return null;
  let clean = tokenStr.trim();

  if (clean.includes(':') && !clean.startsWith('var(')) {
    clean = clean.split(':').pop();
  }

  let opacity = null;
  if (clean.includes('/')) {
    const lastSlash = clean.lastIndexOf('/');
    const maybeOp = clean.slice(lastSlash + 1);
    if (/^[0-9]{1,3}$/.test(maybeOp)) {
      opacity = parseInt(maybeOp, 10);
      clean = clean.slice(0, lastSlash);
    }
  }

  const namedHex = resolveTailwindNamedColor(clean);
  if (namedHex) {
    if (opacity !== null && activeBgHexForBlend) {
      return blendColors(namedHex, activeBgHexForBlend, opacity / 100);
    }
    return namedHex;
  }

  const bracketMatch = clean.match(/(?:bg|text)-\[(.*)\]/);
  if (bracketMatch) {
    clean = bracketMatch[1];
  }

  let resolvedHex = null;
  if (clean === 'bg-black' || clean === 'black') resolvedHex = '#000000';
  else if (clean === 'bg-white' || clean === 'white') resolvedHex = '#FFFFFF';
  else if (clean.startsWith('#')) resolvedHex = clean.toUpperCase();
  else if (clean.startsWith('var(')) {
    const varNameMatch = clean.match(/var\((--[a-zA-Z0-9-]+)\)/);
    if (varNameMatch && cssVarMap.has(varNameMatch[1])) {
      resolvedHex = cssVarMap.get(varNameMatch[1]);
    }
  } else if (cssVarMap.has(clean)) {
    resolvedHex = cssVarMap.get(clean);
  }

  if (!resolvedHex) return null;

  if (opacity !== null) {
    const bgForBlend = activeBgHexForBlend || '#FFFFFF';
    return blendColors(resolvedHex, bgForBlend, opacity / 100);
  }

  return resolvedHex;
}

// ============================================================
// 4. ESCANEO ESTÁTICO DE JSX + AISLAMIENTO DE RAMAS TERNARIAS (? :)
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

const BG_TOKEN_RE = /(bg-\[(?:var\(--[a-zA-Z0-9-]+\)|#[0-9a-fA-F]{3,6})\](?:\/[\d]+)?|bg-black(?:\/[\d]+)?|bg-white(?:\/[\d]+)?|bg-(?:[a-z]+)-[0-9]{2,3}(?:\/[\d]+)?)/;
const TEXT_TOKEN_RE = /(text-\[(?:var\(--[a-zA-Z0-9-]+\)|#[0-9a-fA-F]{3,6})\](?:\/[\d]+)?|text-white(?:\/[\d]+)?|text-black(?:\/[\d]+)?|text-(?:[a-z]+)-[0-9]{2,3}(?:\/[\d]+)?)/;

const TERNARY_RE = /\?\s*['"`]([^'"`]*)['"`]\s*:\s*['"`]([^'"`]*)['"`]/;

function evaluateBranchTokens(branchText, cssVarMap, inheritedBgHex) {
  const violations = [];
  const bgMatch = branchText.match(BG_TOKEN_RE);
  const textMatch = branchText.match(TEXT_TOKEN_RE);

  let activeBgHex = inheritedBgHex;
  let activeBgToken = null;
  if (bgMatch) {
    activeBgToken = bgMatch[0];
    activeBgHex = resolveColorToHex(activeBgToken, cssVarMap, inheritedBgHex) || inheritedBgHex;
  }

  if (textMatch) {
    const textToken = textMatch[0];
    const textHex = resolveColorToHex(textToken, cssVarMap, activeBgHex);
    if (textHex && activeBgHex) {
      const ratio = getContrastRatio(activeBgHex, textHex);
      if (ratio < 4.5) {
        violations.push({ bgToken: activeBgToken, textToken, bgHex: activeBgHex, textHex, ratio: ratio.toFixed(2) });
      }
    }
  }
  return violations;
}

function auditLinesForContrast(lines, cssVarMap) {
  const violations = [];
  const bgStack = [];
  // Pila SEPARADA para fondos condicionales de ternarios partidos en 3
  // líneas (condición / `? '...'` / `: '...'`). Guarda el PAR
  // {trueBgHex, falseBgHex}: así, un ternario de texto puro que sigue unas
  // líneas más abajo (mismo elemento, misma condición — ícono/label de un
  // botón activo/inactivo) alinea su propia rama verdadera contra
  // `trueBgHex` y su rama falsa contra `falseBgHex`, sin que ninguna rama
  // termine evaluada contra el fondo de la OTRA rama. Nunca se mezcla con
  // `bgStack` (fondos incondicionales) — evita la fuga entre ramas que
  // motivó originalmente excluir estas líneas de `bgStack`.
  const conditionalBgStack = [];
  let domDepth = 0;
  const rootCardBg = cssVarMap.get('--ui-bg-card') || cssVarMap.get('--ui-bg-root') || '#FFFFFF';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Directiva explícita de supresión, tipo eslint-disable-next-line —
    // sólo para casos verificados a mano con matemática real. Hoy existe
    // un único caso: ternarios anidados de 3 ramas en una línea, que este
    // auditor line-based no resuelve todavía (sólo separa 2 ramas).
    const prevLine = i > 0 ? lines[i - 1] : '';
    if (prevLine.includes('check-contrast-ignore-next-line')) {
      continue;
    }

    const openContainerTags = (line.match(/<(?:div|section|aside|nav|header|footer|button|label|td|th|li|article|select|textarea)(?:[\s>]|$)/g) || []).length;
    const selfClosingContainerTags = (line.match(/<(?:div|section|aside|nav|header|footer|button|label|td|th|li|article|select|textarea)[^>]*\/>/g) || []).length;
    const closeContainerTags = (line.match(/<\/(?:div|section|aside|nav|header|footer|button|label|td|th|li|article|select|textarea)>/g) || []).length;

    const netOpenTags = Math.max(0, openContainerTags - selfClosingContainerTags);
    const netCloseTags = closeContainerTags;

    const condTop = conditionalBgStack.length > 0 ? conditionalBgStack[conditionalBgStack.length - 1] : null;
    const inheritedBgFallback = bgStack.length > 0 ? bgStack[bgStack.length - 1].bgHex : rootCardBg;

    const ternaryMatch = line.match(TERNARY_RE);
    if (ternaryMatch) {
      const [, trueBranch, falseBranch] = ternaryMatch;
      // Alinear rama-verdadera contra fondo-si-activo, rama-falsa contra
      // fondo-si-inactivo, cuando hay un ternario de fondo abierto más
      // arriba en este mismo elemento; si no hay ninguno, ambas ramas usan
      // el mismo fondo heredado incondicional (comportamiento previo).
      const trueBg = condTop ? condTop.trueBgHex : inheritedBgFallback;
      const falseBg = condTop ? condTop.falseBgHex : inheritedBgFallback;
      const trueViolations = evaluateBranchTokens(trueBranch, cssVarMap, trueBg);
      const falseViolations = evaluateBranchTokens(falseBranch, cssVarMap, falseBg);
      for (const v of [...trueViolations, ...falseViolations]) violations.push({ line: lineNum, ...v });

      domDepth += netOpenTags;
      domDepth = Math.max(0, domDepth - netCloseTags);
      while (bgStack.length > 0 && bgStack[bgStack.length - 1].depth > domDepth) {
        bgStack.pop();
      }
      while (conditionalBgStack.length > 0 && conditionalBgStack[conditionalBgStack.length - 1].depth > domDepth) {
        conditionalBgStack.pop();
      }
      continue;
    }

    const bgMatchRaw = line.match(/(?:(?:hover|focus|active|disabled):)?(bg-\[(?:var\(--[a-zA-Z0-9-]+\)|#[0-9a-fA-F]{3,6})\](?:\/[\d]+)?|bg-black(?:\/[\d]+)?|bg-white(?:\/[\d]+)?|bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}(?:\/[\d]+)?)/);
    const isHoverOrFocusBg = bgMatchRaw && (bgMatchRaw[0].startsWith('hover:') || bgMatchRaw[0].startsWith('focus:') || bgMatchRaw[0].startsWith('active:'));
    const bgMatch = isHoverOrFocusBg ? null : (bgMatchRaw ? [bgMatchRaw[1]] : null);
    const textMatchRaw = line.match(/(?:(?:placeholder|hover|focus|active|disabled):)?(text-\[(?:var\(--[a-zA-Z0-9-]+\)|#[0-9a-fA-F]{3,6})\](?:\/[\d]+)?|text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}(?:\/[\d]+)?|text-white(?:\/[\d]+)?|text-black(?:\/[\d]+)?)/);
    const isPseudoText = textMatchRaw && (textMatchRaw[0].startsWith('placeholder:') || textMatchRaw[0].startsWith('hover:') || textMatchRaw[0].startsWith('focus:'));
    const textMatch = isPseudoText ? null : (textMatchRaw ? [textMatchRaw[1]] : null);

    const isSelfClosing = line.includes('/>');
    const trimmedLine = line.trim();
    const isBareQuestionBranch = trimmedLine.startsWith('?') && !ternaryMatch;
    const isBareColonBranch = trimmedLine.startsWith(':') && !ternaryMatch;
    // Estas dos líneas nunca alimentan `bgStack` (el incondicional): su bg,
    // si tiene, sólo es real bajo una condición — de eso se ocupa
    // `conditionalBgStack`, con las dos ramas separadas.
    const isTernaryLine = isBareQuestionBranch || isBareColonBranch || line.includes('?');

    // Incrementar profundidad para etiquetas abiertas en esta linea antes de apilar
    domDepth += netOpenTags;

    if (bgMatch && !isSelfClosing && !isTernaryLine) {
      const inheritedBgForBlend = bgStack.length > 0 ? bgStack[bgStack.length - 1].bgHex : rootCardBg;
      const bgToken = bgMatch[0];
      const bgHex = resolveColorToHex(bgToken, cssVarMap, inheritedBgForBlend);
      if (bgHex) {
        while (bgStack.length > 0 && bgStack[bgStack.length - 1].depth >= domDepth) {
          bgStack.pop();
        }
        bgStack.push({ bgToken, bgHex, depth: domDepth, lineNum });
      }
    }

    // Detectar el par condicional: línea `? '...'` sola con su propio bg,
    // seguida por una línea `: '...'` sola — su bg propio (si tiene, sin
    // contar pseudo-clases hover/focus) es el fondo real de la rama
    // inactiva; si no tiene, la rama inactiva hereda el fondo incondicional
    // externo.
    if (isBareQuestionBranch && bgMatch) {
      const inheritedBgForBlend = bgStack.length > 0 ? bgStack[bgStack.length - 1].bgHex : rootCardBg;
      const trueBgHex = resolveColorToHex(bgMatch[0], cssVarMap, inheritedBgForBlend);
      if (trueBgHex) {
        const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
        const nextBgMatchRaw = nextLine.match(/(?:(?:hover|focus|active|disabled):)?(bg-\[(?:var\(--[a-zA-Z0-9-]+\)|#[0-9a-fA-F]{3,6})\](?:\/[\d]+)?|bg-black(?:\/[\d]+)?|bg-white(?:\/[\d]+)?|bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}(?:\/[\d]+)?)/);
        const nextIsHoverBg = nextBgMatchRaw && (nextBgMatchRaw[0].startsWith('hover:') || nextBgMatchRaw[0].startsWith('focus:') || nextBgMatchRaw[0].startsWith('active:'));
        const falseBgHex = (nextBgMatchRaw && !nextIsHoverBg)
          ? (resolveColorToHex(nextBgMatchRaw[1], cssVarMap, inheritedBgForBlend) || inheritedBgForBlend)
          : inheritedBgForBlend;

        while (conditionalBgStack.length > 0 && conditionalBgStack[conditionalBgStack.length - 1].depth >= domDepth) {
          conditionalBgStack.pop();
        }
        conditionalBgStack.push({ trueBgHex, falseBgHex, depth: domDepth, lineNum });
      }
    }

    const currentActiveBg = bgStack.length > 0 ? bgStack[bgStack.length - 1].bgHex : rootCardBg;
    const condTopForText = conditionalBgStack.length > 0 ? conditionalBgStack[conditionalBgStack.length - 1] : null;

    if (textMatch) {
      const textToken = textMatch[0];
      let activeBgToken = null;
      let activeBgHex = null;

      if (bgMatch) {
        activeBgToken = bgMatch[0];
        activeBgHex = resolveColorToHex(activeBgToken, cssVarMap, currentActiveBg);
      } else if (isBareColonBranch && condTopForText) {
        // Este texto ES la rama falsa de un ternario de fondo abierto más
        // arriba — se evalúa SOLO contra el fondo de su propia rama
        // (inactivo), no contra el peor caso.
        activeBgToken = 'condicional(inactivo)';
        activeBgHex = condTopForText.falseBgHex;
      } else if (condTopForText) {
        // Texto incondicional (sin su propio ternario) dentro de un
        // elemento cuyo FONDO sí es condicional: no sabemos en build-time
        // cuál rama está activa, así que se audita contra el peor caso de
        // las dos — si falla contra cualquiera de las dos, es una
        // violación real en al menos un estado del botón.
        const ratioTrue = getContrastRatio(condTopForText.trueBgHex, resolveColorToHex(textToken, cssVarMap, condTopForText.trueBgHex) || '#000000');
        const ratioFalse = getContrastRatio(condTopForText.falseBgHex, resolveColorToHex(textToken, cssVarMap, condTopForText.falseBgHex) || '#000000');
        if (ratioTrue <= ratioFalse) {
          activeBgToken = 'condicional(activo)';
          activeBgHex = condTopForText.trueBgHex;
        } else {
          activeBgToken = 'condicional(inactivo)';
          activeBgHex = condTopForText.falseBgHex;
        }
      } else if (currentActiveBg) {
        activeBgToken = bgStack.length > 0 ? bgStack[bgStack.length - 1].bgToken : 'ui-bg-card';
        activeBgHex = currentActiveBg;
      }

      const textHex = resolveColorToHex(textToken, cssVarMap, activeBgHex);
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

    // Decrementar profundidad para etiquetas cerradas en esta linea y desapilar
    domDepth = Math.max(0, domDepth - netCloseTags);
    while (bgStack.length > 0 && bgStack[bgStack.length - 1].depth > domDepth) {
      bgStack.pop();
    }
    while (conditionalBgStack.length > 0 && conditionalBgStack[conditionalBgStack.length - 1].depth > domDepth) {
      conditionalBgStack.pop();
    }
  }

  return violations;
}

function auditCodebaseContrast() {
  console.log('🔍 Iniciando auditoría de contraste WCAG 2.1 AA en componentes UI (3 temas: day, night, teal_ocean)...');
  const themeMaps = loadAllThemeCssVariables();
  const tsxFiles = getAllTsxFiles(path.join(rootDir, 'src'));

  const violations = [];

  for (const filePath of tsxFiles) {
    const relPath = path.relative(rootDir, filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const themeId of Object.keys(themeMaps)) {
      const fileViolations = auditLinesForContrast(lines, themeMaps[themeId]);
      for (const v of fileViolations) {
        violations.push({ file: relPath, theme: themeId, ...v });
      }
    }
  }

  // Auditoría explícita de Matriz de Superficies UI por Tema (Dock, Header, Panel, Card)
  const surfacePairsToTest = [
    { name: 'Dock Base', bgVar: '--ui-bg-dock', textVar: '--ui-dock-text' },
    { name: 'Dock Subtexto', bgVar: '--ui-bg-dock', textVar: '--ui-dock-text-muted' },
    { name: 'Header Base', bgVar: '--ui-bg-header', textVar: '--ui-text-primary' },
    { name: 'Panel Base', bgVar: '--ui-bg-panel', textVar: '--ui-text-primary' },
    { name: 'Panel Subtexto', bgVar: '--ui-bg-panel', textVar: '--ui-text-secondary' },
    { name: 'Tarjeta Base', bgVar: '--ui-bg-card', textVar: '--ui-text-primary' },
    { name: 'Tarjeta Subtexto', bgVar: '--ui-bg-card', textVar: '--ui-text-secondary' },
    { name: 'Tarjeta Secundarios', bgVar: '--color-secondary-muted', textVar: '--color-secondary-card-text' },
  ];

  for (const themeId of Object.keys(themeMaps)) {
    const map = themeMaps[themeId];
    for (const pair of surfacePairsToTest) {
      const bgHex = map.get(pair.bgVar);
      const textHex = map.get(pair.textVar);
      if (bgHex && textHex) {
        const ratio = getContrastRatio(bgHex, textHex);
        if (ratio < 4.5) {
          violations.push({
            file: 'src/index.css',
            theme: themeId,
            line: 'Theme Matrix',
            bgToken: pair.bgVar,
            textToken: pair.textVar,
            bgHex,
            textHex,
            ratio: ratio.toFixed(2)
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error('\n🚨 VIOLACIONES DE CONTRASTE DETECTADAS (WCAG 2.1 AA - Mínimo 4.5:1):');
    for (const v of violations) {
      console.error(`  - [Tema: ${v.theme}] ${v.file}:${v.line} → Fondo: ${v.bgToken} (${v.bgHex}), Texto: ${v.textToken} (${v.textHex}) | Ratio: ${v.ratio}:1 < 4.5:1`);
    }
    console.error(`\n❌ Se encontraron ${violations.length} violaciones de contraste WCAG 2.1 AA.`);
    process.exit(1);
  } else {
    console.log('✅ Auditoría de contraste WCAG 2.1 AA superada en los 4 temas: 0 violaciones encontradas.\n');
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
