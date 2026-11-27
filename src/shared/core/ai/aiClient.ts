import { apiClient } from '../utils/apiClient';
import type { CVData } from '../../../types/cv';

export interface AiTaskParams<T = any> {
  taskId: 'improve_bullet' | 'generate_summary' | 'generate_objective' | 'suggest_competencies' | 'cover_letter' | 'generate_slogan' | 'explain_ats' | 'ats_analysis' | 'first_job_interview' | 'classify_raw_data' | 'suggest_achievement_acr' | 'suggest_records' | 'rewrite_record' | 'app_guide_assistant' | 'editorial_structure' | 'editorial_rewrite' | 'editorial_refine' | 'editorial_ocr_page' | 'editorial_format_citation' | 'editorial_detect_preset' | 'editorial_analyze_ast_structure' | 'editorial_analyze_ast_structure_long' | 'editorial_proofread_section' | 'book_detect_orientation' | 'book_detect_page_numbers' | 'suggest_job_profiles' | 'tailor_cv_for_application';
  payload: T;
  cvData?: CVData;
  maxTokens?: number;
  temperature?: number;
  /** Callback opcional y NO bloqueante: se invoca antes de cada reintento automático (1, 2, ...). Por defecto silencioso. */
  onRetry?: (attempt: number) => void;
  /** Permite activar/desactivar explícitamente la caché local de deduplicación (10 min). */
  useCache?: boolean;
}

export interface AiTaskResult<T = any> {
  data: T;
  providerUsed: string;
}

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [500, 1200];
const TRANSIENT_STATUSES = new Set([0, 408, 429, 500, 502, 503, 504]);
const AI_CACHE_TTL_MS = 10 * 60 * 1000;
const AI_CACHE_MAX_ENTRIES = 50;
const AI_CACHE_MAX_KEY_CHARS = 20_000;

const aiTaskCache = new Map<string, { value: AiTaskResult<any>; expiresAt: number }>();

/** Limpia la caché en memoria de tareas IA (útil en tests o tras cerrar sesión). */
export function clearAiTaskCache(): void {
  aiTaskCache.clear();
}

function shouldUseAiCache(params: AiTaskParams<any>): boolean {
  if (params.useCache === false) return false;
  const isVitest = typeof process !== 'undefined' && Boolean(process.env?.VITEST);
  if (isVitest && params.useCache !== true) return false;
  if (Array.isArray((params.payload as any)?.images) && (params.payload as any).images.length > 0) {
    return false;
  }
  return true;
}

function buildAiCacheKey(params: AiTaskParams<any>): string | null {
  try {
    const serialized = JSON.stringify({
      taskId: params.taskId,
      payload: params.payload ?? null,
      cvId: params.cvData?.id || '',
      format: (params.cvData as any)?.activeFormatId || '',
      maxTokens: params.maxTokens ?? null,
      temperature: params.temperature ?? null,
    });
    if (!serialized || serialized.length >= AI_CACHE_MAX_KEY_CHARS) return null;
    return serialized;
  } catch {
    return null;
  }
}

function storeAiCacheEntry(key: string, value: AiTaskResult<any>): void {
  const now = Date.now();
  if (aiTaskCache.size >= AI_CACHE_MAX_ENTRIES) {
    const oldestKey = aiTaskCache.keys().next().value;
    if (oldestKey !== undefined) {
      aiTaskCache.delete(oldestKey);
    }
  }
  aiTaskCache.set(key, { value, expiresAt: now + AI_CACHE_TTL_MS });
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Parsea el texto de la respuesta de IA. Tolera fences de markdown y prosa alrededor
 * del objeto JSON (recorta del primer `{` al último `}` o del primer `[` al último `]`).
 * Lanza Error con mensaje legible si no hay JSON recuperable.
 */
function tryParseAiJson<T>(rawText: string): T {
  const cleanJson = String(rawText ?? '').replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleanJson) as T;
  } catch {
    // Caer al recorte por delimitadores antes de rendirse
    const firstObj = cleanJson.indexOf('{');
    const firstArr = cleanJson.indexOf('[');
    let start = -1;
    let close = '}';
    if (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
      start = firstArr;
      close = ']';
    } else if (firstObj !== -1) {
      start = firstObj;
    }
    const end = close === '}' ? cleanJson.lastIndexOf('}') : cleanJson.lastIndexOf(']');
    if (start !== -1 && end > start) {
      return JSON.parse(cleanJson.slice(start, end + 1)) as T;
    }
    console.error('Failed to parse AI response as JSON:', rawText);
    throw new Error('La respuesta de la IA no tiene el formato esperado.');
  }
}

/**
 * Invoca una tarea de IA predefinida en el servidor.
 *
 * Reintentos automáticos silenciosos (hasta 3 intentos con backoff 500 ms / 1200 ms)
 * ante errores transitorios: corte de red (status 0), 408/429/5xx o JSON inválido.
 * Errores 4xx no transitorios abortan de inmediato. El cartel rojo solo aparece
 * si se agotan todos los intentos automáticos.
 */
export async function executeAiTask<T = any>(params: AiTaskParams): Promise<AiTaskResult<T>> {
  const { taskId, payload, cvData, maxTokens, temperature, onRetry } = params;
  const cacheable = shouldUseAiCache(params);
  const cacheKey = cacheable ? buildAiCacheKey(params) : null;

  if (cacheKey) {
    const cached = aiTaskCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as AiTaskResult<T>;
    }
    if (cached) {
      aiTaskCache.delete(cacheKey);
    }
  }

  let lastError: Error = new Error('Error al comunicarse con el servicio de IA.');

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await apiClient.post('/api/ai-generate', { taskId, payload, cvData, maxTokens, temperature });

    if (res.ok && res.data?.success) {
      try {
        const parsedData = tryParseAiJson<T>(res.data.text);
        const result: AiTaskResult<T> = {
          data: parsedData,
          providerUsed: res.data.providerUsed,
        };
        if (cacheKey) {
          storeAiCacheEntry(cacheKey, result);
        }
        return result;
      } catch (e: any) {
        // JSON inválido en 200 OK → fallo transitorio, reintentar automáticamente
        lastError = e instanceof Error ? e : new Error('La respuesta de la IA no tiene el formato esperado.');
      }
    } else {
      lastError = new Error(res.error || res.data?.error || res.data?.message || 'Error al comunicarse con el servicio de IA.');
      // 4xx no transitorio (400/401/403/404): no reintentar, devolver el error de inmediato
      if (res.status && !TRANSIENT_STATUSES.has(res.status)) {
        break;
      }
    }

    if (attempt < MAX_ATTEMPTS) {
      onRetry?.(attempt);
      await sleep(BACKOFF_MS[attempt - 1] ?? 1200);
    }
  }

  console.error('AI task failed after automatic retries:', lastError);
  throw lastError;
}
