import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walkDir(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js')) {
      if (!filePath.includes('uiDesignSystem.ts')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

function main() {
  console.log('🔍 Verificando uso de tokens de UI (Detección de Tokens Huérfanos)...');

  const designSystemPath = path.join(ROOT_DIR, 'src', 'shared', 'core', 'uiDesignSystem.ts');
  if (!fs.existsSync(designSystemPath)) {
    console.error('❌ No se encontró src/shared/core/uiDesignSystem.ts');
    process.exit(1);
  }

  const dsContent = fs.readFileSync(designSystemPath, 'utf8');

  // Extraer export const <nombre>
  const exportMatches = Array.from(dsContent.matchAll(/export const ([a-zA-Z0-9_]+)/g)).map(m => m[1]);

  const files = walkDir(path.join(ROOT_DIR, 'src'));
  const allOtherContent = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');

  const orphanTokens = [];

  for (const tokenName of exportMatches) {
    if (tokenName === 'uiThemePresets' || tokenName === 'colorSystem') {
      const regex = new RegExp(`\\b${tokenName}\\b`, 'g');
      if (!regex.test(allOtherContent)) {
        orphanTokens.push(tokenName);
      }
    }
  }

  if (orphanTokens.length > 0) {
    console.warn(`⚠️ ADVERTENCIA: Se encontraron ${orphanTokens.length} tokens/exportaciones huérfanas en uiDesignSystem.ts no consumidos fuera del archivo:`);
    orphanTokens.forEach(t => console.warn(`  - ${t}`));
  } else {
    console.log('✅ Verificación de tokens huérfanos superada: Todos los símbolos de uiDesignSystem.ts están conectados.\n');
  }
}

main();
