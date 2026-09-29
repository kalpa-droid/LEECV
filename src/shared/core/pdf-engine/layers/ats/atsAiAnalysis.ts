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

import { executeAiTask } from '../../../ai/aiClient';

export interface AtsAiFinding {
  id: string;
  category: 'keyword_gap' | 'weak_bullet' | 'quantification' | 'general';
  title: string;
  detail: string;
  originalText?: string;
  suggestedText?: string;
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

  const res = await executeAiTask<{ semanticScore: number; findings: any[] }>({
    taskId: 'ats_analysis',
    payload: { cvText, jobDescription },
    maxTokens: 1200,
    temperature: 0.4
  });

  const parsed = res.data;

  const findings: AtsAiFinding[] = Array.isArray(parsed.findings)
    ? parsed.findings.slice(0, 6).map((f: any, i: number) => ({
        id: f.id || `ai_finding_${i}`,
        category: ['keyword_gap', 'weak_bullet', 'quantification', 'general'].includes(f.category) ? f.category : 'general',
        title: f.title || 'Hallazgo de IA',
        detail: f.detail || '',
        originalText: f.originalText,
        suggestedText: f.suggestedText
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
