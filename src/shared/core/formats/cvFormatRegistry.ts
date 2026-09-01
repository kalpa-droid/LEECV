/**
 * NÚCLEO — MOTOR DE FORMATOS GLOBALES Y REGIONALES DE CV (cvFormatRegistry.ts)
 * 
 * Regula los 5 estándares globales e internacionales de maquetación:
 * 1. ATS 1 Columna Estricta (Formato Corporativo 100% parseable por ATS)
 * 2. US Resume (Norteamérica — Anti-discriminación: Oculta foto, edad, estado civil)
 * 3. Europass (Europa — Estructura estandarizada con CEFR)
 * 4. Tech & Portfolio (Desarrollo/Ingeniería — Proyectos, GitHub y Habilidades Técnicas)
 * 5. LATAM Clásico / Ejecutivo (Tradicional 2 Columnas con Foto y Datos Personales)
 */

export interface CvFormatDefinition {
  id: string;
  name: string;
  description: string;
  columnLayoutPresetId: 'full-width' | 'sidebar-left' | 'sidebar-right';
  defaultVisibleSections: string[];
  hiddenPersonalFields: string[];
  recommendedPresetIds: string[];
}

export const CV_FORMAT_REGISTRY: Record<string, CvFormatDefinition> = {
  'ats-one-column': {
    id: 'ats-one-column',
    name: 'ATS 1 Columna (Corporativo Global)',
    description: 'Estructura lineal de 1 sola columna en flujo continuo. Máxima compatibilidad con sistemas ATS de selección corporativa.',
    columnLayoutPresetId: 'full-width',
    defaultVisibleSections: ['contacto', 'redes', 'resumen', 'experiencia', 'formacion', 'habilidades', 'idiomas', 'certificados'],
    hiddenPersonalFields: [],
    recommendedPresetIds: ['cv-clasico', 'minimal-editorial']
  },

  'us-resume': {
    id: 'us-resume',
    name: 'US Resume (EE.UU. / Canadá)',
    description: 'Estándar norteamericano con cumplimiento estricto de leyes de no discriminación (sin foto, edad ni estado civil).',
    columnLayoutPresetId: 'full-width',
    defaultVisibleSections: ['contacto', 'redes', 'resumen', 'experiencia', 'habilidades', 'formacion', 'proyectos'],
    hiddenPersonalFields: ['profilePhoto', 'birthDate', 'estadoCivil', 'dni', 'cuit', 'nacionalidad'],
    recommendedPresetIds: ['minimal-editorial', 'cv-clasico']
  },

  'europass': {
    id: 'europass',
    name: 'Europass (Estándar Europeo)',
    description: 'Estructura europea unificada con énfasis en Formación, Experiencia e Idiomas clasificados por marco CEFR (A1-C2).',
    columnLayoutPresetId: 'sidebar-left',
    defaultVisibleSections: ['contacto', 'datos-personales', 'redes', 'resumen', 'experiencia', 'formacion', 'idiomas', 'habilidades'],
    hiddenPersonalFields: [],
    recommendedPresetIds: ['modern-corporate', 'cv-clasico']
  },

  'tech-portfolio': {
    id: 'tech-portfolio',
    name: 'Tech & Software Portfolio',
    description: 'Orientado a desarrolladores, ingenieros y perfiles tecnológicos. Prioriza Proyectos, Habilidades Técnicas y Repositorios.',
    columnLayoutPresetId: 'sidebar-left',
    defaultVisibleSections: ['contacto', 'redes', 'resumen', 'proyectos', 'habilidades', 'experiencia', 'formacion', 'publicaciones'],
    hiddenPersonalFields: [],
    recommendedPresetIds: ['creative-sustentable', 'modern-corporate']
  },

  'latam-clasico': {
    id: 'latam-clasico',
    name: 'LATAM Ejecutivo / Tradicional',
    description: 'Formato clásico de 2 columnas ampliamente utilizado en América Latina con foto de perfil y datos completos.',
    columnLayoutPresetId: 'sidebar-left',
    defaultVisibleSections: ['contacto', 'datos-personales', 'frase', 'redes', 'experiencia', 'formacion', 'profesion', 'competencias', 'cursos', 'ecologia', 'firma'],
    hiddenPersonalFields: [],
    recommendedPresetIds: ['cv-clasico', 'modern-corporate']
  }
};

export function getCvFormat(formatId: string): CvFormatDefinition {
  return CV_FORMAT_REGISTRY[formatId] || CV_FORMAT_REGISTRY['ats-one-column'];
}

export function getAllCvFormats(): CvFormatDefinition[] {
  return Object.values(CV_FORMAT_REGISTRY);
}

/**
 * Genera el mapa de visibilidad por defecto asignado a un formato global.
 */
export function getFormatDefaultVisibility(formatId: string): Record<string, boolean> {
  const format = getCvFormat(formatId);
  const visibleSet = new Set(format.defaultVisibleSections);
  const result: Record<string, boolean> = {};

  ['contacto', 'datos-personales', 'frase', 'redes', 'resumen', 'experiencia', 'formacion', 'profesion', 'habilidades', 'competencias', 'idiomas', 'proyectos', 'publicaciones', 'referencias', 'cursos', 'informatica', 'ecologia', 'certificados', 'firma'].forEach((secId) => {
    result[secId] = visibleSet.has(secId);
  });

  return result;
}

/**
 * NÚCLEO — RESUELVE EL FORMATO GLOBAL ACTIVO (cvFormatRegistry.ts)
 * 
 * Si el documento contiene un `activeFormatId` explícito y válido, lo respeta.
 * Si proviene de un JSON/borrador guardado previo que carecía de este campo,
 * infiere el formato global correspondiente basándose en la maquetación efectiva del preset.
 */
export function resolveActiveFormatId(cvData: any): string {
  if (cvData?.activeFormatId && CV_FORMAT_REGISTRY[cvData.activeFormatId]) {
    return cvData.activeFormatId;
  }

  const effectiveLayout = cvData?.columnLayoutPresetId;
  if (effectiveLayout === 'full-width') {
    return 'ats-one-column';
  }
  if (effectiveLayout === 'sidebar-left' || effectiveLayout === 'sidebar-right') {
    return 'latam-clasico';
  }

  const presetId = cvData?.activePresetId || 'cv-clasico';
  if (presetId === 'minimal-editorial' || presetId === 'tarjeta-personal') {
    return 'ats-one-column';
  }

  return 'latam-clasico';
}

export function resolveActiveFormat(cvData: any): CvFormatDefinition {
  return getCvFormat(resolveActiveFormatId(cvData));
}

