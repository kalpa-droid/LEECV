/**
 * check-module-boundaries.js
 * Verifica fronteras de módulos (src/modules/) y gobernanza de UI/colores (src/modules/ y src/shared/).
 * Bloquea el build (exit 1) si existen violaciones de arquitectura.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');
const modulesDir = path.join(srcDir, 'modules');
const sharedDir = path.join(srcDir, 'shared');

let violationsCount = 0;
let uiGovernanceWarnings = 0;

// Lista de archivos exceptuados para la regla de gobernanza de colores/tokens
const EXEMPT_UI_GOVERNANCE = [
  'uiDesignSystem.ts',
  'colorSystem.ts',
  'fieldCatalog.ts',
  'presetRegistry.ts',
  'themePresets.ts',
  'index.css',
  'initialCVData.ts',
  'cvDataSchema.ts',
  'capabilityRegistry.ts',
  'vcardGenerator.ts',
  'TemplateRenderer.tsx',
  'cardFaceRenderer.tsx',
  'CardSheetDocument.tsx'
];

function checkFile(fullPath, currentModule = null) {
  const file = path.basename(fullPath);
  const content = fs.readFileSync(fullPath, 'utf8');

  // 1. Verificación de Fronteras de Módulos (solo aplica si está dentro de /modules/)
  if (currentModule) {
    const importMatches = content.match(/from\s+['"]([^'"]+)['"]/g) || [];
    for (const match of importMatches) {
      const importPath = match.replace(/from\s+['"]/, '').replace(/['"]$/, '');
      if (importPath.includes('/modules/')) {
        const targetModule = importPath.split('/modules/')[1]?.split('/')[0];
        if (targetModule && targetModule !== currentModule) {
          console.error(`❌ Boundary Violation: [${currentModule}] imports [${targetModule}] in ${path.relative(process.cwd(), fullPath)}`);
          violationsCount++;
        }
      }
    }
  }

  // 2. Gobernanza de UI/Colores (aplica a /modules/ y /shared/)
  const isExempt = EXEMPT_UI_GOVERNANCE.some(ex => file.endsWith(ex));
  if (!isExempt) {
    // Detecta patrones de interpolación JS rota en Tailwind como bg-[${...}]
    const brokenInterpolations = content.match(/\b(bg|text|border|ring)-\[\$\{[^}]+\}\]/g);
    if (brokenInterpolations) {
      console.error(`❌ UI Governance Error: [${file}] usa interpolación JS rota en Tailwind '${brokenInterpolations.join(', ')}'. Usar var(--color-*) o clase literal.`);
      uiGovernanceWarnings++;
    }

    // Detecta estilos inline duros con hex
    const hardcodedHexStyleMatches = content.match(/style=\{\{\s*(color|backgroundColor|borderColor):\s*['"]#[0-9a-fA-F]{3,8}['"]/gi);
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

if (violationsCount === 0 && uiGovernanceWarnings === 0) {
  console.log('✅ Governance & Module boundary check passed: 0 violations found!');
  process.exit(0);
} else {
  console.error(`❌ Check completed with errors: ${violationsCount} boundary violations, ${uiGovernanceWarnings} UI governance errors.`);
  process.exit(1);
}

