import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('🔍 Escaneando src/**/*.tsx buscando interpolaciones de plantilla rotas en className="..."...');

function scanDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      scanDir(filePath, fileList);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allSrcFiles = scanDir(path.join(ROOT, 'src'));
const brokenInterpolationRegex = /className="[^"]*\$\{/g;

let violations = [];

for (const filePath of allSrcFiles) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (brokenInterpolationRegex.test(line)) {
      violations.push({
        file: path.relative(ROOT, filePath),
        lineNum: idx + 1,
        content: line.trim()
      });
    }
  });
}

if (violations.length > 0) {
  console.error('\n❌ SE ENCONTRARON CLASES CSS CON INTERPOLACIÓN EN COMILLAS DOBLES ROTA:');
  violations.forEach(v => {
    console.error(`  - ${v.file}:${v.lineNum} → ${v.content}`);
  });
  process.exit(1);
} else {
  console.log('✅ Sin interpolaciones de comillas dobles rotas en la base de código.');
}
