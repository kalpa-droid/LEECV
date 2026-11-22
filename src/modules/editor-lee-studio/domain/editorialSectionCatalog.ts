/**
 * Núcleo puro — Catálogo de secciones de EditorLee (editorialSectionCatalog.ts)
 *
 * Catálogo aislado de CANONICAL_SECTION_ORDER. Define las secciones
 * disponibles por categoría, sus íconos y los valores por defecto.
 *
 * Este módulo es PURO (sin React, sin DOM).
 */
import { EditorialSectionId } from './editorialTypes';

/** Categoría de sección. */
export type EditorialSectionCategory =
  | 'preliminares'
  | 'cuerpo'
  | 'cierre'
  | 'personalizada';

/** Definición de una sección en el catálogo. */
export interface EditorialSectionDefinition {
  /** Identificador único (slug estable). */
  id: string;
  /** Nombre visible de la sección. */
  label: string;
  /** Descripción corta para el catálogo. */
  description: string;
  /** Categoría de la sección. */
  category: EditorialSectionCategory;
  /** Ícono Lucide (nombre, será resuelto por iconCatalog). */
  iconName: string;
  /** ¿Es repetible? (Capítulo 1, Capítulo 2, ...) */
  repeatable: boolean;
  /** Prefijo para numeración automática (si aplica). */
  autoNumberPrefix?: string;
  /** Valores por defecto de la sección al crearse. */
  defaultValues: {
    title: string;
    includeInToc: boolean;
    startNewPage: boolean;
  };
}

/** Catálogo completo de secciones editoriales. */
export const EDITORIAL_SECTION_CATALOG: EditorialSectionDefinition[] = [
  // ── Preliminares ────────────────────────────────────────────────────
  {
    id: 'portada',
    label: 'Portada / Carátula',
    description: 'Tapa editorial con título, autor y editorial.',
    category: 'preliminares',
    iconName: 'BookOpen',
    repeatable: false,
    defaultValues: { title: 'Portada', includeInToc: false, startNewPage: true },
  },
  {
    id: 'dedicatoria',
    label: 'Dedicatoria / Epígrafe',
    description: 'Dedicatoria o frase inicial.',
    category: 'preliminares',
    iconName: 'Heart',
    repeatable: false,
    defaultValues: { title: 'Dedicatoria', includeInToc: false, startNewPage: true },
  },
  {
    id: 'agradecimientos',
    label: 'Agradecimientos',
    description: 'Mención a personas e instituciones.',
    category: 'preliminares',
    iconName: 'HandHeart',
    repeatable: false,
    defaultValues: { title: 'Agradecimientos', includeInToc: true, startNewPage: true },
  },
  {
    id: 'resumen',
    label: 'Resumen / Abstract',
    description: 'Síntesis del contenido (para tesis y trabajos).',
    category: 'preliminares',
    iconName: 'FileText',
    repeatable: false,
    defaultValues: { title: 'Resumen', includeInToc: true, startNewPage: true },
  },
  {
    id: 'prologo',
    label: 'Prólogo / Prefacio',
    description: 'Texto introductorio escrito por otra persona o por el autor.',
    category: 'preliminares',
    iconName: 'Quote',
    repeatable: false,
    defaultValues: { title: 'Prólogo', includeInToc: true, startNewPage: true },
  },
  {
    id: 'introduccion',
    label: 'Introducción / Fundamentación',
    description: 'Presentación del tema y objetivos.',
    category: 'preliminares',
    iconName: 'Compass',
    repeatable: false,
    defaultValues: { title: 'Introducción', includeInToc: true, startNewPage: true },
  },

  // ── Cuerpo ──────────────────────────────────────────────────────────
  {
    id: 'capitulo',
    label: 'Capítulo',
    description: 'Capítulo numerado automáticamente.',
    category: 'cuerpo',
    iconName: 'BookMarked',
    repeatable: true,
    autoNumberPrefix: 'Capítulo',
    defaultValues: { title: 'Capítulo', includeInToc: true, startNewPage: true },
  },
  {
    id: 'unidad',
    label: 'Unidad / Módulo',
    description: 'Unidad didáctica o módulo temático.',
    category: 'cuerpo',
    iconName: 'Layers',
    repeatable: true,
    autoNumberPrefix: 'Unidad',
    defaultValues: { title: 'Unidad', includeInToc: true, startNewPage: true },
  },
  {
    id: 'desarrollo',
    label: 'Desarrollo / Marco Teórico',
    description: 'Desarrollo del marco conceptual o teórico.',
    category: 'cuerpo',
    iconName: 'AlignLeft',
    repeatable: true,
    autoNumberPrefix: 'Desarrollo',
    defaultValues: { title: 'Desarrollo', includeInToc: true, startNewPage: true },
  },
  {
    id: 'metodologia',
    label: 'Metodología / Caso Práctico',
    description: 'Descripción del método o caso de estudio.',
    category: 'cuerpo',
    iconName: 'FlaskConical',
    repeatable: true,
    autoNumberPrefix: 'Metodología',
    defaultValues: { title: 'Metodología', includeInToc: true, startNewPage: true },
  },
  {
    id: 'marco_teorico',
    label: 'Marco Teórico / Antecedentes',
    description: 'Revisión bibliográfica y bases conceptuales.',
    category: 'cuerpo',
    iconName: 'BookOpen',
    repeatable: true,
    autoNumberPrefix: 'Marco Teórico',
    defaultValues: { title: 'Marco Teórico', includeInToc: true, startNewPage: true },
  },
  {
    id: 'resultados',
    label: 'Resultados / Hallazgos',
    description: 'Datos obtenidos, cuadros o evidencia del estudio (IMRyD).',
    category: 'cuerpo',
    iconName: 'BarChart3',
    repeatable: false,
    defaultValues: { title: 'Resultados', includeInToc: true, startNewPage: true },
  },
  {
    id: 'discusion',
    label: 'Discusión / Análisis',
    description: 'Interpretación de resultados y contraste teórico (IMRyD).',
    category: 'cuerpo',
    iconName: 'MessageSquareQuote',
    repeatable: false,
    defaultValues: { title: 'Discusión', includeInToc: true, startNewPage: true },
  },

  // ── Cierre y Referencias ────────────────────────────────────────────
  {
    id: 'conclusiones',
    label: 'Conclusiones',
    description: 'Síntesis y hallazgos finales.',
    category: 'cierre',
    iconName: 'CheckCircle',
    repeatable: false,
    defaultValues: { title: 'Conclusiones', includeInToc: true, startNewPage: true },
  },
  {
    id: 'epilogo',
    label: 'Epílogo',
    description: 'Cierre narrativo posterior al cuerpo.',
    category: 'cierre',
    iconName: 'BookOpen',
    repeatable: false,
    defaultValues: { title: 'Epílogo', includeInToc: true, startNewPage: true },
  },
  {
    id: 'bibliografia',
    label: 'Bibliografía / Fuentes',
    description: 'Referencias ordenadas (APA, Chicago o tradicional).',
    category: 'cierre',
    iconName: 'Library',
    repeatable: false,
    defaultValues: { title: 'Bibliografía', includeInToc: true, startNewPage: true },
  },
  {
    id: 'glosario',
    label: 'Glosario',
    description: 'Términos y definiciones (soporta 2 columnas).',
    category: 'cierre',
    iconName: 'BookText',
    repeatable: false,
    defaultValues: { title: 'Glosario', includeInToc: true, startNewPage: true },
  },
  {
    id: 'anexo',
    label: 'Anexo / Apéndice',
    description: 'Material complementario.',
    category: 'cierre',
    iconName: 'Paperclip',
    repeatable: true,
    autoNumberPrefix: 'Anexo',
    defaultValues: { title: 'Anexo', includeInToc: true, startNewPage: true },
  },
];

/** Secciones agrupadas por categoría. */
export const EDITORIAL_SECTIONS_BY_CATEGORY: Record<EditorialSectionCategory, EditorialSectionDefinition[]> = {
  preliminares: EDITORIAL_SECTION_CATALOG.filter((s) => s.category === 'preliminares'),
  cuerpo: EDITORIAL_SECTION_CATALOG.filter((s) => s.category === 'cuerpo'),
  cierre: EDITORIAL_SECTION_CATALOG.filter((s) => s.category === 'cierre'),
  personalizada: [],
};

/** Busca una definición de sección por id. */
export function findEditorialSectionDefinition(id: string): EditorialSectionDefinition | undefined {
  return EDITORIAL_SECTION_CATALOG.find((s) => s.id === id);
}

/** Identificadores de todas las secciones estándar. */
export const EDITORIAL_STANDARD_SECTION_IDS: string[] = EDITORIAL_SECTION_CATALOG.map((s) => s.id);

/** Crea una sección base a partir de una definición del catálogo. */
export function createSectionFromDefinition(
  def: EditorialSectionDefinition,
  position: number,
  index?: number,
): {
  id: EditorialSectionId;
  title: string;
  sectionKey: string;
  category: EditorialSectionCategory;
  visible: boolean;
  includeInToc: boolean;
  startNewPage: boolean;
  position: number;
  records: [];
} {
  const title = def.autoNumberPrefix && typeof index === 'number'
    ? `${def.autoNumberPrefix} ${index + 1}`
    : def.defaultValues.title;

  return {
    id: `ed_${def.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    sectionKey: def.id,
    category: def.category,
    visible: true,
    includeInToc: def.defaultValues.includeInToc,
    startNewPage: def.defaultValues.startNewPage,
    position,
    records: [],
  };
}