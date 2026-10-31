import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireRateLimit } from './_lib/rateLimiter.js';
import { successResponse, errorResponse } from './_lib/apiResponse.js';
import { serverDal } from './_lib/serverDal.js';
import { AI_PROVIDERS, AI_PROVIDER_FALLBACK_ORDER } from './_lib/aiProviders/registry.js';
import { getNextAvailableKey, markKeyRateLimited } from './_lib/aiProviders/keyRotation.js';
import type { AiCompletionRequest } from './_lib/aiProviders/types.js';
import { calculateAiCost } from './_lib/costCalculator.js';

export const maxDuration = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return errorResponse(res, 405, 'Método no permitido');
  }

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket?.remoteAddress || 'unknown-ip';

  const rateLimitOk = await requireRateLimit(req, res, `cv_import_ip_${clientIp}`, { maxRequests: 20, windowSeconds: 3600 });
  if (!rateLimitOk) return;

  const action = req.query.action as string;

  if (action !== 'extract-page') {
    return errorResponse(res, 400, 'Acción no válida');
  }

  const { kind, content, contextSummary = '', auxiliaryText = '' } = req.body || {};

  if (!content) {
    return errorResponse(res, 400, 'Faltan parámetros requeridos');
  }

  try {
    const systemInstruction = `Eres un extractor experto de CVs, hojas de vida y perfiles de LinkedIn.
Tu tarea es extraer TODA la información estructurada de la página provista a un objeto JSON.

ESTRUCTURA DE SALIDA OBLIGATORIA:
{
  "personalInfo": {
    "fullName": "Nombre completo",
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
  ]
}

REGLAS CRÍTICAS:
1. Extraer TODOS los datos que encuentres. No omitir ninguna experiencia ni educación.
2. Las descripciones de experiencia deben copiarse TEXTUALMENTE y COMPLETAS. No resumir.
3. Si un dato continúa de la página anterior (texto cortado), marcar "continuesFromPrevious": true.
4. Si el documento es una exportación de LinkedIn, mapear "Licenses & Certifications" a education, y "Skills" a skills.
5. Extraer DNI, CUIT, fecha de nacimiento, estado civil y nacionalidad si los encuentras.
6. Si hay URLs de LinkedIn o portfolio, incluirlas en personalInfo.
7. Las fechas deben normalizarse a formato YYYY-MM cuando sea posible.
8. Las habilidades deben separarse individualmente (una por objeto, no agrupadas).
9. Devolver ÚNICAMENTE el JSON válido, sin texto adicional ni explicaciones.`;

    const userPromptBase = kind === 'text'
      ? `Extrae los datos de este texto de CV:\n\n${content}`
      : `Extrae los datos de la imagen de la página del CV provista.`;

    const userPrompt = auxiliaryText
      ? `${userPromptBase}\n\nTexto auxiliar extraído del PDF (usalo solo como referencia, priorizá lo que ves):\n${auxiliaryText}\n${contextSummary}`
      : `${userPromptBase}\n${contextSummary}`;

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
              email: { type: "string" },
              phone: { type: "string" },
              role: { type: "string" },
              location: { type: "string" },
              summary: { type: "string" },
              dni: { type: "string" },
              cuit: { type: "string" },
              birthDate: { type: "string" },
              estadoCivil: { type: "string" },
              nacionalidad: { type: "string" },
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
          }
        }
      }
    };

    if (kind === 'image') {
      const base64Data = content.includes(',') ? content.split(',')[1] : content;
      request.images = [{
        mimeType: 'image/jpeg',
        base64: base64Data
      }];
    }

    let completionText: string | null = null;
    let successfulProviderId: string | null = null;
    let lastError: Error | null = null;

    for (const providerId of AI_PROVIDER_FALLBACK_ORDER) {
      const provider = AI_PROVIDERS[providerId];
      if (!provider) continue;
      if (kind === 'image' && !provider.supportsImages) continue;

      const apiKey = getNextAvailableKey(providerId);
      if (!apiKey) continue;

      try {
        const result = await provider.complete(request, apiKey);
        completionText = result.content;

        if (result.usage) {
          const cost = calculateAiCost(providerId, provider.defaultModel, result.usage.promptTokens, result.usage.completionTokens);
          serverDal.aiTelemetry.logUsage({
            userId: '00000000-0000-0000-0000-000000000000',
            provider: providerId,
            model: provider.defaultModel,
            endpoint: 'cv-import-stateless',
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            estimatedCostUsd: cost
          }).catch(err => console.error('[aiTelemetry] Error logging usage in cv-import:', err));
        }

        successfulProviderId = providerId;
        break;
      } catch (err: any) {
        lastError = err;
        if (err.status === 429 || err.message?.includes('429')) {
          markKeyRateLimited(providerId, apiKey, 60);
        }
      }
    }

    if (!completionText || !successfulProviderId) {
      console.error('[cv-import] Error al procesar página:', lastError);
      return errorResponse(
        res,
        502,
        `No se pudo procesar con los proveedores de IA disponibles: ${lastError?.message || 'Servicios no disponibles'}`
      );
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
        const apiKey = getNextAvailableKey(successfulProviderId);
        if (provider && apiKey) {
          const retryResult = await provider.complete(retryRequest, apiKey);
          const retryClean = retryResult.content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
          fragmentJson = JSON.parse(retryClean);
        } else {
          throw parseErr;
        }
      } catch {
        console.error('AI no devolvió JSON válido ni en retry', completionText);
        return errorResponse(res, 500, 'Error procesando respuesta de IA (Formato inválido tras reintento)');
      }
    }

    return successResponse(res, { fragmentJson });
  } catch (error: any) {
    console.error('Error processing cv import page:', error);
    return errorResponse(res, 500, 'Error interno del servidor');
  }
}
