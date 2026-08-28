import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '../src');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

// Patterns that break contrast inside Modals (since Modals present a light background in Day mode)
const FORBIDDEN_MODAL_PATTERNS = [
  {
    regex: /\btext-white\b(?!\/)(?!\s*[^"']*?\b(bg-\[var\(--color-accent|bg-black\b|bg-indigo-|bg-purple-|bg-emerald-|bg-rose-|bg-red-|bg-blue-))/g,
    name: 'text-white sin fondo oscuro explícito',
    suggestion: 'Usar var(--ui-text-primary) o var(--color-accent-on-base)'
  },
  {
    regex: /\btext-white\/(?:80|70|60|50|40|30|90|20)\b/g,
    name: 'text-white con opacidad en modal',
    suggestion: 'Usar var(--ui-text-secondary) o var(--ui-text-muted)'
  },
  {
    regex: /\btext-slate-(?:100|200|300|400)\b/g,
    name: 'text-slate claro en modal',
    suggestion: 'Usar var(--ui-text-secondary) o var(--ui-text-primary)'
  },
  {
    regex: /bg-\[var\(--ui-bg-dock\)\]/g,
    name: 'bg-[var(--ui-bg-dock)] dentro de modal',
    suggestion: 'Usar var(--ui-bg-card) o var(--ui-bg-panel) (en tema Day, --ui-bg-dock es claro #F1F5F9)'
  },
  {
    regex: /\b(bg-white\/10|bg-white\/20|bg-black\/40|bg-black\/30|bg-black\/50)\b/g,
    name: 'Fondo translúcido hardcodeado en modal',
    suggestion: 'Usar var(--ui-bg-panel), var(--ui-bg-card) o tokens de botón neutrales'
  }
];

function auditModalFiles() {
  console.log('🔍 Iniciando Auditoría de Contraste en Modales y Diálogos...');
  
  const allFiles = getAllFiles(SRC_DIR);
  let totalViolations = 0;
  const violationsByFile = {};

  allFiles.forEach((filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Determine if file is a modal component or renders a Modal
    const isModalFile = 
      content.includes("from '../../shared/core/ui/Modal'") ||
      content.includes("from '../../../shared/core/ui/Modal'") ||
      content.includes("from '../../../../shared/core/ui/Modal'") ||
      content.includes("from '../ui/Modal'") ||
      content.includes("import { Modal }") ||
      content.includes("<Modal") ||
      filePath.endsWith('Modal.tsx') ||
      filePath.includes('/modals/');

    if (!isModalFile) return;

    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      FORBIDDEN_MODAL_PATTERNS.forEach(({ regex, name, suggestion }) => {
        const matches = line.match(regex);
        if (matches) {
          matches.forEach((match) => {
            // Exclude lines with explicit colored badges or buttons with dark background
            if (line.includes('bg-[var(--color-accent-') || line.includes('bg-[var(--color-secondary-') || line.includes('bg-[var(--color-status-')) {
              if (match === 'text-white' && (
                line.includes('bg-[var(--color-accent-base)]') || 
                line.includes('bg-[var(--color-accent-purple)]') || 
                line.includes('bg-[var(--color-secondary-base)]') || 
                line.includes('bg-[var(--color-status-danger-base)]') || 
                line.includes('bg-[var(--color-status-success-base)]')
              )) {
                return; // Valid text-white on solid dark/accent button
              }
            }

            const relativePath = path.relative(path.resolve(__dirname, '..'), filePath);
            if (!violationsByFile[relativePath]) {
              violationsByFile[relativePath] = [];
            }
            violationsByFile[relativePath].push({
              lineNum,
              match,
              name,
              suggestion,
              code: line.trim()
            });
            totalViolations++;
          });
        }
      });
    });
  });

  if (totalViolations > 0) {
    console.error(`\n❌ SE ENCONTRARON ${totalViolations} VIOLACIONES DE CONTRASTE EN MODALES:\n`);
    Object.keys(violationsByFile).forEach((file) => {
      console.error(`📄 ${file}:`);
      violationsByFile[file].forEach(({ lineNum, match, name, suggestion, code }) => {
        console.error(`   Línea ${lineNum}: [${match}] → ${name}`);
        console.error(`   Impacto: ${code}`);
        console.error(`   💡 Sugerencia: ${suggestion}\n`);
      });
    });
    process.exit(1);
  } else {
    console.log('✅ AUDITORÍA DE CONTRASTE EN MODALES COMPLETADA: 0 violaciones encontradas en todos los modales de la web.\n');
  }
}

auditModalFiles();
