/**
 * MOTOR DE TRANSICIÓN DE PRESETS (presetTransitionEngine.ts)
 * 
 * Gestiona de manera reactiva y unificada la retroalimentación visual al aplicar
 * cualquier preset en la aplicación (Paletas de color, Tipografía, Columnas, Presets base,
 * Diseños de portada, Formatos).
 * 
 * Evita la percepción de congelamiento de pantalla mostrando el indicador animado
 * de Pluma Antigua / Lápiz Rotatorio durante el refresco del documento PDF.
 */

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { COVER_PRESETS_CATALOG } from './coverPresetCatalog';

export interface PresetTransitionState {
  isApplying: boolean;
  presetName: string;
  presetType?: string;
  timestamp: number;
}

let currentState: PresetTransitionState = {
  isApplying: false,
  presetName: '',
  presetType: '',
  timestamp: 0
};

const listeners = new Set<() => void>();
let timerId: NodeJS.Timeout | null = null;
let renderPending = false;
let transitionStartTime = 0;

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * Dispara una transición de preset explícita con tiempo de permanencia coordinado con la GPU/DOM.
 */
export function triggerPresetTransition(presetName: string, presetType: string = 'preset', minDurationMs: number = 1800) {
  if (timerId) {
    clearTimeout(timerId);
  }

  renderPending = true;
  transitionStartTime = Date.now();

  currentState = {
    isApplying: true,
    presetName: presetName || 'Personalizado',
    presetType,
    timestamp: transitionStartTime
  };
  notify();

  timerId = setTimeout(() => {
    // Si el renderizado del canvas en el DOM ya terminó, desvanecemos.
    // Si aún está procesando, la función markRenderAsCompleted se encargará de cerrarlo.
    if (!renderPending) {
      currentState = {
        ...currentState,
        isApplying: false
      };
      timerId = null;
      notify();
    }
  }, minDurationMs);
}

/**
 * Notifica al motor que el canvas vectorial del PDF se ha dibujado físicamente en los píxeles de pantalla.
 */
export function markRenderAsCompleted() {
  renderPending = false;
  const elapsed = Date.now() - transitionStartTime;
  const minVisibleMs = 1200; // Asegura al menos 1.2s de pluma giratoria para una estética suave
  const remainingMs = Math.max(50, minVisibleMs - elapsed);

  setTimeout(() => {
    if (currentState.isApplying) {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      currentState = {
        ...currentState,
        isApplying: false
      };
      notify();
    }
  }, remainingMs);
}

/**
 * Cancela inmediatamente cualquier transición activa.
 */
export function cancelPresetTransition() {
  renderPending = false;
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  if (currentState.isApplying) {
    currentState = {
      ...currentState,
      isApplying: false
    };
    notify();
  }
}

/**
 * Suscripción para useSyncExternalStore.
 */
export function subscribeToPresetTransition(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Obtiene el snapshot actual del estado de transición.
 */
export function getPresetTransitionSnapshot(): PresetTransitionState {
  return currentState;
}

/**
 * Hook React que expone el estado de la transición y detecta cambios automáticos
 * en las propiedades clave de presets de cvData.
 */
export function usePresetTransition(cvData?: any): PresetTransitionState {
  const transitionState = useSyncExternalStore(
    subscribeToPresetTransition,
    getPresetTransitionSnapshot,
    getPresetTransitionSnapshot
  );

  const prevPresetsRef = useRef<{
    activePresetId?: string;
    colorPresetId?: string;
    typographyPresetId?: string;
    columnLayoutPresetId?: string;
    coverStyle?: string;
    showCoverPage?: boolean;
    activeFormatId?: string;
  }>({});

  useEffect(() => {
    if (!cvData) return;

    const currentPresets = {
      activePresetId: cvData.activePresetId,
      colorPresetId: cvData.colorPresetId,
      typographyPresetId: cvData.typographyPresetId,
      columnLayoutPresetId: cvData.columnLayoutPresetId,
      coverStyle: cvData.coverStyle,
      showCoverPage: cvData.showCoverPage,
      activeFormatId: cvData.activeFormatId
    };

    const prev = prevPresetsRef.current;
    // Si prev estaba vacío (montaje inicial), solo registramos sin disparar loader
    const isInitialMount = Object.keys(prev).length === 0;

    if (!isInitialMount) {
      let changedName = '';
      let changedType = 'preset';

      if (currentPresets.activePresetId !== prev.activePresetId && currentPresets.activePresetId) {
        changedName = `Plantilla Base: ${currentPresets.activePresetId}`;
      } else if (currentPresets.colorPresetId !== prev.colorPresetId && currentPresets.colorPresetId) {
        changedName = `Paleta de Color`;
        changedType = 'color';
      } else if (currentPresets.typographyPresetId !== prev.typographyPresetId && currentPresets.typographyPresetId) {
        changedName = `Estilo Tipográfico`;
        changedType = 'typography';
      } else if (currentPresets.columnLayoutPresetId !== prev.columnLayoutPresetId && currentPresets.columnLayoutPresetId) {
        changedName = `Disposición de Columnas`;
        changedType = 'layout';
      } else if (currentPresets.coverStyle !== prev.coverStyle && currentPresets.coverStyle) {
        const foundCatalog = COVER_PRESETS_CATALOG.find(p => p.id === currentPresets.coverStyle);
        changedName = foundCatalog ? foundCatalog.name : `Portada: ${currentPresets.coverStyle}`;
        changedType = 'cover';
      } else if (currentPresets.showCoverPage !== prev.showCoverPage && currentPresets.showCoverPage !== undefined) {
        changedName = currentPresets.showCoverPage !== false ? 'Portada Activada' : 'Portada Desactivada';
        changedType = 'cover';
      } else if (currentPresets.activeFormatId !== prev.activeFormatId && currentPresets.activeFormatId) {
        changedName = `Formato de Exportación`;
        changedType = 'format';
      }

      if (changedName && !currentState.isApplying) {
        triggerPresetTransition(changedName, changedType, 1000);
      }
    }

    prevPresetsRef.current = currentPresets;
  }, [
    cvData?.activePresetId,
    cvData?.colorPresetId,
    cvData?.typographyPresetId,
    cvData?.columnLayoutPresetId,
    cvData?.coverStyle,
    cvData?.showCoverPage,
    cvData?.activeFormatId
  ]);

  return transitionState;
}
