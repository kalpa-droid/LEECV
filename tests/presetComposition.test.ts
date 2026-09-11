import { describe, it, expect } from 'vitest';
import { resolveActivePreset } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry';
import { applyPresetLevel } from '../src/shared/core/pdf-engine/layers/presets/presetHierarchyEngine';

describe('resolveActivePreset — Cascada de Color Personalizado', () => {

  it('1. CVData sin overrides retorna el preset base cv-clasico', () => {
    const cvData = { activePresetId: 'cv-clasico' };
    const preset = resolveActivePreset(cvData);
    expect(preset.id).toBe('cv-clasico');
    expect(preset.palette.primary).toBeDefined();
  });

  it('2. colorPresetId del catálogo (sobrio) aplica paleta predefinida', () => {
    const cvData = { activePresetId: 'cv-clasico', colorPresetId: 'sobrio' };
    const preset = resolveActivePreset(cvData);
    expect(preset.id).toBe('cv-clasico-custom');
    expect(preset.palette.primary).toBeDefined();
    // La paleta debe ser diferente al preset base sin overrides
    const basePreset = resolveActivePreset({ activePresetId: 'cv-clasico' });
    expect(preset.palette.primary).not.toBe(basePreset.palette.primary);
  });

  it('3. theme.primaryColor con Hex válido sin colorPresetId genera paleta dinámica', () => {
    const cvData = {
      activePresetId: 'cv-clasico',
      theme: { primaryColor: '#10B981' }
    };
    const preset = resolveActivePreset(cvData);
    expect(preset.id).toBe('cv-clasico-custom');
    // La paleta generada debe tener un color primario derivado del seed
    expect(preset.palette.primary).toBeDefined();
    expect(preset.palette.secondary).toBeDefined();
    expect(preset.palette.accent).toBeDefined();
  });

  it('4. colorPresetId tiene prioridad sobre theme.primaryColor', () => {
    const cvData = {
      activePresetId: 'cv-clasico',
      colorPresetId: 'sobrio',
      theme: { primaryColor: '#10B981' }
    };
    const presetWithBoth = resolveActivePreset(cvData);

    // Debe usar la paleta del catálogo (sobrio), no el hex libre
    const presetSobrioOnly = resolveActivePreset({
      activePresetId: 'cv-clasico',
      colorPresetId: 'sobrio'
    });
    expect(presetWithBoth.palette.primary).toBe(presetSobrioOnly.palette.primary);
  });

  it('5. theme.primaryColor con var() CSS es ignorado (parseCustomHex → null)', () => {
    const cvData = {
      activePresetId: 'cv-clasico',
      theme: { primaryColor: 'var(--color-accent-base)' }
    };
    const preset = resolveActivePreset(cvData);
    // Sin colorPresetId ni hex válido → retorna preset base
    expect(preset.id).toBe('cv-clasico');
  });

  it('6. theme.primaryColor undefined no activa path personalizado', () => {
    const cvData = {
      activePresetId: 'cv-clasico',
      theme: { primaryColor: undefined }
    };
    const preset = resolveActivePreset(cvData);
    expect(preset.id).toBe('cv-clasico');
  });

  it('7. theme.primaryColor con short hex (#FFF) se expande y genera paleta', () => {
    const cvData = {
      activePresetId: 'cv-clasico',
      theme: { primaryColor: '#FFF' }
    };
    const preset = resolveActivePreset(cvData);
    expect(preset.id).toBe('cv-clasico-custom');
    expect(preset.palette.primary).toBeDefined();
  });

  it('8. manualOverrides se preservan con hex personalizado', () => {
    const cvData = {
      activePresetId: 'cv-clasico',
      theme: { primaryColor: '#10B981' },
      manualOverrides: { 'exp-1': { highlightColorOverride: '#FF0000' } }
    };
    const preset = resolveActivePreset(cvData);
    // resolveActivePreset no toca manualOverrides (operan en capa inferior)
    expect(preset.id).toBe('cv-clasico-custom');
    // Los overrides siguen intactos en cvData (resolveActivePreset no los modifica)
    expect(cvData.manualOverrides['exp-1'].highlightColorOverride).toBe('#FF0000');
  });
});

describe('applyPresetLevel — Limpieza de theme.primaryColor', () => {

  it('9. Cambiar plantilla base limpia theme.primaryColor', () => {
    const cvData = {
      activePresetId: 'cv-clasico',
      theme: { primaryColor: '#10B981', fontFamily: 'Helvetica' }
    };
    const updated = applyPresetLevel(cvData, 'preset', { presetId: 'modern-corporate' });
    expect(updated.activePresetId).toBe('modern-corporate');
    expect(updated.theme.primaryColor).toBeUndefined();
    // fontFamily se preserva
    expect(updated.theme.fontFamily).toBe('Helvetica');
  });

  it('10. Cambiar formato global limpia theme.primaryColor', () => {
    const cvData = {
      activePresetId: 'cv-clasico',
      theme: { primaryColor: '#10B981', fontFamily: 'Arial' }
    };
    const updated = applyPresetLevel(cvData, 'format', { formatId: 'cv-clasico' });
    expect(updated.theme.primaryColor).toBeUndefined();
    // fontFamily se preserva
    expect(updated.theme.fontFamily).toBe('Arial');
  });

  it('11. Override de colorPresetId NO limpia theme.primaryColor (convivencia)', () => {
    const cvData = {
      activePresetId: 'cv-clasico',
      theme: { primaryColor: '#10B981' }
    };
    const updated = applyPresetLevel(cvData, 'override', { colorPresetId: 'marino' });
    expect(updated.colorPresetId).toBe('marino');
    // theme.primaryColor sigue ahí, pero colorPresetId tiene prioridad en resolveActivePreset
    expect(updated.theme.primaryColor).toBe('#10B981');
  });
});
