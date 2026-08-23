export interface FormatDateOptions {
  includeTime?: boolean;
  locale?: string;
}

export function formatDate(
  dateStringOrTimestamp: string | number | Date | null | undefined, 
  options: FormatDateOptions = {}
): string {
  if (!dateStringOrTimestamp) return 'Fecha no especificada';

  const {
    includeTime = true,
    locale = 'es-AR'
  } = options;

  try {
    const d = new Date(dateStringOrTimestamp);
    if (isNaN(d.getTime())) return String(dateStringOrTimestamp);

    if (includeTime) {
      return d.toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    return d.toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (err) {
    return String(dateStringOrTimestamp);
  }
}

export function getMonthNameEs(date: Date = new Date()): string {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return months[date.getMonth()] || 'Enero';
}
