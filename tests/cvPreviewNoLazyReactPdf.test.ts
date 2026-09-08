import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Test de regresión — este bug ya ocurrió DOS VECES en producción:
 *
 * 1. Commit 43306b9 ("PERF-1 lazy loading") envolvió TemplateRenderer y
 *    CardSheetDocument en React.lazy()/<Suspense> dentro de CVPreview.tsx,
 *    para "reducir el bundle inicial". Pero el árbol de renderedDocument se
 *    pasa a VectorDocViewer, que llama a pdf(document).toBlob() de
 *    @react-pdf/renderer — ese paquete usa su PROPIO reconciler interno para
 *    armar el PDF, que no implementa el protocolo de Suspense de React DOM.
 *    Resultado: "Cannot read properties of null (reading 'props')" en cada
 *    vista previa.
 * 2. Se corrigió (import directo, sin lazy) en un PR aparte. Un PR posterior
 *    ("fix(perf): restaurar lazy-loading revertido...") partió de una rama
 *    vieja que todavía tenía el bug, lo interpretó como "alguien deshizo mi
 *    optimización sin querer" y lo volvió a aplicar — reintroduciendo
 *    exactamente el mismo error en producción una segunda vez.
 *
 * Este test no verifica comportamiento en runtime (para eso ya existe
 * scripts/verify-pdf-render-smoke.js, que importa TemplateRenderer directo y
 * por eso NO detectó esta regresión — no pasa por CVPreview.tsx). Este test
 * verifica el INVARIANTE estructural exacto que rompió las dos veces:
 * TemplateRenderer/CardSheetDocument deben llegar a pdf() como componentes
 * resueltos de forma síncrona, nunca envueltos en React.lazy().
 *
 * Si este test falla, NO es un falso positivo — es este bug volviendo por
 * tercera vez. Revisar CVPreview.tsx antes de tocar nada de lazy-loading ahí.
 */
describe('CVPreview.tsx — compatibilidad con @react-pdf/renderer', () => {
  const filePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../src/modules/cv-builder/components/CVPreview.tsx'
  );
  const source = readFileSync(filePath, 'utf-8');

  it('NO debe envolver TemplateRenderer en React.lazy()', () => {
    expect(source).not.toMatch(/lazy\(\s*\(\)\s*=>\s*import\([^)]*TemplateRenderer/);
  });

  it('NO debe envolver CardSheetDocument en React.lazy()', () => {
    expect(source).not.toMatch(/lazy\(\s*\(\)\s*=>\s*import\([^)]*CardSheetDocument/);
  });

  it('el árbol pasado a <VectorDocViewer document={...}> no debe contener <Suspense>', () => {
    // Heurística: entre la declaración de renderedDocument y su uso en
    // VectorDocViewer no debería aparecer la palabra "Suspense" —
    // @react-pdf/renderer no la soporta en el árbol que reconstruye.
    const renderedDocumentBlockMatch = source.match(
      /const renderedDocument = useMemo\(\(\) => \{([\s\S]*?)\}, \[/
    );
    expect(renderedDocumentBlockMatch).not.toBeNull();
    const block = renderedDocumentBlockMatch?.[1] ?? '';
    expect(block).not.toMatch(/Suspense/);
  });

  it('TemplateRenderer y CardSheetDocument deben importarse de forma directa (no lazy)', () => {
    expect(source).toMatch(
      /import \{ TemplateRenderer \} from ['"].*TemplateRenderer['"];?/
    );
    expect(source).toMatch(
      /import \{ CardSheetDocument \} from ['"].*CardSheetDocument['"];?/
    );
  });
});
