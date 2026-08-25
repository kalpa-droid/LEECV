/**
 * NÚCLEO — NOMBRES CANÓNICOS DE SECCIÓN (canonicalSectionLabels.ts)
 *
 * Mapea títulos de sección a encabezados canónicos estándar reconocidos por ATS
 * ("Experiencia Laboral", "Formación Académica", "Cursos y Capacitaciones", "Idiomas", "Habilidades").
 */

import { SECTION_CATALOG } from '../../../sectionRegistry';

export interface CanonicalMapping {
  canonicalId: string;
  standardName: string;
  aliases: string[];
}

const getCatalogLabel = (id: string, fallback: string): string => {
  const item = SECTION_CATALOG.find((s) => s.id === id);
  return item ? item.label : fallback;
};

export const CANONICAL_SECTIONS: CanonicalMapping[] = [
  {
    canonicalId: 'experiencia',
    standardName: getCatalogLabel('experiencia', 'Experiencia Laboral'),
    aliases: ['experiencia', 'trayectoria', 'historial laboral', 'trabajo', 'cargos desempeñados', 'laboral', 'experience']
  },
  {
    canonicalId: 'formacion',
    standardName: getCatalogLabel('formacion', 'Formación Académica'),
    aliases: ['estudios', 'educacion', 'educación', 'formacion', 'formación', 'títulos', 'titulos', 'estudios realizados', 'education']
  },
  {
    canonicalId: 'cursos',
    standardName: getCatalogLabel('cursos', 'Cursos & Capacitaciones'),
    aliases: ['cursos', 'capacitaciones', 'certificaciones', 'seminarios', 'talleres', 'diplomaturas', 'courses']
  },
  {
    canonicalId: 'idiomas',
    standardName: 'Idiomas',
    aliases: ['idiomas', 'lenguas', 'languages']
  },
  {
    canonicalId: 'competencias',
    standardName: getCatalogLabel('competencias', 'Competencias Clave'),
    aliases: ['habilidades', 'competencias', 'destrezas', 'aptitudes', 'skills', 'tecnologias', 'tecnologías']
  }
];

export function findCanonicalLabel(titleText: string): string | null {
  if (!titleText) return null;
  const clean = titleText.toLowerCase().trim();

  for (const item of CANONICAL_SECTIONS) {
    if (clean.includes(item.standardName.toLowerCase())) return item.standardName;
    for (const alias of item.aliases) {
      if (clean.includes(alias)) return item.standardName;
    }
  }

  return null;
}
