import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('🔍 Verificando precisión de anclaje de desplazamiento en visor PDF (Ejecución Real)...');

try {
  execSync(`npx tsx scripts/_test_pdf_anchor_exec.ts`, { cwd: ROOT, stdio: 'inherit' });
  console.log('✅ Verificación de anclaje PDF multipágina superada con éxito.');
} catch (err) {
  console.error('❌ Verificación de anclaje PDF falló.');
  process.exit(1);
}
