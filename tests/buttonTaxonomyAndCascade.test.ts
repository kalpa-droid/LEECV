import { describe, expect, it } from 'vitest';
import {
  applyGlobalConfigWithCascade,
  clearManualOverride,
  countManualOverrides,
  detectGlobalConflicts,
  getManualOverrides,
  isManuallyOverridden,
  markManualOverride,
} from '../src/shared/core/presets/configCascadeEngine';
import { buildCvDockTabs, buildCoverLetterDockTabs } from '../src/modules/cv-builder/cvDockProvider';
import { buildCardDockTabs } from '../src/modules/card-studio/cardStepSequence';
import { buildEditorialDockTabs } from '../src/modules/editor-lee-studio/domain/editorialDockEngine';
import type { DockButtonRole } from '../src/shared/core/studio-host/stepSequenceRegistry';

const VALID_DOCK_ROLES = new Set<DockButtonRole>([
  'catalog',
  'preset',
  'record',
  'custom_record',
  'ai_utility',
  'handoff',
]);

describe('Taxonomía de Botones y Cascada Anti-Pisado (V3.2.0)', () => {
  it('marca, consulta, cuenta y limpia overrides manuales de Nivel 3', () => {
    const base = { printTarget: 'home', paperSize: 'A4', showGuides: false };
    expect(getManualOverrides(base)).toEqual({});
    expect(isManuallyOverridden(base, 'paperSize')).toBe(false);
    expect(countManualOverrides(base)).toBe(0);

    const marked = markManualOverride({ ...base, paperSize: 'OFICIO' }, 'paperSize');
    expect(isManuallyOverridden(marked, 'paperSize')).toBe(true);
    expect(countManualOverrides(marked)).toBe(1);

    const cleared = clearManualOverride(marked, 'paperSize', 'A4');
    expect(cleared.paperSize).toBe('A4');
    expect(isManuallyOverridden(cleared, 'paperSize')).toBe(false);
    expect(countManualOverrides(cleared)).toBe(0);
  });

  it('detecta conflictos solo cuando un campo tocado a mano difiere de la nueva regla global', () => {
    let config = { paperSize: 'OFICIO', destination: 'A', showGuides: false };
    config = markManualOverride(config, 'paperSize');

    const conflicts = detectGlobalConflicts(
      config,
      { paperSize: 'SRA3', destination: 'C', showGuides: true },
      { paperSize: 'Hoja física', destination: 'Tapa', showGuides: 'Guías' },
    );

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      fieldKey: 'paperSize',
      label: 'Hoja física',
      currentValue: 'OFICIO',
      globalValue: 'SRA3',
    });
  });

  it('applyGlobalConfigWithCascade preserva ajustes finos en preserve-manual y los alinea en apply-all', () => {
    let config = {
      printTarget: 'home',
      paperSize: 'OFICIO',
      destination: 'A',
      unprintableMarginMm: 5,
    };
    config = markManualOverride(config, 'paperSize');

    const preserved = applyGlobalConfigWithCascade(config, {
      alwaysPatch: { printTarget: 'print_shop' },
      defaultsPatch: { paperSize: 'SRA3', destination: 'C', unprintableMarginMm: 0 },
      mode: 'preserve-manual',
    });
    expect(preserved.printTarget).toBe('print_shop');
    expect(preserved.paperSize).toBe('OFICIO');
    expect(preserved.destination).toBe('C');
    expect(preserved.unprintableMarginMm).toBe(0);
    expect(isManuallyOverridden(preserved, 'paperSize')).toBe(true);

    const overwritten = applyGlobalConfigWithCascade(config, {
      alwaysPatch: { printTarget: 'print_shop' },
      defaultsPatch: { paperSize: 'SRA3', destination: 'C', unprintableMarginMm: 0 },
      mode: 'apply-all',
    });
    expect(overwritten.printTarget).toBe('print_shop');
    expect(overwritten.paperSize).toBe('SRA3');
    expect(overwritten.destination).toBe('C');
    expect(isManuallyOverridden(overwritten, 'paperSize')).toBe(false);
  });

  it('asigna roles explícitos a todos los botones del Dock de CV, Carta, Tarjeta y EditorLee', () => {
    const cvTabs = buildCvDockTabs({
      cvData: {
        activeSections: ['experiencia', 'custom_123'],
        customSections: [{ id: 'custom_123', title: 'Voluntariado', records: [] }],
      },
    });
    expect(cvTabs.length).toBeGreaterThan(5);
    for (const tab of cvTabs) {
      expect(tab.role).toBeDefined();
      expect(VALID_DOCK_ROLES.has(tab.role!)).toBe(true);
    }
    expect(cvTabs.find((t) => t.id === 'diseno')?.role).toBe('preset');
    expect(cvTabs.find((t) => t.id === 'diseno')?.isLarge).toBe(false);
    expect(cvTabs.find((t) => t.id === 'diseno_tipografia')?.isLarge).toBe(false);
    expect(cvTabs.find((t) => t.id === 'diseno_hoja')?.isLarge).toBe(false);
    expect(cvTabs.find((t) => t.id === 'portada')?.isLarge).toBe(false);
    expect(cvTabs.find((t) => t.id === 'experiencia')?.role).toBe('record');
    expect(cvTabs.find((t) => t.id === 'custom_123')?.role).toBe('custom_record');
    expect(cvTabs.find((t) => t.id === 'importar_datos')?.role).toBe('ai_utility');
    expect(cvTabs[0]?.id).toBe('importar_datos');
    expect(cvTabs[1]?.id).toBe('vacante');
    expect(cvTabs.find((t) => t.id === 'carta')).toBeUndefined();
    expect(cvTabs[cvTabs.length - 1]?.id).toBe('nueva_seccion');
    expect(cvTabs[cvTabs.length - 1]?.groupBreakBefore).toBe(true);

    for (const tab of buildCoverLetterDockTabs()) {
      expect(VALID_DOCK_ROLES.has(tab.role!)).toBe(true);
    }
    for (const tab of buildCardDockTabs()) {
      expect(VALID_DOCK_ROLES.has(tab.role!)).toBe(true);
    }

    const editorialTabs = buildEditorialDockTabs({
      cvData: {
        design: { presetId: 'libro-impreso' },
        sections: [
          { id: 'sec1', title: 'Capítulo 1', sectionKey: 'capitulo', category: 'cuerpo', records: [] },
          { id: 'sec2', title: 'Nota propia', sectionKey: 'nota_propia', category: 'personalizada', records: [] },
        ],
      },
    });
    for (const tab of editorialTabs) {
      expect(VALID_DOCK_ROLES.has(tab.role!)).toBe(true);
    }
    expect(editorialTabs.find((t) => t.id === 'editorial_diseño')?.role).toBe('preset');
    expect(editorialTabs.find((t) => t.id === 'editorial_import_ai')?.role).toBe('ai_utility');
    expect(editorialTabs.find((t) => t.id === 'sec2')?.role).toBe('custom_record');
  });
});
