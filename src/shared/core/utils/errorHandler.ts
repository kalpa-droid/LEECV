export interface ErrorHandlerOptions {
  /** Mensaje visual a mostrar en caso de éxito */
  successMessage?: string;
  /** Mensaje visual a mostrar en caso de falla */
  errorMessage?: string;
  /** Contexto o nombre de la operación para el logueo estructurado */
  context?: string;
  /** Callback opcional de notificación (ej: showError/showSuccess de useToast) */
  notify?: (msg: string, type: 'success' | 'error') => void;
  /** Si es true, relanza el error tras notificar al usuario */
  rethrow?: boolean;
}

export interface ErrorResult<T> {
  data: T | null;
  error: any;
  success: boolean;
}

/**
 * MOTOR CANÓNICO DE MANEJO DE ERRORES Y EJECUCIÓN ASÍNCRONA (errorHandler)
 * 
 * Elimina la duplicación de bloques try/catch + console.error en servicios y componentes.
 * Ejecuta una función asíncrona de manera segura y estandariza el manejo de excepciones.
 */
export async function withErrorHandling<T>(
  asyncFn: () => Promise<T>,
  options: ErrorHandlerOptions = {}
): Promise<ErrorResult<T>> {
  const { successMessage, errorMessage, context = 'Operación', notify, rethrow = false } = options;

  try {
    const data = await asyncFn();
    if (successMessage && notify) {
      notify(successMessage, 'success');
    }
    return { data, error: null, success: true };
  } catch (err: any) {
    const displayMessage = errorMessage || err?.message || 'Ocurrió un error al procesar la solicitud.';
    console.warn(`⚠️ [ErrorHandler - ${context}]:`, err);
    if (notify) {
      notify(displayMessage, 'error');
    }

    if (rethrow) {
      throw err;
    }

    return { data: null, error: err, success: false };
  }
}
