/**
 * Detector Inteligente de Tipo de Obra Editorial (editorialPresetDetector.ts)
 *
 * Cuando el usuario sube un archivo (Word, LibreOffice, PDF o apuntes) o pega un texto
 * en EditorLee, analiza la estructura y vocabulario para detectar si el documento
 * corresponde a otro tipo de obra distinto al que está activo (por ejemplo, subió un
 * "Informe / Proyecto" mientras la app está en "Libro / Novela").
 *
 * REGLA DE ORO: NUNCA cambia el preset en silencio. Devuelve una recomendación
 * estructurada para que la UI avise en ese instante y el usuario decida con 1 clic.
 *
 * Cumple Regla 8: normalización de diacríticos `.normalize('NFD')`, límites de palabra `\b`
 * y trazabilidad mediante `reportMessage`.
 */

import { executeAiTask } from '../../../shared/core/ai/aiClient';
import { reportMessage } from '../../../shared/core/utils/monitoring';
import { getEditorialPreset } from './editorialPresetCatalog';
import type {
  EditorialBibliographyStyle,
  EditorialPresetId,
  EditorialStructuralNormId,
} from './editorialTypes';

export interface EditorialPresetRecommendation {
  currentPresetId: EditorialPresetId;
  recommendedPresetId: EditorialPresetId;
  recommendedPresetLabel: string;
  recommendedStructuralNormId: EditorialStructuralNormId;
  recommendedBibliographyStyle: EditorialBibliographyStyle;
  confidence: 'high' | 'medium' | 'low';
  detectedLabel: string;
  reason: string;
  source: 'ai' | 'heuristic';
}

function normalizeForMatching(raw: string): string {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Clasificador heurístico local instantáneo (< 5 ms, sin red).
 * Se usa como diagnóstico inmediato y como respaldo si el proveedor de IA no está disponible.
 */
export function detectEditorialPresetHeuristic(
  rawText: string,
  fileName = '',
): {
  presetId: EditorialPresetId;
  structuralNormId: EditorialStructuralNormId;
  bibliographyStyle: EditorialBibliographyStyle;
  confidence: 'high' | 'medium' | 'low';
  detectedLabel: string;
  reason: string;
} {
  const sample = `${fileName}\n${String(rawText || '').slice(0, 8000)}\n${String(rawText || '').slice(-2500)}`;
  const norm = normalizeForMatching(sample);

  const countMatches = (patterns: readonly RegExp[]): number =>
    patterns.reduce((acc, rx) => acc + (rx.test(norm) ? 1 : 0), 0);

  // 1. Señales de Informe / Proyecto Ejecutivo
  const executiveSignals = countMatches([
    /\bresumen\s+ejecutivo\b/,
    /\binforme\s+(tecnico|de\s+gestion|de\s+avance|ejecutivo|final|anual|profesional)\b/,
    /\b(kpi|indicadores\s+de\s+gestion|cronograma|presupuesto|entregables|alcance\s+del\s+proyecto)\b/,
    /\b(objetivos?\s+especificos?|objetivo\s+general|objetivo\s+del\s+proyecto)\b/,
    /\b(plan\s+de\s+accion|recomendaciones\s+estrategicas|matriz\s+de\s+riesgos|diagnostico\s+situacional)\b/,
  ]);

  // 2. Señales de Artículo / Informe Científico IMRyD (Vancouver / IEEE)
  const vancouverSignals = countMatches([
    /\b(materiales\s+y\s+metodos|pacientes\s+y\s+metodos|metodologia\s+experimental)\b/,
    /\b(resultados\s+y\s+discusion|\bdiscusion\b)\b/,
    /\b(abstract|palabras\s+clave|keywords)\b/,
    /\[\d{1,2}(?:\s*,\s*\d{1,2})*\]/, // Citas numéricas [1], [2, 3]
    /\b(ensayo\s+clinico|cohorte|significancia\s+estadistica|p\s*<\s*0[.,]0\d)\b/,
  ]);

  // 3. Señales de Tesis Universitaria APA 7
  const thesisSignals = countMatches([
    /\b(tesis\s+de\s+grado|tesis\s+doctoral|tesina|trabajo\s+final\s+de\s+grado)\b/,
    /\b(marco\s+teorico|estado\s+del\s+arte|antecedentes\s+de\s+la\s+investigacion)\b/,
    /\b(hipotesis\s+de\s+investigacion|variables\s+de\s+estudio|diseno\s+metodologico)\b/,
    /\([a-z]{3,20}\s*,\s*(?:19|20)\d{2}[a-z]?(?:\s*,\s*p\.?\s*\d+)?\)/, // Cita APA (Autor, 2023)
    /\breferencias\s+bibliograficas\b/,
  ]);

  // 4. Señales de TP Escolar / Secundaria
  const schoolSignals = countMatches([
    /\b(trabajo\s+practico|tp\s+n[°º]?\s*\d+)\b/,
    /\b(colegio|escuela\s+secundaria|cuestionario|consignas?\s+de\s+trabajo)\b/,
    /\b(profesor(?:a)?\s*:|materia\s*:|curso\s*:\s*\d)\b/,
  ]);

  // 5. Señales de Manual / Apunte / Guía didáctica
  const manualSignals = countMatches([
    /\b(unidad\s+\d+|modulo\s+\d+|leccion\s+\d+)\b/,
    /\b(manual\s+de\s+|guia\s+practica|apunte\s+de\s+catedra|cuadernillo)\b/,
    /\b(glosario\s+de\s+terminos|ejercicios\s+de\s+autoevaluacion|actividades\s+practicas)\b/,
  ]);

  // 6. Señales de Libro / Ensayo / Novela
  const literarySignals = countMatches([
    /\b(capitulo\s+(?:\d+|[ivxlcdm]+|uno|dos|tres)|prologo|epilogo)\b/,
    /(?:^|\n)\s*[—–-]\s*[a-z]/, // Diálogo literario con raya
    /\b(novela|antologia|poemario|relatos)\b/,
  ]);

  const candidates: Array<{
    presetId: EditorialPresetId;
    score: number;
    structuralNormId: EditorialStructuralNormId;
    bibliographyStyle: EditorialBibliographyStyle;
    detectedLabel: string;
    reason: string;
  }> = [
    {
      presetId: 'informe-proyecto',
      score: executiveSignals,
      structuralNormId: 'libre',
      bibliographyStyle: 'tradicional',
      detectedLabel: 'Informe / Proyecto',
      reason: 'Detectamos estructura ejecutiva (objetivos, indicadores, diagnóstico o recomendaciones de proyecto).',
    },
    {
      presetId: 'cientifico-vancouver',
      score: vancouverSignals,
      structuralNormId: 'apa7',
      bibliographyStyle: 'vancouver',
      detectedLabel: 'Informe Científico IMRyD (Vancouver)',
      reason: 'Detectamos apartados científicos (Métodos, Resultados, Discusión) y/o citas numéricas [1].',
    },
    {
      presetId: 'tesis-apa7',
      score: thesisSignals,
      structuralNormId: 'apa7',
      bibliographyStyle: 'apa7',
      detectedLabel: 'Tesis Universitaria (APA 7)',
      reason: 'Detectamos marco teórico, metodología académica y referencias con formato autor-año (APA 7).',
    },
    {
      presetId: 'tp-secundaria',
      score: schoolSignals,
      structuralNormId: 'libre',
      bibliographyStyle: 'tradicional',
      detectedLabel: 'Informe / TP Escolar',
      reason: 'Detectamos consignas, datos de materia/curso y estructura de trabajo práctico.',
    },
    {
      presetId: 'manual-apunte-guia',
      score: manualSignals,
      structuralNormId: 'libre',
      bibliographyStyle: 'tradicional',
      detectedLabel: 'Manual / Apunte / Guía',
      reason: 'Detectamos unidades didácticas, módulos de estudio o actividades prácticas.',
    },
    {
      presetId: 'libro-ensayo-novela',
      score: literarySignals,
      structuralNormId: 'libre',
      bibliographyStyle: 'tradicional',
      detectedLabel: 'Libro / Ensayo / Novela',
      reason: 'Detectamos estructura de capítulos narrativos, prólogo o diálogos literarios.',
    },
  ];

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0];
  const runnerUp = candidates[1];

  const confidence: 'high' | 'medium' | 'low' =
    top.score >= 3 && top.score > runnerUp.score
      ? 'high'
      : top.score >= 2
      ? 'medium'
      : 'low';

  reportMessage('editorialPresetDetector:heuristic', 'info', {
    context: 'editorialPresetDetector',
    extra: {
      detected: top.presetId,
      score: top.score,
      confidence,
    },
  });

  return {
    presetId: top.presetId,
    structuralNormId: top.structuralNormId,
    bibliographyStyle: top.bibliographyStyle,
    confidence,
    detectedLabel: top.detectedLabel,
    reason: top.reason,
  };
}

/**
 * Evalúa el texto recién importado (combinando heurística local e IA) y devuelve
 * una recomendación SOLO si el tipo de obra detectado difiere del `currentPresetId` activo.
 */
const SAME_FAMILY_PRESETS: Record<string, ReadonlySet<string>> = {
  literary: new Set(['libro-ensayo-novela', 'novela-literaria', 'ensayo-editorial']),
  scientific: new Set(['articulo-academico', 'cientifico-vancouver']),
  thesis: new Set(['tesis-apa7', 'monografia-terciaria', 'trabajo-practico-monografia-tesis']),
  practical: new Set(['manual-apunte-guia', 'apunte-estudio', 'guia-practica']),
  report: new Set(['informe-proyecto', 'proyecto-tecnico']),
};

function isSamePresetFamily(a: string, b: string): boolean {
  if (a === b) return true;
  return Object.values(SAME_FAMILY_PRESETS).some((group) => group.has(a) && group.has(b));
}

export async function detectEditorialPresetForText(params: {
  fullText: string;
  currentPresetId: EditorialPresetId;
  fileName?: string;
  skipAi?: boolean;
}): Promise<EditorialPresetRecommendation | null> {
  const { fullText, currentPresetId, fileName = '', skipAi = false } = params;
  const trimmed = String(fullText || '').trim();
  if (trimmed.length < 80) return null;

  const heuristic = detectEditorialPresetHeuristic(trimmed, fileName);

  // Intentar clasificación semántica con IA rápida de texto
  if (!skipAi) {
    try {
      const startText = trimmed.slice(0, 3600);
      const endText = trimmed.length > 4000 ? trimmed.slice(-1400) : '';
      const aiRes = await executeAiTask<{
        recommendedPresetId: EditorialPresetId;
        recommendedStructuralNormId: EditorialStructuralNormId;
        recommendedBibliographyStyle: EditorialBibliographyStyle;
        confidence: 'high' | 'medium' | 'low';
        detectedLabel: string;
        reason: string;
      }>({
        taskId: 'editorial_detect_preset',
        payload: {
          currentPresetId,
          fileName,
          startText,
          endText,
        },
        maxTokens: 500,
        temperature: 0.1,
      });

      const d = aiRes.data;
      if (d && d.recommendedPresetId && d.confidence !== 'low') {
        if (isSamePresetFamily(d.recommendedPresetId, currentPresetId)) {
          return null;
        }
        const presetMeta = getEditorialPreset(d.recommendedPresetId);
        return {
          currentPresetId,
          recommendedPresetId: d.recommendedPresetId,
          recommendedPresetLabel: presetMeta?.label || d.detectedLabel || d.recommendedPresetId,
          recommendedStructuralNormId: d.recommendedStructuralNormId || presetMeta?.structuralNormId || 'libre',
          recommendedBibliographyStyle: d.recommendedBibliographyStyle || presetMeta?.bibliographyStyle || 'tradicional',
          confidence: d.confidence,
          detectedLabel: d.detectedLabel || presetMeta?.shortLabel || 'Obra detectada',
          reason: d.reason || heuristic.reason,
          source: 'ai',
        };
      }
    } catch {
      // Fallback silencioso a la heurística local
    }
  }

  if (heuristic.confidence !== 'low' && !isSamePresetFamily(heuristic.presetId, currentPresetId)) {
    const presetMeta = getEditorialPreset(heuristic.presetId);
    return {
      currentPresetId,
      recommendedPresetId: heuristic.presetId,
      recommendedPresetLabel: presetMeta?.label || heuristic.detectedLabel,
      recommendedStructuralNormId: heuristic.structuralNormId,
      recommendedBibliographyStyle: heuristic.bibliographyStyle,
      confidence: heuristic.confidence,
      detectedLabel: heuristic.detectedLabel,
      reason: heuristic.reason,
      source: 'heuristic',
    };
  }

  return null;
}
