import { Project, SyntaxKind, JsxText, JsxAttribute, CallExpression, StringLiteral, TemplateExpression, Node } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

export interface ExtractedStringItem {
  type: 'jsx-text' | 'jsx-attribute' | 'notification-literal' | 'notification-template-segment' | 'confirm-literal';
  text: string;
  line: number;
  context?: string;
}

export function extractBaselineFromFile(filePath: string): ExtractedStringItem[] {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`El archivo especificado no existe: ${absolutePath}`);
  }

  const project = new Project({
    compilerOptions: {
      jsx: 1, // Preserve / React
      allowJs: true,
    },
    skipAddingFilesFromTsConfig: true,
  });

  const sourceFile = project.addSourceFileAtPath(absolutePath);
  const results: ExtractedStringItem[] = [];

  sourceFile.forEachDescendant((node) => {
    // 1. Recorrer JsxText
    if (Node.isJsxText(node)) {
      const rawText = node.getText();
      const trimmed = rawText.replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' ');
      if (trimmed.length > 0 && !/^\s*$/.test(trimmed)) {
        // Ignorar textos que sean puramente números o símbolos sin palabras (ej: "{", "}", "/")
        if (/[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/.test(trimmed)) {
          results.push({
            type: 'jsx-text',
            text: trimmed,
            line: node.getStartLineNumber(),
          });
        }
      }
    }

    // 2. Recorrer JsxAttribute (placeholder, aria-label, title, alt)
    if (Node.isJsxAttribute(node)) {
      const attrName = node.getNameNode().getText();
      if (['placeholder', 'aria-label', 'title', 'alt'].includes(attrName)) {
        const initializer = node.getInitializer();
        if (initializer) {
          if (Node.isStringLiteral(initializer)) {
            const val = initializer.getLiteralValue().trim();
            if (val) {
              results.push({
                type: 'jsx-attribute',
                text: val,
                line: node.getStartLineNumber(),
                context: attrName,
              });
            }
          } else if (Node.isJsxExpression(initializer)) {
            const expr = initializer.getFirstChildByKind(SyntaxKind.StringLiteral);
            if (expr && Node.isStringLiteral(expr)) {
              const val = expr.getLiteralValue().trim();
              if (val) {
                results.push({
                  type: 'jsx-attribute',
                  text: val,
                  line: node.getStartLineNumber(),
                  context: attrName,
                });
              }
            }
          }
        }
      }
    }

    // 3. Llamadas a notificaciones y confirmaciones
    if (Node.isCallExpression(node)) {
      const exprText = node.getExpression().getText();
      const args = node.getArguments();

      if (['showError', 'showSuccess', 'showInfo', 'showWarning'].some(fn => exprText.endsWith(fn))) {
        if (args.length > 0) {
          const firstArg = args[0];
          if (Node.isStringLiteral(firstArg)) {
            const val = firstArg.getLiteralValue().trim();
            if (val) {
              results.push({
                type: 'notification-literal',
                text: val,
                line: node.getStartLineNumber(),
                context: exprText,
              });
            }
          } else if (Node.isTemplateExpression(firstArg)) {
            const tmpl = firstArg;
            const headText = tmpl.getHead().getLiteralText().trim();
            if (headText) {
              results.push({
                type: 'notification-template-segment',
                text: headText,
                line: node.getStartLineNumber(),
                context: exprText,
              });
            }
            tmpl.getTemplateSpans().forEach((span) => {
              const literalText = span.getLiteral().getLiteralText().trim();
              if (literalText) {
                results.push({
                  type: 'notification-template-segment',
                  text: literalText,
                  line: node.getStartLineNumber(),
                  context: exprText,
                });
              }
            });
          }
        }
      }

      if (exprText.includes('useConfirm') || exprText.includes('confirm')) {
        args.forEach((arg) => {
          if (Node.isObjectLiteralExpression(arg)) {
            arg.getProperties().forEach((prop) => {
              if (Node.isPropertyAssignment(prop)) {
                const pName = prop.getName();
                if (['title', 'message', 'confirmText', 'cancelText', 'description'].includes(pName)) {
                  const init = prop.getInitializer();
                  if (init && Node.isStringLiteral(init)) {
                    const val = init.getLiteralValue().trim();
                    if (val) {
                      results.push({
                        type: 'confirm-literal',
                        text: val,
                        line: node.getStartLineNumber(),
                        context: pName,
                      });
                    }
                  }
                }
              }
            });
          }
        });
      }
    }
  });

  return results;
}

// Ejecución CLI si se invoca directamente
if (process.argv[1] && (process.argv[1].endsWith('extract-baseline.ts') || process.argv[1].endsWith('extract-baseline.js'))) {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('❌ Uso: npx tsx scripts/i18n/extract-baseline.ts <ruta-al-componente.tsx>');
    process.exit(1);
  }

  try {
    const extracted = extractBaselineFromFile(fileArg);
    const fileName = path.basename(fileArg, path.extname(fileArg));
    const outputDir = path.resolve(process.cwd(), 'scripts/i18n/baseline');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `${fileName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(extracted, null, 2), 'utf-8');

    console.log(`✅ Baseline generado exitosamente para ${fileName} (${extracted.length} cadenas extraídas).`);
    console.log(`📄 Archivo guardado en: ${outputPath}`);

    if (extracted.length === 0) {
      console.warn(`⚠️ ADVERTENCIA: Se extrajeron 0 cadenas. Verifica si el componente tiene texto visible que requiera ajustar los patrones AST.`);
    }
  } catch (error: any) {
    console.error(`❌ Error al extraer baseline: ${error.message}`);
    process.exit(1);
  }
}
