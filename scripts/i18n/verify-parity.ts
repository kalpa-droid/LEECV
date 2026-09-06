import { extractBaselineFromFile, ExtractedStringItem } from './extract-baseline';
import * as path from 'path';
import * as fs from 'fs';
import { Project, SyntaxKind, PropertyAccessExpression } from 'ts-morph';

interface CatalogMap {
  [key: string]: any;
}

export function loadCatalogValues(): Set<string> {
  const catalogDir = path.resolve(process.cwd(), 'src/shared/i18n/catalog');
  const catalogValues = new Set<string>();

  if (!fs.existsSync(catalogDir)) {
    return catalogValues;
  }

  const files = fs.readdirSync(catalogDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
  for (const file of files) {
    try {
      const fullPath = path.join(catalogDir, file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Extraer strings literales definidos en los archivos de catálogo mediante regex simple/AST
      const stringMatches = content.match(/:\s*(['"`])(.*?)\1/g);
      if (stringMatches) {
        stringMatches.forEach(match => {
          const val = match.replace(/^:\s*['"`]/, '').replace(/['"`]$/, '').trim();
          if (val) {
            catalogValues.add(val);
          }
        });
      }
    } catch (err) {
      console.warn(`⚠️ No se pudo leer catálogo: ${file}`);
    }
  }

  return catalogValues;
}

export function verifyComponentParity(filePath: string): { success: boolean; missingInCatalog: string[]; remainingLiterals: ExtractedStringItem[] } {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const fileName = path.basename(absolutePath, path.extname(absolutePath));
  const baselinePath = path.resolve(process.cwd(), `scripts/i18n/baseline/${fileName}.json`);

  if (!fs.existsSync(baselinePath)) {
    throw new Error(`❌ No se encontró el baseline para ${fileName} en ${baselinePath}. Debes ejecutar extract-baseline.ts ANTES de migrar.`);
  }

  const baselineData: ExtractedStringItem[] = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
  const catalogValues = loadCatalogValues();

  // (a) Verificar que cada string del baseline esté en los valores del catálogo
  const missingInCatalog: string[] = [];
  for (const item of baselineData) {
    const expected = item.text.trim();
    if (expected.length > 0 && !catalogValues.has(expected)) {
      // Intentar coincidencia sin espacios sobrantes o minúsculas si aplica
      let found = false;
      for (const catVal of catalogValues) {
        if (catVal.trim() === expected) {
          found = true;
          break;
        }
      }
      if (!found) {
        missingInCatalog.push(expected);
      }
    }
  }

  // (b) Re-correr extractor sobre el archivo migrado
  const currentLiterals = extractBaselineFromFile(absolutePath);
  // Filtrar de los literales remanentes aquellos que sean llamadas a `t.algo` (ya no son JsxText plano)
  const remainingLiterals = currentLiterals.filter(item => {
    // Si la cadena ya existe en el catálogo pero quedó en JsxText, es sospechoso, pero si es un texto que cambió
    return true;
  });

  const success = missingInCatalog.length === 0 && remainingLiterals.length === 0;

  return {
    success,
    missingInCatalog,
    remainingLiterals,
  };
}

if (process.argv[1] && (process.argv[1].endsWith('verify-parity.ts') || process.argv[1].endsWith('verify-parity.js'))) {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('❌ Uso: npx tsx scripts/i18n/verify-parity.ts <ruta-al-componente-migrado.tsx>');
    process.exit(1);
  }

  try {
    const result = verifyComponentParity(fileArg);
    const fileName = path.basename(fileArg);

    if (!result.success) {
      console.error(`\n❌ PARIDAD DE TEXTO FALLIDA PARA: ${fileName}\n`);

      if (result.missingInCatalog.length > 0) {
        console.error(`⚠️ CADENAS DEL BASELINE QUE NO SE ENCONTRARON EN EL CATÁLOGO (${result.missingInCatalog.length}):`);
        result.missingInCatalog.forEach(str => {
          console.error(`   - "${str}"`);
        });
        console.error('');
      }

      if (result.remainingLiterals.length > 0) {
        console.error(`⚠️ LITERALES DE TEXTO PLANO REMANENTES EN EL COMPONENTE (${result.remainingLiterals.length}):`);
        result.remainingLiterals.forEach(lit => {
          console.error(`   - Línea ${lit.line}: "${lit.text}" (${lit.type})`);
        });
        console.error('');
      }

      console.error('🛑 Corrige las diferencias antes de continuar al siguiente lote.');
      process.exit(1);
    } else {
      console.log(`✅ PARIDAD 100% VERIFICADA PARA: ${fileName}`);
      console.log(`   - 0 cadenas faltantes en el catálogo.`);
      console.log(`   - 0 literales planos remanentes en el componente.`);
      process.exit(0);
    }
  } catch (error: any) {
    console.error(`❌ Error durante la verificación de paridad: ${error.message}`);
    process.exit(1);
  }
}
