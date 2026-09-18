/**
 * NÚCLEO — MOTOR DE CICLO DE VIDA Y TITULACIÓN AUTOMÁTICA DE DOCUMENTOS (documentLifecycleEngine.ts)
 *
 * Responsabilidades:
 * 1. Proporcionar identificadores estables para borradores iniciales (Draft Singleton)
 *    evitando que cada recarga genere un nuevo ID y se acumulen cientos de pestañas.
 * 2. Calcular en tiempo real el título descriptivo del documento:
 *    - Si el usuario introdujo su nombre y apellido: "CV - Juan Pérez" (o "CV - Juan Pérez — Puesto").
 *    - Si introdujo cualquier otro registro pero aún no su nombre: "CV - [Fecha y Hora]" (o con el puesto).
 *    - Si es un borrador nuevo sin cambios: "Nuevo Currículum" / "Nueva Tarjeta".
 * 3. Respetar estrictamente copias por puesto (version_label).
 * 4. Excluir libros (docType === 'book') que se diseñan y exportan en el momento.
 */

export const DRAFT_CV_ID = 'draft_cv';
export const DRAFT_CARD_ID = 'draft_card';
export const DRAFT_COVER_LETTER_ID = 'draft_cover_letter';
export const DRAFT_BOOK_ID = 'draft_book';

export function isDraftDocumentId(id?: string): boolean {
  if (!id) return true;
  return id === DRAFT_CV_ID || id === DRAFT_CARD_ID || id === DRAFT_COVER_LETTER_ID || id === DRAFT_BOOK_ID || id.startsWith('draft_');
}

export function getDraftIdForDocType(docType: 'cv' | 'business_card' | 'book' | 'cover_letter'): string {
  switch (docType) {
    case 'business_card': return DRAFT_CARD_ID;
    case 'cover_letter': return DRAFT_COVER_LETTER_ID;
    case 'book': return DRAFT_BOOK_ID;
    default: return DRAFT_CV_ID;
  }
}

/**
 * Formatea fecha y hora en estilo compacto latinoamericano (ej: "16/09 20:30")
 */
export function formatCompactDateTime(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month} ${hours}:${minutes}:${seconds}`;
}

/**
 * Extrae el nombre limpio del candidato del objeto de datos.
 * Retorna null si está vacío o solo contiene placeholders.
 */
export function extractCandidateName(docData: any): string | null {
  if (!docData) return null;
  const p = docData.personalInfo || {};

  const rawFull = (p.fullName || '').trim();
  const rawNombre = (p.nombre || p.givenNames || '').trim();
  const rawApellido = (p.apellido || p.surname || '').trim();

  let candidate = '';
  if (rawFull && !isPlaceholderName(rawFull)) {
    candidate = rawFull;
  } else if (rawNombre || rawApellido) {
    candidate = `${rawNombre} ${rawApellido}`.trim();
  }

  if (!candidate || isPlaceholderName(candidate)) {
    return null;
  }
  return candidate;
}

function isPlaceholderName(name: string): boolean {
  const normalized = name.toLowerCase().trim();
  return (
    normalized === 'nombre y apellido' ||
    normalized === 'tu nombre' ||
    normalized === 'documento' ||
    normalized === 'candidato' ||
    normalized === 'nombre' ||
    normalized === 'apellido'
  );
}

/**
 * Calcula el título automático del documento respetando el puesto laboral (version_label).
 */
export function computeAutoDocumentTitle(
  docData: any,
  docType: 'cv' | 'business_card' | 'book' | 'cover_letter' = 'cv',
  options?: { isDirty?: boolean; modifiedAt?: Date }
): string {
  // Los libros no se autotitulan dinámicamente: se imprimen/exportan en el momento
  if (docType === 'book') {
    return docData?.title || 'Libro de Impresión';
  }

  const prefix = docType === 'business_card' 
    ? 'Tarjeta' 
    : docType === 'cover_letter' 
    ? 'Carta' 
    : 'CV';

  const versionLabel = (docData?.version_label || '').trim();
  const suffix = versionLabel ? ` — ${versionLabel}` : '';

  const candidateName = extractCandidateName(docData);

  if (candidateName) {
    return `${prefix} - ${candidateName}${suffix}`;
  }

  // Si hay cambios pero aún no se ingresó el nombre: usar fecha y hora de inicio de edición
  if (options?.isDirty || docData?.isDirty) {
    let baseDate: Date | null = null;
    
    // 1. Extraer timestamp de creación desde el ID (ej: "cv_1710000000000")
    if (docData?.id) {
      const parts = docData.id.split('_');
      if (parts.length > 1) {
        const ts = parseInt(parts[1], 10);
        // Validar que parezca un timestamp en ms razonable (mayor al año 2001)
        if (!isNaN(ts) && ts > 1000000000000) {
          baseDate = new Date(ts);
        }
      }
    }

    // 2. Fallback a updatedAt si existe
    if (!baseDate && docData?.updatedAt) {
      const parsed = new Date(docData.updatedAt);
      if (!isNaN(parsed.getTime())) baseDate = parsed;
    }
    
    // 3. Fallback a modifiedAt de las opciones, y si nada funciona, a 'ahora' pero solo se evalúa una vez
    if (!baseDate) {
      baseDate = options?.modifiedAt || new Date();
    }

    const timeStr = formatCompactDateTime(baseDate);
    return `${prefix} - ${timeStr}${suffix}`;
  }

  // Borrador limpio sin modificar
  if (versionLabel) {
    return `${prefix} — ${versionLabel}`;
  }

  return docType === 'business_card' ? 'Nueva Tarjeta' : 'Nuevo Currículum';
}

/**
 * Acepta tanto el documento completo (isProvisional) como el resumen de la lista
 * guardada (DocumentRecord.is_provisional). Los dos representan lo mismo y los dos
 * llegan acá: el reconciliador filtra sobre resúmenes, closeTab sobre documentos.
 */
export function isProvisionalDocument(doc: any): boolean {
  if (!doc) return false;
  const flag = doc.isProvisional !== undefined ? doc.isProvisional : doc.is_provisional;
  return flag !== false;
}

export function markAsConfirmed<T extends Record<string, any>>(doc: T): T {
  return { ...doc, isProvisional: false };
}

/**
 * Guardarraíl contra llenar la lista "Abrir" de documentos vacíos: solo se
 * reconcilia lo que tiene contenido real cargado por el usuario.
 */
export function hasRealContent(doc: any): boolean {
  if (!doc) return false;
  if (extractCandidateName(doc)) return true;

  const p = doc.personalInfo || {};
  if ((p.email || '').trim() || (p.phone || '').trim() || (p.quote || '').trim()) return true;

  const listFields = ['roles', 'education', 'professions', 'courses', 'skills', 'languages', 'projects', 'customSections'];
  return listFields.some((f) => Array.isArray(doc[f]) && doc[f].length > 0);
}

