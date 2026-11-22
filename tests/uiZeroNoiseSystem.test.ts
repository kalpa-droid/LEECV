import { describe, it, expect, vi } from 'vitest';
import { emitLidioMessage, subscribeLidioMessages, type LidioLiveMessage } from '../src/shared/core/assistant/lidioBus';
import { ICON_REGISTRY } from '../src/shared/core/pdf-engine/layers/icons/iconRegistry';
import { UI_ICON_IDS } from '../src/shared/core/ui/iconCatalog';
import { isValidPanelTab, resolveRuleTargetTab } from '../src/shared/core/recruiter-rules/ruleTargetTabs';
import { zIndex } from '../src/shared/core/uiDesignSystem';

describe('V3.0 Sistema UI Cero Ruido + Bus Lidio + Dock en 3 Botones de Diseño', () => {
  it('emite mensajes vivos al bus de Lidio y desuscribe sin pérdidas', () => {
    const received: LidioLiveMessage[] = [];
    const unsubscribe = subscribeLidioMessages((msg) => received.push(msg));

    const emitted = emitLidioMessage({
      kind: 'help',
      title: 'Copia ZIP de LinkedIn',
      body: 'Se leerán los datos disponibles.',
      groupKey: 'import-linkedin-zip',
    });

    expect(emitted.id).toBeTruthy();
    expect(emitted.durationMs).toBeGreaterThanOrEqual(7000);
    expect(received).toHaveLength(1);
    expect(received[0].groupKey).toBe('import-linkedin-zip');

    unsubscribe();
    emitLidioMessage({ kind: 'state', body: 'No debería llegar tras desuscribir.' });
    expect(received).toHaveLength(1);
  });

  it('un listener defectuoso en lidioBus no rompe otros suscriptores', () => {
    const spy = vi.fn();
    const unsubBad = subscribeLidioMessages(() => {
      throw new Error('fallo aislado');
    });
    const unsubGood = subscribeLidioMessages(spy);

    expect(() =>
      emitLidioMessage({ kind: 'storage', title: 'Guardado', body: 'Carpeta Segura' }),
    ).not.toThrow();
    expect(spy).toHaveBeenCalledTimes(1);

    unsubBad();
    unsubGood();
  });

  it('registra los 5 íconos nuevos de V3.0 en ICON_REGISTRY sin duplicados', () => {
    const keys = [
      UI_ICON_IDS.helpBubble,
      UI_ICON_IDS.disenoTipografia,
      UI_ICON_IDS.disenoHoja,
      UI_ICON_IDS.region,
      UI_ICON_IDS.folderSafe,
    ];
    for (const id of keys) {
      expect(ICON_REGISTRY[id]).toBeDefined();
      expect(ICON_REGISTRY[id].paths.length).toBeGreaterThan(0);
    }
  });

  it('las 3 pestañas de diseño están registradas en ruleTargetTabs y multicol_layout lleva a diseno_hoja', () => {
    expect(isValidPanelTab('diseno')).toBe(true);
    expect(isValidPanelTab('diseno_tipografia')).toBe(true);
    expect(isValidPanelTab('diseno_hoja')).toBe(true);
    expect(resolveRuleTargetTab('multicol_layout')).toBe('diseno_hoja');
  });

  it('jerarquía de capas móvil garantiza que Lidio y toast nunca quedan detrás del Dock', () => {
    expect(zIndex.assistantFab).toBeGreaterThan(zIndex.dock);
    expect(zIndex.assistantToast).toBeGreaterThan(zIndex.assistantFab);
    expect(zIndex.assistantDialog).toBeGreaterThan(zIndex.assistantToast);
    expect(zIndex.modal).toBeGreaterThan(zIndex.assistantDialog);
  });
});
