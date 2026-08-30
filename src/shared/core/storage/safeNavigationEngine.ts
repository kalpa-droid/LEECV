/**
 * NÚCLEO — MOTOR DE NAVEGACIÓN SEGURA (safeNavigationEngine.ts)
 * 
 * Unifica el patrón de autoguardado preventivo del borrador actual antes de ejecutar
 * acciones de navegación o creación ("+ Nuevo", "Abrir...", "Cambio de pestaña", "Planes").
 * Garantiza que cualquier fallo secundario al guardar sea capturado sin interrumpir la
 * acción deseada por el usuario.
 */

export interface SafeNavigationOptions {
  silent?: boolean;
}

export async function runWithSafeSave(
  saveFn?: () => Promise<any>,
  actionFn?: () => void | Promise<void>,
  options: SafeNavigationOptions = {}
): Promise<void> {
  if (typeof saveFn === 'function') {
    try {
      await saveFn();
    } catch (err) {
      if (!options.silent) {
        console.warn('Advertencia en auto-guardado previo a navegación:', err);
      }
    }
  }

  if (typeof actionFn === 'function') {
    await actionFn();
  }
}
