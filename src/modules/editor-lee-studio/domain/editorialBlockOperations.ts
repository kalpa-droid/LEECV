import type { EditorialRecord, EditorialRecordType } from './editorialTypes';

export function createDefaultEditorialRecord(
  type: EditorialRecordType,
  extra?: Partial<EditorialRecord>,
): EditorialRecord {
  const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  if (type === 'table') {
    return {
      id,
      type: 'table',
      content: 'Tabla comparativa',
      tableCaption: 'Tabla 1.',
      tableHeaders: ['Columna 1', 'Columna 2'],
      tableRows: [['Dato 1', 'Dato 2']],
      tableStylePreset: 'apa',
      ...extra,
    };
  }
  if (type === 'image') {
    return {
      id,
      type: 'image',
      content: '',
      imageLayoutMode: 'centered',
      imageWidthPct: 75,
      ...extra,
    };
  }
  return {
    id,
    type,
    content: '',
    ...(type === 'subtitle' ? { subtitleLevel: 2 } : {}),
    ...(type === 'list' ? { listStyle: 'bullet' } : {}),
    ...(type === 'callout' ? { calloutVariant: 'nota', calloutTitle: 'Nota destacada', calloutItems: [] } : {}),
    ...(type === 'poem' ? { preserveLineBreaks: true } : {}),
    ...(type === 'figure_placeholder' ? { figureNumber: 'Figura 1', figureCaption: 'Descripción de la figura' } : {}),
    ...extra,
  };
}

export function insertRecordAt(
  records: EditorialRecord[],
  index: number,
  newRecord: EditorialRecord,
): EditorialRecord[] {
  const safe = Array.isArray(records) ? [...records] : [];
  const clamped = Math.max(0, Math.min(safe.length, Math.floor(index)));
  safe.splice(clamped, 0, newRecord);
  return safe;
}

export function moveRecord(
  records: EditorialRecord[],
  index: number,
  delta: -1 | 1,
): EditorialRecord[] {
  const safe = Array.isArray(records) ? [...records] : [];
  const target = index + delta;
  if (index < 0 || index >= safe.length || target < 0 || target >= safe.length) {
    return safe;
  }
  const [item] = safe.splice(index, 1);
  safe.splice(target, 0, item);
  return safe;
}

export function reorderRecord(
  records: EditorialRecord[],
  fromIndex: number,
  toIndex: number,
): EditorialRecord[] {
  const safe = Array.isArray(records) ? [...records] : [];
  if (
    fromIndex < 0 ||
    fromIndex >= safe.length ||
    toIndex < 0 ||
    toIndex >= safe.length ||
    fromIndex === toIndex
  ) {
    return safe;
  }
  const [item] = safe.splice(fromIndex, 1);
  safe.splice(toIndex, 0, item);
  return safe;
}

/**
 * Divide un bloque de texto/párrafo en la posición del cursor (o en la frontera lógica
 * más natural cerca de la mitad) para intercalar una imagen, cita o tabla en medio del texto.
 */
export function splitParagraphRecord(
  records: EditorialRecord[],
  recordId: string,
  cursorOffset?: number,
): { records: EditorialRecord[]; createdId: string | null } {
  const safe = Array.isArray(records) ? [...records] : [];
  const idx = safe.findIndex((r) => r.id === recordId);
  if (idx < 0) return { records: safe, createdId: null };

  const target = safe[idx];
  const raw = String(target.content || '');
  const trimmedLen = raw.trim().length;
  if (trimmedLen < 4) {
    // Bloque vacío o casi vacío: simplemente abrir un párrafo nuevo debajo
    const created = createDefaultEditorialRecord('paragraph', { content: '' });
    return {
      records: insertRecordAt(safe, idx + 1, created),
      createdId: created.id,
    };
  }

  let cut =
    typeof cursorOffset === 'number' && cursorOffset > 0 && cursorOffset < raw.length
      ? cursorOffset
      : -1;

  if (cut < 0) {
    const mid = Math.floor(raw.length / 2);
    const nl = raw.indexOf('\n', mid);
    const space = raw.indexOf(' ', mid);
    cut = nl > 0 && nl < raw.length - 1 ? nl : space > 0 && space < raw.length - 1 ? space : mid;
  }

  const firstPart = raw.slice(0, cut).trimEnd();
  const secondPart = raw.slice(cut).trimStart();
  if (!firstPart || !secondPart) {
    const created = createDefaultEditorialRecord('paragraph', { content: '' });
    return {
      records: insertRecordAt(safe, idx + 1, created),
      createdId: created.id,
    };
  }

  const created = createDefaultEditorialRecord('paragraph', { content: secondPart });
  const updated = safe.map((r, i) => (i === idx ? { ...r, content: firstPart } : r));
  return {
    records: insertRecordAt(updated, idx + 1, created),
    createdId: created.id,
  };
}
