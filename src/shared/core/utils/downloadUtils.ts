/**
 * NÚCLEO — HELPER ÚNICO DE DESCARGA DE ARCHIVOS EN NAVEGADOR (downloadUtils.ts)
 *
 * Centraliza la creación y liberación limpia de URLs de Blob y elementos <a> de descarga,
 * eliminando la duplicación en exportadores de PDF, tarjetas y JSON.
 */

export function downloadBlob(blob: Blob, fileName: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
