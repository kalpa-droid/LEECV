import type { Preset } from './layers/presets/presetSchema';

export type PdfCategoryExporter = (
  data: any,
  preset: Preset,
  atsMode?: boolean,
) => Promise<boolean>;

const categoryExporters = new Map<string, PdfCategoryExporter>();

/**
 * Registra el exportador PDF de una categoría de página (ej. `'carta'`, `'planner'`, `'factura'`, `'editorial'`)
 * desde su respectiva cápsula vertical, evitando que `pdfExporter.ts` importe renderizadores de módulos.
 */
export function registerPdfCategoryExporter(
  pageCategory: string,
  exporter: PdfCategoryExporter,
): void {
  categoryExporters.set(pageCategory, exporter);
}

export function getPdfCategoryExporter(
  pageCategory: string,
): PdfCategoryExporter | undefined {
  return categoryExporters.get(pageCategory);
}
