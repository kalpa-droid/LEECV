/**
 * check-module-boundaries.js
 * Verifica fronteras de módulos (src/modules/) y gobernanza de UI/colores/diálogos/léxico (src/modules/ y src/shared/).
 * Bloquea el build (exit 1) si existen violaciones de arquitectura.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UI_GLOSSARY } from '../src/shared/core/uiTextGlossary.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');
const modulesDir = path.join(srcDir, 'modules');
const sharedDir = path.join(srcDir, 'shared');

let violationsCount = 0;
let uiGovernanceWarnings = 0;
const auditOnlyFindings = [];

// Lista de archivos exceptuados para la regla de gobernanza de colores/tokens
const EXEMPT_UI_GOVERNANCE = [
  'uiDesignSystem.ts',
  'colorSystem.ts',
  'fieldCatalog.ts',
  'presetRegistry.ts',
  'index.css',
  'initialCVData.ts',
  'cvDataSchema.ts',
  'capabilityRegistry.ts',
  'vcardGenerator.ts',
  'TemplateRenderer.tsx',
  'cardFaceRenderer.tsx',
  'CardSheetDocument.tsx'
];

// Archivos exentos de la regla de confirm/alert nativo (sus propias definiciones de núcleo)
const EXEMPT_NATIVE_DIALOGS = [
  'ConfirmDialog.tsx',
  'Toast.tsx'
];

// Términos prohibidos para el chequeo de léxico de interfaz — se derivan del
// glosario real (uiTextGlossary.ts), NO de una copia a mano acá. Antes este
// script tenía su propia lista de 2 términos que duplicaba (mal) las 6 reglas
// reales del glosario, así que 4 de 6 reglas nunca se estaban chequeando.
const FORBIDDEN_LEXICON = Object.values(UI_GLOSSARY).flatMap(({ canonical, forbidden }) =>
  forbidden.map((term) => ({ term, canonical }))
);

function checkFile(fullPath, currentModule = null) {
  const file = path.basename(fullPath);
  const content = fs.readFileSync(fullPath, 'utf8');

  // 1. Verificación de Fronteras de Módulos (aplica a /modules/ y a /shared/)
  const isSharedFile = fullPath.includes('/src/shared/');
  const importMatches = content.match(/from\s+['"]([^'"]+)['"]/g) || [];

  for (const match of importMatches) {
    const importPath = match.replace(/from\s+['"]/, '').replace(/['"]$/, '');

    // /shared/ NUNCA debe importar desde /modules/.
    // Explicación arquitectónica: Los componentes primitivos reutilizables en /shared/core/ (ej: RepeatableSection, RecordFormSection)
    // jamás deben depender de componentes de dominio específicos de un módulo (ej: SectionManualAdjustment en /modules/cv-builder/).
    // Si un componente en /shared/ necesita renderizar algo específico de un módulo, debe aceptar una prop de slot o render prop
    // (ej: manualAdjustment?: React.ReactNode o renderTrailingSlot?: (key) => React.ReactNode) y ser la invocación en /modules/ la que inyecte el elemento.
    if (isSharedFile && importPath.includes('/modules/')) {
      console.error(`❌ Shared Boundary Violation: Shared file [${path.relative(process.cwd(), fullPath)}] imports from module [${importPath}]. Usar patrón de slot/renderProp (ej: manualAdjustment o renderTrailingSlot).`);
      violationsCount++;
    }

    // Un módulo de /modules/ no debe importar desde OTRO módulo de /modules/
    if (currentModule && importPath.includes('/modules/')) {
      const targetModule = importPath.split('/modules/')[1]?.split('/')[0];
      if (targetModule && targetModule !== currentModule) {
        console.error(`❌ Boundary Violation: [${currentModule}] imports [${targetModule}] in ${path.relative(process.cwd(), fullPath)}`);
        violationsCount++;
      }
    }
  }

  // 2. Gobernanza de UI/Colores (aplica a /modules/ y /shared/)
  const isExemptColors = EXEMPT_UI_GOVERNANCE.some(ex => file.endsWith(ex));
  if (!isExemptColors) {
    // Detecta patrones de interpolación JS rota en Tailwind como bg-[${...}]
    const brokenInterpolations = content.match(/\b(bg|text|border|ring)-\[\$\{[^}]+\}\]/g);
    if (brokenInterpolations) {
      console.error(`❌ UI Governance Error: [${file}] usa interpolación JS rota en Tailwind '${brokenInterpolations.join(', ')}'. Usar var(--color-*) o clase literal.`);
      uiGovernanceWarnings++;
    }

    // Detecta estilos inline duros con hex (en cualquier posición de la propiedad dentro de style={{...}})
    const hardcodedHexStyleMatches = content.match(/style=\{\{[^}]*\b(color|backgroundColor|borderColor|fill|stroke)\s*:\s*['"]#[0-9a-fA-F]{3,8}['"]/gi);
    if (hardcodedHexStyleMatches) {
      console.error(`🎨 UI Governance Error: [${file}] tiene colores inline duros: '${hardcodedHexStyleMatches.join(', ')}'. Usar colorSystem/uiDesignSystem de /shared/core/uiDesignSystem.`);
      uiGovernanceWarnings++;
    }

    // Detecta hexes arbitrarios en clases de Tailwind (incluyendo via-, from-, to-, shadow-, opacidades como /20 y estados hover:/focus:)
    const tailwindArbitraryHexMatches = content.match(/(?:hover:|focus:|active:|disabled:|dark:)?(bg|text|border|ring|from|via|to|shadow|placeholder|fill|stroke)-\[#[0-9a-fA-F]{3,8}\](?:\/\d{1,3})?/gi);
    if (tailwindArbitraryHexMatches) {
      console.error(`🎨 UI Governance Error: [${file}] usa hex arbitrario en className: '${tailwindArbitraryHexMatches.join(', ')}'. Usar variables CSS var(--color-*) o tokens del sistema.`);
      uiGovernanceWarnings++;
    }

    // PUNTO CIEGO REAL (fase de auditoría, todavía NO bloquea el build):
    // el regex de arriba solo mira hex — una clase de Tailwind con NOMBRE
    // (bg-purple-600, shadow-xl, rounded-2xl) viola exactamente la misma
    // regla ("nada de color/sombra/radio a mano") pero es invisible para
    // esos checks. Detectado explícitamente ahora, distinto count, no se
    // suma a uiGovernanceWarnings todavía — ver AGENTS.md antes de activar
    // el bloqueo, primero hay que migrar los archivos que ya tiene.
    const namedTailwindColorMatches = content.match(/(?:hover:|focus:|active:|disabled:|dark:)?(bg|text|border|ring|from|via|to)-(red|blue|green|purple|pink|indigo|yellow|amber|emerald|teal|cyan|sky|violet|fuchsia|rose|orange|lime|slate|gray|zinc|neutral|stone)-[0-9]{2,3}\b/gi);
    const namedShadowMatches = content.match(/\bshadow-(sm|md|lg|xl|2xl|inner)\b/g);
    const namedRadiusMatches = content.match(/\brounded-(lg|xl|2xl|3xl)\b/g);
    if (namedTailwindColorMatches || namedShadowMatches || namedRadiusMatches) {
      auditOnlyFindings.push({
        file,
        color: namedTailwindColorMatches?.length || 0,
        shadow: namedShadowMatches?.length || 0,
        radius: namedRadiusMatches?.length || 0,
      });
    }
  }

  // 3. Gobernanza de Diálogos Nativos (bloquea window.confirm y alert sueltos)
  const isExemptDialogs = EXEMPT_NATIVE_DIALOGS.some(ex => file.endsWith(ex));
  if (!isExemptDialogs) {
    if (/\bwindow\.confirm\s*\(/.test(content)) {
      console.error(`🚨 UI Governance Error: [${file}] usa 'window.confirm()' nativo. Usar el hook useConfirm().`);
      uiGovernanceWarnings++;
    }
    if (/\balert\s*\(/.test(content)) {
      console.error(`🚨 UI Governance Error: [${file}] usa 'alert()' nativo. Usar las funciones showInfo/showError del sistema Toast.`);
      uiGovernanceWarnings++;
    }
  }

function stripJsxExpressions(code) {
  let result = '';
  let depth = 0;
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    if (char === '{') {
      depth++;
    } else if (char === '}') {
      if (depth > 0) depth--;
    } else if (depth === 0) {
      result += char;
    }
  }
  return result;
}

  // 4. Gobernanza Léxica de Texto de Interfaz (revisa cadenas visibles en JSX y props textuales)
  if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
    const jsxOnlyContent = stripJsxExpressions(content);
    FORBIDDEN_LEXICON.forEach(({ term, canonical }) => {
      // Revisa sólo texto en JSX entre > e < o dentro de props de texto como title="", label="", placeholder=""
      const jsxTextRegex = new RegExp(`>([^<]*\\b${term}\\b[^<]*)<|\\b(title|label|placeholder)=["'][^"']*\\b${term}\\b[^"']*["']`, 'gi');
      if (jsxTextRegex.test(jsxOnlyContent)) {
        console.error(`💬 Lexical Governance Error: [${file}] contiene el término prohibido '${term}'. Usar '${canonical}' según uiTextGlossary.ts.`);
        uiGovernanceWarnings++;
      }
    });
  }
}

function scanDir(dir, currentModule = null) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const isSubModule = dir === modulesDir ? file : currentModule;
      scanDir(fullPath, isSubModule);
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      checkFile(fullPath, currentModule);
    }
  }
}

console.log('🔍 Iniciando verificación de Gobernanza de Módulos y UI...');

// Escanear /modules/ y /shared/
scanDir(modulesDir);
scanDir(sharedDir);

if (auditOnlyFindings.length > 0) {
  const totalColor = auditOnlyFindings.reduce((s, f) => s + f.color, 0);
  const totalShadow = auditOnlyFindings.reduce((s, f) => s + f.shadow, 0);
  const totalRadius = auditOnlyFindings.reduce((s, f) => s + f.radius, 0);
  console.warn(`\n⚠️  AUDITORÍA (no bloquea el build todavía): ${auditOnlyFindings.length} archivo(s) usan clases de Tailwind con nombre en vez del núcleo — ${totalColor} color, ${totalShadow} sombra, ${totalRadius} radio.`);
  console.warn('   Ver AGENTS.md — migrar a colorSystem/elevationSystem/radius antes de activar el bloqueo de esta regla.');
  auditOnlyFindings.forEach(f => console.warn(`   - ${f.file}: color=${f.color} shadow=${f.shadow} radius=${f.radius}`));
}

if (violationsCount === 0 && uiGovernanceWarnings === 0) {
  console.log('✅ Governance & Module boundary check passed: 0 violations found!');
  process.exit(0);
} else {
  console.error(`❌ Check completed with errors: ${violationsCount} boundary violations, ${uiGovernanceWarnings} UI governance errors.`);
  process.exit(1);
}
