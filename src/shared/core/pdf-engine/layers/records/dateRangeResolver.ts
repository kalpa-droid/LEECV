/**
 * NÚCLEO — RESOLVEDOR DE RANGOS DE FECHAS (dateRangeResolver.ts)
 * 
 * Unifica el cálculo de etiquetas de período/año para registros de CV,
 * evitando parches duplicados en cvDataAdapter.ts.
 */
export function resolveDateRange(record: any): string {
  if (!record || typeof record !== 'object') return '';
  if (record.year) return String(record.year);
  if (record.periodo) return String(record.periodo);
  if (record.startDate) {
    if (record.current) return `${record.startDate} - Presente`;
    if (record.endDate) return `${record.startDate} - ${record.endDate}`;
    return String(record.startDate);
  }
  if (record.endDate) return String(record.endDate);
  return '';
}
