/**
 * formatDate.js
 * Centralized date formatting for CVs, timestamps, and admin tables.
 */

export function formatDate(dateStringOrTimestamp, options = {}) {
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
