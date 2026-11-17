/**
 * VERIFICACIÓN ANTI-REGRESIÓN: Lidio siempre con tip + PDFs problemáticos.
 *
 * 1) LIDIO (runtime, módulo puro):
 *    - pickAlwaysTip JAMÁS devuelve null (prioridad pestaña → transversales → repaso),
 *      para cv y book, en todos los estados de "visto".
 *    - pickNextTipCycled avanza manual ("Otro tip"/"Entendido") recorriendo el
 *      catálogo completo sin repetir hasta cerrar el ciclo.
 *    - Los 3 huecos de contenido auditados: creep, doble cara (borde corto),
 *      guías de armado (marcas de corte).
 *    - Wiring del componente: botón "Otro tip", resolución al abrir el panel,
 *      precarga tras "Entendido" y liberación del tip al cerrar.
 *
 * 2) PDFs problemáticos (clasificador + wiring de UI/engine):
 *    - Clasificación tipada: 0 bytes, PasswordException, InvalidPDFException,
 *      MissingPDFException, PDF sin páginas → aviso propio por código.
 *    - Contraseña de apertura: cuadro inline (sin window.prompt), reintento
 *      con la clave SOLO en memoria de sesión (nunca persistida en options).
 *    - Protegido contra edición: detección con pdf-lib (ignoreEncryption) en
 *      la carga, conmutación automática a exportMode 'raster' y aviso en los
 *      pasos 1, 6 y 7. El camino raster de pdf.js recibe la contraseña si
 *      hubiera; el vectorial lanza un mensaje de rescate claro.
 */

import fs from 'fs';
import path from 'path';
import {
  ALL_BOOK_TIPS,
  ALL_TIPS,
  TAB_TIPS,
  pickAlwaysTip,
  pickNextTipCycled,
} from '../src/shared/core/assistant/assistantTips';
import {
  PdfSourceError,
  classifyPdfSourceError,
  isPdfSourceError,
  pdfSourceErrorFromUnknown,
} from '../src/shared/core/book-engine/pdfSourceClassifier';

let failures = 0;
let passes = 0;

const expectTrue = (condition: boolean, label: string, detail: string = '') => {
  if (condition) {
    passes++;
    console.log(`  ✓ ${label}${detail ? ` (${detail})` : ''}`);
  } else {
    failures++;
    console.error(`  ✗ FALLO: ${label}${detail ? ` (${detail})` : ''}`);
  }
};

const readSource = (rel: string): string =>
  fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');

function containsAll(source: string, needles: string[]): string[] {
  return needles.filter((n) => !source.includes(n));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) LIDIO SIEMPRE CON TIP
// ─────────────────────────────────────────────────────────────────────────────
function verifyLidioRuntime() {
  console.log('\n── 1) Lidio siempre con tip (pickAlwaysTip + pickNextTipCycled) ──');

  // pickAlwaysTip JAMÁS null en cv y book, todos los estados.
  let neverNull = true;
  const catalogs: Record<'cv' | 'book', string[]> = { cv: ALL_TIPS.map((t) => t.id), book: ALL_BOOK_TIPS.map((t) => t.id) };
  for (const docType of ['cv', 'book'] as const) {
    const all = catalogs[docType];
    for (const tab of [undefined, null, 'pestaña-inexistente', ...Object.keys(catalogs)]) {
      for (const seen of [[], all, ['id-inventado']]) {
        const tip = pickAlwaysTip(tab as any, seen as string[], docType);
        if (!tip || !tip.id || !all.includes(tip.id)) neverNull = false;
      }
    }
  }
  expectTrue(neverNull, 'pickAlwaysTip devuelve un tip válido del catálogo en TODOS los estados (cv y book)');

  // Repaso: con todo visto, rota por el ciclo de la pestaña activa (los tips
  // específicos; los transversales si la pestaña no tiene).
  const allCv = ALL_TIPS.map((t) => t.id);
  const repaso = pickAlwaysTip('vacante', allCv);
  expectTrue(TAB_TIPS.vacante.some((t) => t.id === repaso.id), 'repaso: con todo visto devuelve un tip del ciclo de la pestaña activa');
  const nextInCycle = pickAlwaysTip('vacante', allCv, 'cv', 'tip-vacante-1');
  expectTrue(nextInCycle.id === 'tip-vacante-2', 'repaso con afterTipId avanza al siguiente tip del ciclo');

  // pickNextTipCycled recorre el catálogo completo sin repetir hasta cerrar el ciclo.
  let current: string | null = allCv[0];
  const visited = new Set<string>([current]);
  let cycledClean = true;
  for (let i = 0; i < allCv.length - 1; i++) {
    const next = pickNextTipCycled(current, allCv, 'cv');
    if (!next || visited.has(next.id)) { cycledClean = false; break; }
    visited.add(next.id);
    current = next.id;
  }
  expectTrue(cycledClean && pickNextTipCycled(current, allCv, 'cv')?.id === allCv[0],
    `pickNextTipCycled recorre los ${allCv.length} tips cv sin repetir y cierra el ciclo`);

  // Los 3 huecos de contenido (auditados contra el catálogo book).
  const bookBodies = ALL_BOOK_TIPS.map((t) => `${t.title} ${t.body}`).join(' ');
  expectTrue(bookBodies.includes('creep'), 'tip de creep (compensar páginas internas)');
  expectTrue(bookBodies.includes('borde corto'), 'tip de doble cara / voltear por borde corto');
  expectTrue(bookBodies.includes('marcas de corte'), 'tip de guías de armado / marcas de corte');
}

function verifyLidioWiring() {
  console.log('\n── 2) Wiring de FloatingAssistant (botón "Otro tip" + resolución al abrir) ──');
  const src = readSource('src/modules/cv-builder/components/FloatingAssistant.tsx');

  const missing = containsAll(src, [
    'pickAlwaysTip',
    'pickNextTipCycled',
    'Otro tip',
    'resolveTipForPanel',
    'showAnotherTip',
    'acknowledgeTip',
    'closePanel',
    'handleToggleOpen',
  ]);
  expectTrue(missing.length === 0, 'FloatingAssistant: imports + botón "Otro tip" + resolución al abrir + precarga tras "Entendido"',
    missing.length ? `falta: ${missing.join(', ')}` : 'todo presente');

  // La resolución al abrir solo consume la vista pedida por el usuario: no
  // cuenta para el tope por sesión ni dispara toast (sin persistSessionCount
  // dentro de resolveTipForPanel).
  const resolveBlock = src.slice(src.indexOf('const resolveTipForPanel'), src.indexOf('const handleToggleOpen'));
  expectTrue(resolveBlock.includes('pickAlwaysTip') && !resolveBlock.includes('persistSessionCount'),
    'resolver al abrir NO consume el tope de sesión de tips automáticos');
  expectTrue(resolveBlock.includes('lastShownTipRef.current'),
    'el repaso al abrir el panel rota desde el último tip mostrado (no repite siempre el mismo)');

  // El FAB y la pestaña Tips resuelven un tip si no hay ninguno activo.
  expectTrue(/onClick=\{handleToggleOpen\}/.test(src), 'el botón flotante usa handleToggleOpen (resuelve tip al abrir)');
  expectTrue(/setView\('tips'\); resolveTipForPanel\(\)/.test(src), 'entrar a la vista Tips también resuelve un tip al instante');

  // El estado vacío "Estás al día" queda como fallback defensivo inalcanzable
  // (pickAlwaysTip nunca devuelve null): se conserva el bloque.
  expectTrue(src.includes('Estás al día'), 'fallback defensivo "Estás al día" se conserva (bloque inalcanzable)');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) CLASIFICADOR DE PDFs PROBLEMÁTICOS
// ─────────────────────────────────────────────────────────────────────────────
function verifyClassifier() {
  console.log('\n── 3) Clasificación tipada de PDFs problemáticos ──');

  const namedError = (name: string) => {
    const err = new Error('detalle');
    err.name = name;
    return err;
  };

  expectTrue(classifyPdfSourceError(namedError('PasswordException')) === 'password', 'PasswordException → password');
  expectTrue(classifyPdfSourceError(namedError('InvalidPDFException')) === 'corrupt', 'InvalidPDFException → corrupt');
  expectTrue(classifyPdfSourceError(namedError('MissingPDFException')) === 'missing', 'MissingPDFException → missing');
  expectTrue(classifyPdfSourceError(new Error('x'), 0) === 'empty-file', 'archivo de 0 bytes → empty-file');
  expectTrue(classifyPdfSourceError(new Error('x')) === 'unknown', 'error sin tipo → unknown');

  const typed = new PdfSourceError('password');
  expectTrue(isPdfSourceError(typed) && typed.code === 'password', 'PdfSourceError tipado con código estable');
  expectTrue(pdfSourceErrorFromUnknown(typed) === typed, 'no se re-envuelve un error ya tipado');
  const wrapped = pdfSourceErrorFromUnknown(namedError('InvalidPDFException'));
  expectTrue(wrapped.code === 'corrupt', 'los errores crudos se envuelven con su código');
}

function verifyPdfWiring() {
  console.log('\n── 4) Wiring de carga protegida/dañada (contenedor, paso 1, motor) ──');

  const content = readSource('src/modules/book-studio/BookStudioContent.tsx');
  const missingContent = containsAll(content, [
    "PDFDocument.load(arrayBuffer, { ignoreEncryption: true })", // detección de protección en la carga
    "exportMode: isEncrypted ? 'raster'",                       // conmutación automática a imágenes
    'passwordChallenge',                                         // cuadro inline de contraseña
    "type=\"password\"",                                         // input de contraseña (sin window.prompt)
    'setPasswordChallenge({ fileName: file.name, wrongPassword: Boolean(password) })',
    'empty-file',                                                // guard file.size === 0
    'empty-pdf',                                                 // guard numPages === 0
    'pdfProtection',
    'PDF_LOAD_ERROR_TEXT',                                       // aviso por código en el contenedor
    'protectionNoticeUnlocked',                                  // aviso paso 1 (desbloqueado)
    'protectionNotice',                                          // aviso paso 1 (protegido)
  ]);
  expectTrue(missingContent.length === 0, 'BookStudioContent: detección + rescate automático + challenge de contraseña + avisos',
    missingContent.length ? `falta: ${missingContent.join(', ')}` : 'todo presente');

  // La contraseña NUNCA viaja en options (se persisten en saveBook): solo como
  // parámetro explícito del motor.
  expectTrue(!/exportMode.*pdfPassword|pdfPassword.*options\./.test(content), 'la contraseña no se guarda dentro de options');

  const sourceStep = readSource('src/modules/book-studio/BookSourceTypeStep.tsx');
  const missingStep = containsAll(sourceStep, [
    'isPdfSourceError',
    "err.code !== 'password'", // el challenge inline reemplaza el mensaje genérico
    'PDF_SOURCE_ERROR_TEXT',
  ]);
  expectTrue(missingStep.length === 0, 'BookSourceTypeStep: aviso tipado por código (sin genérico para password)',
    missingStep.length ? `falta: ${missingStep.join(', ')}` : 'todo presente');

  const engine = readSource('src/shared/core/book-engine/impositionEngine.ts');
  const missingEngine = containsAll(engine, [
    '/encrypt/i.test(msg)',           // red de seguridad del camino vectorial
    'Imágenes compatibles',           // mensaje de rescate en lenguaje sencillo
    'pdfPassword?: string | null',    // firma de processBookImposition
    '...(pdfPassword ? { password: pdfPassword } : {})', // camino raster con clave
  ]);
  expectTrue(missingEngine.length === 0, 'impositionEngine: rescate vectorial + contraseña en el camino raster',
    missingEngine.length ? `falta: ${missingEngine.join(', ')}` : 'todo presente');

  const exportStep = readSource('src/modules/book-studio/BookPreviewExportStep.tsx');
  const missingExport = containsAll(exportStep, [
    'pdfPassword?: string | null',
    '}, pdfPassword);',               // la clave llega al motor en la exportación
    'previewExportStep.protectionNotice',
  ]);
  expectTrue(missingExport.length === 0, 'BookPreviewExportStep: contraseña retenida en sesión + aviso de protección',
    missingExport.length ? `falta: ${missingExport.join(', ')}` : 'todo presente');

  const impositionStep = readSource('src/modules/book-studio/BookImpositionStep.tsx');
  expectTrue(impositionStep.includes('sourceProtected') && impositionStep.includes('disabled={sourceProtected}'),
    'paso 6: modo export bloqueado en automático cuando el PDF está protegido');

  const catalog = readSource('src/shared/i18n/catalog/bookStudio.ts');
  const missingCatalog = containsAll(catalog, [
    'errorEmptyFile:', 'errorCorrupt:', 'errorMissing:', 'errorEmptyPdf:', 'errorUnknown:',
    'passwordRequiredTitle:', 'passwordWrong:', 'passwordSubmit:', 'protectionNotice:', 'protectionBadge:',
  ]);
  expectTrue(missingCatalog.length === 0, 'catálogo i18n: avisos en lenguaje sencillo por cada código',
    missingCatalog.length ? `falta: ${missingCatalog.join(', ')}` : 'todo presente');
}

async function main() {
  console.log('🔍 Verificación anti-regresión: Lidio siempre con tip + PDFs problemáticos...');
  verifyLidioRuntime();
  verifyLidioWiring();
  verifyClassifier();
  verifyPdfWiring();

  console.log('\n══════════════════════════════════════════════════════════');
  if (failures > 0) {
    console.error(`⛔ VERIFICACIÓN FALLIDA: ${failures} fallo(s), ${passes} verificaciones OK.`);
    process.exit(1);
  }
  console.log(`✅ VERIFICACIÓN EXITOSA: ${passes}/${passes} verificaciones pasaron al 100%.`);
}

main().catch((err) => {
  console.error('⛔ ERROR FATAL DE LA VERIFICACIÓN:', err);
  process.exit(1);
});
