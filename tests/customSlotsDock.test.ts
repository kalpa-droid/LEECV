import { describe, expect, it } from 'vitest';
import { CUSTOM_SLOTS, findFreeCustomSlot, resolveActiveDockSections } from '../src/shared/core/sections/activeSectionsDockEngine';

/**
 * Opción 2 del dock: un slot personalizada-N vacío NO aparece en el dock
 * (el "+" de "Nueva Sección" queda como único lanzador). Pero una sección
 * canónica vacía SÍ sigue visible por decisión de diseño documentada:
 * ocultar el botón impediría cargar el PRIMER registro ahí.
 */

describe('findFreeCustomSlot — primer slot libre', () => {
  it('ignora un slot vacío con visibility true (la visibilidad NO cuenta)', () => {
    const cvData = {
      'personalizada-1': [],
      sectionVisibility: { 'personalizada-1': true },
      sectionTitleOverrides: {}
    };
    expect(findFreeCustomSlot(cvData)).toBe('personalizada-1');
  });

  it('salta slots con título propio o con registros', () => {
    const cvData = {
      'personalizada-1': [{ cargo: 'Dev' }],
      'personalizada-2': [],
      sectionTitleOverrides: { 'personalizada-1': 'Logros' }
    };
    expect(findFreeCustomSlot(cvData)).toBe('personalizada-2');
  });

  it('devuelve undefined cuando los 5 slots están ocupados', () => {
    const cvData = {
      'personalizada-1': [{}],
      'personalizada-2': [{}],
      'personalizada-3': [{}],
      'personalizada-4': [{}],
      'personalizada-5': [{}],
      sectionTitleOverrides: {},
      sectionVisibility: {}
    };
    expect(findFreeCustomSlot(cvData)).toBeUndefined();
  });

  it('sin cvData devuelve el primer slot', () => {
    expect(findFreeCustomSlot(null)).toBe('personalizada-1');
  });
});

describe('resolveActiveDockSections — visibilidad de slots personalizados', () => {
  const idsOf = (cvData: any) => resolveActiveDockSections(cvData).map((s) => s.id);

  it('oculta un slot personalizada-N vacío aunque un formato lo haya encendido', () => {
    const cvData = {
      'personalizada-1': [],
      sectionVisibility: { 'personalizada-1': true },
      sectionTitleOverrides: {}
    };
    expect(idsOf(cvData)).not.toContain('personalizada-1');
  });

  it('muestra el slot cuando tiene título propio o registros', () => {
    const conTitulo = {
      'personalizada-2': [],
      sectionVisibility: { 'personalizada-2': true },
      sectionTitleOverrides: { 'personalizada-2': 'Voluntariado' }
    };
    expect(idsOf(conTitulo)).toContain('personalizada-2');

    const conRegistros = {
      'personalizada-3': [{ tituloOGrado: 'Algo' }],
      sectionVisibility: {},
      sectionTitleOverrides: {}
    };
    expect(idsOf(conRegistros)).toContain('personalizada-3');
  });

  it('una sección canónica vacía con visibility true SIGUE visible', () => {
    const cvData = {
      projects: [],
      sectionVisibility: { proyectos: true },
      sectionTitleOverrides: {}
    };
    expect(idsOf(cvData)).toContain('proyectos');
  });

  it('los 5 slots existen como constante canónica', () => {
    expect(CUSTOM_SLOTS).toEqual(['personalizada-1', 'personalizada-2', 'personalizada-3', 'personalizada-4', 'personalizada-5']);
  });
});
