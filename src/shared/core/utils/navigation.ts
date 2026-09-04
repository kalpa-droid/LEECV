/**
 * MOTOR CANÓNICO DE NAVEGACIÓN Y RUTEO DE NAVEGADOR (navigation)
 * 
 * Centraliza redirecciones, aperturas de pestañas externas, resolución de origen y parámetros de URL.
 * Evita la manipulación directa y dispersa de `window.location` y `window.open`.
 */
export const navigation = {
  /**
   * Obtiene la URL de origen actual (origin) o devuelve un fallback de servidor.
   */
  getOrigin(defaultOrigin: string = 'https://leecv.app'): string {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return defaultOrigin;
  },

  /**
   * Redirige la página actual a una ruta o URL externa.
   */
  goTo(url: string): void {
    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  },

  /**
   * Abre una URL en una nueva pestaña del navegador.
   */
  openExternal(url: string): void {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  },

  /**
   * Lee un parámetro específico de la query string (ej: ?c=123).
   */
  getQueryParam(paramName: string): string | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get(paramName);
  },

  /**
   * Devuelve el objeto completo de query params, para cuando hace falta leer
   * varios a la vez (ej: 'c' O 'publicCv' O 'share' con prioridad entre sí).
   * Sin esto, cualquier caso que necesite más de un param queda forzado a
   * volver a `new URLSearchParams(window.location.search)` a mano.
   */
  getSearchParams(): URLSearchParams {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  },

  /**
   * Retorna la ruta actual (pathname).
   */
  getPathname(): string {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname;
  },

  /**
   * Reemplaza la URL actual sin recargar la página (útil para limpiar token o parámetros tras login/error).
   */
  cleanQueryParams(): void {
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  },
};
