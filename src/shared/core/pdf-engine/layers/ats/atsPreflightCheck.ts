/**
 * NÚCLEO — AUDITORÍA INTERNA PREDICTIVA ATS (atsPreflightCheck.ts)
 *
 * Simula el flujo de lectura secuencial que realizaría un parser ATS (arriba-abajo,
 * izquierda-derecha) y devuelve una lista de advertencias no bloqueantes.
 */

import { Preset } from '../presets/presetSchema';
import { ContentSection } from '../records/recordTypes';
import { CVData } from '../../../../../types/cv';
import { resolveCanonicalSection } from './canonicalSectionLabels';
import { buildStructuredRecordLayout } from '../records/recordLayoutEngine';
import { RULES_CATALOG } from '../../../recruiter-rules/rulesCatalog';

export interface AtsWarning {
  id: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
  articleSlug?: string;
  fixAction?: 'hide_field' | 'edit_section';
}

export interface AtsPreflightResult {
  score: number;
  warnings: AtsWarning[];
  linearReadingOrder: string[];
}

export function runAtsPreflightCheck(
  preset: Preset,
  sections: ContentSection[],
  cvData?: CVData
): AtsPreflightResult {
  const warnings: AtsWarning[] = [];
  const linearReadingOrder: string[] = [];

  // Evaluación dinámica usando el catálogo central de reglas
  if (cvData) {
    RULES_CATALOG.forEach((rule) => {
      const result = rule.evaluate(cvData);
      if (result === 'fail') {
        warnings.push({
          id: rule.id,
          level: rule.severity === 'high' ? 'critical' : rule.severity === 'medium' ? 'warning' : 'info',
          title: rule.title,
          description: rule.description,
          recommendation: rule.articleSlug ? `Consultá la guía en nuestro blog para más detalles.` : 'Revisá esta sección.',
          articleSlug: rule.articleSlug,
          fixAction: rule.fixAction
        });
      }
    });
  }

  // Simulación de Flujo Lineal de Secciones y Nombres Canónicos (F5)
  sections.forEach((sec) => {
    if (sec.titleText) {
      const canonical = resolveCanonicalSection({ sectionId: sec.id, titleText: sec.titleText });
      if (!canonical) {
        // Esta regla se mantiene estática porque requiere saber la estructura de secciones generada por el PDF engine,
        // no solo el objeto CVData crudo.
        warnings.push({
          id: `non_standard_section_${sec.id}`,
          level: 'info',
          title: `Título de Sección Creativo: "${sec.titleText}"`,
          description: 'Los parsers ATS identifican mejor encabezados estándar como "Experiencia Laboral", "Formación Académica" o "Habilidades".',
          recommendation: 'Considera usar un título de sección estándar para maximizar la compatibilidad con sistemas de empleo.'
        });
      }
      linearReadingOrder.push(`SECCIÓN: ${sec.titleText} ${canonical ? `[Canónico: ${canonical}]` : ''}`);
    }
    sec.records.forEach((rec) => {
      const layout = buildStructuredRecordLayout((rec.fields || rec) as any);
      const title = layout.header || 'Registro';
      const inst = layout.subheader || '';
      linearReadingOrder.push(`  - ${title} ${inst ? `(${inst})` : ''}`);
    });
  });

  const criticalCount = warnings.filter(w => w.level === 'critical').length;
  const warningCount = warnings.filter(w => w.level === 'warning').length;

  let score = 100 - (criticalCount * 25) - (warningCount * 10);
  score = Math.max(20, Math.min(100, score));

  return {
    score,
    warnings,
    linearReadingOrder
  };
}
