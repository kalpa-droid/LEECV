import { describe, it, expect } from 'vitest';
import { getAllCvFormats, getCvFormat } from '../src/shared/core/formats/cvFormatRegistry';
import { applyPresetLevel } from '../src/shared/core/pdf-engine/layers/presets/presetHierarchyEngine';
import { hasCapability } from '../src/shared/core/capabilities/capabilityRegistry';

describe('V3.0 Jerarquía de Región, Plantilla y Ajuste Manual (sin pisadas)', () => {
  it('todos los estándares regionales exponen shortBadge corto y legible para la barra superior', () => {
    const formats = getAllCvFormats();
    expect(formats.length).toBeGreaterThanOrEqual(6);
    for (const fmt of formats) {
      expect(typeof fmt.shortBadge).toBe('string');
      expect(fmt.shortBadge.trim().length).toBeGreaterThan(0);
      expect(fmt.shortBadge.trim().length).toBeLessThanOrEqual(14);
    }
    expect(hasCapability('cv', 'region_format')).toBe(true);
    expect(hasCapability('business_card', 'region_format')).toBe(false);
  });

  it('us-resume conserva activeFormatId y bloqueo de 1 columna aunque cambies la plantilla visual', () => {
    const base = applyPresetLevel(
      { activePresetId: 'minimal-editorial', sectionVisibility: {} },
      'format',
      { formatId: 'us-resume', applicationMode: 'curated' },
    );
    expect(base.activeFormatId).toBe('us-resume');
    expect(base.columnLayoutPresetId).toBe('full-width');
    expect(base.sectionVisibility.cursos).toBe(false);

    const switched = applyPresetLevel(base, 'preset', { presetId: 'modern-corporate' });
    expect(switched.activeFormatId).toBe('us-resume');
    expect(switched.activePresetId).toBe('modern-corporate');
    expect(switched.columnLayoutPresetId).toBe('full-width');
    // No pisa la curaduría del formato EE.UU.
    expect(switched.sectionVisibility.cursos).toBe(false);
  });

  it('europass conserva activeFormatId al alternar entre sidebar-left y sidebar-right (misma familia 2 columnas)', () => {
    const base = applyPresetLevel(
      { activePresetId: 'cv-clasico', sectionVisibility: {} },
      'format',
      { formatId: 'europass', applicationMode: 'curated' },
    );
    expect(base.activeFormatId).toBe('europass');

    const flipped = applyPresetLevel(base, 'override', { columnLayoutPresetId: 'sidebar-right' });
    expect(flipped.activeFormatId).toBe('europass');
    expect(flipped.columnLayoutPresetId).toBe('sidebar-right');
  });

  it('cambiar a full-width desde un formato 2-col sí actualiza el formato derivado correctamente', () => {
    const base = applyPresetLevel(
      { activePresetId: 'cv-clasico', sectionVisibility: {} },
      'format',
      { formatId: 'latam-clasico', applicationMode: 'curated' },
    );
    const singleCol = applyPresetLevel(base, 'override', { columnLayoutPresetId: 'full-width' });
    expect(singleCol.columnLayoutPresetId).toBe('full-width');
    expect(getCvFormat(singleCol.activeFormatId).columnLayoutPresetId).toBe('full-width');
  });
});
