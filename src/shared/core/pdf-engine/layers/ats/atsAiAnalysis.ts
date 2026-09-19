/**
 * NÚCLEO — ANÁLISIS ATS CON IA (atsAiAnalysis.ts)
 *
 * Complementa a atsPreflightCheck.ts: ese motor chequea ESTRUCTURA (¿hay
 * columnas?, ¿falta el email?, ¿los títulos son canónicos?) de forma
 * instantánea y sin costo. Este motor analiza CONTENIDO — algo que un
 * chequeo de reglas fijas no puede hacer — apoyándose en el mismo núcleo
 * de IA compartido (aiClient.ts -> /api/ai-generate) que ya usa el módulo
 * de Carta de Presentación. No se crea un cliente de IA nuevo (Regla 1).
 */

import { generateAiCompletion } from '../../../ai/aiClient';

export interface AtsAiFinding {
  id: string;
  category: 'keyword_gap' | 'weak_bullet' | 'quantification' | 'general';
  title: string;
  detail: string;
}

export interface AtsAiAnalysisResult {
  semanticScore: number;
  findings: AtsAiFinding[];
  providerUsed: string;
  remainingCredits: number;
}

/**
 * @param cvText Texto plano del CV. Se recomienda pasar el mismo
 *   `linearReadingOrder` que ya calcula runAtsPreflightCheck (evita
 *   recalcular la extracción de texto en dos lugares distintos).
 * @param jobDescription Descripción de la vacante objetivo (opcional). Sin
 *   ella, el análisis evalúa calidad general de redacción/cuantificación.
 */
export async function runAiAtsAnalysis(
  cvText: string,
  jobDescription?: string
): Promise<AtsAiAnalysisResult> {
  const systemPrompt = `Eres un reclutador técnico experto en sistemas ATS (Applicant Tracking Systems) y en redacción de currículums en español.
Analizás el texto plano de un CV (tal como lo leería un parser ATS, sin diseño) y, si se provee, la descripción de una vacante puntual.
Tu tarea es encontrar problemas de CONTENIDO que una revisión de estructura no puede detectar: palabras clave de la vacante ausentes en el CV, bullets de experiencia redactados de forma vaga o sin verbo de acción, y logros sin cuantificar (sin números, porcentajes o resultados medibles).
Devolvé EXCLUSIVAMENTE un objeto JSON plano, sin texto adicional ni marcado markdown, con esta forma exacta:
{
  "semanticScore": 0-100,
  "findings": [
    { "id": "string único", "category": "keyword_gap" | "weak_bullet" | "quantification" | "general", "title": "Título corto del hallazgo", "detail": "Explicación de 1-2 oraciones con la recomendación concreta" }
  ]
}
Máximo 6 hallazgos, priorizando los de mayor impacto. Si el CV está sólido, devolvé menos hallazgos o un array vacío, no inventes problemas.`;

  const userPrompt = `TEXTO DEL CV (orden de lectura lineal, tal como lo procesaría un ATS):
${cvText || 'Sin contenido detectado.'}

${jobDescription
    ? `DESCRIPCIÓN DE LA VACANTE OBJETIVO:\n${jobDescription}`
    : 'No se proveyó una vacante puntual: evaluá calidad general de redacción y cuantificación de logros, sin comparar contra palabras clave de una oferta específica.'
  }`;

  const res = await generateAiCompletion({
    systemPrompt,
    userPrompt,
    temperature: 0.4
  });

  const jsonClean = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(jsonClean);

  const findings: AtsAiFinding[] = Array.isArray(parsed.findings)
    ? parsed.findings.slice(0, 6).map((f: any, i: number) => ({
        id: f.id || `ai_finding_${i}`,
        category: ['keyword_gap', 'weak_bullet', 'quantification', 'general'].includes(f.category) ? f.category : 'general',
        title: f.title || 'Hallazgo de IA',
        detail: f.detail || ''
      }))
    : [];

  const semanticScore = Math.max(0, Math.min(100, Number(parsed.semanticScore) || 0));

  return {
    semanticScore,
    findings,
    providerUsed: res.providerUsed,
    remainingCredits: res.remainingCredits
  };
}
