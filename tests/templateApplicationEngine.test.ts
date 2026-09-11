import { describe, it, expect } from 'vitest';
import { applyTemplateMode } from '../src/shared/core/pdf-engine/layers/presets/templateApplicationEngine';
import { getPreset } from '../src/shared/core/pdf-engine/layers/presets/presetRegistry';
import { getCvFormat } from '../src/shared/core/formats/cvFormatRegistry';

describe('applyTemplateMode — separación en columnas primaria/secundaria', () => {
  // Fixture exacto pedido en el plan: preset modern-corporate activo
  // (2 columnas, sidebar = datos-personales/contacto/competencias/informatica)
  // + formato ats-one-column (defaultVisibleSections = contacto/redes/resumen/
  // experiencia/formacion/habilidades/idiomas/certificados).
  const modernCorporate = getPreset('modern-corporate');
  const atsOneColumn = getCvFormat('ats-one-column');

  const emptyState = {
    sectionVisibility: {},
    sectionOrders: { primaria: [], secundaria: [] },
  };

  it('1. full-template: sectionOrders.secundaria solo trae las visibles que caen en el sidebar del preset activo', () => {
    const result = applyTemplateMode(emptyState, atsOneColumn, modernCorporate, 'full-template');

    // Único solapamiento entre el sidebar de modern-corporate
    // (datos-personales, contacto, competencias, informatica) y las
    // secciones visibles de ats-one-column es 'contacto'.
    expect(result.sectionOrders.secundaria).toEqual(['contacto']);

    // El resto de las secciones visibles del formato van a primaria, en el
    // mismo orden de prioridad que trae el formato.
    expect(result.sectionOrders.primaria).toEqual([
      'redes', 'resumen', 'experiencia', 'formacion', 'habilidades', 'idiomas', 'certificados',
    ]);
  });

  it('2. full-template: no mezcla todo en una sola columna (regresión directa del bug que motivó este motor)', () => {
    const result = applyTemplateMode(emptyState, atsOneColumn, modernCorporate, 'full-template');
    // Ninguna sección visible se pierde, y ninguna aparece en las dos columnas a la vez.
    const todasLasVisibles = [...result.sectionOrders.primaria, ...result.sectionOrders.secundaria];
    expect(todasLasVisibles.sort()).toEqual([...atsOneColumn.defaultVisibleSections].sort());
    const interseccion = result.sectionOrders.primaria.filter((id) => result.sectionOrders.secundaria.includes(id));
    expect(interseccion).toEqual([]);
  });

  it('3. full-template: sectionVisibility marca en true solo las secciones del formato', () => {
    const result = applyTemplateMode(emptyState, atsOneColumn, modernCorporate, 'full-template');
    expect(result.sectionVisibility['contacto']).toBe(true);
    expect(result.sectionVisibility['experiencia']).toBe(true);
    // 'proyectos' no está en defaultVisibleSections de ats-one-column.
    expect(result.sectionVisibility['proyectos']).toBe(false);
  });

  it('4. template-order: no oculta secciones existentes, solo prioriza y respeta la columna base de cada una', () => {
    const currentConVisibilidadPrevia = {
      sectionVisibility: { 'proyectos': true, 'contacto': true },
      sectionOrders: { primaria: [], secundaria: [] },
    };
    const result = applyTemplateMode(currentConVisibilidadPrevia, atsOneColumn, modernCorporate, 'template-order');

    // sectionVisibility no se toca en este modo.
    expect(result.sectionVisibility).toEqual(currentConVisibilidadPrevia.sectionVisibility);

    // 'contacto' sigue cayendo en secundaria (es del sidebar del preset),
    // pero ahora aparecen TODAS las secciones (incluidas las que el
    // formato no prioriza), no solo las de defaultVisibleSections.
    expect(result.sectionOrders.secundaria).toContain('contacto');
    expect(result.sectionOrders.primaria).toContain('proyectos');
    // Las secciones priorizadas por el formato van primero dentro de su columna.
    expect(result.sectionOrders.primaria[0]).toBe('redes');
  });

  it('5. no-filters: devuelve el estado actual sin tocar nada', () => {
    const currentPersonalizado = {
      sectionVisibility: { 'idiomas': false },
      sectionOrders: { primaria: ['experiencia'], secundaria: ['idiomas'] },
    };
    const result = applyTemplateMode(currentPersonalizado, atsOneColumn, modernCorporate, 'no-filters');
    expect(result).toEqual(currentPersonalizado);
  });

  it('6. preset sin sector sidebar (sectionOrder solo con "main"): todo cae en primaria, sin romper', () => {
    // Ningún preset real del catálogo carece de sidebar hoy — se construye
    // uno sintético mínimo para probar el fallback `|| []` de baseSidebarIds
    // sin depender de que esa combinación exista en el catálogo actual.
    const presetSinSidebar: any = {
      ...modernCorporate,
      id: 'sintetico-sin-sidebar-test',
      sectionOrder: [{ sectorRole: 'main', sectionIds: ['experiencia', 'formacion'] }],
    };
    const result = applyTemplateMode(emptyState, atsOneColumn, presetSinSidebar, 'full-template');
    expect(result.sectionOrders.secundaria).toEqual([]);
    expect(result.sectionOrders.primaria.length).toBe(atsOneColumn.defaultVisibleSections.length);
  });
});
