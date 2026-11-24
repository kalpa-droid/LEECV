// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, afterEach } from 'vitest';
import { Modal } from '../src/shared/core/ui/Modal';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: HTMLElement[] = [];

afterEach(() => {
  while (mounted.length) mounted.pop()?.remove();
  document.querySelectorAll('[data-ui-modal="true"]').forEach((el) => {
    el.parentElement?.remove();
  });
});

describe('Modal portal global — evita recorte por barra superior y contenedores z-20', () => {
  it('monta el modal directamente en document.body (fuera del contenedor z-20) con zIndex 9999', () => {
    const parentWrapper = document.createElement('div');
    parentWrapper.className = 'z-20 overflow-y-auto';
    document.body.appendChild(parentWrapper);
    mounted.push(parentWrapper);

    const root = createRoot(parentWrapper);
    act(() => {
      root.render(
        <Modal isOpen={true} onClose={() => {}} title="Ventana de prueba">
          <p>Contenido del modal</p>
        </Modal>,
      );
    });

    // El contenedor z-20 NO debe atrapar al modal adentro suyo.
    expect(parentWrapper.querySelector('[data-ui-modal="true"]')).toBeNull();

    // Debe vivir en document.body con z-index de modal (9999).
    const dialog = document.body.querySelector('[data-ui-modal="true"]') as HTMLElement | null;
    expect(dialog).not.toBeNull();
    expect(dialog?.parentElement?.parentElement).toBe(document.body);
    expect(dialog?.parentElement?.style.zIndex).toBe('9999');
    expect(dialog?.textContent).toContain('Ventana de prueba');
  });
});
