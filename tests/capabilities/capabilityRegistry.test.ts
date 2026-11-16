import { describe, it, expect } from 'vitest';
import { inferDocumentTypeId } from '../../src/shared/core/capabilities/capabilityRegistry';

describe('inferDocumentTypeId — presets de libro / agenda / tarjeta', () => {
  it('un documento creado desde el preset "libro-standard" se infiere como book', () => {
    expect(inferDocumentTypeId({ activePresetId: 'libro-standard' })).toBe('book');
    expect(inferDocumentTypeId({ activePresetId: 'libro-digital' })).toBe('book');
    expect(inferDocumentTypeId({ activePresetId: 'LIBRO-STANDARD' })).toBe('book');
    expect(inferDocumentTypeId({ activePresetId: 'book' })).toBe('book');
  });

  it('no rompe las inferencias ya existentes', () => {
    expect(inferDocumentTypeId({ activePresetId: 'planner-diario' })).toBe('planner');
    expect(inferDocumentTypeId({ activePresetId: 'tarjeta-personal' })).toBe('business_card');
    expect(inferDocumentTypeId({ activePresetId: 'carta-clasica' })).toBe('cover_letter');
    expect(inferDocumentTypeId({ activePresetId: 'preset-inventado' })).toBe('cv');
  });

  it('sin datos válidos cae en cv', () => {
    expect(inferDocumentTypeId(null)).toBe('cv');
    expect(inferDocumentTypeId('no-es-objeto')).toBe('cv');
    expect(inferDocumentTypeId({})).toBe('cv');
  });
});
