/**
 * check-module-boundaries.js
 * Verifies that src/modules/ subfolders do not cross-import each other directly.
 * Core shared logic must live in src/shared/ or src/context/.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modulesDir = path.resolve(__dirname, '../src/modules');

let violationsCount = 0;
let uiGovernanceWarnings = 0;

// Lista de archivos exceptuados (motor de color del PDF en /pdf-engine/ o definidores de tokens)
const EXEMPT_UI_GOVERNANCE = [
  'uiDesignSystem.ts',
  'colorSystem.ts',
  'fieldCatalog.ts',
  'presetRegistry.ts',
  'themePresets.ts'
];

function checkDir(dir, currentModule) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      checkDir(fullPath, currentModule);
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      const content = fs.readFileSync(fullPath, 'utf8');

      // 1. Verificación de Fronteras de Módulos
      const importMatches = content.match(/from\s+['"]([^'"]+)['"]/g) || [];
      for (const match of importMatches) {
        const importPath = match.replace(/from\s+['"]/, '').replace(/['"]$/, '');
        if (importPath.includes('/modules/')) {
          const targetModule = importPath.split('/modules/')[1]?.split('/')[0];
          if (targetModule && targetModule !== currentModule) {
            console.warn(`⚠️ Boundary Warning: [${currentModule}] imports [${targetModule}] in ${path.relative(process.cwd(), fullPath)}`);
            violationsCount++;
          }
        }
      }

      // 2. Gobernanza de Arquitectura de Motor UI (Detecta colores o estilos duros a mano)
      if (!EXEMPT_UI_GOVERNANCE.some(ex => file.endsWith(ex))) {
        // Detecta patrones como style={{ color: '#HEX' }} o background '#HEX' escrito a mano
        const hardcodedHexStyleMatches = content.match(/style=\{\{\s*(color|backgroundColor|borderColor):\s*['"]#(FF2E63|00A8A0|2B1B2E|EFE2C9)['"]/gi);
        if (hardcodedHexStyleMatches) {
          console.warn(`🎨 UI Governance Warning: [${file}] tiene colores inline duros. Usar colorSystem/uiDesignSystem de /shared/core/uiDesignSystem.`);
          uiGovernanceWarnings++;
        }
      }
    }
  }
}

if (fs.existsSync(modulesDir)) {
  const modules = fs.readdirSync(modulesDir);
  for (const mod of modules) {
    const modPath = path.join(modulesDir, mod);
    if (fs.statSync(modPath).isDirectory()) {
      checkDir(modPath, mod);
    }
  }
}

if (violationsCount === 0 && uiGovernanceWarnings === 0) {
  console.log('✅ Governance & Module boundary check passed: 0 violations found!');
} else {
  console.log(`ℹ️ Check completed: ${violationsCount} boundary warnings, ${uiGovernanceWarnings} UI governance warnings.`);
}
