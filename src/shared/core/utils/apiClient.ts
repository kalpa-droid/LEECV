import { supabase } from '../lib/supabaseClient';

export interface ApiClientOptions extends RequestInit {
  requiresAuth?: boolean;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

/**
 * MOTOR CANÓNICO DE CLIENTE HTTP / API
 * 
 * Centraliza peticiones a /api/ y servicios externos.
 * Adiciona automáticamente el token Bearer de Supabase Auth si existe sesión activa.
 * Provee un manejo homogéneo de respuestas y errores.
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<ApiResponse<T>> {
  const { requiresAuth = true, headers = {}, body, ...customConfig } = options;

  const mergedHeaders: Record<string, string> = {
    ...((headers as Record<string, string>) || {}),
  };

  // Asigna JSON Content-Type por defecto salvo que sea FormData
  if (!(body instanceof FormData) && !mergedHeaders['Content-Type']) {
    mergedHeaders['Content-Type'] = 'application/json';
  }

  if (requiresAuth && supabase && !mergedHeaders['Authorization']) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        mergedHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch {
      // Omitir token en caso de excepción de sesión
    }
  }

  try {
    const isJsonBody = !(body instanceof FormData) && typeof body === 'object' && body !== null;
    const finalBody = isJsonBody ? JSON.stringify(body) : body;

    const config: RequestInit = {
      ...customConfig,
      headers: mergedHeaders,
      ...(finalBody ? { body: finalBody as BodyInit } : {}),
    };

    const response = await fetch(endpoint, config);
    let data: any = null;

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { message: text } : null;
    }

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `Error HTTP ${response.status}`;
      return {
        ok: false,
        status: response.status,
        data,
        error: errorMessage,
      };
    }

    return {
      ok: true,
      status: response.status,
      data,
      error: null,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err?.message || 'Error de conexión con el servidor',
    };
  }
}

export const apiClient = {
  get: <T = any>(url: string, options?: ApiClientOptions) =>
    apiFetch<T>(url, { ...options, method: 'GET' }),
  post: <T = any>(url: string, body?: any, options?: ApiClientOptions) =>
    apiFetch<T>(url, { ...options, method: 'POST', body }),
  put: <T = any>(url: string, body?: any, options?: ApiClientOptions) =>
    apiFetch<T>(url, { ...options, method: 'PUT', body }),
  delete: <T = any>(url: string, options?: ApiClientOptions) =>
    apiFetch<T>(url, { ...options, method: 'DELETE' }),
};
