/**
 * Regresión: reintentos automáticos y silenciosos de executeAiTask.
 * El cartel de error solo debe aparecer cuando se agotan los intentos;
 * los fallos transitorios (red / 408 / 429 / 5xx / JSON roto) se reintentan solos.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/shared/core/utils/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from '../src/shared/core/utils/apiClient';
import { executeAiTask } from '../src/shared/core/ai/aiClient';

const postMock = apiClient.post as ReturnType<typeof vi.fn>;

/** Respuesta 200 OK con texto de tarea de IA exitosa. */
const okJson = (obj: any, providerUsed = 'groq') => ({
  ok: true,
  status: 200,
  data: { success: true, text: JSON.stringify(obj), providerUsed },
  error: null,
});

/** Respuesta HTTP de error (transitoria o no según status). */
const httpError = (status: number, message = 'boom') => ({
  ok: false,
  status,
  data: { error: message },
  error: message,
});

const okMalformed = (text = 'no hay json por acá') => ({
  ok: true,
  status: 200,
  data: { success: true, text, providerUsed: 'groq' },
  error: null,
});

describe('executeAiTask — reintentos silenciosos', () => {
  let timeoutSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // El backoff real (500/1200 ms) se ejecuta de forma inmediata para no esperar en tests.
    timeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((cb: any, _ms?: number, ...args: any[]) => {
      if (typeof cb === 'function') cb(...args);
      return 0 as any;
    }) as any);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    timeoutSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('éxito directo: una sola llamada, sin reintentos', async () => {
    postMock.mockResolvedValueOnce(okJson({ b: 2 }));
    const onRetry = vi.fn();
    const res = await executeAiTask({ taskId: 'generate_summary', payload: {}, onRetry });
    expect(res.data).toEqual({ b: 2 });
    expect(res.providerUsed).toBe('groq');
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it(' reintenta ante 500 transitorio y sale adelante en el 3er intento', async () => {
    postMock
      .mockResolvedValueOnce(httpError(500))
      .mockResolvedValueOnce(httpError(500))
      .mockResolvedValueOnce(okJson({ c: 3 }));
    const onRetry = vi.fn();
    const res = await executeAiTask({ taskId: 'improve_bullet', payload: {}, onRetry });
    expect(res.data).toEqual({ c: 3 });
    expect(postMock).toHaveBeenCalledTimes(3);
    expect(onRetry.mock.calls.map((c: any[]) => c[0])).toEqual([1, 2]);
  });

  it('reintenta ante 429 (rate limit) y sale adelante', async () => {
    postMock
      .mockResolvedValueOnce(httpError(429))
      .mockResolvedValueOnce(okJson({ x: 9 }));
    const res = await executeAiTask({ taskId: 'generate_slogan', payload: {} });
    expect(res.data).toEqual({ x: 9 });
    expect(postMock).toHaveBeenCalledTimes(2);
  });

  it('agotados los 3 intentos 5xx → lanza error', async () => {
    postMock.mockResolvedValue(httpError(503, 'servicio caído'));
    await expect(executeAiTask({ taskId: 'ats_analysis', payload: {} })).rejects.toThrow('servicio caído');
    expect(postMock).toHaveBeenCalledTimes(3);
  });

  it('error 4xx no transitorio → aborta de inmediato sin reintentos', async () => {
    postMock.mockResolvedValueOnce(httpError(400, 'petición inválida'));
    const onRetry = vi.fn();
    await expect(executeAiTask({ taskId: 'classify_raw_data', payload: {}, onRetry })).rejects.toThrow('petición inválida');
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('corte de red (status 0) cuenta como transitorio y reintenta', async () => {
    postMock
      .mockResolvedValueOnce({ ok: false, status: 0, data: null, error: 'Error de conexión con el servidor' })
      .mockResolvedValueOnce(okJson({ k: 'v' }));
    const res = await executeAiTask({ taskId: 'suggest_records', payload: {} });
    expect(res.data).toEqual({ k: 'v' });
    expect(postMock).toHaveBeenCalledTimes(2);
  });

  it('200 OK con JSON malformado se reintenta y se recupera', async () => {
    postMock
      .mockResolvedValueOnce(okMalformed('ups, esto no es json'))
      .mockResolvedValueOnce(okMalformed('{"truncado":'))
      .mockResolvedValueOnce(okJson({ ok: true }));
    const onRetry = vi.fn();
    const res = await executeAiTask({ taskId: 'suggest_competencies', payload: {}, onRetry });
    expect(res.data).toEqual({ ok: true });
    expect(onRetry.mock.calls.map((c: any[]) => c[0])).toEqual([1, 2]);
  });

  it('200 OK con JSON malformado en los 3 intentos → lanza error de formato', async () => {
    postMock.mockResolvedValue(okMalformed());
    await expect(executeAiTask({ taskId: 'explain_ats', payload: {} })).rejects.toThrow('formato esperado');
    expect(postMock).toHaveBeenCalledTimes(3);
  });
});
