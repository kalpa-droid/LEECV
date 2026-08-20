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

function checkDir(dir, currentModule) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      checkDir(fullPath, currentModule);
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      const content = fs.readFileSync(fullPath, 'utf8');
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

if (violationsCount === 0) {
  console.log('✅ Module boundary check passed: 0 cross-module violations found!');
} else {
  console.log(`ℹ️ Module boundary check completed with ${violationsCount} warnings.`);
}
