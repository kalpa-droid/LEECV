// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentViewport } from '../src/shared/core/viewport';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let width = 390;
class RO { cb: any; constructor(cb: any) { this.cb = cb; (globalThis as any).__ro = this; } observe() {} disconnect() {} }
(globalThis as any).ResizeObserver = RO;
(Element.prototype as any).getBoundingClientRect = function () {
  const w = (this as HTMLElement).id === 'c' ? width : 0;
  return { width: w, height: 700, top: 0, left: 0, right: w, bottom: 700, x: 0, y: 0, toJSON() {} };
};

let api: any;
function Host({ showShell }: { showShell: boolean }) {
  api = useDocumentViewport({ pageSizeId: 'a4' });
  return showShell ? <div ref={api.containerRef} id="c" style={{ padding: '8px' }} /> : <div>landing</div>;
}
const scaleVar = () => document.getElementById('c')!.style.getPropertyValue('--doc-scale');
const flush = async () => { await act(async () => { await new Promise(r => setTimeout(r, 40)); }); };

/**
 * Integración del hook contra un DOM real. Cubre lo que los tests puros no ven: que el
 * contenedor quede enlazado (regresión "el botón Ver no ajusta": App no le pasaba el ref
 * al AppShell) y que el ajuste corra aunque el contenedor se monte después del hook.
 */
describe('useDocumentViewport contra un DOM real (jsdom)', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="root"></div>'; width = 390; });

  it('contenedor presente al montar: escribe --doc-scale ajustado al ancho útil', async () => {
    const root = createRoot(document.getElementById('root')!);
    await act(async () => { root.render(<Host showShell />); });
    await flush();
    const s = parseFloat(scaleVar());
    expect(s).toBeGreaterThan(0.4);
    expect(794 * s).toBeLessThanOrEqual(390 - 16);
    expect(api.zoomLevel).toBeCloseTo(s, 2);
    root.unmount();
  });

  it('contenedor que aparece DESPUÉS (landing -> editor): igual se ajusta', async () => {
    const root = createRoot(document.getElementById('root')!);
    await act(async () => { root.render(<Host showShell={false} />); });
    await flush();
    await act(async () => { root.render(<Host showShell />); });
    await flush();
    const s = parseFloat(scaleVar());
    expect(s).toBeGreaterThan(0.4);
    root.unmount();
  });

  it('pellizco/zoom manual y luego "Ver" (fitAndCenter) vuelve limpio al ajuste', async () => {
    const root = createRoot(document.getElementById('root')!);
    await act(async () => { root.render(<Host showShell />); });
    await flush();
    const fit = parseFloat(scaleVar());
    await act(async () => { api.setZoomLevel(1.5); });
    const zoomed = parseFloat(scaleVar());
    await act(async () => { api.fitAndCenter(); });
    await flush();
    const back = parseFloat(scaleVar());
    expect(zoomed).toBe(1.5);
    expect(back).toBeCloseTo(fit, 2);
    expect(api.isAutoFitMode).toBe(true);
    root.unmount();
  });

  it('rotar el teléfono (390 -> 844) reajusta solo, conservando el modo automático', async () => {
    const root = createRoot(document.getElementById('root')!);
    await act(async () => { root.render(<Host showShell />); });
    await flush();
    const before = parseFloat(scaleVar());
    width = 844;
    await act(async () => { (globalThis as any).__ro.cb([]); });
    await flush();
    const after = parseFloat(scaleVar());
    expect(after).toBeGreaterThan(before);
    root.unmount();
  });

  it('contenedor oculto (display:none => ancho 0) que luego se muestra: reintenta y ajusta', async () => {
    width = 0;
    const root = createRoot(document.getElementById('root')!);
    await act(async () => { root.render(<Host showShell />); });
    await act(async () => { await new Promise(r => setTimeout(r, 30)); });
    expect(scaleVar()).not.toBe('0.456');
    width = 390; // React lo muestra al tocar "Ver"
    await act(async () => { api.fitAndCenter(); });
    await flush();
    const s = parseFloat(scaleVar());
    expect(s).toBeGreaterThan(0.4);
    root.unmount();
  });
});
