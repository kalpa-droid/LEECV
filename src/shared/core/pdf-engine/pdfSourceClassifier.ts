/**
 * NÚCLEO — Clasificador de PDFs problemáticos (pdfSourceClassifier.ts)
 *
 * Traduce los errores crudos de pdf.js / del entorno a códigos estables y
 * tipados para que la UI muestre el aviso correcto en lenguaje sencillo:
 *
 * - 'empty-file'   → el archivo pesa 0 bytes (no es un PDF, está vacío).
 * - 'password'     → PDF con contraseña de apertura (pdf.js PasswordException).
 * - 'corrupt'      → archivo dañado o no es un PDF válido (InvalidPDFException).
 * - 'missing'      → no se encontró el archivo (MissingPDFException).
 * - 'empty-pdf'    → el PDF se abrió pero no tiene páginas.
 * - 'unknown'      → error no tipado (mensaje genérico de lectura).
 *
 * Módulo PURO (sin DOM, sin pdf.js): clasifica por err.name para poder
 * testearse en node sin cargar el worker de pdf.js.
 */

export type PdfSourceErrorCode =
  | 'empty-file'
  | 'password'
  | 'corrupt'
  | 'missing'
  | 'empty-pdf'
  | 'unknown';

/** Error tipado que lanza la carga del PDF origen del Book Studio. */
export class PdfSourceError extends Error {
  readonly code: PdfSourceErrorCode;

  constructor(code: PdfSourceErrorCode, message?: string) {
    super(message || code);
    this.name = 'PdfSourceError';
    this.code = code;
  }
}

export function isPdfSourceError(err: unknown): err is PdfSourceError {
  return err instanceof PdfSourceError;
}

/** Clasifica un error crudo (pdf.js, archivo, entorno) en un código estable. */
export function classifyPdfSourceError(err: unknown, fileSize?: number): PdfSourceErrorCode {
  if (typeof fileSize === 'number' && fileSize === 0) return 'empty-file';
  const name = (err as { name?: unknown } | null | undefined)?.name;
  if (name === 'PasswordException') return 'password';
  if (name === 'MissingPDFException') return 'missing';
  if (name === 'InvalidPDFException') return 'corrupt';
  return 'unknown';
}

/**
 * Convierte un error crudo en PdfSourceError: si ya es tipado lo devuelve tal
 * cual; si no, lo clasifica (por nombre de excepción y tamaño del archivo).
 */
export function pdfSourceErrorFromUnknown(err: unknown, fileSize?: number): PdfSourceError {
  if (isPdfSourceError(err)) return err;
  const code = classifyPdfSourceError(err, fileSize);
  const detail = err instanceof Error ? err.message : undefined;
  return new PdfSourceError(code, detail ? `${code}: ${detail}` : code);
}

/**
 * ¿El archivo elegido parece un PDF? Acepta si file.type === application/pdf
 * (p. ej. Google Drive / Files en móvil) o si el nombre termina en .pdf
 * (case-insensitive). No exige ambas.
 */
export function isPdfLikeFile(file: { name?: string; type?: string } | null | undefined): boolean {
  if (!file) return false;
  if (file.type === 'application/pdf') return true;
  return (file.name || '').toLowerCase().endsWith('.pdf');
}

/**
 * ¿El error de carga de pdf.js es fatal (no tiene sentido reintentar cMaps)?
 * PasswordException = PDF protegido con contraseña; InvalidPDFException = el
 * archivo no es un PDF válido. Ambos fallarían igual en los 3 intentos.
 */
export function isFatalPdfLoadError(err: unknown): boolean {
  const name = (err as { name?: unknown } | null | undefined)?.name;
  return name === 'PasswordException' || name === 'InvalidPDFException';
}
