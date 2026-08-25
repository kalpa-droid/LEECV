/**
 * NÚCLEO — NOMBRES CANÓNICOS DE SECCIÓN (canonicalSectionLabels.ts)
 *
 * Mapea títulos de sección a encabezados canónicos estándar reconocidos por ATS
 * ("Experiencia Laboral", "Formación Académica", "Cursos y Capacitaciones", "Idiomas", "Habilidades").
 */

export interface CanonicalMapping {
  canonicalId: string;
  standardName: string;
  aliases: string[];
}

export const CANONICAL_SECTIONS: CanonicalMapping[] = [
  {
    canonicalId: 'experience',
    standardName: 'Experiencia Laboral',
    aliases: ['experiencia', 'trayectoria', 'historial laboral', 'trabajo', 'cargos desempeñados', 'laboral', 'experience']
  },
  {
    canonicalId: 'education',
    standardName: 'Formación Académica',
    aliases: ['estudios', 'educacion', 'educación', 'formacion', 'formación', 'títulos', 'titulos', 'estudios realizados', 'education']
  },
  {
    canonicalId: 'course',
    standardName: 'Cursos y Capacitaciones',
    aliases: ['cursos', 'capacitaciones', 'certificaciones', 'seminarios', 'talleres', 'diplomaturas', 'courses']
  },
  {
    canonicalId: 'languages',
    standardName: 'Idiomas',
    aliases: ['idiomas', 'lenguas', 'languages']
  },
  {
    canonicalId: 'skills',
    standardName: 'Habilidades Técnicas',
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
