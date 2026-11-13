import { describe, it, expect } from 'vitest';
import { ICON_REGISTRY, getIcon } from '../src/shared/core/pdf-engine/layers/icons/iconRegistry';
import {
  SECTION_ICON_IDS,
  PRODUCT_ICON_IDS,
  UI_ICON_IDS,
  resolveSectionIconId
} from '../src/shared/core/ui/iconCatalog';
import { CANONICAL_SECTION_ORDER, MAX_CUSTOM_SLOTS } from '../src/shared/core/sections/canonicalSectionOrder';

/** Misma entidad/acción = mismo ícono; entidades distintas = ícono distinto. */
const normalizePaths = (paths: string[]) =>
  paths.map((p) => p.replace(/\s+/g, ' ').trim()).sort().join('|');

describe('Iconos únicos canónicos (catálogo central)', () => {
  it('1. ICON_REGISTRY: ningún par de íconos dibuja los mismos trazados', () => {
    const byPath = new Map<string, string[]>();
    for (const [id, def] of Object.entries(ICON_REGISTRY)) {
      const key = normalizePaths(def.paths);
      byPath.set(key, [...(byPath.get(key) || []), id]);
    }
    for (const [key, ids] of byPath) {
      expect(ids.length, `trazados duplicados: ${ids.join(', ')}`).toBe(1);
      expect(key.length).toBeGreaterThan(0);
    }
  });

  it('2. SECTION_ICON_IDS cubre todas las secciones canónicas', () => {
    for (const secId of CANONICAL_SECTION_ORDER) {
      expect(SECTION_ICON_IDS[secId], `sección '${secId}' sin ícono`).toBeTruthy();
      expect(ICON_REGISTRY[SECTION_ICON_IDS[secId]]).toBeDefined();
    }
  });

  it('3. Slots personalizada-1..5 tienen ícono determinista propio (nunca fallback)', () => {
    for (let i = 1; i <= MAX_CUSTOM_SLOTS; i++) {
      const slot = `personalizada-${i}`;
      expect(ICON_REGISTRY[SECTION_ICON_IDS[slot]]).toBeDefined();
      expect(SECTION_ICON_IDS[slot]).not.toBe('fallback');
      expect(resolveSectionIconId(slot)).toBe(SECTION_ICON_IDS[slot]);
    }
  });

  it('4. Slots card_* y redes social-* cubiertos y resueltos', () => {
    for (const slot of ['card_size', 'card_extract', 'card_logo', 'card_front', 'card_back', 'card_qr']) {
      expect(ICON_REGISTRY[SECTION_ICON_IDS[slot]]).toBeDefined();
    }
    for (const slot of ['social-professional', 'social-code', 'social-email', 'social-web']) {
      expect(ICON_REGISTRY[SECTION_ICON_IDS[slot]]).toBeDefined();
    }
  });

  it('5. Cero colisiones: valores únicos por mapa y disjunción sección/producto/UI', () => {
    const values = Object.values(SECTION_ICON_IDS);
    expect(new Set(values).size, 'colisión dentro de SECTION_ICON_IDS').toBe(values.length);

    const productValues = Object.values(PRODUCT_ICON_IDS);
    expect(new Set(productValues).size).toBe(productValues.length);

    const uiValues = Object.values(UI_ICON_IDS);
    expect(new Set(uiValues).size).toBe(uiValues.length);

    const sectionSet = new Set(values);
    for (const id of productValues) expect(sectionSet.has(id)).toBe(false);
    for (const id of uiValues) expect(sectionSet.has(id)).toBe(false);
    const productSet = new Set(productValues);
    for (const id of uiValues) expect(productSet.has(id)).toBe(false);
  });

  it('6. Todos los valores del catálogo existen en ICON_REGISTRY (nada colgado)', () => {
    for (const map of [SECTION_ICON_IDS, PRODUCT_ICON_IDS, UI_ICON_IDS]) {
      for (const [key, iconId] of Object.entries(map)) {
        expect(ICON_REGISTRY[iconId], `ícono '${iconId}' (${key}) inexistente`).toBeDefined();
      }
    }
  });

  it('7. resolveSectionIconId normaliza sufijo -cont de banners de contenedor', () => {
    expect(resolveSectionIconId('contacto-cont')).toBe(SECTION_ICON_IDS['contacto']);
    expect(resolveSectionIconId('experiencia-cont')).toBe(SECTION_ICON_IDS['experiencia']);
  });

  it('8. resolveSectionIconId: override del usuario gana sobre todo; customSections gana sobre slot', () => {
    const cvData = {
      sectionIconOverrides: { 'personalizada-2': 'portafolio' },
      customSections: [{ id: 'personalizada-1', iconId: 'logros' }]
    };
    // 1. override explícito
    expect(resolveSectionIconId('personalizada-2', cvData)).toBe('portafolio');
    // 2. customSections (legado) gana sobre el slot determinista
    expect(resolveSectionIconId('personalizada-1', cvData)).toBe('logros');
    // 3. sin override ni customSections: slot determinista
    expect(resolveSectionIconId('personalizada-3')).toBe('personalizada-3');
  });

  it('9. resolveSectionIconId: entrada vacía o irreconocible devuelve fallback', () => {
    expect(resolveSectionIconId('')).toBe('fallback');
    expect(resolveSectionIconId('seccion-que-no-existe')).toBe('fallback');
    // @ts-expect-error — entrada inválida robustecida
    expect(resolveSectionIconId(undefined)).toBe('fallback');
  });

  it('10. getIcon nunca devuelve undefined (fallback garantizado)', () => {
    expect(getIcon('id-inexistente')).toBeDefined();
    expect(getIcon('personalizada-5')?.paths.length).toBeGreaterThan(0);
  });
});
