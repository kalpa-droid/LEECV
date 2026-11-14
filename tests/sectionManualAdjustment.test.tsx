// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, afterEach } from 'vitest';
import { SectionManualAdjustment } from '../src/modules/cv-builder/components/editor/SectionManualAdjustment';
import { initialCVData } from '../src/data/initialCVData';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: HTMLElement[] = [];

function renderAdjustment(sectionId: string): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  mounted.push(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <SectionManualAdjustment sectionId={sectionId} cvData={initialCVData as any} setCvData={() => {}} />
    );
  });
  return container;
}

afterEach(() => {
  while (mounted.length) mounted.pop()?.remove();
});

describe('SectionManualAdjustment — el control de ubicación siempre se muestra', () => {
  it('sección no asignable a columna (certificados): muestra el candado con la razón, no selectores mudos', () => {
    const container = renderAdjustment('certificados');
    expect(container.textContent).toContain('no se puede mover de columna');
    expect(container.textContent).toContain('Ubicación y Orden Relativo');
    expect(container.textContent).not.toContain('Ubicación en Hoja');
  });

  it('sección normal (experiencia): muestra los selectores de columna y posición', () => {
    const container = renderAdjustment('experiencia');
    expect(container.textContent).toContain('Ubicación en Hoja');
    expect(container.textContent).toContain('Posición en Secuencia');
  });
});
