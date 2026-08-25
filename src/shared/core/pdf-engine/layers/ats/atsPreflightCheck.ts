/**
 * NÚCLEO — AUDITORÍA INTERNA PREDICTIVA ATS (atsPreflightCheck.ts)
 *
 * Simula el flujo de lectura secuencial que realizaría un parser ATS (arriba-abajo,
 * izquierda-derecha) y devuelve una lista de advertencias no bloqueantes.
 */

import { Preset } from '../presets/presetSchema';
import { ContentSection } from '../records/recordTypes';
import { PersonalInfo } from '../../../../../types/cv';

export interface AtsWarning {
  id: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
}

export interface AtsPreflightResult {
  score: number;
  warnings: AtsWarning[];
  linearReadingOrder: string[];
}

export function runAtsPreflightCheck(
  preset: Preset,
  sections: ContentSection[],
  personalInfo?: PersonalInfo
): AtsPreflightResult {
  const warnings: AtsWarning[] = [];
  const linearReadingOrder: string[] = [];

  // 1. Verificación de Estructura Multicolumna
  const hasSidebar = preset.sectionOrder.some(s => s.sectorRole === 'sidebar' && s.sectionIds.length > 0);
  if (hasSidebar) {
    warnings.push({
      id: 'multicol_warning',
      level: 'warning',
      title: 'Diseño Multicolumna Detectado',
      description: 'Algunos parsers ATS antiguos pueden leer el sidebar y la columna principal como líneas continuas.',
      recommendation: 'Usa la opción "Exportar versión ATS" para generar un PDF unicontenido de 1 sola columna.'
    });
  }

  // 2. Verificación de Contacto y Datos Críticos
  if (!personalInfo?.email) {
    warnings.push({
      id: 'missing_email',
      level: 'critical',
      title: 'Correo Electrónico Ausente',
      description: 'Los sistemas ATS descartan postulaciones que carecen de un correo electrónico parseable.',
      recommendation: 'Agrega tu dirección de email en la sección de datos personales.'
    });
  }

  if (!personalInfo?.phone) {
    warnings.push({
      id: 'missing_phone',
      level: 'warning',
      title: 'Teléfono de Contacto Ausente',
      description: 'Un número de teléfono facilita el contacto directo por reclutadores.',
      recommendation: 'Agrega un número telefónico válido con código de área.'
    });
  }

  // 3. Simulación de Flujo Lineal de Secciones
  sections.forEach((sec) => {
    if (sec.titleText) {
      linearReadingOrder.push(`SECCIÓN: ${sec.titleText}`);
    }
    sec.records.forEach((rec) => {
      const f = rec.fields || {};
      const title = String(f.tituloOGrado || f.cargo || f.titulo || f.puesto || (rec as any).titulo || 'Registro');
      const inst = String(f.institucion || f.empresa || (rec as any).institucion || '');
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
