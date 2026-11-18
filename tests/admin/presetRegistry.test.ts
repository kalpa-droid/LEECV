import { describe, it, expect } from 'vitest';
import {
  PRESET_LIST,
  getAllPresets,
} from '../../src/shared/core/pdf-engine/layers/presets/presetRegistry';

/**
 * Regresión del bug del Proxy de PRESET_LIST:
 * antes, `PRESET_LIST[0]` devolvía `Array.prototype.values` (la función) en vez
 * del primer preset, porque `Symbol.iterator in Object("0")` es `true` (un
 * String implementa Symbol.iterator). `TemplateManagementTab` lo ejecutaba
 * como lazy initializer de useState y explotaba con
 * "TypeError: Cannot convert undefined or null to object at values".
 */
describe('PRESET_LIST (Proxy sobre PRESET_MAP)', () => {
  it('PRESET_LIST[0] es el primer preset, no una función', () => {
    const first = PRESET_LIST[0];
    expect(first).toBeTruthy();
    expect(typeof first).not.toBe('function');
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first.id).toBe(Array.from(PRESET_LIST)[0].id);
  });

  it('el índice numérico gana sobre Symbol.iterator (prop="0", prop="10")', () => {
    for (const idx of [0, 1, 10]) {
      const item = PRESET_LIST[idx];
      if (item !== undefined) expect(typeof item).toBe('object');
    }
  });

  it('itera con for...of / spread sin lanzar', () => {
    const viaSpread = [...PRESET_LIST];
    expect(viaSpread.length).toBeGreaterThan(0);
    expect(viaSpread.length).toBe(PRESET_LIST.length);

    let count = 0;
    for (const preset of PRESET_LIST) {
      expect(preset).toHaveProperty('id');
      count += 1;
    }
    expect(count).toBe(PRESET_LIST.length);
  });

  it('length, map, filter, find y forEach devuelven datos coherentes', () => {
    const ids = PRESET_LIST.map((p) => p.id);
    expect(ids.length).toBe(PRESET_LIST.length);

    const documentos = PRESET_LIST.filter((p) => p.pageCategory === 'documento');
    expect(documentos.length).toBe(getAllPresets().length);

    expect(PRESET_LIST.find((p) => p.id === ids[0])?.id).toBe(ids[0]);

    let seen = 0;
    PRESET_LIST.forEach(() => {
      seen += 1;
    });
    expect(seen).toBe(PRESET_LIST.length);
  });
});
