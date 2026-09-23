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
    aliases: ['estudios', 'educacion', 'formacion', 'titulos', 'estudios realizados', 'education']
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
    aliases: ['habilidades', 'competencias', 'destrezas', 'aptitudes', 'skills', 'tecnologias']
  }
];

const normalizeText = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/:/g, '').trim().replace(/\s+/g, ' ');

const CANONICAL_MAP = new Map<string, string>();
const ALIAS_MAP = new Map<string, string>();

// Precompilar mapas para búsqueda O(1)
CANONICAL_SECTIONS.forEach(sec => {
  CANONICAL_MAP.set(sec.canonicalId, sec.standardName);
  ALIAS_MAP.set(normalizeText(sec.standardName), sec.standardName);
  sec.aliases.forEach(alias => {
    ALIAS_MAP.set(normalizeText(alias), sec.standardName);
  });
});

export function resolveCanonicalSection({ sectionId, titleText }: { sectionId?: string; titleText?: string }): string | null {
  // Nivel 1: Lookup directo por sectionId
  if (sectionId && CANONICAL_MAP.has(sectionId)) {
    return CANONICAL_MAP.get(sectionId)!;
  }

  // Nivel 2: Fallback léxico solo si sectionId no resolvió (secciones custom)
  if (!titleText) return null;
  const cleanTitle = normalizeText(titleText);

  if (ALIAS_MAP.has(cleanTitle)) {
    return ALIAS_MAP.get(cleanTitle)!;
  }

  return null;
}

/**
 * @deprecated Usa resolveCanonicalSection en su lugar.
 * Mantenido temporalmente para llamadores no migrados.
 */
export function findCanonicalLabel(titleText: string): string | null {
  return resolveCanonicalSection({ titleText });
}
