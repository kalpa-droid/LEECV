/**
 * Núcleo puro — Motor Universal de Cascada Anti-Pisado (configCascadeEngine.ts)
 *
 * Modela los 3 niveles jerárquicos de configuración en cualquier app LEECV:
 * - Nivel 1 (Global): estándar superior (ej. Región del CV, Casa vs Imprenta,
 *   Obra + Norma de página + Citas).
 * - Nivel 2 (Preset / Molde visual): apariencia o disposición compatible con Nivel 1.
 * - Nivel 3 (Ajuste Fino / `manualOverrides`): campo puntual ajustado a mano.
 *
 * Regla de oro: nunca pisar silenciosamente un ajuste fino al cambiar presets,
 * y al cambiar el Nivel 1 permitir elegir explícitamente entre `apply-all`
 * (reemplazar conflictos por la norma global) o `preserve-manual`.
 *
 * Módulo PURO (sin React, sin DOM).
 */

export type ManualOverridesMap = Record<string, boolean>;

export interface GlobalCascadeConflict {
  fieldKey: string;
  label: string;
  currentValue: unknown;
  globalValue: unknown;
}

export type GlobalApplyMode = 'apply-all' | 'preserve-manual';

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Obtiene el mapa limpio de ajustes manuales activos sobre un objeto de configuración/documento. */
export function getManualOverrides(source: any): ManualOverridesMap {
  const raw = source?.manualOverrides;
  if (!isRecord(raw)) return {};
  const clean: ManualOverridesMap = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === true) clean[k] = true;
  }
  return clean;
}

/** Indica si un campo puntual tiene ajuste fino explícito. */
export function isManuallyOverridden(source: any, fieldKey: string): boolean {
  return getManualOverrides(source)[fieldKey] === true;
}

/** Cuenta cuántos ajustes finos activos hay (útil para indicadores en Barra Superior). */
export function countManualOverrides(source: any, keys?: readonly string[]): number {
  const map = getManualOverrides(source);
  if (!keys) return Object.keys(map).length;
  return keys.filter((k) => map[k] === true).length;
}

/** Devuelve una copia con el campo marcado como ajuste fino manual (`manualOverrides[fieldKey] = true`). */
export function markManualOverride<T extends Record<string, any>>(
  source: T,
  fieldKey: string,
): T {
  const nextMap = { ...getManualOverrides(source), [fieldKey]: true };
  return {
    ...source,
    manualOverrides: nextMap,
  };
}

/** Devuelve una copia limpiando el override manual de un campo puntual (vuelve al control global/preset). */
export function clearManualOverride<T extends Record<string, any>>(
  source: T,
  fieldKey: string,
  restoredValue?: unknown,
): T {
  const nextMap = { ...getManualOverrides(source) };
  delete nextMap[fieldKey];
  return {
    ...source,
    ...(restoredValue !== undefined ? { [fieldKey]: restoredValue } : {}),
    manualOverrides: nextMap,
  };
}

/**
 * Detecta qué campos ajustados manualmente por el usuario difieren de los valores
 * recomendados por un nuevo perfil global (Nivel 1).
 */
export function detectGlobalConflicts(
  source: any,
  globalDefaults: Record<string, unknown>,
  fieldLabels: Record<string, string> = {},
): GlobalCascadeConflict[] {
  const overrides = getManualOverrides(source);
  const conflicts: GlobalCascadeConflict[] = [];

  for (const [fieldKey, targetVal] of Object.entries(globalDefaults)) {
    if (!overrides[fieldKey]) continue;
    const currentVal = source?.[fieldKey];
    if (currentVal !== undefined && currentVal !== targetVal) {
      conflicts.push({
        fieldKey,
        label: fieldLabels[fieldKey] || fieldKey,
        currentValue: currentVal,
        globalValue: targetVal,
      });
    }
  }

  return conflicts;
}

/**
 * Aplica un cambio de configuración Global (Nivel 1) sobre `source` respetando Nivel 3:
 * - Si `mode === 'preserve-manual'`, aplica `alwaysPatch` + solo aquellos campos en `defaultsPatch`
 *   que NO estén marcados en `manualOverrides`.
 * - Si `mode === 'apply-all'`, sobrescribe con `defaultsPatch` y limpia los `manualOverrides` de esos campos.
 */
export function applyGlobalConfigWithCascade<T extends Record<string, any>>(
  source: T,
  params: {
    /** Campos identitarios del propio Nivel 1 (ej. `printTarget`, `normId`). Siempre se aplican. */
    alwaysPatch: Partial<T>;
    /** Valores por defecto derivados del Nivel 1 (sujetos a `manualOverrides`). */
    defaultsPatch: Partial<T>;
    mode?: GlobalApplyMode;
  },
): T {
  const { alwaysPatch, defaultsPatch, mode = 'preserve-manual' } = params;
  const prevOverrides = getManualOverrides(source);
  const nextOverrides: ManualOverridesMap = { ...prevOverrides };
  const resolvedDefaults: Record<string, any> = {};

  for (const [key, defaultVal] of Object.entries(defaultsPatch)) {
    if (mode === 'apply-all') {
      resolvedDefaults[key] = defaultVal;
      delete nextOverrides[key];
    } else if (!prevOverrides[key]) {
      resolvedDefaults[key] = defaultVal;
    }
  }

  return {
    ...source,
    ...resolvedDefaults,
    ...alwaysPatch,
    manualOverrides: nextOverrides,
  };
}
