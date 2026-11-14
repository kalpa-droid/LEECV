import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { successResponse, errorResponse } from './_lib/apiResponse.js';
import { serverDal } from './_lib/serverDal.js';
import { AI_PROVIDERS, AI_PROVIDER_FALLBACK_ORDER } from './_lib/aiProviders/registry.js';
import { getNextAvailableKey, markKeyRateLimited } from './_lib/aiProviders/keyRotation.js';
import type { AiCompletionRequest } from './_lib/aiProviders/types.js';
import { calculateAiCost } from './_lib/costCalculator.js';
import { isFragmentEffectivelyEmpty } from './_lib/cvImportGate.js';

export const maxDuration = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket?.remoteAddress || 'unknown-ip';

  const rateLimitOk = await requireRateLimit(req, res, `cv_import_ip_${clientIp}`, { maxRequests: 80, windowSeconds: 3600 });
  if (!rateLimitOk) return;

  const action = req.query.action as string;

  // Presupuesto global por petición: Vercel corta a los 60s.
  const requestDeadline = Date.now() + 50_000;

  // --- NUEVO: acción consolidate-ats (consolidar fragmentos de múltiples páginas) ---
  if (action === 'consolidate-ats') {
    const { fragments = [] } = req.body || {};
    if (!Array.isArray(fragments) || fragments.length === 0) {
      return errorResponse(res, 400, 'Faltan parámetros requeridos: fragments[]');
    }

    const consolidationSystemInstruction = `Eres un consultor experto en optimización de CVs y sistemas ATS (Applicant Tracking Systems).
Tu tarea es consolidar y pulir los datos extraídos por OCR de múltiples páginas de un CV.

REGLAS OBLIGATORIAS:
1. CONSERVAR EL 100% DE LOS REGISTROS: PROHIBIDO eliminar, descartar o recortar a un "top 3". Si en los fragmentos hay 25 cursos, 15 experiencias o 10 certificaciones, debes entregar absolutamente TODOS los cursos, experiencias y certificaciones intactos sin omitir ninguno.
2. CONTINUIDAD: Une descripciones u oraciones que se hayan cortado al cambiar de página sin duplicar palabras.
3. ELIMINAR RUIDO: Remueve números de página, notas al pie de escaneo, folios, sellos repetitivos y cabeceras de página.
4. IMPACTO ATS: Inicia los puntos de responsabilidad y logros con verbos de acción fuertes en tiempo pasado (ej. Implementó, Diseñó, Coordinó, Optimizó).
5. CLASIFICACIÓN EXACTA: Mapea cada elemento a su categoría canónica de LEECV:
   - personalInfo (titlePrefix, fullName, givenNames, surname, email, phone, address, cityProvince, website, quote, dni, cuit, birthDate, nacionalidad, estadoCivil, disponibilidad, licenciaConducir, linkedin, portfolio, location, role, summary)
   - summary, objective, frase
   - experience, education, profession, coursesAndCertificates, achievements, portfolio, projects, publications, references, hardSkills, skills, languages, informatics, redes.
6. FORMATO: Devuelve ÚNICAMENTE un objeto JSON válido, sin delimitadores de código markdown ni texto adicional.`;

    const consolidationRequest: AiCompletionRequest = {
      systemPrompt: consolidationSystemInstruction,
      userPrompt: `Consolida y optimiza para ATS los siguientes fragmentos de páginas:\n\n${JSON.stringify(fragments)}`,
      maxTokens: 6000,
      temperature: 0.2,
    };

    // Intentar Groq primero por velocidad ATS; si sus claves fallan o están limitadas, fallback a Gemini.
    // Rotación multi-key: ante 429 marcar la clave (60s) y seguir con la siguiente disponible en lugar de abortar.
    const providersToTry = ['groq', 'gemini']
      .map(providerId => ({ providerId, provider: AI_PROVIDERS[providerId] }))
      .filter(({ provider }) => !!provider);

    if (providersToTry.length === 0) {
      return errorResponse(res, 503, 'ai_not_configured');
    }

    let lastConsolidationError: any = null;
    let attemptedKeys = 0;
    for (const { providerId, provider } of providersToTry) {
      // Rotar hasta agotar las claves disponibles de este proveedor (salto con 429 marcado como limitado)
      for (let keyAttempt = 0; keyAttempt < 8; keyAttempt++) {
        const remainingMs = requestDeadline - Date.now();
        if (remainingMs < 4000) {
          console.warn('[cv-import] Presupuesto de tiempo de Vercel agotado durante consolidación.');
          break;
        }
        const apiKey = await getNextAvailableKey(providerId);
        if (!apiKey) break; // no quedan claves disponibles para este proveedor → siguiente proveedor
        attemptedKeys++;

        try {
          const result = await provider.complete(consolidationRequest, apiKey);

          if (result.usage) {
            const actualModel = result.modelUsed || provider.defaultModel;
            const cost = calculateAiCost(providerId, actualModel, result.usage.promptTokens, result.usage.completionTokens);
            serverDal.aiTelemetry.logUsage({
              userId: '00000000-0000-0000-0000-000000000000',
              provider: providerId,
              model: actualModel,
              endpoint: 'cv-import-consolidate-ats',
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              estimatedCostUsd: cost
            }).catch(err => console.error('[aiTelemetry] Error logging usage in consolidate-ats:', err));
          }

          let consolidatedJson: any;
          try {
            const cleanJsonStr = result.content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            consolidatedJson = JSON.parse(cleanJsonStr);
          } catch (parseErr) {
            console.error(`[cv-import] Error al parsear JSON consolidado de ${providerId}:`, parseErr);
            break;
          }
          return successResponse(res, { consolidatedJson });
        } catch (err: any) {
          lastConsolidationError = err;
          if (err.status === 429 || err.message?.includes('429')) {
            await markKeyRateLimited(providerId, apiKey, 60);
            console.warn(`[cv-import] Clave de ${providerId} limitada (429). Rotando a la siguiente clave...`);
            continue;
          }
          console.warn(`[cv-import] Falló consolidación con ${providerId}:`, err.message || err);
          break; // error no recuperable para este proveedor → siguiente proveedor
        }
      }
    }

    if (attemptedKeys === 0 && !lastConsolidationError) {
      console.error('[cv-import] No hay claves de IA configuradas o todas están rate-limited.');
      return errorResponse(res, 503, 'ai_not_configured');
    }

    console.error('[cv-import] Error al consolidar datos en todos los proveedores:', lastConsolidationError);
    return errorResponse(res, 502, 'Error del proveedor de IA durante consolidación');
  }

  if (action === 'job-status') {
    const jobId = req.query.jobId as string;
    if (!jobId) return errorResponse(res, 400, 'jobId requerido');
    const job = await serverDal.ocrJobs.getById(jobId);
    if (!job) return errorResponse(res, 404, 'Job no encontrado');
    return successResponse(res, { job });
  }

  if (action !== 'extract-page') {
    return errorResponse(res, 400, 'Acción no válida');
  }

  const { kind, content, contextSummary = '', auxiliaryText = '', mimeType: rawMimeType } = req.body || {};

  // MIME real de la imagen (el frontend puede mandar WebP/PNG nítido en páginas digitales)
  const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const imageMimeType = (allowedMimes.has(String(rawMimeType)) ? rawMimeType : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp';

  const contextBlock = typeof contextSummary === 'string' && contextSummary.trim()
    ? `\n\nContexto de la página anterior (usalo para decidir si un bloque es continuación del último registro): ${contextSummary.trim()}`
    : '';

  if (!content) {
    return errorResponse(res, 400, 'Faltan parámetros requeridos');
  }

  // --- NUEVO: estimar páginas y validar límite (máximo 10 por job) ---
  let estimatedPages = 1;
  if (kind === 'image') {
    estimatedPages = 1;
  } else if (kind === 'text') {
    const lines = (content?.match(/\n/g) || []).length;
    estimatedPages = Math.max(1, Math.ceil((lines + 1) / 50)); // ~50 líneas por página
  } else if (kind === 'pdf') {
    // Para PDF, el frontend ya dividió en páginas, asumimos 1 por request
    estimatedPages = 1;
  }

  // --- Límite y tracking ---
  const frontPageLimit = 10;
  const hasExtraPages = estimatedPages > frontPageLimit;

  // --- CREAR JOB ANTES DE PROCESAR (tracking para eventuales colas futuras) ---
  const pageJobResult = await serverDal.ocrJobs.create({
    userId: '',
    email: '',
    pagesTotal: estimatedPages > frontPageLimit ? frontPageLimit : estimatedPages,
    status: 'processing',
  });
  const pageJobId = pageJobResult?.id as string;

  try {
    const systemInstruction = `Eres un extractor experto de CVs, hojas de vida y perfiles de LinkedIn.
Tu tarea es extraer TODA la información estructurada de la página provista a un objeto JSON.

ESTRUCTURA DE SALIDA OBLIGATORIA:
{
  "personalInfo": {
    "fullName": "Nombre completo",
    "givenNames": "Nombre(s) de pila si aparecen por separado",
    "surname": "Apellido(s) si aparecen por separado",
    "email": "correo@ejemplo.com",
    "phone": "+54 11 1234-5678",
    "role": "Cargo o título profesional actual",
    "location": "Ciudad, País",
    "summary": "Resumen profesional o perfil (copiar textualmente si existe, o dejar vacío)",
    "dni": "",
    "cuit": "",
    "birthDate": "YYYY-MM-DD si se encuentra",
    "estadoCivil": "",
    "nacionalidad": "",
    "linkedin": "URL de LinkedIn si aparece",
    "portfolio": "URL de portfolio/web personal si aparece"
  },
  "experience": [
    {
      "company": "Nombre de la empresa",
      "role": "Puesto / Cargo",
      "startDate": "YYYY-MM o texto original",
      "endDate": "YYYY-MM, 'Presente' o 'Actual' si sigue vigente",
      "description": "Descripción COMPLETA de responsabilidades y logros. NO resumir ni acortar. Copiar TODO el texto.",
      "continuesFromPrevious": false
    }
  ],
  "education": [
    {
      "institution": "Universidad / Instituto",
      "degree": "Título obtenido o en curso",
      "startDate": "",
      "endDate": "",
      "description": "Detalles adicionales si existen",
      "continuesFromPrevious": false
    }
  ],
  "skills": [
    { "name": "Habilidad individual" }
  ],
  "languages": [
    { "language": "Idioma", "proficiency": "Nivel (Nativo, Avanzado, Intermedio, Básico)" }
  ],
  "coursesAndCertificates": [
    {
      "title": "Nombre del curso, capacitación o certificado",
      "institution": "Institución u organización emisora",
      "year": "Año o fecha",
      "hours": "Carga horaria si se menciona"
    }
  ],
  "projects": [
    {
      "title": "Nombre del proyecto",
      "institution": "Entidad, empresa o cliente",
      "year": "Año",
      "details": "Detalles o tecnologías"
    }
  ],
  "publications": [
    {
      "title": "Título de la publicación o artículo",
      "autor": "Autor o coautores",
      "year": "Año"
    }
  ],
  "achievements": [
    {
      "title": "Logro, premio o reconocimiento",
      "institution": "Institución que lo otorgó",
      "details": "Detalles"
    }
  ],
  "objective": "Objetivo profesional o meta (copiar textualmente si existe, o dejar vacío)",
  "frase": "Frase, cita o lema personal si aparece",
  "redes": [
    { "plataforma": "LinkedIn / GitHub / Portfolio", "usuario": "Usuario o handle", "url": "URL completa" }
  ],
  "hardSkills": [
    { "name": "Habilidad técnica", "level": "Nivel si aparece" }
  ],
  "informatics": [
    { "title": "Programa / herramienta", "course": "Curso o certificación asociada", "institution": "Institución" }
  ],
  "profession": [
    { "degree": "Título profesional", "institution": "Institución", "year": "Año" }
  ],
  "references": [
    { "personaReferencia": "Nombre del referente", "cargo": "Cargo / relación", "institution": "Empresa / institución", "contactoReferencia": "Contacto" }
  ],
  "portfolio": [
    { "title": "Proyecto / trabajo destacado", "institution": "Cliente / empresa", "details": "Detalles" }
  ]
}

REGLAS CRÍTICAS:
1. Extraer TODOS los datos que encuentres sin excepción: experiencias, títulos, cursos, diplomas, certificaciones, proyectos y logros. No omitir ninguno.
2. Si la página contiene constancias de asistencia, certificados, capacitaciones o cursos, colocarlos en 'coursesAndCertificates'. NUNCA descartarlos.
3. Las descripciones de experiencia deben copiarse TEXTUALMENTE y COMPLETAS. No resumir.
4. Si un dato continúa de la página anterior (texto cortado), marcar "continuesFromPrevious": true.
5. Si el documento es una exportación de LinkedIn, mapear "Licenses & Certifications" a coursesAndCertificates, y "Skills" a skills.
6. Extraer DNI, CUIT, fecha de nacimiento, estado civil y nacionalidad si los encuentras.
7. Si hay URLs de LinkedIn o portfolio, incluirlas en personalInfo.
8. Las fechas deben normalizarse a formato YYYY-MM cuando sea posible.
9. Las habilidades deben separarse individualmente (una por objeto, no agrupadas).
10. Devolver ÚNICAMENTE el JSON válido, sin texto adicional ni explicaciones.

PROTOCOLO DE LECTURA ESTRUCTURAL (seguilo ANTES de extraer):
A. Segmentá la página: ¿una columna, dos columnas / barra lateral, tabla cronológica, o un certificado/diploma completo?
B. En dos columnas o barra lateral: leé TODA una columna de arriba a abajo antes de pasar a la siguiente. Nunca mezcles un renglón izquierdo con uno derecho en un mismo registro.
C. Si viene "Texto auxiliar extraído del PDF", usalo como ancla exacta: la imagen decide a qué sección pertenece cada bloque y el texto auxiliar copia sin errores emails, teléfonos, DNI, CUIT, enlaces y fechas.
D. Barras de progreso, estrellas o puntos junto a idiomas/habilidades: NO inventes porcentajes. Mapeá a nivel (Básico, Intermedio, Avanzado) SOLO si es inequívoco; si no hay nivel explícito, omití proficiency.
E. Si la página es un certificado, diploma o analítico completo: extraé título, institución, año y carga horaria completos en coursesAndCertificates o education. Nunca resumas ni omitas campos por parecer redundantes.
F. TIPOS EXACTOS (Groq no valida el esquema automáticamente): experience, education, skills, languages, coursesAndCertificates, projects, publications, achievements, redes, hardSkills, informatics, profession, references y portfolio son SIEMPRE arrays (usá [] si no hay datos); personalInfo es SIEMPRE un objeto con las llaves exactas indicadas; los strings van entre comillas; continuesFromPrevious es booleano estricto (true/false, nunca "true"); sin null ni undefined: usá "" o [] cuando falte un dato. Si el CV trae objetivo/frase, colocalos en objective/frase como strings.`;

    const userPromptBase = kind === 'text'
      ? `Extrae los datos de este texto de CV:\n\n${content}`
      : `Extrae los datos de la imagen de la página del CV provista.`;

    const userPrompt = auxiliaryText
      ? `${userPromptBase}\n\nTexto auxiliar extraído del PDF (usalo como ancla exacta de caracteres ambiguos; priorizá la imagen para la estructura y las secciones):\n${auxiliaryText}${contextBlock}`
      : `${userPromptBase}${contextBlock}`;

    const request: AiCompletionRequest = {
      systemPrompt: systemInstruction,
      userPrompt,
      maxTokens: 4000,
      temperature: 0.1,
      responseSchema: {
        type: "object",
        properties: {
          personalInfo: {
            type: "object",
            properties: {
              fullName: { type: "string" },
              titlePrefix: { type: "string" },
              givenNames: { type: "string" },
              surname: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              role: { type: "string" },
              location: { type: "string" },
              summary: { type: "string" },
              website: { type: "string" },
              quote: { type: "string" },
              address: { type: "string" },
              dni: { type: "string" },
              cuit: { type: "string" },
              birthDate: { type: "string" },
              estadoCivil: { type: "string" },
              nacionalidad: { type: "string" },
              disponibilidad: { type: "string" },
              licenciaConducir: { type: "string" },
              linkedin: { type: "string" },
              portfolio: { type: "string" }
            }
          },
          experience: {
            type: "array",
            items: {
              type: "object",
              properties: {
                company: { type: "string" },
                role: { type: "string" },
                startDate: { type: "string" },
                endDate: { type: "string" },
                description: { type: "string" },
                continuesFromPrevious: { type: "boolean" }
              }
            }
          },
          education: {
            type: "array",
            items: {
              type: "object",
              properties: {
                institution: { type: "string" },
                degree: { type: "string" },
                startDate: { type: "string" },
                endDate: { type: "string" },
                description: { type: "string" },
                continuesFromPrevious: { type: "boolean" }
              }
            }
          },
          skills: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" }
              }
            }
          },
          languages: {
            type: "array",
            items: {
              type: "object",
              properties: {
                language: { type: "string" },
                proficiency: { type: "string" }
              }
            }
          },
          coursesAndCertificates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                institution: { type: "string" },
                year: { type: "string" },
                hours: { type: "string" }
              }
            }
          },
          projects: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                institution: { type: "string" },
                year: { type: "string" },
                details: { type: "string" }
              }
            }
          },
          publications: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                autor: { type: "string" },
                year: { type: "string" }
              }
            }
          },
          achievements: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                institution: { type: "string" },
                details: { type: "string" }
              }
            }
          },
          objective: { type: "string" },
          frase: { type: "string" },
          summary: { type: "string" },
          redes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                plataforma: { type: "string" },
                usuario: { type: "string" },
                url: { type: "string" }
              }
            }
          },
          hardSkills: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                level: { type: "string" }
              }
            }
          },
          informatics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                course: { type: "string" },
                institution: { type: "string" }
              }
            }
          },
          profession: {
            type: "array",
            items: {
              type: "object",
              properties: {
                degree: { type: "string" },
                institution: { type: "string" },
                year: { type: "string" }
              }
            }
          },
          references: {
            type: "array",
            items: {
              type: "object",
              properties: {
                personaReferencia: { type: "string" },
                cargo: { type: "string" },
                institution: { type: "string" },
                contactoReferencia: { type: "string" }
              }
            }
          },
          portfolio: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                institution: { type: "string" },
                details: { type: "string" }
              }
            }
          }
        }
      }
    };

    if (kind === 'image') {
      const base64Data = content.includes(',') ? content.split(',')[1] : content;
      request.images = [{
        mimeType: imageMimeType,
        base64: base64Data
      }];
      // Alta resolución de medios para tablas, notas al pie y texto chico (respaldo seguro en gemini.ts)
      request.mediaResolution = 'MEDIA_RESOLUTION_HIGH';
    }

    let lastError: Error | null = null;

    // Cascada de proveedores/claves. Reusable: la primera pasada y el reintento de verificación
    // (Completeness Gate) comparten esta misma lógica.
    const runCompletionCascade = async (reqToUse: AiCompletionRequest): Promise<{ content: string; providerId: string } | null> => {
      for (const providerId of AI_PROVIDER_FALLBACK_ORDER) {
        const remainingMs = requestDeadline - Date.now();
        if (remainingMs < 4000) {
          console.warn('[cv-import] Presupuesto de tiempo de Vercel agotado. No se intenta con más proveedores.');
          break;
        }
        const provider = AI_PROVIDERS[providerId];
        if (!provider) continue;
        if (kind === 'image' && !provider.supportsImages) continue;

        // Rotar hasta agotar las claves disponibles del proveedor (salto con 429 como en consolidate-ats)
        for (let keyAttempt = 0; keyAttempt < 8; keyAttempt++) {
          const attemptRemainingMs = requestDeadline - Date.now();
          if (attemptRemainingMs < 4000) break;
          const apiKey = await getNextAvailableKey(providerId);
          if (!apiKey) break; // no quedan claves disponibles para este proveedor → siguiente proveedor

          try {
            const result = await provider.complete(reqToUse, apiKey);

            if (result.usage) {
              const actualModel = result.modelUsed || provider.defaultModel;
              const cost = calculateAiCost(providerId, actualModel, result.usage.promptTokens, result.usage.completionTokens);
              serverDal.aiTelemetry.logUsage({
                userId: '00000000-0000-0000-0000-000000000000',
                provider: providerId,
                model: actualModel,
                endpoint: 'cv-import-stateless',
                promptTokens: result.usage.promptTokens,
                completionTokens: result.usage.completionTokens,
                estimatedCostUsd: cost
              }).catch(err => console.error('[aiTelemetry] Error logging usage in cv-import:', err));
            }

            return { content: result.content, providerId };
          } catch (err: any) {
            lastError = err;
            if (err.status === 429 || err.message?.includes('429')) {
              await markKeyRateLimited(providerId, apiKey, 60);
              console.warn(`[cv-import] Clave de ${providerId} limitada (429). Rotando a la siguiente clave...`);
              continue; // siguiente clave del mismo proveedor
            }
            break; // error no recuperable para este proveedor → siguiente proveedor
          }
        }
      }
      return null;
    };

    let cascadeResult = await runCompletionCascade(request);
    let completionText: string | null = cascadeResult?.content ?? null;
    let successfulProviderId: string | null = cascadeResult?.providerId ?? null;

    if (!completionText || !successfulProviderId) {
      const keyAvailability = await Promise.all(AI_PROVIDER_FALLBACK_ORDER.map(pid => getNextAvailableKey(pid)));
      const allKeysMissing = keyAvailability.every(k => !k);
      const allRateLimited = keyAvailability.some(k => !!k) && !!lastError?.message?.includes('429') && !allKeysMissing;

      if (allKeysMissing) {
        console.error('[cv-import] No hay claves de IA configuradas:', lastError);
        await serverDal.ocrJobs.update(pageJobId, { status: 'failed', error_message: 'ai_not_configured' });
        return errorResponse(res, 503, 'ai_not_configured');
      }
      if (allRateLimited) {
        console.error('[cv-import] Proveedores de IA limitados por tasa:', lastError);
        await serverDal.ocrJobs.update(pageJobId, { status: 'failed', error_message: 'ai_rate_limited' });
        return errorResponse(res, 429, 'ai_rate_limited');
      }
      console.error('[cv-import] Error al procesar página:', lastError);
      await serverDal.ocrJobs.update(pageJobId, { status: 'failed', error_message: 'ai_provider_error' });
      return errorResponse(res, 502, `ai_provider_error: ${lastError?.message || 'Error técnico del proveedor de IA'}`);
    }

    let fragmentJson = {};
    try {
      const cleanJsonStr = completionText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      fragmentJson = JSON.parse(cleanJsonStr);
    } catch (parseErr) {
      try {
        const retryRequest: AiCompletionRequest = {
          systemPrompt: 'Recibes un texto que debería ser JSON pero tiene errores de sintaxis. Corregí el JSON y devolvelo SOLO como JSON válido, sin explicaciones.',
          userPrompt: `Corregí este JSON:\n${completionText}`,
          maxTokens: 4000,
          temperature: 0.0,
          responseSchema: request.responseSchema
        };
        const provider = AI_PROVIDERS[successfulProviderId];
        const apiKey = await getNextAvailableKey(successfulProviderId);
        if (provider && apiKey) {
          const retryResult = await provider.complete(retryRequest, apiKey);
          const retryClean = retryResult.content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
          fragmentJson = JSON.parse(retryClean);
        } else {
          throw parseErr;
        }
      } catch {
        console.error('AI no devolvió JSON válido ni en retry', completionText);
        await serverDal.ocrJobs.update(pageJobId, {
          status: 'failed',
          error_message: 'Error procesando respuesta de IA (Formato inválido tras reintento)',
        });
        return errorResponse(res, 500, 'Error procesando respuesta de IA (Formato inválido tras reintento)');
      }
    }

    // --- Completeness Gate: página con contenido pero JSON vacío → UN reintento de verificación ---
    const expectsRichContent =
      kind === 'image' || (typeof auxiliaryText === 'string' && auxiliaryText.length > 400);

    if (expectsRichContent && isFragmentEffectivelyEmpty(fragmentJson)) {
      console.warn('[cv-import] Página con contenido pero JSON vacío; disparando reintento de verificación.');
      const verifyRequest: AiCompletionRequest = {
        ...request,
        userPrompt: `${request.userPrompt}\n\nATENCIÓN: una primera pasada devolvió un JSON vacío pese a que la página contiene datos. Releé la página completa con atención y devolvé TODOS los datos encontrados, aunque parezcan menores. Nunca un objeto vacío.`,
      };
      const verifyResult = await runCompletionCascade(verifyRequest);
      if (verifyResult) {
        try {
          const verifyClean = verifyResult.content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
          const verifiedJson = JSON.parse(verifyClean);
          if (!isFragmentEffectivelyEmpty(verifiedJson)) {
            fragmentJson = verifiedJson;
          } else {
            console.warn('[cv-import] El reintento de verificación también devolvió JSON vacío; se conserva el original.');
          }
        } catch (verifyErr) {
          console.warn('[cv-import] El reintento de verificación no devolvió JSON válido; se conserva el original.', verifyErr);
        }
      } else {
        console.warn('[cv-import] El reintento de verificación no obtuvo respuesta de ningún proveedor; se conserva el original.');
      }
    }

    await serverDal.ocrJobs.update(pageJobId!, {
      status: 'completed',
      result_json: fragmentJson,
      completed_at: new Date().toISOString(),
    });

    const message = hasExtraPages ? 'Página procesada. Hay más páginas pendientes de tratamiento.' : 'Página procesada exitosamente.';
    return successResponse(res, { jobId: pageJobId, fragmentJson, message });
  } catch (error: any) {
    console.error('Error processing cv import page:', error);
    try {
      await serverDal.ocrJobs.update(pageJobId, {
        status: 'failed',
        error_message: error.message || 'Unknown internal error',
      });
    } catch (_) {}
    return errorResponse(res, 500, 'Error interno del servidor');
  }
}
