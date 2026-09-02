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

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * Dispara una transición de preset explícita con tiempo de permanencia mínimo.
 */
export function triggerPresetTransition(presetName: string, presetType: string = 'preset', minDurationMs: number = 750) {
  if (timerId) {
    clearTimeout(timerId);
  }

  currentState = {
    isApplying: true,
    presetName: presetName || 'Personalizado',
    presetType,
    timestamp: Date.now()
  };
  notify();

  timerId = setTimeout(() => {
    currentState = {
      ...currentState,
      isApplying: false
    };
    timerId = null;
    notify();
  }, minDurationMs);
}

/**
 * Cancela inmediatamente cualquier transición activa.
 */
export function cancelPresetTransition() {
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
        changedName = `Paleta de Color: ${currentPresets.colorPresetId}`;
        changedType = 'color';
      } else if (currentPresets.typographyPresetId !== prev.typographyPresetId && currentPresets.typographyPresetId) {
        changedName = `Estilo Tipográfico: ${currentPresets.typographyPresetId}`;
        changedType = 'typography';
      } else if (currentPresets.columnLayoutPresetId !== prev.columnLayoutPresetId && currentPresets.columnLayoutPresetId) {
        changedName = `Disposición de Columnas`;
        changedType = 'layout';
      } else if (currentPresets.coverStyle !== prev.coverStyle && currentPresets.coverStyle) {
        changedName = `Portada: ${currentPresets.coverStyle}`;
        changedType = 'cover';
      } else if (currentPresets.activeFormatId !== prev.activeFormatId && currentPresets.activeFormatId) {
        changedName = `Formato: ${currentPresets.activeFormatId}`;
        changedType = 'format';
      }

      if (changedName) {
        triggerPresetTransition(changedName, changedType, 800);
      }
    }

    prevPresetsRef.current = currentPresets;
  }, [
    cvData?.activePresetId,
    cvData?.colorPresetId,
    cvData?.typographyPresetId,
    cvData?.columnLayoutPresetId,
    cvData?.coverStyle,
    cvData?.activeFormatId
  ]);

  return transitionState;
}
