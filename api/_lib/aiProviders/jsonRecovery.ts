/**
 * Recuperación de JSON desde texto libre de proveedores de IA.
 *
 * Los proveedores pueden responder 200 OK con JSON válido, JSON rodeado de
 * preámbulo/prosa, fences de markdown (```json ... ```) o JSON truncado.
 * Esta capa intenta extraer el objeto/array útil ANTES de dar la respuesta
 * por buena; si no hay JSON recuperable, devuelve { ok: false } para que el
 * endpoint lo trate como fallo recuperable (reintentar otra clave/proveedor).
 */

export interface JsonRecoveryResult {
  ok: true;
  /** Texto JSON canónico (sin fences ni preámbulo) listo para devolver al cliente. */
  cleanText: string;
  /** Valor ya parseado (para validación contra responseSchema si hiciera falta). */
  value: any;
}

export interface JsonRecoveryFailure {
  ok: false;
}

export function recoverJsonFromText(raw: string | null | undefined): JsonRecoveryResult | JsonRecoveryFailure {
  if (!raw || typeof raw !== 'string') return { ok: false };
  let text = raw.trim();
  if (!text) return { ok: false };

  // 1. Fences de markdown: ```json ... ``` o ``` ... ```
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1] && fence[1].trim()) {
    text = fence[1].trim();
  }

  // 2. Primer { o [ hasta su cierre correspondiente (ignora prosa alrededor)
  const firstObj = text.indexOf('{');
  const firstArr = text.indexOf('[');
  let start = -1;
  let close = '}';
  if (firstObj === -1 && firstArr === -1) return { ok: false };
  if (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
    start = firstArr;
    close = ']';
  } else {
    start = firstObj;
  }
  const end = text.lastIndexOf(close);
  if (end <= start) return { ok: false }; // JSON truncado

  const candidate = text.slice(start, end + 1);
  try {
    const value = JSON.parse(candidate);
    return { ok: true, value, cleanText: JSON.stringify(value) };
  } catch {
    return { ok: false };
  }
}
